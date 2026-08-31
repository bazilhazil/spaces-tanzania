import { supabase } from "@/integrations/supabase/client";

export const DEAL_STAGES = [
  "new_inquiry",
  "contacted",
  "viewing_scheduled",
  "viewing_completed",
  "negotiation",
  "offer_made",
  "offer_accepted",
  "agreement_signed",
  "completed",
  "cancelled",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

/** Simple, universal wording shown to users (no CRM jargon). */
export const STAGE_LABEL: Record<DealStage, string> = {
  new_inquiry: "New",
  contacted: "Contacted",
  viewing_scheduled: "Viewing",
  viewing_completed: "Viewed",
  negotiation: "Negotiating",
  offer_made: "Offer made",
  offer_accepted: "Offer accepted",
  agreement_signed: "Agreement signed",
  completed: "Completed",
  cancelled: "Closed",
};

/** Columns users actually see in the pipeline. */
export const PIPELINE_STAGES = [
  "new_inquiry",
  "contacted",
  "viewing_scheduled",
  "viewing_completed",
  "negotiation",
  "completed",
  "cancelled",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Maps every internal stage onto one of the visible pipeline columns. */
export function pipelineColumnFor(stage: DealStage): PipelineStage {
  if (stage === "offer_made" || stage === "offer_accepted" || stage === "agreement_signed") {
    return "negotiation";
  }
  return stage as PipelineStage;
}

export const STAGE_TONE: Record<DealStage, string> = {
  new_inquiry: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  contacted: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20",
  viewing_scheduled: "bg-violet-500/10 text-violet-700 ring-violet-500/20",
  viewing_completed: "bg-purple-500/10 text-purple-700 ring-purple-500/20",
  negotiation: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  offer_made: "bg-orange-500/10 text-orange-700 ring-orange-500/20",
  offer_accepted: "bg-lime-500/10 text-lime-700 ring-lime-500/20",
  agreement_signed: "bg-teal-500/10 text-teal-700 ring-teal-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

export type DealPriority = "low" | "medium" | "high" | "urgent";
export type DealHealth = "healthy" | "waiting" | "at_risk" | "closed";

export const HEALTH_DOT: Record<DealHealth, string> = {
  healthy: "bg-emerald-500",
  waiting: "bg-amber-500",
  at_risk: "bg-rose-500",
  closed: "bg-neutral-500",
};

export const HEALTH_LABEL: Record<DealHealth, string> = {
  healthy: "Healthy",
  waiting: "Waiting",
  at_risk: "At Risk",
  closed: "Closed",
};

export type DealDocumentKind =
  | "offer_letter"
  | "lease_agreement"
  | "sale_agreement"
  | "inspection_report"
  | "ownership_document"
  | "other";

export const DOC_LABEL: Record<DealDocumentKind, string> = {
  offer_letter: "Offer Letter",
  lease_agreement: "Lease Agreement",
  sale_agreement: "Sale Agreement",
  inspection_report: "Inspection Report",
  ownership_document: "Ownership Documents",
  other: "Other Attachment",
};

export type Deal = {
  id: string;
  reference: string;
  property_id: string | null;
  lead_id?: string | null;

  conversation_id: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  owner_id: string | null;
  agent_id: string | null;
  stage: DealStage;
  priority: DealPriority;
  health: DealHealth;
  value: number | null;
  currency: string;
  expected_close_at: string | null;
  next_follow_up_at: string | null;
  last_activity_at: string;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string | null;
  property_region?: string | null;
  property_district?: string | null;
  owner_name?: string | null;
  agent_name?: string | null;
};

export type DealActivity = {
  id: string;
  deal_id: string;
  kind: string;
  label: string;
  detail: string | null;
  actor_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type DealDocument = {
  id: string;
  deal_id: string;
  kind: DealDocumentKind;
  name: string;
  storage_path: string;
  size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

const BUCKET = "deal-documents";

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Deal[];
  if (!rows.length) return [];

  const propIds = Array.from(new Set(rows.map((r) => r.property_id).filter((x): x is string => !!x)));
  const userIds = Array.from(new Set(
    rows.flatMap((r) => [r.owner_id, r.agent_id]).filter((x): x is string => !!x),
  ));

  const [propsRes, profilesRes] = await Promise.all([
    propIds.length
      ? supabase.from("properties").select("id,title,region,district").in("id", propIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? supabase.from("public_profiles").select("id,full_name").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const props = Object.fromEntries(((propsRes.data ?? []) as any[]).map((p) => [p.id, p]));
  const profs = Object.fromEntries(((profilesRes.data ?? []) as any[]).map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    property_title: r.property_id ? props[r.property_id]?.title ?? null : null,
    property_region: r.property_id ? props[r.property_id]?.region ?? null : null,
    property_district: r.property_id ? props[r.property_id]?.district ?? null : null,
    owner_name: r.owner_id ? profs[r.owner_id]?.full_name ?? null : null,
    agent_name: r.agent_id ? profs[r.agent_id]?.full_name ?? null : null,
  }));
}

export async function moveDealStage(id: string, stage: DealStage) {
  const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
  if (error) throw error;
}

export async function updateDeal(id: string, patch: Partial<Deal>) {
  const { error } = await supabase.from("deals").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function fetchActivities(dealId: string): Promise<DealActivity[]> {
  const { data, error } = await supabase
    .from("deal_activities")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DealActivity[];
}

export async function addNote(dealId: string, note: string, actorId?: string | null) {
  const { error } = await supabase.from("deal_activities").insert({
    deal_id: dealId,
    kind: "note_added",
    label: "Note added",
    detail: note,
    actor_id: actorId ?? null,
  } as never);
  if (error) throw error;
  await supabase.from("deals").update({ last_activity_at: new Date().toISOString() }).eq("id", dealId);
}

export async function scheduleFollowUp(dealId: string, whenIso: string, actorId?: string | null) {
  const { error } = await supabase.from("deals").update({ next_follow_up_at: whenIso }).eq("id", dealId);
  if (error) throw error;
  await supabase.from("deal_activities").insert({
    deal_id: dealId,
    kind: "follow_up_scheduled",
    label: "Follow-up scheduled",
    detail: new Date(whenIso).toLocaleString(),
    actor_id: actorId ?? null,
  } as never);
}

export async function fetchDocuments(dealId: string): Promise<DealDocument[]> {
  const { data, error } = await supabase
    .from("deal_documents")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DealDocument[];
}

export async function uploadDocument(
  dealId: string,
  file: File,
  kind: DealDocumentKind,
  actorId?: string | null,
) {
  // uploaded_by must match the signed-in user (RLS blocks uploader spoofing).
  const { data: auth } = await supabase.auth.getUser();
  const uploaderId = auth.user?.id ?? actorId ?? null;
  if (!uploaderId) throw new Error("You need to be signed in to upload documents.");
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${dealId}/${Date.now()}_${safeName}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) throw up.error;
  const { error } = await supabase.from("deal_documents").insert({
    deal_id: dealId,
    kind,
    name: file.name,
    storage_path: path,
    size: file.size,
    mime_type: file.type || null,
    uploaded_by: uploaderId,
  } as never);
  if (error) throw error;
  await supabase.from("deal_activities").insert({
    deal_id: dealId,
    kind: "document_uploaded",
    label: `${DOC_LABEL[kind]} uploaded`,
    detail: file.name,
    actor_id: uploaderId,
  } as never);
  await supabase.from("deals").update({ last_activity_at: new Date().toISOString() }).eq("id", dealId);
}

export async function documentSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function deleteDocument(id: string, path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from("deal_documents").delete().eq("id", id);
  if (error) throw error;
}

export async function cancelDeal(id: string, reason: string) {
  const { error } = await supabase
    .from("deals")
    .update({ stage: "cancelled", cancel_reason: reason } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function completeDeal(id: string) {
  const { error } = await supabase.from("deals").update({ stage: "completed" } as never).eq("id", id);
  if (error) throw error;
}

export async function assignAgent(id: string, agentId: string | null) {
  const { error } = await supabase.from("deals").update({ agent_id: agentId } as never).eq("id", id);
  if (error) throw error;
  await supabase.from("deal_activities").insert({
    deal_id: id,
    kind: "agent_assigned",
    label: agentId ? "Agent assigned" : "Agent unassigned",
  } as never);
}

export function computeStats(deals: Deal[]) {
  const active = deals.filter((d) => d.stage !== "completed" && d.stage !== "cancelled");
  const completed = deals.filter((d) => d.stage === "completed");
  const cancelled = deals.filter((d) => d.stage === "cancelled");
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const closingWeek = active.filter(
    (d) => d.expected_close_at && new Date(d.expected_close_at).getTime() - now <= weekMs,
  ).length;
  const totalValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const closedWithDuration = completed.filter((d) => d.updated_at && d.created_at);
  const avgDays =
    closedWithDuration.length === 0
      ? 0
      : Math.round(
          closedWithDuration.reduce(
            (s, d) => s + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000,
            0,
          ) / closedWithDuration.length,
        );
  return {
    active: active.length,
    closingWeek,
    completed: completed.length,
    cancelled: cancelled.length,
    avgDays,
    totalValue,
  };
}

export function computeHealth(d: Deal): DealHealth {
  if (d.stage === "completed" || d.stage === "cancelled") return "closed";
  const now = Date.now();
  const last = new Date(d.last_activity_at).getTime();
  if (d.next_follow_up_at && new Date(d.next_follow_up_at).getTime() < now - 86400000) return "at_risk";
  if (now - last > 7 * 86400000) return "at_risk";
  if (now - last > 3 * 86400000) return "waiting";
  return "healthy";
}
