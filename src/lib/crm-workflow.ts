import { supabase } from "@/integrations/supabase/client";
import type { DealStage } from "@/lib/deals-db";

/* ------------------------------- Lead status ------------------------------ */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "viewing_scheduled",
  "viewing_completed",
  "negotiating",
  "offer_made",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** i18n key suffix per status (crm.status.<key>) */
export const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  new: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  contacted: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600",
  viewing_scheduled: "border-violet-500/30 bg-violet-500/10 text-violet-600",
  viewing_completed: "border-purple-500/30 bg-purple-500/10 text-purple-600",
  negotiating: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  offer_made: "border-orange-500/30 bg-orange-500/10 text-orange-600",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  lost: "border-rose-500/30 bg-rose-500/10 text-rose-600",
};

export function normalizeLeadStatus(raw: string | null | undefined): LeadStatus {
  const v = (raw ?? "new").toLowerCase();
  if ((LEAD_STATUSES as readonly string[]).includes(v)) return v as LeadStatus;
  if (v === "new_inquiry" || v === "open") return "new";
  if (v === "closed" || v === "converted") return "won";
  return "new";
}

export const LOST_REASONS = [
  "price",
  "location",
  "changed_mind",
  "unavailable",
  "chose_other",
  "other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

/* --------------------------------- Types --------------------------------- */

export interface CrmLead {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  ownerId: string;
  ownerName: string;
  visitorId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  contactMethod: string;
  message: string | null;
  notes: string | null;
  status: LeadStatus;
  createdAt: string;
  lastActivityAt: string;
  dealId: string | null;
  dealReference: string | null;
  dealStage: DealStage | null;
  viewingId: string | null;
  viewingStatus: string | null;
  viewingAt: string | null;
  /** The message conversation this inquiry came from (when there is one). */
  conversationId: string | null;
}

export interface TimelineEntry {
  id: string;
  at: string;
  kind: string;
  label: string;
  detail?: string | null;
}

/* --------------------------------- Fetch --------------------------------- */

type Raw = Record<string, any>;

/** Leads visible to the signed-in owner/agent (or every lead for admins). */
export async function fetchCrmLeads(opts?: { all?: boolean }): Promise<CrmLead[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];

  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(300);
  if (!opts?.all) q = q.eq("owner_id", uid);
  const { data } = await q;
  const rows = ((data as Raw[]) ?? []);
  if (!rows.length) return [];

  const propIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))];
  const leadIds = rows.map((r) => r.id);
  const dealIds = [...new Set(rows.map((r) => r.deal_id).filter(Boolean))];

  const [propsRes, profRes, bookRes, dealRes, convRes] = await Promise.all([
    propIds.length
      ? supabase.from("properties").select("id,title,region,district,ward").in("id", propIds)
      : Promise.resolve({ data: [] as Raw[] } as never),
    ownerIds.length
      ? supabase.from("profiles").select("id,full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as Raw[] } as never),
    supabase
      .from("bookings")
      .select("id,lead_id,status,scheduled_at,property_id,buyer_id")
      .in("lead_id", leadIds),
    dealIds.length
      ? supabase.from("deals").select("id,reference,stage").in("id", dealIds)
      : Promise.resolve({ data: [] as Raw[] } as never),
    propIds.length
      ? supabase.from("conversations").select("id,property_id,buyer_id").in("property_id", propIds)
      : Promise.resolve({ data: [] as Raw[] } as never),
  ] as const);

  const props = new Map((((propsRes as Raw).data as Raw[]) ?? []).map((p) => [p.id, p]));
  const profs = new Map((((profRes as Raw).data as Raw[]) ?? []).map((p) => [p.id, p]));
  const deals = new Map((((dealRes as Raw).data as Raw[]) ?? []).map((d) => [d.id, d]));
  const bookings = new Map<string, Raw>();
  for (const b of (((bookRes as Raw).data as Raw[]) ?? [])) {
    if (b.lead_id) bookings.set(b.lead_id, b);
  }

  return rows.map((r) => {
    const p = props.get(r.property_id);
    const b = bookings.get(r.id);
    const d = r.deal_id ? deals.get(r.deal_id) : null;
    return {
      id: r.id,
      propertyId: r.property_id,
      propertyTitle: p?.title ?? "Property",
      propertyLocation: [p?.ward, p?.district, p?.region].filter(Boolean).join(", "),
      ownerId: r.owner_id,
      ownerName: profs.get(r.owner_id)?.full_name ?? "Owner / Agent",
      visitorId: r.visitor_id ?? null,
      name: r.visitor_name || "Visitor",
      phone: r.visitor_phone ?? null,
      email: r.visitor_email ?? null,
      contactMethod: r.contact_method ?? "message",
      message: r.message ?? null,
      notes: r.notes ?? null,
      status: normalizeLeadStatus(r.status),
      createdAt: r.created_at,
      lastActivityAt: r.last_activity_at ?? r.updated_at ?? r.created_at,
      dealId: r.deal_id ?? null,
      dealReference: d?.reference ?? null,
      dealStage: (d?.stage as DealStage) ?? null,
      viewingId: b?.id ?? null,
      viewingStatus: b?.status ?? null,
      viewingAt: b?.scheduled_at ?? null,
    };
  });
}

