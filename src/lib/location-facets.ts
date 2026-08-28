/**
 * Location facets derived from REAL listing data.
 *
 * The public search filters (Region -> City/District -> Area) are built from
 * these facets so users never see an option that has no active listing behind
 * it. Nothing here is hardcoded: it all comes from `public_properties`, the
 * view that only exposes live, available listings.
 */
import { supabase } from "@/integrations/supabase/client";
import { locationSlug } from "@/lib/seo";

export type WardFacet = { name: string; count: number };
export type DistrictFacet = { name: string; count: number; wards: WardFacet[] };
export type RegionFacet = { name: string; count: number; districts: DistrictFacet[] };

export type LocationHitFacet = {
  kind: "region" | "district" | "ward";
  label: string;
  region: string;
  district?: string;
  ward?: string;
  count: number;
  slug: string;
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function fetchLocationFacets(): Promise<RegionFacet[]> {
  const { data, error } = await supabase
    .from("public_properties")
    .select("region,district,ward")
    .limit(5000);
  if (error || !data) return [];

  const regions = new Map<string, RegionFacet>();
  for (const row of data as { region?: string; district?: string; ward?: string }[]) {
    const region = clean(row.region);
    if (!region) continue;
    let r = regions.get(region);
    if (!r) regions.set(region, (r = { name: region, count: 0, districts: [] }));
    r.count += 1;

    const district = clean(row.district);
    if (!district) continue;
    let d = r.districts.find((x) => x.name === district);
    if (!d) r.districts.push((d = { name: district, count: 0, wards: [] }));
    d.count += 1;

    const ward = clean(row.ward);
    if (!ward) continue;
    const w = d.wards.find((x) => x.name === ward);
    if (w) w.count += 1;
    else d.wards.push({ name: ward, count: 1 });
  }

  const byCount = <T extends { count: number; name: string }>(a: T, b: T) =>
    b.count - a.count || a.name.localeCompare(b.name);

  const out = [...regions.values()].sort(byCount);
  for (const r of out) {
    r.districts.sort(byCount);
    for (const d of r.districts) d.wards.sort(byCount);
  }
  return out;
}

/** Flatten facets into a searchable list of real places (most listings first). */
export function facetHits(facets: RegionFacet[]): LocationHitFacet[] {
  const hits: LocationHitFacet[] = [];
  for (const r of facets) {
    hits.push({ kind: "region", label: r.name, region: r.name, count: r.count, slug: locationSlug(r.name) });
    for (const d of r.districts) {
      hits.push({
        kind: "district",
        label: `${d.name}, ${r.name}`,
        region: r.name,
        district: d.name,
        count: d.count,
        slug: locationSlug(d.name),
      });
      for (const w of d.wards) {
        hits.push({
          kind: "ward",
          label: `${w.name}, ${d.name}`,
          region: r.name,
          district: d.name,
          ward: w.name,
          count: w.count,
          slug: locationSlug(w.name),
        });
      }
    }
  }
  return hits;
}

/** Natural place lookup ("masaki", "mbezi", "zanzibar") over real listing data. */
export function searchFacets(facets: RegionFacet[], q: string, limit = 6): LocationHitFacet[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const starts: LocationHitFacet[] = [];
  const contains: LocationHitFacet[] = [];
  for (const h of facetHits(facets)) {
    const name = (h.ward ?? h.district ?? h.region).toLowerCase();
    if (name.startsWith(query)) starts.push(h);
    else if (h.label.toLowerCase().includes(query)) contains.push(h);
  }
  return [...starts, ...contains].slice(0, limit);
}
