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
};

export async function fetchPropertyMetrics(propertyId: string): Promise<PropertyMetrics> {
  const [views, favorites, bookings, convos] = await Promise.all([
    supabase.from("property_views").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
    supabase.from("favorites").select("user_id", { count: "exact", head: true }).eq("property_id", propertyId),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
    supabase.from("conversations").select("id").eq("property_id", propertyId),
  ]);
  let messageCount = 0;
  const convIds = (convos.data ?? []).map((c: { id: string }) => c.id);
  if (convIds.length) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds);
    messageCount = count ?? 0;
  }
  return {
    views: views.count ?? 0,
    favorites: favorites.count ?? 0,
    messages: messageCount,
    bookings: bookings.count ?? 0,
  };
}
