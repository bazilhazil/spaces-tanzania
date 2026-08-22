import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";

export type ViewingStatusDb =
  | "pending"
  | "approved"
  | "rejected"
  | "rescheduled"
  | "cancelled"
  | "completed";

export interface ViewingRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string | null;
  propertyLocation: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string | null;
  buyerEmail: string | null;
  ownerId: string | null;
  agentId: string | null;
  recipientId: string | null;
  recipientName: string;
  scheduledAt: string;
  suggestedAt: string | null;
  durationMinutes: number;
  message: string | null;
  status: ViewingStatusDb;
  createdAt: string;
  leadId: string | null;
  dealId: string | null;
}

export interface CreateViewingInput {
  propertyId: string;
  ownerId: string;
  agentId?: string | null;
  scheduledAt: string; // ISO
  durationMinutes?: number;
  message?: string;
  contactPhone?: string;
}

/** Creates a Pending viewing request routed to the agent when set, else the owner. */
export async function createViewingRequest(
  input: CreateViewingInput,
): Promise<{ ok: boolean; error?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) return { ok: false, error: "auth" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone,email")
    .eq("id", user.id)
    .maybeSingle();

  const recipient = input.agentId || input.ownerId;
  const { error } = await supabase.from("bookings").insert({
    property_id: input.propertyId,
    buyer_id: user.id,
    owner_id: input.ownerId,
    agent_id: input.agentId ?? null,
    recipient_id: recipient,
    buyer_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    buyer_email: profile?.email ?? user.email ?? null,
    contact_phone: input.contactPhone ?? profile?.phone ?? null,
    scheduled_at: input.scheduledAt,
    duration_minutes: input.durationMinutes ?? 30,
    message: input.message ?? null,
    status: "pending",
  } as never);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type Raw = Record<string, any>;

async function hydrate(rows: Raw[]): Promise<ViewingRequest[]> {
  if (!rows.length) return [];
  const propIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.buyer_id, r.recipient_id, r.owner_id, r.agent_id]).filter(Boolean),
    ),
  ];

  const [{ data: props }, { data: media }, { data: profiles }] = await Promise.all([
    supabase.from("properties").select("id,title,region,district,ward").in("id", propIds),
    supabase
      .from("property_media")
      .select("property_id,storage_path,is_cover,position")
      .in("property_id", propIds)
      .order("position", { ascending: true }),
    userIds.length
      ? supabase.from("profiles").select("id,full_name,phone,email").in("id", userIds)
      : Promise.resolve({ data: [] as Raw[] } as never),
  ]);

  const propById = new Map((props ?? []).map((p: Raw) => [p.id, p]));
  const profById = new Map(((profiles as Raw[]) ?? []).map((p: Raw) => [p.id, p]));

  const coverPath: Record<string, string> = {};
  for (const m of ((media as Raw[]) ?? [])) {
    if (!coverPath[m.property_id] || m.is_cover) coverPath[m.property_id] = m.storage_path;
  }
  const coverEntries = await Promise.all(
    Object.entries(coverPath).map(async ([pid, path]) => [pid, await signedUrl(path)] as const),
  );
  const covers = Object.fromEntries(coverEntries);

  return rows.map((r) => {
    const p = propById.get(r.property_id) as Raw | undefined;
    const buyer = profById.get(r.buyer_id) as Raw | undefined;
    const recipient = profById.get(r.recipient_id ?? r.owner_id) as Raw | undefined;
    return {
      id: r.id,
      propertyId: r.property_id,
      propertyTitle: p?.title ?? "Property",
      propertyImage: covers[r.property_id] ?? null,
      propertyLocation: [p?.ward, p?.district, p?.region].filter(Boolean).join(", "),
      buyerId: r.buyer_id,
      buyerName: r.buyer_name ?? buyer?.full_name ?? "Buyer",
      buyerPhone: r.contact_phone ?? buyer?.phone ?? null,
      buyerEmail: r.buyer_email ?? buyer?.email ?? null,
      ownerId: r.owner_id ?? null,
      agentId: r.agent_id ?? null,
      recipientId: r.recipient_id ?? r.owner_id ?? null,
      recipientName: recipient?.full_name ?? "Owner / Agent",
      scheduledAt: r.scheduled_at,
      suggestedAt: r.suggested_at ?? null,
      durationMinutes: r.duration_minutes ?? 30,
      message: r.message ?? r.notes ?? null,
      status: (r.status ?? "pending") as ViewingStatusDb,
      createdAt: r.created_at,
      leadId: r.lead_id ?? null,
      dealId: r.deal_id ?? null,
    };
  });
}

/** Requests the signed-in owner/agent must action. */
export async function fetchIncomingViewings(): Promise<ViewingRequest[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .or(`recipient_id.eq.${uid},owner_id.eq.${uid},agent_id.eq.${uid}`)
    .order("scheduled_at", { ascending: true });
  return hydrate(((data as Raw[]) ?? []).filter((r) => r.buyer_id !== uid));
}

/** Requests the signed-in user sent. */
export async function fetchMyViewings(): Promise<ViewingRequest[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("buyer_id", uid)
    .order("scheduled_at", { ascending: true });
  return hydrate((data as Raw[]) ?? []);
}

/** Admin overview of every viewing request. */
export async function fetchAllViewings(limit = 300): Promise<ViewingRequest[]> {
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return hydrate((data as Raw[]) ?? []);
}

export async function setViewingStatus(
  id: string,
  status: ViewingStatusDb,
): Promise<boolean> {
  const { error } = await supabase
    .from("bookings")
    .update({ status } as never)
    .eq("id", id);
  return !error;
}

/** Owner/agent proposes another slot — buyer sees "Rescheduled". */
export async function suggestNewTime(id: string, isoDate: string): Promise<boolean> {
  const { error } = await supabase
    .from("bookings")
    .update({ suggested_at: isoDate, status: "rescheduled" } as never)
    .eq("id", id);
  return !error;
}

/** Buyer accepts the suggested slot — becomes the confirmed time. */
export async function acceptSuggestedTime(v: ViewingRequest): Promise<boolean> {
  const { error } = await supabase
    .from("bookings")
    .update({
      scheduled_at: v.suggestedAt ?? v.scheduledAt,
      suggested_at: null,
      status: "approved",
    } as never)
    .eq("id", v.id);
  return !error;
}
