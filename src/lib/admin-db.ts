import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";

/**
 * Admin Control Center data layer.
 *
 * Every value returned here is computed from the real database. There are no
 * demo listings, seeded users, fabricated revenue figures or invented counts.
 */

// ---------------------------------------------------------------- overview

export interface AdminOverview {
  properties: {
    total: number;
    live: number;
    pending: number;
    draft: number;
    rejected: number;
    paused: number;
    archived: number;
    sold: number;
    rented: number;
    verified: number;
    underReview: number;
  };
  users: { total: number; owners: number; agents: number; buyers: number; admins: number };
  activity: {
    leads: number;
    bookings: number;
    deals: number;
    dealsCompleted: number;
    reviews: number;
    reportsOpen: number;
    verificationsPending: number;
  };
  revenue: { paidTotal: number; currency: string; payments: number };
}

const EMPTY_OVERVIEW: AdminOverview = {
  properties: { total: 0, live: 0, pending: 0, draft: 0, rejected: 0, paused: 0, archived: 0, sold: 0, rented: 0, verified: 0, underReview: 0 },
  users: { total: 0, owners: 0, agents: 0, buyers: 0, admins: 0 },
  activity: { leads: 0, bookings: 0, deals: 0, dealsCompleted: 0, reviews: 0, reportsOpen: 0, verificationsPending: 0 },
  revenue: { paidTotal: 0, currency: "TZS", payments: 0 },
};

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [props, roles, profiles, leads, bookings, deals, reviews, reports, verifications, payments] = await Promise.all([
    supabase.from("properties").select("status,verified,under_review").limit(10000),
    supabase.from("user_roles").select("user_id,role").limit(10000),
    supabase.from("profiles").select("id").limit(10000),
    supabase.from("leads").select("id").limit(10000),
    supabase.from("bookings").select("id").limit(10000),
    supabase.from("deals").select("stage").limit(10000),
    supabase.from("reviews").select("id").limit(10000),
    supabase.from("safety_reports").select("status").limit(10000),
    supabase.from("verification_requests").select("status").limit(10000),
    supabase.from("payments").select("amount,currency,status").limit(10000),
  ]);

  const out: AdminOverview = JSON.parse(JSON.stringify(EMPTY_OVERVIEW));

  for (const p of ((props.data ?? []) as any[])) {
    out.properties.total += 1;
    const s = p.status as keyof AdminOverview["properties"];
    if (s in out.properties) (out.properties as any)[s] += 1;
    if (p.verified) out.properties.verified += 1;
    if (p.under_review) out.properties.underReview += 1;
  }

  out.users.total = ((profiles.data ?? []) as any[]).length;
  for (const r of ((roles.data ?? []) as any[])) {
    if (r.role === "owner") out.users.owners += 1;
    else if (r.role === "agent") out.users.agents += 1;
    else if (r.role === "buyer") out.users.buyers += 1;
    else out.users.admins += 1;
  }

  out.activity.leads = ((leads.data ?? []) as any[]).length;
  out.activity.bookings = ((bookings.data ?? []) as any[]).length;
  const dealRows = (deals.data ?? []) as any[];
  out.activity.deals = dealRows.length;
  out.activity.dealsCompleted = dealRows.filter((d) => d.stage === "completed").length;
  out.activity.reviews = ((reviews.data ?? []) as any[]).length;
  out.activity.reportsOpen = ((reports.data ?? []) as any[]).filter((r) => r.status === "new" || r.status === "under_review" || r.status === "more_info").length;
  out.activity.verificationsPending = ((verifications.data ?? []) as any[]).filter((v) => v.status === "pending").length;

  const payRows = ((payments.data ?? []) as any[]).filter((p) => p.status === "paid" || p.status === "succeeded");
  out.revenue.payments = payRows.length;
  out.revenue.paidTotal = payRows.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  out.revenue.currency = payRows[0]?.currency ?? "TZS";

  return out;
}

// ------------------------------------------------------- moderation queue

export interface AdminQueueItem {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  listingType: string;
  propertyType: string;
  status: string;
  verified: boolean;
  underReview: boolean;
  underReviewReason: string | null;
  rejectionReason: string | null;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  cover: string | null;
  quality: number;
}

