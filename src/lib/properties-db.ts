import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import type { Property, PropertyCategory, ListingType, Agent } from "@/lib/mock-data";

const TYPE_TO_CATEGORY: Record<string, PropertyCategory> = {
  house: "House",
  apartment: "Apartment",
  office: "Office",
  shop: "Shop",
  warehouse: "Warehouse",
  land: "Land",
  commercial: "Commercial Building",
};

type Row = any;

async function mediaForProperties(ids: string[]): Promise<Record<string, string[]>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("property_media")
    .select("property_id,storage_path,is_cover,position")
    .in("property_id", ids)
    .order("position", { ascending: true });
  const grouped: Record<string, { path: string; cover: boolean; pos: number }[]> = {};
  for (const m of (data ?? []) as any[]) {
    (grouped[m.property_id] ||= []).push({ path: m.storage_path, cover: !!m.is_cover, pos: m.position ?? 0 });
  }
  const out: Record<string, string[]> = {};
  await Promise.all(
    Object.entries(grouped).map(async ([pid, items]) => {
      items.sort((a, b) => (b.cover ? 1 : 0) - (a.cover ? 1 : 0) || a.pos - b.pos);
      const urls = await Promise.all(items.map((it) => signedUrl(it.path)));
      out[pid] = urls.filter((u): u is string => !!u);
    }),
  );
  return out;
}

function mapRow(row: Row, images: string[]): Property {
  const created = new Date(row.created_at);
  const daysOld = (Date.now() - created.getTime()) / 86400000;
  return {
    id: row.id,
    slug: row.id,
    title: row.title ?? "Untitled",
    description: row.description ?? "",
    category: TYPE_TO_CATEGORY[row.property_type] ?? "House",
    listingType: (row.listing_type as ListingType) ?? "sale",
    price: Number(row.price ?? 0),
    currency: (row.currency as "TZS" | "USD") ?? "TZS",
    city: row.region ?? "Tanzania",
    district: row.district ?? "",
    ward: row.ward ?? "",
    street: row.street ?? row.address ?? "",
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    parking: row.parking ?? 0,
    size: Number(row.area_sqm ?? 0),
    yearBuilt: row.year_built ?? 0,
    furnished: Array.isArray(row.amenities) && row.amenities.includes("furnished"),
    amenities: row.amenities ?? [],
    images: images.length ? images : ["https://placehold.co/1200x900/e2e8f0/64748b?text=No+Image"],
    // Only an approved property verification sets `verified` on the row.
    verified: row.verified === true,
    featured: row.featured === true,
    premium: false,
    new: daysOld < 14,
    views: row.view_count ?? 0,
    agentId: row.owner_id ?? "",
    createdAt: row.created_at,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    landmark: row.landmark ?? null,
  };
}

// For anonymous visitors we query `public_properties` (a view that omits owner
// contact details). Authenticated users hit the base `properties` table so
// they still get contact_name/contact_phone/contact_whatsapp on the details page.


export async function fetchLiveProperties(limit = 60): Promise<Property[]> {
  const { data: session } = await supabase.auth.getSession();
  const result = session.session
    ? await supabase.from("properties").select("*").eq("status", "live").order("created_at", { ascending: false }).limit(limit)
    : await supabase.from("public_properties").select("*").order("created_at", { ascending: false }).limit(limit);
  if (result.error || !result.data) return [];
  const rows = result.data as Row[];
  const media = await mediaForProperties(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, media[r.id] ?? []));
}

/**
 * Owner contact details live in the protected `property_contacts` table and are
 * only reachable through a controlled RPC for signed-in users.
 */
export async function fetchPropertyContact(propertyId: string): Promise<{
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
} | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  const { data } = await supabase.rpc("get_property_contact", { _property_id: propertyId } as never);
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  return row ?? null;
}

export async function fetchPropertyById(id: string): Promise<{ property: Property; row: Row } | null> {
  const { data: session } = await supabase.auth.getSession();
  const result = session.session
    ? await supabase.from("properties").select("*").eq("id", id).maybeSingle()
    : await supabase.from("public_properties").select("*").eq("id", id).maybeSingle();
  if (!result.data) return null;
  const row = result.data as Row;
  if (session.session) {
    const contact = await fetchPropertyContact(id);
    if (contact) Object.assign(row, contact);
  }
  const media = await mediaForProperties([row.id]);
  return { property: mapRow(row, media[row.id] ?? []), row };
}

export function contactAgentFromRow(row: Row): Agent {
  const name = row.contact_name || "Listing owner";
  const phone = row.contact_phone || "";
  const whatsapp = (row.contact_whatsapp || row.contact_phone || "").replace(/[^\d]/g, "");
  return {
    id: row.owner_id ?? "owner",
    name,
    agency: "SPACES",
    city: row.region ?? "Tanzania",
    phone,
    email: "",
    whatsapp,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    listings: 1,
    rating: 4.8,
    verified: false,
  };
}

/**
 * Fetch a specific set of properties by their real database IDs.
 * Used by favorites / compare / recently-viewed so those surfaces never
 * depend on hardcoded example listings.
 */
export async function fetchPropertiesByIds(ids: string[]): Promise<Property[]> {
  const clean = Array.from(new Set(ids.filter(Boolean)));
  if (!clean.length) return [];
  const { data: session } = await supabase.auth.getSession();
  const result = session.session
    ? await supabase.from("properties").select("*").in("id", clean)
    : await supabase.from("public_properties").select("*").in("id", clean);
  if (result.error || !result.data) return [];
  const rows = result.data as Row[];
  const media = await mediaForProperties(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, media[r.id] ?? []));
}

/** Real, database-derived platform statistics for public marketing surfaces. */
export async function fetchPlatformStats(): Promise<{
  liveListings: number;
  verifiedListings: number;
  cities: number;
  partners: number;
}> {
  const { data } = await supabase
    .from("public_properties")
    .select("id,region,verified,owner_id")
    .limit(5000);
  const rows = (data ?? []) as Row[];
  return {
    liveListings: rows.length,
    verifiedListings: rows.filter((r) => r.verified === true).length,
    cities: new Set(rows.map((r) => r.region).filter(Boolean)).size,
    partners: new Set(rows.map((r) => r.owner_id).filter(Boolean)).size,
  };
}
