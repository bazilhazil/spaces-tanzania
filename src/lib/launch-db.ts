import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import { fetchBackupConfig } from "@/lib/backup-db";
import { phoneCodeAvailable } from "@/lib/phone-otp.functions";
import { onlinePaymentsAvailable, bankTransferDetails } from "@/lib/selcom.functions";

/**
 * Admin Operations Center — launch readiness, platform health, pending work and
 * recent activity.
 *
 * Everything here is derived from real records and real server-side capability
 * probes. Nothing is simulated: a service is only reported as working when the
 * check actually succeeds, and Selcom stays "pending production credentials"
 * until the server reports configured credentials.
 */

export type ReadyState = "ready" | "pending" | "action";
export type HealthState = "green" | "yellow" | "red";

export interface ChecklistItem {
  id: string;
  label: string;
  state: ReadyState;
  detail: string;
  section?: string; // admin section to open
}

export interface HealthItem {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
}

export interface PendingItem {
  id: string;
  label: string;
  count: number;
  section: string;
}

export interface ActivityItem {
  id: string;
  kind:
    | "user_new"
    | "property_new"
    | "lead_new"
    | "viewing_new"
    | "deal_new"
    | "payment_paid"
    | "property_verified"
    | "review_new"
    | "report_new";
  text: string;
  at: string;
}

export interface LaunchReport {
  checklist: ChecklistItem[];
  health: HealthItem[];
  pending: PendingItem[];
  activity: ActivityItem[];
}

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function count(table: string, build: (q: any) => any = (q) => q): Promise<number | null> {
  try {
    const { count: c, error } = await build(
      supabase.from(table as never).select("id", { count: "exact", head: true }),
    );
    if (error) return null;
    return c ?? 0;
  } catch {
    return null;
  }
}


