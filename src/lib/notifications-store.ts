// SPACES Notification Center — client-side store.
// Providers (SMS/email/WhatsApp/push) are not yet wired; this module models
// in-app notifications, delivery channel preferences and provider status so
// the UI can be built exactly as it will behave once providers go live.

export type NotificationKind =
  | "new_lead"
  | "new_message"
  | "new_inquiry"
  | "viewing_request"
  | "viewing_approved"
  | "viewing_rejected"
  | "deal_updated"
  | "deal_completed"
  | "subscription_purchased"
  | "subscription_expiring"
  | "payment_successful"
  | "payment_failed"
  | "verification_approved"
  | "verification_rejected"
  | "property_approved"
  | "property_rejected"
  | "announcement";

export type NotificationChannel = "in_app" | "sms" | "email" | "whatsapp" | "push";

export type SpacesNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  href?: string;
};

export type ChannelPrefs = Record<NotificationChannel, boolean> & {
  marketing: boolean;
  weeklyReports: boolean;
};

export type ProviderId = "sms" | "email" | "whatsapp" | "push";
export type ProviderStatus = Record<ProviderId, boolean>;

const KEY = "spaces.notifications.v1";
const PREFS_KEY = "spaces.notifications.prefs.v1";
const PROV_KEY = "spaces.notifications.providers.v1";

export const KIND_META: Record<NotificationKind, { label: string; group: "leads" | "deals" | "viewings" | "billing" | "verification" | "properties" | "system" }> = {
  new_lead: { label: "New Lead", group: "leads" },
  new_message: { label: "New Message", group: "leads" },
  new_inquiry: { label: "New Property Inquiry", group: "leads" },
  viewing_request: { label: "Viewing Request", group: "viewings" },
  viewing_approved: { label: "Viewing Approved", group: "viewings" },
  viewing_rejected: { label: "Viewing Rejected", group: "viewings" },
  deal_updated: { label: "Deal Updated", group: "deals" },
  deal_completed: { label: "Deal Completed", group: "deals" },
  subscription_purchased: { label: "Subscription Purchased", group: "billing" },
  subscription_expiring: { label: "Subscription Expiring", group: "billing" },
  payment_successful: { label: "Payment Successful", group: "billing" },
  payment_failed: { label: "Payment Failed", group: "billing" },
  verification_approved: { label: "Verification Approved", group: "verification" },
  verification_rejected: { label: "Verification Rejected", group: "verification" },
  property_approved: { label: "Property Approved", group: "properties" },
  property_rejected: { label: "Property Rejected", group: "properties" },
  announcement: { label: "Announcement", group: "system" },
};

const DEFAULT_PREFS: ChannelPrefs = {
  in_app: true, sms: true, email: true, whatsapp: false, push: true,
  marketing: false, weeklyReports: true,
};

const DEFAULT_PROVIDERS: ProviderStatus = {
  sms: false, email: false, whatsapp: false, push: false,
};

const SEED: SpacesNotification[] = [
  { id: "n1", kind: "new_lead", title: "New lead from Serengeti Villa", body: "Amina Yusuf inquired about a 3-bedroom listing.", createdAt: new Date(Date.now() - 30 * 60_000).toISOString(), read: false, href: "/leads" },
  { id: "n2", kind: "viewing_request", title: "Viewing requested", body: "Tomorrow 10:00 · Masaki penthouse.", createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(), read: false, href: "/viewings" },
  { id: "n3", kind: "payment_successful", title: "Payment received", body: "Professional plan · 49,000 TZS via M-Pesa.", createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(), read: true, href: "/billing/history" },
  { id: "n4", kind: "deal_updated", title: "Deal moved to Negotiation", body: "Oyster Bay townhouse · offer submitted.", createdAt: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(), read: true, href: "/deals" },
  { id: "n5", kind: "verification_approved", title: "Identity verified", body: "Your trust badge is now active.", createdAt: new Date(Date.now() - 8 * 24 * 3600_000).toISOString(), read: true, href: "/trust" },
];

function readList(): SpacesNotification[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as SpacesNotification[];
    return Array.isArray(parsed) ? parsed : SEED;
  } catch { return SEED; }
}

function writeList(list: SpacesNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("spaces:notifications-changed"));
}

export function listNotifications(): SpacesNotification[] {
  return [...readList()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(): number {
  return readList().filter((n) => !n.read).length;
}

export function markRead(id: string) {
  writeList(readList().map((n) => (n.id === id ? { ...n, read: true } : n)));
}
export function markAllRead() {
  writeList(readList().map((n) => ({ ...n, read: true })));
}
export function removeNotification(id: string) {
  writeList(readList().filter((n) => n.id !== id));
}
export function pushNotification(n: Omit<SpacesNotification, "id" | "createdAt" | "read">) {
  const item: SpacesNotification = { ...n, id: `n${Date.now()}`, createdAt: new Date().toISOString(), read: false };
  writeList([item, ...readList()]);
}

export function getPrefs(): ChannelPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as ChannelPrefs) };
  } catch { return DEFAULT_PREFS; }
}
export function setPrefs(p: ChannelPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("spaces:notif-prefs-changed"));
}

export function getProviders(): ProviderStatus {
  if (typeof window === "undefined") return DEFAULT_PROVIDERS;
  try {
    const raw = window.localStorage.getItem(PROV_KEY);
    if (!raw) return DEFAULT_PROVIDERS;
    return { ...DEFAULT_PROVIDERS, ...(JSON.parse(raw) as ProviderStatus) };
  } catch { return DEFAULT_PROVIDERS; }
}
export function setProviders(p: ProviderStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROV_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("spaces:notif-providers-changed"));
}
export function anyProviderConfigured(): boolean {
  const p = getProviders();
  return p.sms || p.email || p.whatsapp || p.push;
}
