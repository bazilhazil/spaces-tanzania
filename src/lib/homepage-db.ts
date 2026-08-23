import { supabase } from "@/integrations/supabase/client";

/**
 * Homepage data sources. Everything here reads the real database — no
 * hardcoded listings, agents, testimonials or statistics.
 */

export interface RegionSummary {
  name: string;
  listings: number;
}

/** Real regions derived from publicly visible (live) listings. */
export async function fetchRegionSummaries(): Promise<RegionSummary[]> {
  const { data } = await supabase.from("public_properties").select("region").limit(5000);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { region: string | null }[]) {
    if (!row.region) continue;
    counts.set(row.region, (counts.get(row.region) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, listings]) => ({ name, listings }))
    .sort((a, b) => b.listings - a.listings);
}

export interface PublicAgent {
  id: string;
  name: string;
  agency: string | null;
  location: string | null;
  avatar: string | null;
  verified: boolean;
  listings: number;
}

/** Real verified agents with the number of live listings they own. */
export async function fetchVerifiedAgents(limit = 8): Promise<PublicAgent[]> {
  const { data } = await supabase
    .from("public_profiles")
    .select("id,full_name,agency_name,location,avatar_url,verified_agent")
    .eq("verified_agent", true)
    .limit(limit);
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const { data: props } = await supabase
    .from("public_properties")
    .select("owner_id")
    .in(
      "owner_id",
      rows.map((r) => r.id),
    );
  const counts = new Map<string, number>();
  for (const p of (props ?? []) as { owner_id: string }[]) {
    counts.set(p.owner_id, (counts.get(p.owner_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.full_name || "SPACES agent",
    agency: r.agency_name,
    location: r.location,
    avatar: r.avatar_url,
    verified: true,
    listings: counts.get(r.id) ?? 0,
  }));
}

export interface PublicTestimonial {
  id: string;
  quote: string;
  name: string;
  rating: number;
}

/** Real published reviews used as homepage testimonials. */
export async function fetchPublishedTestimonials(limit = 3): Promise<PublicTestimonial[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id,comment,rating,reviewer_id,published_at")
    .eq("status", "published")
    .not("comment", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id,full_name")
    .in(
      "id",
      rows.map((r) => r.reviewer_id).filter(Boolean),
    );
  const names = new Map((((profiles ?? []) as any[]) || []).map((p) => [p.id, p.full_name]));

  return rows
    .filter((r) => (r.comment ?? "").trim().length > 0)
    .map((r) => ({
      id: r.id,
      quote: r.comment as string,
      name: names.get(r.reviewer_id) || "SPACES member",
      rating: Number(r.rating ?? 5),
    }));
}
