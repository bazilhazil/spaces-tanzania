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
    furnished: false,
    amenities: row.amenities ?? [],
    images: images.length ? images : ["https://placehold.co/1200x900/e2e8f0/64748b?text=No+Image"],
    verified: false,
    featured: false,
    premium: false,
    new: daysOld < 14,
    views: row.view_count ?? 0,
    agentId: row.owner_id ?? "",
    createdAt: row.created_at,
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

export async function fetchPropertyById(id: string): Promise<{ property: Property; row: Row } | null> {
  const { data: session } = await supabase.auth.getSession();
  const result = session.session
    ? await supabase.from("properties").select("*").eq("id", id).maybeSingle()
    : await supabase.from("public_properties").select("*").eq("id", id).maybeSingle();
  if (!result.data) return null;
  const row = result.data as Row;
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
