/** Rule-based parsing of everyday search phrases like "House in Masaki" or "Nyumba Mikocheni". */
const TYPE_WORDS: Record<string, string> = {
  house: "house", houses: "house", home: "house", villa: "house", nyumba: "house",
  apartment: "apartment", apartments: "apartment", flat: "apartment", ghorofa: "apartment", apartimenti: "apartment",
  office: "office", offices: "office", ofisi: "office",
  shop: "shop", shops: "shop", duka: "shop", maduka: "shop",
  warehouse: "warehouse", godown: "warehouse", ghala: "warehouse",
  land: "land", plot: "land", kiwanja: "land", viwanja: "land", shamba: "land",
  commercial: "commercial", biashara: "commercial",
};
const STOP = new Set(["in", "at", "for", "the", "a", "an", "near", "katika", "huko", "ya", "la", "za", "kwa", "bed", "bedroom", "bedrooms", "chumba", "vyumba", "rent", "sale", "kupangisha", "kuuza", "to"]);

export interface ParsedSearch {
  type: string | null;
  places: string[];
  minBeds: number | null;
  listing: "rent" | "sale" | null;
}

export function parseSearch(q: string): ParsedSearch {
  const low = q.toLowerCase();
  const words = low.split(/[\s,]+/).filter(Boolean);
  let type: string | null = null;
  const places: string[] = [];
  for (const w of words) {
    if (!type && TYPE_WORDS[w]) { type = TYPE_WORDS[w]; continue; }
    if (TYPE_WORDS[w] || STOP.has(w) || /^\d+$/.test(w) || w.length < 3) continue;
    places.push(w);
  }
  const bed = /(\d+)\s*(bed|bedroom|chumba|vyumba)/.exec(low);
  const listing = /\b(rent|kupangisha|kodi)\b/.test(low) ? "rent" : /\b(sale|buy|kuuza|kununua)\b/.test(low) ? "sale" : null;
  return { type, places, minBeds: bed ? Number(bed[1]) : null, listing };
}

/** Loose similarity: substring either way, or first 4 letters match (handles typos like "Mikochen"). */
export function looseMatch(hay: string, term: string) {
  if (hay.includes(term)) return true;
  if (term.length >= 5 && hay.includes(term.slice(0, 4))) return true;
  return false;
}
