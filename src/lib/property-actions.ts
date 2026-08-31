import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-media";

/**
 * Delete a property and its media (DB rows + storage objects).
 * Storage cleanup runs BEFORE the DB delete so cascade-removed media rows
 * don't leave the file paths unreachable to us.
 */
export async function deletePropertyWithStorage(propertyId: string): Promise<void> {
  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path")
    .eq("property_id", propertyId);
  const paths = (media ?? []).map((m: { storage_path: string }) => m.storage_path).filter(Boolean);
  if (paths.length) {
    // Best-effort — RLS may block some paths; continue with DB delete regardless.
    await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw error;
}

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
