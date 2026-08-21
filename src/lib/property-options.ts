import type { PropertyCategory } from "@/lib/mock-data";

/** Categories exposed in discovery search (matches DB property_type enum). */
export const DISCOVERY_CATEGORIES: PropertyCategory[] = [
  "House",
  "Apartment",
  "Office",
  "Shop",
  "Warehouse",
  "Commercial Building",
  "Land",
];

/** Amenity values as stored on properties.amenities (see upload wizard). */
export const AMENITY_OPTIONS = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "parking", label: "Parking" },
  { value: "fence", label: "Fence" },
  { value: "security", label: "Security" },
  { value: "cctv", label: "CCTV" },
  { value: "pool", label: "Swimming Pool" },
  { value: "garden", label: "Garden" },
  { value: "solar", label: "Solar" },
  { value: "generator", label: "Generator" },
  { value: "ac", label: "Air Conditioning" },
  { value: "pets", label: "Pet Friendly" },
  { value: "wheelchair", label: "Wheelchair Access" },
  { value: "internet", label: "Internet" },
] as const;

export const FURNISHED_AMENITY = "furnished";
