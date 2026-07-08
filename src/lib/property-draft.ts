// LocalStorage draft for the upload wizard (auto-save between sessions).
export type WizardDraft = {
  step: number;
  property_type?: string;
  listing_type?: "rent" | "sale";
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  negotiable?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  area_sqm?: number;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  // Media is stored separately (blob URLs can't persist)
};

const KEY = "spaces:upload-draft:v1";

export function loadDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: WizardDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* quota */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
