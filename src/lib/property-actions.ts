import { supabase } from "@/integrations/supabase/client";

export type ArchiveResult = {
  retainedDeals: number;
  retainedBillingRecords: number;
};

/**
 * Safe removal of a Space.
 *
 * Nothing is erased: the listing is archived (removed from active listings and
 * search) while inquiries, viewings, completed deals, reviews and billing
 * records are retained. The database performs this in a single transaction, so
 * a failure never leaves the listing half-deleted.
 */
export async function archiveProperty(propertyId: string, reason?: string): Promise<ArchiveResult> {
  const { data, error } = await supabase.rpc("archive_property" as never, {
    _property_id: propertyId,
    _reason: reason ?? null,
  } as never);
  if (error) throw error;
  const r = (data ?? {}) as { retained_deals?: number; retained_billing_records?: number };
  return {
    retainedDeals: Number(r.retained_deals ?? 0),
    retainedBillingRecords: Number(r.retained_billing_records ?? 0),
  };
}

/** Bring an archived Space back as a paused listing the owner can review before publishing. */
export async function restoreProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.rpc("restore_property" as never, { _property_id: propertyId } as never);
  if (error) throw error;
}

/** @deprecated Spaces are archived, never hard-deleted. Kept so existing callers stay safe. */
export const deletePropertyWithStorage = archiveProperty;


export async function updatePropertyStatus(
  propertyId: string,
  status: "draft" | "pending" | "live" | "paused" | "sold" | "rented" | "archived",
): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .update({ status: status as never })
    .eq("id", propertyId);
  if (error) throw error;
}

export type PropertyMetrics = {
  views: number;
  favorites: number;
  messages: number;
  bookings: number;
  leads: number;
  deals: number;
  activeDeal: boolean;
};

const EMPTY_METRICS = (): PropertyMetrics => ({
  views: 0, favorites: 0, messages: 0, bookings: 0, leads: 0, deals: 0, activeDeal: false,
});

/** Leads / viewing requests / deals per view — the listing's funnel conversion. */
export function conversionRate(m: PropertyMetrics): number {
  if (!m.views) return 0;
  return Math.round(((m.leads + m.bookings) / m.views) * 100);
}

export async function fetchPropertyMetrics(propertyId: string): Promise<PropertyMetrics> {
  const m = await fetchPropertyMetricsBatch([propertyId]);
  return m[propertyId] ?? EMPTY_METRICS();
}

export async function fetchPropertyMetricsBatch(
  propertyIds: string[],
): Promise<Record<string, PropertyMetrics>> {
  const out: Record<string, PropertyMetrics> = {};
  for (const id of propertyIds) out[id] = EMPTY_METRICS();
  if (!propertyIds.length) return out;

  // These tables are readable only by signed-in owners/agents; skip entirely for
  // signed-out visitors so we don't fire permission-denied queries.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return out;

  const [viewsRes, favsRes, booksRes, convosRes, leadsRes, dealsRes] = await Promise.all([
    supabase.from("property_views").select("property_id").in("property_id", propertyIds),
    supabase.from("favorites").select("property_id").in("property_id", propertyIds),
    supabase.from("bookings").select("property_id").in("property_id", propertyIds),
    supabase.from("conversations").select("id,property_id").in("property_id", propertyIds),
    supabase.from("leads").select("property_id").in("property_id", propertyIds),
    supabase.from("deals").select("property_id,stage").in("property_id", propertyIds),
  ]);
  for (const r of (viewsRes.data ?? []) as { property_id: string }[]) if (out[r.property_id]) out[r.property_id].views++;
  for (const r of (favsRes.data ?? []) as { property_id: string }[]) if (out[r.property_id]) out[r.property_id].favorites++;
  for (const r of (booksRes.data ?? []) as { property_id: string }[]) if (out[r.property_id]) out[r.property_id].bookings++;
  for (const r of (leadsRes.data ?? []) as { property_id: string }[]) if (out[r.property_id]) out[r.property_id].leads++;
  for (const r of (dealsRes.data ?? []) as { property_id: string | null; stage: string }[]) {
    if (!r.property_id || !out[r.property_id]) continue;
    out[r.property_id].deals++;
    if (r.stage !== "completed" && r.stage !== "cancelled") out[r.property_id].activeDeal = true;
  }

  const convos = (convosRes.data ?? []) as { id: string; property_id: string }[];
  if (convos.length) {
    const convoIds = convos.map((c) => c.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds);
    const convToProp: Record<string, string> = {};
    for (const c of convos) convToProp[c.id] = c.property_id;
    for (const m of (msgs ?? []) as { conversation_id: string }[]) {
      const pid = convToProp[m.conversation_id];
      if (pid && out[pid]) out[pid].messages++;
    }
  }
  return out;
}


/** Duplicate a property row (as draft) and copy its media entries. */
export async function duplicateProperty(propertyId: string): Promise<string> {
  const { data: src, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!src) throw new Error("Property not found");

  const s = src as Record<string, unknown>;
  const { id: _id, created_at: _c, updated_at: _u, view_count: _v, ...rest } = s;
  void _id; void _c; void _u; void _v;
  const insertRow = { ...rest, title: `${s.title as string} (Copy)`, status: "draft" };
  const { data: created, error: insErr } = await supabase
    .from("properties")
    .insert(insertRow as never)
    .select("id")
    .single();
  if (insErr) throw insErr;

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path,media_type,is_cover,position")
    .eq("property_id", propertyId)
    .order("position");
  if (media && media.length) {
    const rows = media.map((m: Record<string, unknown>) => ({ ...m, property_id: created.id }));
    await supabase.from("property_media").insert(rows as never);
  }
  return created.id as string;
}
