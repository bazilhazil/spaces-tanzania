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
  ownerId?: string | null;
  agentId?: string | null;
  scheduledAt: string; // ISO
  durationMinutes?: number;
  message?: string;
  contactPhone?: string;
}

export type ViewingErrorCode =
  | "auth"
  | "property_missing"
  | "invalid_date"
  | "permission"
  | "failed";

/**
 * Creates a Pending viewing request. The property row (and any assigned agent)
 * is resolved from the database at submit time so the request always references
 * the real listing and the real recipient — never stale props.
 */
export async function createViewingRequest(
  input: CreateViewingInput,
): Promise<{ ok: boolean; error?: ViewingErrorCode; detail?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) return { ok: false, error: "auth" };

  if (!input.propertyId) return { ok: false, error: "property_missing" };

  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
    return { ok: false, error: "invalid_date" };
  }

  // 1. Validate the property really exists and grab its true owner.
  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("id,owner_id")
    .eq("id", input.propertyId)
    .maybeSingle();
  if (propErr) console.error("Viewing request property lookup failed:", propErr);
  const ownerId = (prop as { owner_id?: string } | null)?.owner_id ?? input.ownerId ?? null;
  const propertyId = (prop as { id?: string } | null)?.id ?? input.propertyId;
  if (!ownerId) return { ok: false, error: "property_missing" };

  // 2. Route to an assigned agent when one manages viewings for this listing.
  let agentId = input.agentId ?? null;
  if (!agentId) {
    const { data: assigned } = await supabase
      .from("property_agents")
      .select("agent_id,permission")
      .eq("property_id", propertyId)
      .in("permission", ["manage_viewings", "full_management"])
      .limit(1)
      .maybeSingle();
    agentId = (assigned as { agent_id?: string } | null)?.agent_id ?? null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone,email")
    .eq("id", user.id)
    .maybeSingle();

  const recipient = agentId || ownerId;
  const payload = {
    property_id: propertyId,
    buyer_id: user.id,
    owner_id: ownerId,
    agent_id: agentId,
    recipient_id: recipient,
    buyer_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    buyer_email: profile?.email ?? user.email ?? null,
    contact_phone: input.contactPhone ?? profile?.phone ?? null,
    scheduled_at: when.toISOString(),
    duration_minutes: input.durationMinutes ?? 30,
    message: input.message ?? null,
    status: "pending",
  };

  // A partial unique index allows only one ACTIVE request per (property, buyer).
  // Reuse it instead of failing so a buyer can simply change their requested slot.
  const { data: active } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", propertyId)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "approved", "rescheduled"])
    .limit(1)
    .maybeSingle();

  if (active) {
    const { error: updErr } = await supabase
      .from("bookings")
      .update({
        scheduled_at: payload.scheduled_at,
        duration_minutes: payload.duration_minutes,
        message: payload.message,
        contact_phone: payload.contact_phone,
        suggested_at: null,
        status: "pending",
      } as never)
      .eq("id", (active as { id: string }).id);
    if (updErr) {
      console.error("[viewings] update existing request failed", {
        operation: "createViewingRequest:update",
        bookingId: (active as { id: string }).id,
        userId: user.id,
        propertyId,
        ownerId,
        agentId,
        code: (updErr as { code?: string }).code,
        message: updErr.message,
      });
      return { ok: false, error: "failed", detail: updErr.message };
    }
    return { ok: true, updated: true };
  }

  const { error } = await supabase.from("bookings").insert(payload as never);

  if (error) {
    const code = (error as { code?: string }).code ?? "";
    console.error("[viewings] request submission failed", {
      operation: "createViewingRequest:insert",
      userId: user.id,
      propertyId,
      ownerId,
      agentId,
      recipientId: recipient,
      scheduledAt: payload.scheduled_at,
      code,
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    if (code === "23505") return { ok: false, error: "duplicate", detail: error.message };
    if (code === "42501" || /row-level security|permission denied/i.test(error.message)) {
      return { ok: false, error: "permission", detail: error.message };
    }
    if (/JWT|token|not authenticated/i.test(error.message)) {
      return { ok: false, error: "auth", detail: error.message };
    }
    if (code === "23503") return { ok: false, error: "property_missing", detail: error.message };
    return { ok: false, error: "failed", detail: error.message };
  }
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
