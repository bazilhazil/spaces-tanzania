// SPACES Revenue & Subscription Management — mock data layer.
// Payment gateway integration is intentionally deferred; this module models
// plans, add-ons, invoices, promotions, and revenue analytics.

export type PlanId = "free" | "professional" | "agency" | "enterprise";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "suspended";
export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

export type PaymentMethodId =
  | "mpesa"
  | "mixx"
  | "tigopesa"
  | "airtel"
  | "halopesa"
  | "visa"
  | "mastercard"
  | "bank";


export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyTZS: number | null; // null = custom
  priceAnnualTZS: number | null;
  listingsQuota: number | "unlimited";
  agentsQuota: number | "unlimited";
  featured: boolean;
  highlights: string[];
  features: string[];
  cta: string;
  badge?: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started on SPACES",
    priceMonthlyTZS: 0,
    priceAnnualTZS: 0,
    listingsQuota: 3,
    agentsQuota: 1,
    featured: false,
    highlights: ["3 active listings", "Basic analytics", "Standard visibility"],
    features: [
      "Up to 3 active listings",
      "Basic analytics dashboard",
      "Standard search visibility",
      "Messaging with buyers",
      "Viewing requests",
    ],
    cta: "Current plan",
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For serious owners & solo agents",
    priceMonthlyTZS: 49_000,
    priceAnnualTZS: 490_000,
    listingsQuota: 25,
    agentsQuota: 1,
    featured: true,
    badge: "Most popular",
    highlights: ["25 listings", "Priority placement", "Lead CRM"],
    features: [
      "Up to 25 active listings",
      "Priority search placement",
      "Advanced analytics & insights",
      "Full Lead CRM access",
      "Listing performance reports",
      "Priority support",
      "20% verification discount",
    ],
    cta: "Upgrade to Professional",
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "Scale your team & brand",
    priceMonthlyTZS: 149_000,
    priceAnnualTZS: 1_490_000,
    listingsQuota: "unlimited",
    agentsQuota: "unlimited",
    featured: false,
    highlights: ["Unlimited listings", "Multiple agents", "Team dashboard"],
    features: [
      "Unlimited active listings",
      "Multiple agent seats",
      "Shared team CRM",
      "Team performance dashboard",
      "Agency branding & storefront",
      "Advanced reports & exports",
      "Dedicated support channel",
    ],
    cta: "Upgrade to Agency",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom for large operators",
    priceMonthlyTZS: null,
    priceAnnualTZS: null,
    listingsQuota: "unlimited",
    agentsQuota: "unlimited",
    featured: false,
    highlights: ["Custom pricing", "Dedicated manager", "White-label"],
    features: [
      "Custom volume pricing",
      "Dedicated account manager",
      "API access (roadmap)",
      "White-label readiness",
      "Priority onboarding",
      "Custom SLA & security review",
    ],
    cta: "Contact sales",
  },
];

export type AddOn = {
  id: string;
  name: string;
  description: string;
  priceTZS: number;
  durationDays: number;
  icon: "star" | "flame" | "shield" | "home" | "search" | "crown";
};

export const ADDONS: AddOn[] = [
  { id: "featured", name: "Featured Listing", description: "Highlighted card across search results.", priceTZS: 25_000, durationDays: 7, icon: "star" },
  { id: "urgent", name: "Urgent Listing", description: "Urgent badge to signal fast-moving deals.", priceTZS: 15_000, durationDays: 5, icon: "flame" },
  { id: "verified", name: "Verified Listing", description: "Fast-track verification with priority review.", priceTZS: 35_000, durationDays: 30, icon: "shield" },
  { id: "homepage", name: "Homepage Promotion", description: "Featured slot on the SPACES homepage.", priceTZS: 75_000, durationDays: 7, icon: "home" },
  { id: "top-search", name: "Top Search Placement", description: "Pinned to the top of relevant search results.", priceTZS: 60_000, durationDays: 7, icon: "search" },
  { id: "premium-badge", name: "Premium Badge", description: "Premium indicator on your profile & listings.", priceTZS: 20_000, durationDays: 30, icon: "crown" },
];

