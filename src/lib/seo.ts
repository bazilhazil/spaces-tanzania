/**
 * SEO helpers for public property URLs.
 *
 * Public property URLs look like:
 *   /properties/3-bedroom-house-for-rent-mbezi-beach-<uuid>
 * The trailing UUID is the source of truth, so plain `/properties/<uuid>`
 * links created before this change keep working.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const SITE_URL = "https://spacestz.com";

export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/^-|-$/g, "");
}

export type SeoPropertyLike = {
  id: string;
  title?: string | null;
  category?: string | null;
  listingType?: string | null;
  bedrooms?: number | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
};

/** Build a keyword-rich, human readable slug that still resolves to the id. */
export function propertySlug(p: SeoPropertyLike): string {
  const bed = p.bedrooms ? `${p.bedrooms} bedroom` : "";
  const type = p.category || "space";
  const action = p.listingType === "sale" ? "for sale" : p.listingType === "lease" ? "for lease" : "for rent";
  const place = [p.ward, p.district, p.city].filter(Boolean)[0] ?? "";
  const words = [bed, type, action, "in", place].filter(Boolean).join(" ");
  const text = slugifyText(words || p.title || "space");
  return text ? `${text}-${p.id}` : p.id;
}

/** Extract the property id from either a legacy id URL or an SEO slug. */
export function idFromSlug(slug: string): string {
  const m = slug.match(UUID_RE);
  return m ? m[0] : slug;
}

export function locationSlug(name: string): string {
  return slugifyText(name);
}

export function canonicalPropertyUrl(slug: string): string {
  return `${SITE_URL}/properties/${slug}`;
}