/** Simple, deterministic completeness score from the record itself. */
function completeness(row: any, hasImage: boolean): number {
  const checks = [
    !!row.title,
    (row.description ?? "").length > 60,
    Number(row.price) > 0,
    !!row.region,
    !!row.district,
    !!row.ward,
    Number(row.area_sqm) > 0,
    Array.isArray(row.amenities) && row.amenities.length > 0,
    row.latitude != null && row.longitude != null,
    hasImage,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export type QueueFilter = "review" | "live" | "rejected" | "all";

export async function fetchModerationQueue(filter: QueueFilter = "review"): Promise<AdminQueueItem[]> {
  let query = supabase.from("properties").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "review") query = query.in("status", ["pending", "draft"]);
  else if (filter === "live") query = query.eq("status", "live");
  else if (filter === "rejected") query = query.eq("status", "rejected");

  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as any[];
  if (!rows.length) return [];

  const [{ data: media }, { data: owners }] = await Promise.all([
    supabase.from("property_media").select("property_id,storage_path,is_cover,position").in("property_id", rows.map((r) => r.id)),
    supabase.from("profiles").select("id,full_name").in("id", Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)))),
  ]);

  const coverPath = new Map<string, string>();
  for (const m of ((media ?? []) as any[]).slice().sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || (a.position ?? 0) - (b.position ?? 0))) {
    if (!coverPath.has(m.property_id)) coverPath.set(m.property_id, m.storage_path);
  }
  const covers = new Map<string, string>();
  await Promise.all(
    [...coverPath.entries()].map(async ([pid, path]) => {
      const url = await signedUrl(path);
      if (url) covers.set(pid, url);
    }),
  );
  const ownerNames = new Map(((owners ?? []) as any[]).map((o) => [o.id, o.full_name]));

  return rows.map((r) => {
    const cover = covers.get(r.id) ?? null;
    return {
      id: r.id,
      title: r.title ?? "Untitled listing",
      location: [r.ward, r.district, r.region].filter(Boolean).join(", ") || "—",
      price: Number(r.price ?? 0),
      currency: r.currency ?? "TZS",
      listingType: r.listing_type,
      propertyType: r.property_type,
      status: r.status,
      verified: r.verified === true,
      underReview: r.under_review === true,
      underReviewReason: r.under_review_reason ?? null,
      rejectionReason: r.rejection_reason ?? null,
      ownerId: r.owner_id,
      ownerName: ownerNames.get(r.owner_id) || "Unknown owner",
      createdAt: r.created_at,
      cover,
      quality: completeness(r, !!cover),
    };
  });
}

export type ModerationAction = "approve" | "request_changes" | "reject" | "suspend" | "archive" | "feature";

/** Writes the moderation decision to the real property record. */
export async function moderateProperty(id: string, action: ModerationAction, reason?: string) {
  const patch: Record<string, unknown> = {};
  switch (action) {
    case "approve":
      patch.status = "live";
      patch.under_review = false;
      patch.under_review_reason = null;
      patch.rejection_reason = null;
      break;
    case "request_changes":
      patch.under_review = true;
      patch.under_review_reason = reason ?? "Changes requested by moderation";
      break;
    case "reject":
      patch.status = "rejected";
      patch.rejection_reason = reason ?? "Rejected by moderation";
      patch.under_review = false;
      break;
    case "suspend":
      patch.status = "paused";
      break;
    case "archive":
      patch.status = "archived";
      break;
    case "feature":
      patch.featured = true;
      break;
  }
  const { error } = await supabase.from("properties").update(patch as never).eq("id", id);
  if (error) throw error;
}

// --------------------------------------------------------------- users

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  status: string;
  joined: string;
  listings: number;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const [{ data: profiles }, { data: roles }, { data: props }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,phone,account_status,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("user_roles").select("user_id,role").limit(5000),
    supabase.from("properties").select("owner_id").limit(10000),
  ]);
  const roleMap = new Map<string, string[]>();
  for (const r of ((roles ?? []) as any[])) {
    const list = roleMap.get(r.user_id) ?? [];
    list.push(r.role);
    roleMap.set(r.user_id, list);
  }
  const counts = new Map<string, number>();
  for (const p of ((props ?? []) as any[])) counts.set(p.owner_id, (counts.get(p.owner_id) ?? 0) + 1);

  return ((profiles ?? []) as any[]).map((p) => ({
    id: p.id,
    name: p.full_name || "Unnamed user",
    email: p.email ?? null,
    phone: p.phone ?? null,
    roles: roleMap.get(p.id) ?? [],
    status: p.account_status ?? "active",
    joined: p.created_at,
    listings: counts.get(p.id) ?? 0,
  }));
}

// ------------------------------------------------------------- reports

export interface AdminReport {
  id: string;
  reference: string;
  target: string;
  reason: string;
  status: string;
  priority: string;
  createdAt: string;
}

export async function fetchAdminReports(): Promise<AdminReport[]> {
  const { data } = await supabase
    .from("safety_reports")
    .select("id,reference,target_type,reason,status,priority,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: r.reference,
    target: r.target_type,
    reason: r.reason,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
  }));
}

// ------------------------------------------------------------ bookings

export interface AdminBooking {
  id: string;
  propertyTitle: string;
  buyerName: string;
  scheduledAt: string;
  status: string;
}

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("id,property_id,buyer_name,scheduled_at,status")
    .order("scheduled_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const { data: props } = await supabase
    .from("properties")
    .select("id,title")
    .in("id", Array.from(new Set(rows.map((r) => r.property_id).filter(Boolean))));
  const titles = new Map(((props ?? []) as any[]).map((p) => [p.id, p.title]));
  return rows.map((r) => ({
    id: r.id,
    propertyTitle: titles.get(r.property_id) || "—",
    buyerName: r.buyer_name || "—",
    scheduledAt: r.scheduled_at,
    status: r.status,
  }));
}

