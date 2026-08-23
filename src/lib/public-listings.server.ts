/**
 * Server-side reads of PUBLIC listing data only.
 *
 * Everything here goes through the `public_properties` view (owner contact
 * details and other PII are excluded by design) using the publishable key,
 * so nothing private can leak into SSR HTML, the sitemap or share previews.
 */
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers });
      },
    },
  });
}

const TYPE_LABEL: Record<string, string> = {
  house: "House",
  apartment: "Apartment",
  office: "Office",
  shop: "Shop",
  warehouse: "Warehouse",
  land: "Land",
  commercial: "Commercial Building",
};

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  listingType: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size: number | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  verified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

function map(row: Record<string, unknown>): PublicListing {
  const r = row as any;
  return {
    id: String(r.id),
    title: r.title ?? "Space",
    description: r.description ?? "",
    category: TYPE_LABEL[r.property_type] ?? "Space",
    listingType: r.listing_type ?? "rent",
    price: Number(r.price ?? 0),
    currency: r.currency ?? "TZS",
    bedrooms: r.bedrooms ?? null,
    bathrooms: r.bathrooms ?? null,
    size: r.area_sqm ?? null,
    ward: r.ward ?? null,
    district: r.district ?? null,
    city: r.region ?? null,
    verified: r.verified === true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? r.created_at ?? null,
  };
}

export async function getPublicListing(id: string): Promise<PublicListing | null> {
  const { data } = await publicClient().from("public_properties").select("*").eq("id", id).maybeSingle();
  return data ? map(data as Record<string, unknown>) : null;
}

export async function listPublicListings(limit = 1000): Promise<PublicListing[]> {
  const { data } = await publicClient()
    .from("public_properties")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map(map);
}

/** Cover image storage path for a listing (used by the share-preview route). */
export async function getCoverPath(id: string): Promise<string | null> {
  const { data } = await publicClient()
    .from("property_media")
    .select("storage_path,is_cover,position")
    .eq("property_id", id)
    .order("position", { ascending: true })
    .limit(20);
  const rows = (data ?? []) as any[];
  if (!rows.length) return null;
  rows.sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0));
  return rows[0].storage_path ?? null;
}
