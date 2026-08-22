import heroVilla from "@/assets/hero-villa.jpg";
import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
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
  parking: number;
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
  region: string;
  listings: number;
  image: string;
}

export const locations: Location[] = [
  { slug: "dar-es-salaam", name: "Dar es Salaam", region: "Coastal", listings: 1284, image: locDar },
  { slug: "zanzibar", name: "Zanzibar", region: "Island", listings: 421, image: locZanzibar },
  { slug: "arusha", name: "Arusha", region: "Northern", listings: 316, image: locArusha },
  { slug: "mwanza", name: "Mwanza", region: "Lake Zone", listings: 208, image: locMwanza },
];

export const agents: Agent[] = [
  {
    id: "a1",
    name: "Amina Hassan",
    agency: "Kilimanjaro Realty",
    city: "Dar es Salaam",
    phone: "+255 754 100 200",
    email: "amina@spaces.co.tz",
    whatsapp: "255754100200",
    avatar: "https://i.pravatar.cc/240?img=47",
    listings: 42,
    rating: 4.9,
    verified: true,
  },
  {
    id: "a2",
    name: "Joseph Mushi",
    agency: "Serengeti Homes",
    city: "Arusha",
    phone: "+255 762 341 900",
    email: "joseph@spaces.co.tz",
    whatsapp: "255762341900",
    avatar: "https://i.pravatar.cc/240?img=12",
    listings: 28,
    rating: 4.8,
    verified: true,
  },
  {
    id: "a3",
    name: "Neema Kimaro",
    agency: "Coastline Properties",
    city: "Zanzibar",
    phone: "+255 715 220 118",
    email: "neema@spaces.co.tz",
    whatsapp: "255715220118",
    avatar: "https://i.pravatar.cc/240?img=32",
    listings: 35,
    rating: 5.0,
    verified: true,
  },
  {
    id: "a4",
    name: "Baraka Mwakalinga",
    agency: "Uzunguni Estates",
    city: "Mwanza",
    phone: "+255 787 559 402",
    email: "baraka@spaces.co.tz",
    whatsapp: "255787559402",
    avatar: "https://i.pravatar.cc/240?img=15",
    listings: 19,
    rating: 4.7,
    verified: false,
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Fatma Abdallah",
    role: "Homebuyer",
    city: "Dar es Salaam",
    quote:
      "SPACES made finding our family home in Masaki effortless. Verified listings and honest agents — I felt safe every step of the way.",
    rating: 5,
  },
  {
    id: "t2",
    name: "David Kileo",
    role: "Property Owner",
    city: "Arusha",
    quote:
      "Listed my apartment on Monday, received three qualified viewing requests by Friday. The dashboard is beautifully simple.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Sarah Mnyika",
    role: "Tenant",
    city: "Zanzibar",
    quote:
      "The map search and WhatsApp button saved me weeks. I signed my lease within two visits. Truly premium experience.",
    rating: 5,
  },
];

const heroImage = heroVilla;