// ------------------------------------------------------------ payments

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
  reference: string | null;
}

export async function fetchAdminPayments(): Promise<AdminPayment[]> {
  const { data } = await supabase
    .from("payments")
    .select("id,amount,currency,provider,status,created_at,reference,purpose")
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    amount: Number(p.amount ?? 0),
    currency: p.currency ?? "TZS",
    provider: p.provider,
    status: p.status,
    createdAt: p.created_at,
    reference: p.reference ?? null,
  }));
}

export interface AdminSubscription {
  plan: string;
  active: number;
  total: number;
}

export async function fetchAdminSubscriptions(): Promise<AdminSubscription[]> {
  const { data } = await supabase.from("subscriptions").select("plan,status").limit(5000);
  const map = new Map<string, { active: number; total: number }>();
  for (const s of ((data ?? []) as any[])) {
    const entry = map.get(s.plan) ?? { active: 0, total: 0 };
    entry.total += 1;
    if (s.status === "active") entry.active += 1;
    map.set(s.plan, entry);
  }
  return [...map.entries()].map(([plan, v]) => ({ plan, ...v }));
}

// ------------------------------------------------------------ activity

export interface AdminActivityItem {
  id: string;
  kind: "property_new" | "user_new" | "viewing_booked" | "report_filed" | "verification_pending" | "deal_completed";
  text: string;
  at: string;
}

export async function fetchAdminActivity(limit = 10): Promise<AdminActivityItem[]> {
  const [props, profiles, bookings, reports] = await Promise.all([
    supabase.from("properties").select("id,title,created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("bookings").select("id,buyer_name,created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("safety_reports").select("id,reference,reason,created_at").order("created_at", { ascending: false }).limit(limit),
  ]);

  const items: AdminActivityItem[] = [
    ...((props.data ?? []) as any[]).map((p) => ({ id: `p-${p.id}`, kind: "property_new" as const, text: p.title ?? "New listing", at: p.created_at })),
    ...((profiles.data ?? []) as any[]).map((p) => ({ id: `u-${p.id}`, kind: "user_new" as const, text: p.full_name || "New member joined", at: p.created_at })),
    ...((bookings.data ?? []) as any[]).map((b) => ({ id: `b-${b.id}`, kind: "viewing_booked" as const, text: `Viewing requested by ${b.buyer_name || "a buyer"}`, at: b.created_at })),
    ...((reports.data ?? []) as any[]).map((r) => ({ id: `r-${r.id}`, kind: "report_filed" as const, text: `${r.reference}: ${r.reason}`, at: r.created_at })),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

// -------------------------------------------------------------- series

export interface MonthPoint {
  label: string;
  value: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketByMonth(dates: string[], months = 12): MonthPoint[] {
  const now = new Date();
  const buckets: MonthPoint[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    index.set(key, buckets.length);
    buckets.push({ label: MONTH_LABELS[d.getMonth()], value: 0 });
  }
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const i = index.get(key);
    if (i !== undefined) buckets[i].value += 1;
  }
  return buckets;
}

export interface AdminSeries {
  listings: MonthPoint[];
  users: MonthPoint[];
  views: MonthPoint[];
  hasData: boolean;
}

export async function fetchAdminSeries(): Promise<AdminSeries> {
  const [props, profiles, views] = await Promise.all([
    supabase.from("properties").select("created_at").limit(10000),
    supabase.from("profiles").select("created_at").limit(10000),
    supabase.from("property_views").select("created_at").limit(10000),
  ]);
  const listings = bucketByMonth(((props.data ?? []) as any[]).map((r) => r.created_at));
  const users = bucketByMonth(((profiles.data ?? []) as any[]).map((r) => r.created_at));
  const viewSeries = bucketByMonth(((views.data ?? []) as any[]).map((r) => r.created_at));
  const hasData = [listings, users, viewSeries].some((s) => s.some((p) => p.value > 0));
  return { listings, users, views: viewSeries, hasData };
}

/** Real property-type distribution across all listings. */
export async function fetchPropertyTypeMix(): Promise<{ name: string; count: number; pct: number }[]> {
  const { data } = await supabase.from("properties").select("property_type").limit(10000);
  const rows = (data ?? []) as any[];
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.property_type, (counts.get(r.property_type) ?? 0) + 1);
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/** Real region distribution across all listings. */
export async function fetchRegionMix(): Promise<{ name: string; count: number; pct: number }[]> {
  const { data } = await supabase.from("properties").select("region").limit(10000);
  const rows = ((data ?? []) as any[]).filter((r) => r.region);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