async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export async function fetchLaunchReport(): Promise<LaunchReport> {
  const [
    properties,
    media,
    leads,
    viewings,
    deals,
    reviews,
    notifications,
    users,
    paidPayments,
    pendingProperties,
    pendingVerifications,
    pendingViewings,
    openDeals,
    failedPayments,
    pendingPayments,
    openReports,
    reviewProperties,
    pendingReviews,
    backup,
    smsProbe,
    payProbe,
    storageProbe,
    authProbe,
    bankProbe,
    rlsProbe,
  ] = await Promise.all([

    count("properties"),
    count("property_media"),
    count("leads"),
    count("bookings"),
    count("deals"),
    count("reviews"),
    count("notifications"),
    count("profiles"),
    count("payments", (q) => q.in("status", ["paid", "succeeded"])),
    count("properties", (q) => q.eq("status", "pending")),
    count("verification_requests", (q) => q.eq("status", "pending")),
    count("bookings", (q) => q.eq("status", "pending")),
    count("deals", (q) => q.not("stage", "in", "(completed,cancelled)")),
    count("payments", (q) => q.eq("status", "failed")),
    count("payments", (q) => q.in("status", ["pending", "processing"])),
    count("safety_reports", (q) => q.in("status", ["new", "under_review", "more_info"])),
    count("properties", (q) => q.eq("under_review", true)),
    count("reviews", (q) => q.eq("status", "pending")),
    safe(fetchBackupConfig, null),
    safe(async () => (await phoneCodeAvailable()) as { available?: boolean }, null),
    safe(async () => (await onlinePaymentsAvailable()) as { available?: boolean }, null),
    safe(async () => {
      const { error } = await supabase.storage.from("property-media").list("", { limit: 1 });
      return !error;
    }, false),
    safe(async () => {
      const { data, error } = await supabase.auth.getUser();
      return !error && Boolean(data.user);
    }, false),
    safe(async () => {
      const b = (await bankTransferDetails()) as { bank_name?: string; account_number?: string };
      return Boolean(b?.bank_name && b?.account_number);
    }, false),
    safe(async () => {
      // Real RLS probe: a protected table must never return rows to a normal session.
      const { data, error } = await supabase
        .from("phone_otp_codes" as never)
        .select("id")
        .limit(1);
      return Boolean(error) || (data?.length ?? 0) === 0;
    }, false),
  ]);


  const dbUp = properties !== null && users !== null;
  const smsReady = Boolean(smsProbe?.available);
  const payReady = Boolean(payProbe?.available);
  const backupReady = Boolean(backup?.configured);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const onProductionDomain = host === "spacestz.com" || host === "www.spacestz.com";
  const httpsOk = typeof window !== "undefined" ? window.location.protocol === "https:" : false;
  const domainReady = onProductionDomain && httpsOk;
  const bankReady = Boolean(bankProbe);
  const paymentsReady = payReady || bankReady;
  const securityReady = Boolean(rlsProbe);


  const yes = (n: number | null) => (n ?? 0) > 0;

  const checklist: ChecklistItem[] = [
    {
      id: "company",
      label: "Company information",
      state: COMPANY.email && COMPANY.phone && COMPANY.address ? "ready" : "action",
      detail: COMPANY.email ? `${COMPANY.legalName} · ${COMPANY.email}` : "Contact details missing",
      section: "settings",
    },
    {
      id: "domain",
      label: "Domain configured",
      state: domainReady ? "ready" : "pending",
      detail: domainReady
        ? "Served from spacestz.com over HTTPS"
        : `Not verified from here — this session is on ${host || "an unknown host"}. Open the checklist on spacestz.com to confirm.`,
    },

    {
      id: "auth",
      label: "Authentication",
      state: authProbe ? "ready" : "action",
      detail: authProbe ? "Sign-in sessions verified" : "Could not verify the signed-in session",
      section: "users",
    },
    {
      id: "email",
      label: "Email delivery",
      state: "pending",
      detail: "Transactional email provider not verified yet",
      section: "settings",
    },
    {
      id: "sms",
      label: "SMS provider",
      state: smsReady ? "ready" : "action",
      detail: smsReady ? "Sakura SMS credentials present on the server" : "SMS credentials required",
      section: "sms",
    },
    {
      id: "listings",
      label: "Property listings",
      state: yes(properties) ? "ready" : "pending",
      detail: yes(properties) ? plural(properties ?? 0, "listing", "listings") : "No listings published yet",
      section: "properties",
    },
    {
      id: "storage",
      label: "Property images & storage",
      state: storageProbe ? (yes(media) ? "ready" : "pending") : "action",
      detail: storageProbe
        ? yes(media)
          ? plural(media ?? 0, "media file", "media files")
          : "Storage reachable, no media uploaded yet"
        : "Storage could not be reached",
      section: "properties",
    },
    {
      id: "leads",
      label: "Leads",
      state: yes(leads) ? "ready" : "pending",
      detail: yes(leads) ? plural(leads ?? 0, "lead", "leads") : "No leads recorded yet",
      section: "leads",
    },
    {
      id: "viewings",
      label: "Viewing requests",
      state: yes(viewings) ? "ready" : "pending",
      detail: yes(viewings) ? plural(viewings ?? 0, "request", "requests") : "No viewing requests yet",
      section: "viewings",
    },
    {
      id: "deals",
      label: "Deals",
      state: yes(deals) ? "ready" : "pending",
      detail: yes(deals) ? plural(deals ?? 0, "deal", "deals") : "No deals created yet",
      section: "deals",
    },
    {
      id: "reviews",
      label: "Reviews",
      state: yes(reviews) ? "ready" : "pending",
      detail: yes(reviews) ? plural(reviews ?? 0, "review", "reviews") : "No reviews submitted yet",
      section: "reviews",
    },
    {
      id: "notifications",
      label: "Notifications",
      state: yes(notifications) ? "ready" : "pending",
      detail: yes(notifications) ? plural(notifications ?? 0, "notification", "notifications") : "No notifications sent yet",
      section: "notifications",
    },
    {
      id: "payments",
      label: "Payments configured",
      state: paymentsReady ? "ready" : "action",
      detail: paymentsReady
        ? `${payReady ? "Online payments" : "Bank transfer"} available · ${plural(paidPayments ?? 0, "confirmed payment", "confirmed payments")}`
        : "No payment route available yet — add bank transfer details or Selcom credentials",
      section: "payments",
    },
    {
      id: "selcom",
      label: "Selcom integration",
      state: payReady ? "ready" : "pending",
      detail: payReady ? "Credentials present on the server" : "Pending production credentials",
      section: "payments",
    },
    {
      id: "security",
      label: "Security checks",
      state: securityReady ? "ready" : "action",
      detail: securityReady
        ? "Access-rule probe passed: protected records stay unreadable"
        : "Access-rule probe returned protected records — review immediately",
      section: "superadmin",
    },

    {
      id: "backup",
      label: "Backup system",
      state: backupReady ? "ready" : "action",
      detail: backupReady
        ? backup?.lastSuccessAt
          ? `Last successful backup ${new Date(backup.lastSuccessAt).toLocaleDateString()}`
          : "Configured, awaiting first reported run"
        : "Backup configuration required",
      section: "data",
    },
  ];

  const health: HealthItem[] = [
    { id: "database", label: "Database", state: dbUp ? "green" : "red", detail: dbUp ? "Responding to queries" : "Not responding" },
    { id: "auth", label: "Authentication", state: authProbe ? "green" : "red", detail: authProbe ? "Sessions valid" : "Session check failed" },
    { id: "storage", label: "Storage", state: storageProbe ? "green" : "red", detail: storageProbe ? "Reachable" : "Unreachable" },
    {
      id: "notifications",
      label: "Notifications",
      state: yes(notifications) ? "green" : "yellow",
      detail: yes(notifications) ? "Delivering in-app notifications" : "No notifications delivered yet",
    },
    { id: "email", label: "Email", state: "yellow", detail: "Provider not verified" },
    { id: "sms", label: "SMS", state: smsReady ? "green" : "yellow", detail: smsReady ? "Provider configured" : "Provider credentials required" },
    {
      id: "payments",
      label: "Payments",
      state: payReady ? "green" : "yellow",
      detail: payReady ? "Online payments enabled" : "Pending production credentials",
    },
    {
      id: "backup",
      label: "Backup",
      state: backupReady ? "green" : "yellow",
      detail: backupReady ? "Configured" : "Not configured",
    },
  ];

  const pending: PendingItem[] = [
    { id: "prop-pending", label: "Properties awaiting approval", count: pendingProperties ?? 0, section: "properties" },
    { id: "prop-review", label: "Properties needing review", count: reviewProperties ?? 0, section: "properties" },
    { id: "verif", label: "Pending verification requests", count: pendingVerifications ?? 0, section: "verification" },
    { id: "viewings", label: "Pending viewing requests", count: pendingViewings ?? 0, section: "viewings" },
    { id: "deals", label: "Open deals", count: openDeals ?? 0, section: "deals" },
    { id: "pay-failed", label: "Failed payments", count: failedPayments ?? 0, section: "payments" },
    { id: "pay-pending", label: "Payments awaiting verification", count: pendingPayments ?? 0, section: "payments" },
    { id: "reports", label: "Open reports", count: openReports ?? 0, section: "reports" },
    { id: "reviews", label: "Reviews awaiting moderation", count: pendingReviews ?? 0, section: "reviews" },
  ].filter((p) => p.count > 0);

  const activity = await fetchPlatformActivity(12);

  return { checklist, health, pending, activity };
}