export const properties: Property[] = [
  {
    id: "p1",
    slug: "oceanview-villa-masaki",
    title: "Oceanview Villa in Masaki",
    description:
      "A serene five-bedroom villa perched above the Msasani peninsula. Floor-to-ceiling windows frame uninterrupted ocean views; a private infinity pool anchors the terrace. Fully furnished, staff quarters, backup generator, and 24/7 security.",
    category: "House",
    listingType: "sale",
    price: 1250000000,
    currency: "TZS",
    city: "Dar es Salaam",
    district: "Kinondoni",
    ward: "Masaki",
    street: "Toure Drive",
    bedrooms: 5,
    bathrooms: 6,
    parking: 4,
    size: 620,
    yearBuilt: 2022,
    furnished: true,
    amenities: ["Swimming Pool", "Garden", "Security", "Backup Power", "Air Conditioning", "Internet", "Sea View"],
    images: [heroImage, prop2, prop4, prop1],
    verified: true,
    featured: true,
    premium: true,
    new: false,
    views: 2841,
    agentId: "a1",
    createdAt: "2026-06-14",
  },
  {
    id: "p2",
    slug: "skyline-apartment-upanga",
    title: "Skyline Apartment, Upanga",
    description:
      "Bright 3-bedroom apartment on the 14th floor with panoramic views of the harbour. Chef's kitchen, en-suite master, and access to a rooftop pool and gym.",
    category: "Apartment",
    listingType: "rent",
    price: 2800000,
    currency: "TZS",
    city: "Dar es Salaam",
    district: "Ilala",
    ward: "Upanga",
    street: "Upanga Road",
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    size: 165,
    yearBuilt: 2021,
    furnished: true,
    amenities: ["Swimming Pool", "Security", "Air Conditioning", "Internet", "Gym", "Elevator"],
    images: [prop1, prop2, prop4],
    verified: true,
    featured: true,
    premium: false,
    new: true,
    views: 1204,
    agentId: "a1",
    createdAt: "2026-07-01",
  },
  {
    id: "p3",
    slug: "beachfront-villa-nungwi",
    title: "Beachfront Villa, Nungwi",
    description:
      "Four-bedroom Zanzibari retreat steps from turquoise water. Open living, coral stone walls, and a private white-sand cove.",
    category: "House",
    listingType: "sale",
    price: 685000000,
    currency: "TZS",
    city: "Zanzibar",
    district: "Kaskazini A",
    ward: "Nungwi",
    street: "Nungwi Beach Road",
    bedrooms: 4,
    bathrooms: 4,
    parking: 3,
    size: 410,
    yearBuilt: 2020,
    furnished: true,
    amenities: ["Swimming Pool", "Beachfront", "Security", "Garden", "Internet", "Air Conditioning"],
    images: [prop2, heroImage, prop4],
    verified: true,
    featured: true,
    premium: true,
    new: false,
    views: 3120,
    agentId: "a3",
    createdAt: "2026-05-22",
  },
  {
    id: "p4",
    slug: "grade-a-office-posta",
    title: "Grade-A Office, Posta",
    description:
      "Prime CBD office suite, 320 sqm open plan with two boardrooms, dedicated fibre, and secure basement parking for 8 vehicles.",
    category: "Office",
    listingType: "commercial",
    price: 5400000,
    currency: "TZS",
    city: "Dar es Salaam",
    district: "Ilala",
    ward: "Posta",
    street: "Samora Avenue",
    bedrooms: 0,
    bathrooms: 3,
    parking: 8,
    size: 320,
    yearBuilt: 2019,
    furnished: false,
    amenities: ["Elevator", "Security", "Backup Power", "Fibre Internet", "Air Conditioning", "Parking"],
    images: [prop3, prop1],
    verified: true,
    featured: false,
    premium: false,
    new: true,
    views: 512,
    agentId: "a1",
    createdAt: "2026-06-30",
  },
  {
    id: "p5",
    slug: "family-house-njiro-arusha",
    title: "Family House in Njiro",
    description:
      "Warm 4-bedroom family home with mature garden, garage for two, and quiet cul-de-sac in Njiro. Ten minutes to international schools.",
    category: "House",
    listingType: "sale",
    price: 320000000,
    currency: "TZS",
    city: "Arusha",
    district: "Arusha City",
    ward: "Njiro",
    street: "Njiro Block D",
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    size: 280,
    yearBuilt: 2018,
    furnished: false,
    amenities: ["Garden", "Security", "Backup Power", "Internet", "Parking"],
    images: [prop4, prop2],
    verified: false,
    featured: false,
    premium: false,
    new: true,
    views: 289,
    agentId: "a2",
    createdAt: "2026-07-03",
  },
  {
    id: "p6",
    slug: "lakeside-apartment-mwanza",
    title: "Lakeside Apartment, Mwanza",
    description:
      "Two-bedroom apartment with a full-length balcony overlooking Lake Victoria. Modern kitchen, secure compound, backup water.",
    category: "Apartment",
    listingType: "rent",
    price: 950000,
    currency: "TZS",
    city: "Mwanza",
    district: "Ilemela",
    ward: "Kirumba",
    street: "Kenyatta Road",
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    size: 95,
    yearBuilt: 2020,
    furnished: true,
    amenities: ["Security", "Internet", "Air Conditioning", "Backup Water", "Lake View"],
    images: [prop1, prop2],
    verified: true,
    featured: false,
    premium: false,
    new: false,
    views: 640,
    agentId: "a4",
    createdAt: "2026-06-10",
  },
];

export const stats = [
  { label: "Verified listings", value: "12,400+" },
  { label: "Trusted agents", value: "820" },
  { label: "Cities covered", value: "24" },
  { label: "Happy families", value: "38,000+" },
];

export function formatPrice(price: number, currency: "TZS" | "USD", listingType: ListingType) {
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const prefix = currency === "TZS" ? "TZS" : "$";
  const suffix = listingType === "rent" ? " / mo" : "";
  return `${prefix} ${formatter.format(price)}${suffix}`;
}

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

export function getAgent(id: string) {
  return agents.find((a) => a.id === id);
}
