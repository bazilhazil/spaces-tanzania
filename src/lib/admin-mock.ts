// Mock data for the SPACES Admin Control Center.
// Everything here is display-only. Replace with real queries when APIs are ready.

export type AdminRole =
  | "guest"
  | "user"
  | "owner"
  | "agent"
  | "moderator"
  | "admin"
  | "superadmin";

export const ROLE_LABELS: Record<AdminRole, string> = {
  guest: "Guest",
  user: "Registered User",
  owner: "Owner",
  agent: "Agent",
  moderator: "Moderator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export const ROLE_MATRIX: {
  capability: string;
  roles: Record<AdminRole, boolean>;
}[] = [
  ["Browse listings", { guest: true, user: true, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Book viewings", { guest: false, user: true, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Upload property", { guest: false, user: false, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Manage clients", { guest: false, user: false, owner: false, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Moderate listings", { guest: false, user: false, owner: false, agent: false, moderator: true, admin: true, superadmin: true }],
  ["Manage users", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: true, superadmin: true }],
  ["Configure system", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: true, superadmin: true }],
  ["Rotate API keys", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: false, superadmin: true }],
  ["Maintenance mode", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: false, superadmin: true }],
].map(([capability, roles]) => ({ capability: capability as string, roles: roles as Record<AdminRole, boolean> }));

export const KPI = [
  { label: "Today's Visitors", value: "12,483", delta: 8.2, tone: "brand" as const },
  { label: "Registrations", value: "342", delta: 12.4, tone: "brand" as const },
  { label: "New Listings", value: "89", delta: 4.1, tone: "gold" as const },
  { label: "Pending Verification", value: "27", delta: -3.0, tone: "danger" as const },
  { label: "Pending Reports", value: "14", delta: 2.0, tone: "danger" as const },
  { label: "Bookings Today", value: "58", delta: 9.6, tone: "success" as const },
  { label: "Revenue Today", value: "TZS 8.4M", delta: 6.2, tone: "success" as const },
  { label: "Monthly Revenue", value: "TZS 214M", delta: 14.7, tone: "gold" as const },
];

export const HIGHLIGHTS = [
  { label: "Top Region", value: "Dar es Salaam" },
  { label: "Top Property Type", value: "2-Bed Apartments" },
  { label: "Most Active Agent", value: "Neema Kileo" },
  { label: "Avg Response Time", value: "8m 42s" },
  { label: "Platform Health", value: "99.98%" },
];

export type ActivityKind =
  | "property_new" | "property_approved" | "viewing_booked"
  | "user_new" | "subscription_paid" | "verification_approved" | "report_filed";

export const ACTIVITY: { id: string; kind: ActivityKind; text: string; time: string }[] = [
  { id: "a1", kind: "property_new", text: "3-BR villa uploaded — Masaki", time: "just now" },
  { id: "a2", kind: "verification_approved", text: "Owner Amina Juma verified", time: "2m ago" },
  { id: "a3", kind: "viewing_booked", text: "Viewing booked — Oyster Bay penthouse", time: "6m ago" },
  { id: "a4", kind: "user_new", text: "New user @kelvin.mushi joined", time: "11m ago" },
  { id: "a5", kind: "subscription_paid", text: "Agent Premium plan — TZS 120,000", time: "18m ago" },
  { id: "a6", kind: "report_filed", text: "Report: possibly fake listing #4821", time: "24m ago" },
  { id: "a7", kind: "property_approved", text: "Listing #4808 approved", time: "31m ago" },
  { id: "a8", kind: "property_new", text: "Studio uploaded — Kariakoo", time: "42m ago" },
];

export type ModerationItem = {
  id: string;
  title: string;
  location: string;
  price: string;
  cover: string;
  quality: number;
  ownerScore: number;
  verified: boolean;
  submitted: string;
};