export async function fetchPlatformActivity(limit = 12): Promise<ActivityItem[]> {
  const q = <T,>(p: PromiseLike<{ data: T[] | null }>) => Promise.resolve(p).then((r) => r.data ?? []).catch(() => [] as T[]);

  const [profiles, props, leads, bookings, deals, payments, reviews, reports] = await Promise.all([
    q<Row>(supabase.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("properties").select("id,title,created_at,verified").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("leads").select("id,visitor_name,created_at").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("bookings").select("id,buyer_name,created_at").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("deals").select("id,reference,created_at").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("payments").select("id,amount,currency,status,paid_at,created_at").in("status", ["paid", "succeeded"]).order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("reviews").select("id,rating,created_at").order("created_at", { ascending: false }).limit(limit)),
    q<Row>(supabase.from("safety_reports").select("id,reference,reason,created_at").order("created_at", { ascending: false }).limit(limit)),
  ]);

  const s = (v: unknown, fallback = "") => (typeof v === "string" && v ? v : fallback);
  const nf = new Intl.NumberFormat("en-US");

  const items: ActivityItem[] = [
    ...profiles.map((p) => ({ id: `u-${s(p["id"])}`, kind: "user_new" as const, text: `${s(p["full_name"], "A new member")} registered`, at: s(p["created_at"]) })),
    ...props.flatMap((p) => {
      const base: ActivityItem = { id: `p-${s(p["id"])}`, kind: "property_new", text: `New space listed: ${s(p["title"], "Untitled")}`, at: s(p["created_at"]) };
      return p["verified"] === true
        ? [base, { id: `pv-${s(p["id"])}`, kind: "property_verified" as const, text: `Space verified: ${s(p["title"], "Untitled")}`, at: s(p["created_at"]) }]
        : [base];
    }),
    ...leads.map((l) => ({ id: `l-${s(l["id"])}`, kind: "lead_new" as const, text: `New lead from ${s(l["visitor_name"], "a visitor")}`, at: s(l["created_at"]) })),
    ...bookings.map((b) => ({ id: `b-${s(b["id"])}`, kind: "viewing_new" as const, text: `Viewing requested by ${s(b["buyer_name"], "a buyer")}`, at: s(b["created_at"]) })),
    ...deals.map((d) => ({ id: `d-${s(d["id"])}`, kind: "deal_new" as const, text: `Deal created: ${s(d["reference"], "—")}`, at: s(d["created_at"]) })),
    ...payments.map((p) => ({
      id: `pay-${s(p["id"])}`,
      kind: "payment_paid" as const,
      text: `Payment received: ${s(p["currency"], "TZS")} ${nf.format(Math.round(Number(p["amount"] ?? 0)))}`,
      at: s(p["paid_at"]) || s(p["created_at"]),
    })),
    ...reviews.map((r) => ({ id: `rv-${s(r["id"])}`, kind: "review_new" as const, text: `Review submitted (${Number(r["rating"] ?? 0)}★)`, at: s(r["created_at"]) })),
    ...reports.map((r) => ({ id: `rp-${s(r["id"])}`, kind: "report_new" as const, text: `Report submitted: ${s(r["reason"], "—")}`, at: s(r["created_at"]) })),
  ].filter((i) => i.at);

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}
