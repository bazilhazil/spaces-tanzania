/**
 * Listing completeness + duplicate detection.
 *
 * These checks decide whether a space may be submitted for review. They only
 * cover information a buyer genuinely needs — nothing optional is required.
 */

export const MIN_LISTING_IMAGES = 3;

export interface CompletenessInput {
  title?: string | null;
  propertyType?: string | null;
  price?: number | null;
  region?: string | null;
  district?: string | null;
  description?: string | null;
  imageCount: number;
  contactName?: string | null;
  contactPhone?: string | null;
  preferredContact?: string | null;
}

/** Human-readable list of what still needs completing (empty = ready). */
export function missingListingRequirements(input: CompletenessInput): string[] {
  const missing: string[] = [];
  if (!input.title?.trim()) missing.push("A title for the space");
  if (!input.propertyType) missing.push("The type of space");
  if (!input.price || Number(input.price) <= 0) missing.push("The rent or sale price");
  if (!input.region?.trim() || !input.district?.trim()) missing.push("The location (region and district)");
  if ((input.description ?? "").trim().length < 40) missing.push("A short description (at least 40 characters)");
  if (input.imageCount < MIN_LISTING_IMAGES) {
    missing.push(`At least ${MIN_LISTING_IMAGES} photos (you have ${input.imageCount})`);
  }
  if (!input.contactName?.trim()) missing.push("Your name");
  if (!input.contactPhone?.trim()) missing.push("A phone number people can reach you on");
  return missing;
}

export function isListingComplete(input: CompletenessInput): boolean {
  return missingListingRequirements(input).length === 0;
}

/* ------------------------- duplicate detection ------------------------- */

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Rough word-overlap similarity between two titles (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalise(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalise(b).split(" ").filter((w) => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.max(wa.size, wb.size);
}

export interface DuplicateCandidate {
  id: string;
  title: string;
  ownerId: string;
  location: string;
  price: number;
  createdAt: string;
}

/**
 * Flags likely duplicates. Nothing is ever removed automatically — the result
 * is only surfaced to an administrator for review.
 */
export function findDuplicateGroups(items: DuplicateCandidate[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const sameOwner = !!a.ownerId && a.ownerId === b.ownerId;
      const sameLocation = normalise(a.location) === normalise(b.location) && !!a.location.trim();
      const samePrice = a.price > 0 && Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.02;
      const similarTitle = titleSimilarity(a.title, b.title) >= 0.7;

      const signals = [sameOwner, sameLocation, samePrice, similarTitle].filter(Boolean).length;
      const likely = (similarTitle && (sameLocation || samePrice)) || (sameOwner && sameLocation && samePrice) || signals >= 3;
      if (!likely) continue;

      (out.get(a.id) ?? out.set(a.id, []).get(a.id)!).push(b.id);
      (out.get(b.id) ?? out.set(b.id, []).get(b.id)!).push(a.id);
    }
  }
  return out;
}