export type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  category: "mobile" | "card";
  status: "planned"; // gateways not yet integrated
  description: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "mpesa", name: "M-Pesa", category: "mobile", status: "planned", description: "Vodacom mobile money" },
  { id: "mixx", name: "Mixx by Yas", category: "mobile", status: "planned", description: "Yas Tanzania wallet" },
  { id: "airtel", name: "Airtel Money", category: "mobile", status: "planned", description: "Airtel mobile money" },
  { id: "halopesa", name: "HaloPesa", category: "mobile", status: "planned", description: "Halotel mobile money" },
  { id: "visa", name: "Visa", category: "card", status: "planned", description: "Global credit / debit" },
  { id: "mastercard", name: "Mastercard", category: "card", status: "planned", description: "Global credit / debit" },
];

export type Subscription = {
  planId: PlanId;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  renewsOn: string; // ISO
  startedOn: string;
  seatsUsed: number;
  listingsUsed: number;
  paymentMethod: PaymentMethodId | null;
};

export type Invoice = {
  id: string;
  date: string;
  amountTZS: number;
  description: string;
  status: InvoiceStatus;
  method: PaymentMethodId | null;
};

export type Coupon = {
  code: string;
  discountPct: number;
  appliesTo: PlanId[] | "all";
  expiresOn: string;
  usage: number;
  cap: number;
  active: boolean;
};

export const CURRENT_SUBSCRIPTION: Subscription = {
  planId: "professional",
  status: "active",
  cycle: "monthly",
  renewsOn: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  startedOn: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  seatsUsed: 1,
  listingsUsed: 8,
  paymentMethod: "mpesa",
};

export const INVOICES: Invoice[] = [
  { id: "INV-2026-0142", date: "2026-06-11", amountTZS: 49_000, description: "Professional — Monthly", status: "paid", method: "mpesa" },
  { id: "INV-2026-0121", date: "2026-05-11", amountTZS: 49_000, description: "Professional — Monthly", status: "paid", method: "mpesa" },
  { id: "INV-2026-0108", date: "2026-05-02", amountTZS: 25_000, description: "Featured Listing — 7 days", status: "paid", method: "visa" },
  { id: "INV-2026-0097", date: "2026-04-11", amountTZS: 49_000, description: "Professional — Monthly", status: "paid", method: "mpesa" },
  { id: "INV-2026-0084", date: "2026-04-03", amountTZS: 35_000, description: "Verified Listing", status: "refunded", method: "airtel" },
];

export const COUPONS: Coupon[] = [
  { code: "SPACES20", discountPct: 20, appliesTo: "all", expiresOn: "2026-12-31", usage: 142, cap: 500, active: true },
  { code: "AGENCY50", discountPct: 50, appliesTo: ["agency"], expiresOn: "2026-09-30", usage: 12, cap: 50, active: true },
  { code: "WELCOME10", discountPct: 10, appliesTo: ["professional"], expiresOn: "2026-12-31", usage: 88, cap: 1000, active: true },
];

// Admin revenue analytics (mock aggregates)
export const REVENUE_KPI = {
  mrrTZS: 8_940_000,
  mrrDelta: 12.4,
  arrTZS: 107_280_000,
  activeSubs: 214,
  activeSubsDelta: 8.1,
  churnPct: 3.2,
  churnDelta: -0.4,
  arpuTZS: 41_775,
};

export const REVENUE_BY_PLAN = [
  { plan: "Free", subs: 1284, mrrTZS: 0 },
  { plan: "Professional", subs: 168, mrrTZS: 8_232_000 },
  { plan: "Agency", subs: 42, mrrTZS: 6_258_000 },
  { plan: "Enterprise", subs: 4, mrrTZS: 1_800_000 },
];

export const REVENUE_TREND = [
  { month: "Jan", mrrTZS: 5_120_000 },
  { month: "Feb", mrrTZS: 5_680_000 },
  { month: "Mar", mrrTZS: 6_290_000 },
  { month: "Apr", mrrTZS: 7_010_000 },
  { month: "May", mrrTZS: 7_920_000 },
  { month: "Jun", mrrTZS: 8_940_000 },
];

export function formatTZS(v: number | null): string {
  if (v == null) return "Custom";
  if (v === 0) return "Free";
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(v) + " TZS";
}

export function planById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
