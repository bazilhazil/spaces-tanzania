// Saved searches + property alerts — backed by public.saved_searches.
import { supabase } from "@/integrations/supabase/client";

export type AlertFrequency = "instant" | "daily" | "weekly" | "off";

/** Mirrors the /properties search params so a saved search can be replayed. */
export type SavedSearchFilters = {
  q?: string;
  type?: string;        // rent | sale
  category?: string;    // House, Apartment, ...
  city?: string;        // region
  district?: string;
  area?: string;        // ward
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  furnished?: boolean;
  verified?: boolean;
  amenities?: string;   // csv
};

export type SavedSearchRecord = {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  alertsEnabled: boolean;
  frequency: AlertFrequency;
  lastAlertAt: string | null;
  createdAt: string;
};

function mapRow(row: any): SavedSearchRecord {
  return {
    id: row.id,
    name: row.name,
    filters: (row.filters ?? {}) as SavedSearchFilters,
    alertsEnabled: row.alerts_enabled !== false,
    frequency: (row.frequency ?? "instant") as AlertFrequency,
    lastAlertAt: row.last_alert_at ?? null,
    createdAt: row.created_at,
  };
}

export async function listSavedSearches(): Promise<SavedSearchRecord[]> {
  const { data } = await supabase
    .from("saved_searches" as never)
    .select("*")
    .order("created_at", { ascending: false });
  return ((data ?? []) as any[]).map(mapRow);
}

export type SaveSearchResult =
  | { ok: true; search: SavedSearchRecord }
  | { ok: false; code: "duplicate" | "auth" | "error"; message: string };

export async function createSavedSearch(input: {
  name: string;
  filters: SavedSearchFilters;
  alertsEnabled?: boolean;
  frequency?: AlertFrequency;
}): Promise<SaveSearchResult> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return { ok: false, code: "auth", message: "Sign in to save this search." };

  const { data, error } = await supabase
    .from("saved_searches" as never)
    .insert({
      user_id: userId,
      name: input.name.trim(),
      filters: cleanFilters(input.filters) as never,
      alerts_enabled: input.alertsEnabled ?? true,
      frequency: input.frequency ?? "instant",
    } as never)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "duplicate", message: "You already have a saved search with that name." };
    }
    return { ok: false, code: "error", message: error.message };
  }
  return { ok: true, search: mapRow(data) };
}

export async function updateSavedSearch(
  id: string,
  patch: Partial<{ name: string; filters: SavedSearchFilters; alertsEnabled: boolean; frequency: AlertFrequency }>,
): Promise<boolean> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.filters !== undefined) row.filters = cleanFilters(patch.filters);
  if (patch.alertsEnabled !== undefined) row.alerts_enabled = patch.alertsEnabled;
  if (patch.frequency !== undefined) row.frequency = patch.frequency;
  const { error } = await supabase.from("saved_searches" as never).update(row as never).eq("id", id);
  return !error;
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const { error } = await supabase.from("saved_searches" as never).delete().eq("id", id);
  return !error;
}

/** Drops empty values so duplicate detection & SQL matching stay predictable. */
export function cleanFilters(f: SavedSearchFilters): SavedSearchFilters {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    out[k] = v;
  }
  return out as SavedSearchFilters;
}

/** Count live listings currently matching a saved search (real data). */
export async function countMatches(f: SavedSearchFilters): Promise<number> {
  let q = supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "live");
  if (f.type) q = q.eq("listing_type", f.type as never);
  if (f.category) q = q.eq("property_type", categoryToType(f.category) as never);
  if (f.city) q = q.eq("region", f.city);
  if (f.district) q = q.eq("district", f.district);
  if (f.area) q = q.eq("ward", f.area);
  if (f.minPrice) q = q.gte("price", f.minPrice);
  if (f.maxPrice) q = q.lte("price", f.maxPrice);
  if (f.beds) q = q.gte("bedrooms", f.beds);
  if (f.baths) q = q.gte("bathrooms", f.baths);
  if (f.verified) q = q.eq("verified", true);
  const amenities = [
    ...(f.amenities ? f.amenities.split(",").filter(Boolean) : []),
    ...(f.furnished ? ["furnished"] : []),
  ];
  if (amenities.length) q = q.contains("amenities", amenities);
  const { count } = await q;
  return count ?? 0;
}

export function categoryToType(category: string): string {
  const map: Record<string, string> = {
    House: "house",
    Apartment: "apartment",
    Office: "office",
    Shop: "shop",
    Warehouse: "warehouse",
    Land: "land",
    "Commercial Building": "commercial",
  };
  return map[category] ?? category.toLowerCase();
}

/** Human-readable summary, e.g. "2+ beds · Apartment · Mbezi · under TZS 1,500,000". */
export function describeFilters(f: SavedSearchFilters): string {
  const parts: string[] = [];
  if (f.type) parts.push(f.type === "rent" ? "For rent" : "For sale");
  if (f.beds) parts.push(`${f.beds}+ beds`);
  if (f.baths) parts.push(`${f.baths}+ baths`);
  if (f.category) parts.push(f.category);
  if (f.area) parts.push(f.area);
  if (f.district) parts.push(f.district);
  if (f.city) parts.push(f.city);
  if (f.minPrice && f.maxPrice) parts.push(`TZS ${f.minPrice.toLocaleString()} – ${f.maxPrice.toLocaleString()}`);
  else if (f.maxPrice) parts.push(`under TZS ${f.maxPrice.toLocaleString()}`);
  else if (f.minPrice) parts.push(`over TZS ${f.minPrice.toLocaleString()}`);
  if (f.furnished) parts.push("Furnished");
  if (f.verified) parts.push("Verified only");
  if (f.amenities) parts.push(...f.amenities.split(",").filter(Boolean));
  if (f.q) parts.push(`"${f.q}"`);
  return parts.length ? parts.join(" · ") : "All spaces";
}
