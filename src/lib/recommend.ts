import type { Property } from "@/lib/mock-data";
import type { SavedSearchFilters } from "@/lib/saved-searches-db";

interface Signals {
  searches: SavedSearchFilters[];
  savedIds: string[];
  viewedIds: string[];
}

/**
 * Transparent rule-based matching. Each property earns points for matching the
 * user's saved searches, the areas/types/budget of properties they saved or viewed.
 * Returns the top matches with the main reason, so the UI can explain "why".
 */
export function recommend(all: Property[], s: Signals, limit = 6) {
  const known = new Set([...s.savedIds, ...s.viewedIds]);
  const liked = all.filter((p) => known.has(p.id));
  const districts = new Set(liked.map((p) => p.district.toLowerCase()).filter(Boolean));
  const cats = new Set(liked.map((p) => p.category));
  const prices = liked.map((p) => p.price).filter((n) => n > 0);
  const budget = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  const scored = all
    .filter((p) => !s.savedIds.includes(p.id) && (p.availability ?? "available") === "available")
    .map((p) => {
      let score = 0;
      let reason = "popular";
      for (const f of s.searches) {
        let m = 0;
        if (f.type && f.type === p.listingType) m++;
        if (f.category && f.category === p.category) m++;
        if (f.city && f.city.toLowerCase() === p.city.toLowerCase()) m++;
        if (f.district && f.district.toLowerCase() === p.district.toLowerCase()) m += 2;
        if (f.maxPrice && p.price <= f.maxPrice && (!f.minPrice || p.price >= f.minPrice)) m++;
        if (f.beds && p.bedrooms >= f.beds) m++;
        if (m * 3 > score) { score = m * 3; reason = "search"; }
      }
      if (districts.has(p.district.toLowerCase())) { score += 3; if (reason === "popular") reason = "area"; }
      if (cats.has(p.category)) { score += 2; if (reason === "popular") reason = "type"; }
      if (budget && Math.abs(p.price - budget) / budget < 0.3) { score += 2; if (reason === "popular") reason = "budget"; }
      if (p.verified) score += 1;
      return { p, reason, score: score + Math.min(p.views, 200) / 400 };
    });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(({ p, reason }) => ({ p, reason }));
}