export const MODERATION: ModerationItem[] = [
  { id: "p-4821", title: "Modern 3-BR Villa with Pool", location: "Masaki, Dar es Salaam", price: "TZS 480M", cover: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800", quality: 92, ownerScore: 88, verified: true, submitted: "2h ago" },
  { id: "p-4822", title: "Ocean View Penthouse", location: "Oyster Bay", price: "TZS 1.2B", cover: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", quality: 78, ownerScore: 71, verified: false, submitted: "3h ago" },
  { id: "p-4823", title: "Cozy Studio Near CBD", location: "Kariakoo", price: "TZS 350K / mo", cover: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", quality: 64, ownerScore: 55, verified: false, submitted: "5h ago" },
  { id: "p-4824", title: "Family Home with Garden", location: "Mikocheni", price: "TZS 220M", cover: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", quality: 84, ownerScore: 90, verified: true, submitted: "6h ago" },
];

export const USERS = [
  { id: "u1", name: "Amina Juma", email: "amina@spaces.co.tz", role: "owner", status: "active", joined: "Jan 2026", listings: 4 },
  { id: "u2", name: "Neema Kileo", email: "neema@atrio.co.tz", role: "agent", status: "active", joined: "Mar 2025", listings: 27 },
  { id: "u3", name: "Kelvin Mushi", email: "kelvin.m@gmail.com", role: "user", status: "active", joined: "Today", listings: 0 },
  { id: "u4", name: "Peter Malongo", email: "peter@landlord.tz", role: "owner", status: "suspended", joined: "Oct 2024", listings: 12 },
  { id: "u5", name: "Grace Mwangi", email: "grace.mw@yahoo.com", role: "user", status: "pending", joined: "Yesterday", listings: 0 },
];

export const VERIFICATION_QUEUE = [
  { id: "v1", name: "Amina Juma", type: "Owner", doc: "National ID + Title Deed", submitted: "2h ago", risk: "low" },
  { id: "v2", name: "Atrio Properties Ltd", type: "Agent", doc: "TIN + Business License", submitted: "5h ago", risk: "low" },
  { id: "v3", name: "Villa #4821", type: "Property", doc: "Title deed, land survey", submitted: "6h ago", risk: "medium" },
  { id: "v4", name: "Peter Malongo", type: "Owner", doc: "National ID", submitted: "1d ago", risk: "high" },
];

export const REPORTS = [
  { id: "r1", target: "Listing #4801", reason: "Fake listing", reporter: "kelvin.m", status: "pending", severity: "high" },
  { id: "r2", target: "Listing #4772", reason: "Wrong location", reporter: "@grace", status: "pending", severity: "low" },
  { id: "r3", target: "@peter.tz", reason: "Spam messages", reporter: "3 users", status: "pending", severity: "medium" },
  { id: "r4", target: "Listing #4720", reason: "Duplicate", reporter: "moderator", status: "resolved", severity: "low" },
  { id: "r5", target: "Listing #4699", reason: "Offensive content", reporter: "@amina", status: "resolved", severity: "high" },
];

export const CHART_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const CHART_REVENUE = [22, 34, 41, 55, 62, 78, 91, 104, 128, 156, 182, 214]; // TZS M
export const CHART_TRAFFIC = [18, 24, 31, 38, 44, 52, 61, 74, 82, 91, 108, 124]; // k visits
export const CHART_LISTINGS = [4, 7, 12, 18, 24, 33, 41, 52, 61, 72, 84, 96];

export const TOP_KEYWORDS = [
  "3 bedroom Masaki", "cheap apartment Kariakoo", "beach house Zanzibar",
  "office space Upanga", "villa with pool", "studio Mikocheni",
];

export const BOOKINGS = [
  { id: "b1", property: "Villa — Masaki", user: "Kelvin Mushi", when: "Today, 3:00 PM", agent: "Neema Kileo", status: "confirmed" },
  { id: "b2", property: "Studio — Kariakoo", user: "Grace Mwangi", when: "Tomorrow, 10:00 AM", agent: "—", status: "pending" },
  { id: "b3", property: "Penthouse — Oyster Bay", user: "James Otieno", when: "Fri, 2:30 PM", agent: "Neema Kileo", status: "confirmed" },
];

export const PAYMENTS = [
  { id: "pay1", user: "Atrio Properties", plan: "Agent Premium", amount: "TZS 120,000", when: "18m ago", status: "paid" },
  { id: "pay2", user: "Peter Malongo", plan: "Featured Listing x2", amount: "TZS 60,000", when: "2h ago", status: "paid" },
  { id: "pay3", user: "Amina Juma", plan: "Verification Fee", amount: "TZS 10,000", when: "5h ago", status: "paid" },
  { id: "pay4", user: "Grace Mwangi", plan: "Buyer Plus", amount: "TZS 25,000", when: "yesterday", status: "refunded" },
];

export const AUDIT_LOGS = [
  { id: "l1", actor: "admin@spaces", action: "Approved listing #4808", ip: "196.192.44.10", when: "31m ago" },
  { id: "l2", actor: "moderator.nia", action: "Suspended user @peter.tz", ip: "196.192.44.22", when: "1h ago" },
  { id: "l3", actor: "system", action: "Auto-flagged listing #4821", ip: "—", when: "2h ago" },
  { id: "l4", actor: "superadmin", action: "Rotated Google Maps API key", ip: "41.222.9.88", when: "yesterday" },
];

export const SUPPORT_TICKETS = [
  { id: "t1", subject: "Cannot upload photos", user: "Amina Juma", priority: "high", status: "open", when: "12m ago" },
  { id: "t2", subject: "Payment not reflected", user: "Peter Malongo", priority: "high", status: "open", when: "1h ago" },
  { id: "t3", subject: "Change email address", user: "Kelvin Mushi", priority: "low", status: "pending", when: "3h ago" },
  { id: "t4", subject: "Delete my account", user: "Grace Mwangi", priority: "medium", status: "resolved", when: "yesterday" },
];

export const NOTIFICATIONS = [
  { id: "n1", title: "Weekly digest scheduled", body: "Sends every Monday 08:00 EAT", channel: "email" },
  { id: "n2", title: "SMS budget threshold", body: "70% of monthly SMS spent", channel: "sms" },
  { id: "n3", title: "Push notification A/B", body: "Variant B outperforming by 18%", channel: "push" },
];

export const CAMPAIGNS = [
  { id: "c1", name: "Ramadan Homes 2026", status: "live", reach: "128k", ctr: "4.8%" },
  { id: "c2", name: "First Time Buyers", status: "scheduled", reach: "—", ctr: "—" },
  { id: "c3", name: "Zanzibar Getaways", status: "draft", reach: "—", ctr: "—" },
];