/** Chronological timeline built from the lead, its viewing and its deal. */
export async function fetchLeadTimeline(lead: CrmLead): Promise<TimelineEntry[]> {
  const entries: TimelineEntry[] = [
    { id: `${lead.id}-created`, at: lead.createdAt, kind: "lead_created", label: "lead_created", detail: lead.message },
  ];

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id,status,scheduled_at,created_at,updated_at")
    .eq("lead_id", lead.id);

  for (const b of ((bookings as Raw[]) ?? [])) {
    entries.push({
      id: `${b.id}-req`,
      at: b.created_at,
      kind: "viewing_requested",
      label: "viewing_requested",
      detail: b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : null,
    });
    if (b.status === "approved" || b.status === "completed") {
      entries.push({
        id: `${b.id}-appr`,
        at: b.updated_at ?? b.created_at,
        kind: "viewing_approved",
        label: "viewing_approved",
      });
    }
    if (b.status === "completed") {
      entries.push({
        id: `${b.id}-done`,
        at: b.updated_at ?? b.created_at,
        kind: "viewing_completed",
        label: "viewing_completed",
      });
    }
  }

  if (lead.dealId) {
    const { data: acts } = await supabase
      .from("deal_activities")
      .select("id,kind,label,detail,created_at")
      .eq("deal_id", lead.dealId);
    for (const a of ((acts as Raw[]) ?? [])) {
      entries.push({ id: a.id, at: a.created_at, kind: a.kind, label: a.label, detail: a.detail });
    }
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/* -------------------------------- Mutations -------------------------------- */

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const { error } = await supabase
    .from("leads")
    .update({ status, last_activity_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function saveLeadNotes(id: string, notes: string) {
  const { error } = await supabase
    .from("leads")
    .update({ notes, last_activity_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Creates a Deal from an existing Lead, reusing buyer, property, owner/agent
 * and viewing information. Returns the existing deal when one is already open.
 */
export async function createDealFromLead(
  lead: CrmLead,
): Promise<{ id: string; reference: string; existing: boolean }> {
  if (lead.dealId) {
    const { data } = await supabase.from("deals").select("id,reference").eq("id", lead.dealId).maybeSingle();
    if (data) return { id: (data as Raw).id, reference: (data as Raw).reference, existing: true };
  }

  // duplicate protection: reuse an active deal for the same buyer + property
  if (lead.visitorId) {
    const { data: open } = await supabase
      .from("deals")
      .select("id,reference,stage")
      .eq("property_id", lead.propertyId)
      .eq("buyer_id", lead.visitorId)
      .not("stage", "in", "(completed,cancelled)")
      .maybeSingle();
    if (open) {
      await supabase.from("deals").update({ lead_id: lead.id } as never).eq("id", (open as Raw).id);
      await supabase.from("leads").update({ deal_id: (open as Raw).id } as never).eq("id", lead.id);
      return { id: (open as Raw).id, reference: (open as Raw).reference, existing: true };
    }
  }

  const { data: prop } = await supabase
    .from("properties")
    .select("price,currency,owner_id")
    .eq("id", lead.propertyId)
    .maybeSingle();

  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id ?? null;
  const ownerId = (prop as Raw)?.owner_id ?? lead.ownerId;

  const reference = `DL-${Date.now().toString(36).toUpperCase()}`;
  const stage: DealStage =
    lead.viewingStatus === "completed"
      ? "viewing_completed"
      : lead.viewingStatus === "approved"
        ? "viewing_scheduled"
        : lead.status === "contacted"
          ? "contacted"
          : "new_inquiry";

  const { data, error } = await supabase
    .from("deals")
    .insert({
      reference,
      property_id: lead.propertyId,
      lead_id: lead.id,
      buyer_id: lead.visitorId,
      buyer_name: lead.name,
      buyer_phone: lead.phone,
      buyer_email: lead.email,
      owner_id: ownerId,
      agent_id: uid && uid !== ownerId ? uid : null,
      stage,
      value: (prop as Raw)?.price ?? null,
      currency: (prop as Raw)?.currency ?? "TZS",
    } as never)
    .select("id,reference")
    .single();
  if (error) throw error;

  await supabase.from("leads").update({ deal_id: (data as Raw).id } as never).eq("id", lead.id);
  await supabase.from("deal_activities").insert({
    deal_id: (data as Raw).id,
    kind: "lead_created",
    label: "Deal created from lead",
    detail: lead.propertyTitle,
    actor_id: uid,
  } as never);

  return { id: (data as Raw).id, reference: (data as Raw).reference, existing: false };
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
