// Shared property/agent types, location imagery and formatting helpers.
// The database is the single source of truth for all property records —
// no example/demo listings live in this file.
import locZanzibar from "@/assets/loc-zanzibar.jpg";
import locDar from "@/assets/loc-dar.jpg";
import locArusha from "@/assets/loc-arusha.jpg";
import locMwanza from "@/assets/loc-mwanza.jpg";

export type ListingType = "rent" | "sale" | "commercial";
export type PropertyCategory =
  | "House"
  | "Apartment"
  | "Office"
  | "Shop"
  | "Warehouse"
  | "Land"
  | "Commercial Building";

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PropertyCategory;
  listingType: ListingType;
  price: number;
  currency: "TZS" | "USD";
  city: string;
  district: string;
  ward: string;
  street: string;
  bedrooms: number;
  bathrooms: number;
  parkingAvailable: boolean;
  size: number; // sqm
  yearBuilt: number;
  furnished: boolean;
  amenities: string[];
  images: string[];
  verified: boolean;
  featured: boolean;
  premium: boolean;
  new: boolean;
  views: number;
  agentId: string;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
}

export interface Agent {
  id: string;
  name: string;
  agency: string;
  city: string;
  phone: string;
  email: string;
  whatsapp: string;
  avatar: string;
  listings: number;
  rating: number;
  verified: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  city: string;
  quote: string;
  rating: number;
}

export interface Location {
  slug: string;
  name: string;
  image: string;
}

// Decorative city imagery only. Listing counts always come from the database.
export const locations: Location[] = [
  { slug: "dar-es-salaam", name: "Dar es Salaam", image: locDar },
  { slug: "zanzibar", name: "Zanzibar", image: locZanzibar },
  { slug: "arusha", name: "Arusha", image: locArusha },
  { slug: "mwanza", name: "Mwanza", image: locMwanza },
];





export function formatPrice(price: number, currency: "TZS" | "USD", listingType: ListingType) {
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const prefix = currency === "TZS" ? "TZS" : "$";
  const suffix = listingType === "rent" ? " / mo" : "";
  return `${prefix} ${formatter.format(price)}${suffix}`;
}

