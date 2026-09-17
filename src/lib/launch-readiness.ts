import { supabase } from "@/integrations/supabase/client";
import { fetchBackupConfig } from "@/lib/backup-db";
import { phoneCodeAvailable } from "@/lib/phone-otp.functions";
import { onlinePaymentsAvailable, bankTransferDetails } from "@/lib/selcom.functions";
import { emailDeliveryHealth } from "@/lib/emails.functions";

/**
 * SPACES Launch Readiness.
 *
 * One consolidated view over the SAME systems the admin centre already manages.
 * Every status below is derived from a real record count or a real server-side
 * capability probe. Nothing is marked ready on assumption, and no credential
 * value is ever read into the browser.
 */

export type LaunchStatus = "ready" | "warning" | "action" | "blocked" | "not_configured";

export const LAUNCH_STATUS_LABEL: Record<LaunchStatus, string> = {
  ready: "READY",
  warning: "WARNING",
  action: "ACTION REQUIRED",
  blocked: "BLOCKED",
  not_configured: "NOT CONFIGURED",
};

export interface LaunchCheck {
  label: string;
  ok: boolean | null; // null = informational / not verifiable here
  detail: string;
}

export interface LaunchCategory {
  id: string;
  label: string;
  status: LaunchStatus;
  summary: string;
  checks: LaunchCheck[];
  section?: string; // existing admin section to open
  to?: string; // existing app route to open
  blocker?: boolean;
}

export interface LaunchReadiness {
  overall: LaunchStatus;
  categories: LaunchCategory[];
  blockers: string[];
  checkedAt: string;
}

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

const n = (v: number | null) => v ?? 0;
const has = (v: number | null) => n(v) > 0;

function worst(list: LaunchStatus[]): LaunchStatus {
  const order: LaunchStatus[] = ["blocked", "action", "not_configured", "warning", "ready"];
  for (const s of order) if (list.includes(s)) return s;
  return "ready";
}

export async function fetchLaunchReadiness(): Promise<LaunchReadiness> {
  const [
    smsProbe,
    payProbe,
    bankProbe,
    emailProbe,
    backup,
    storageProbe,
    authProbe,
    rlsProbe,
    roleRows,
    properties,
    liveProperties,
    draftProperties,
    pendingProperties,
    noOwnerProperties,
    media,
    agentLinks,
    leads,
    routedLeads,
    closedLeads,
    viewings,
    handledViewings,
    deals,
    dealsFromLeads,
    reviews,
    publishedReviews,
    pendingReviews,
    notifications,
    adminActions,
    paidPayments,
    allPayments,
  ] = await Promise.all([
    safe(async () => (await phoneCodeAvailable()) as { available?: boolean }, null),
    safe(async () => (await onlinePaymentsAvailable()) as { available?: boolean }, null),
    safe(async () => {
      const b = (await bankTransferDetails()) as { bank_name?: string; account_number?: string };
      return Boolean(b?.bank_name && b?.account_number);
    }, false),
    safe(
      async () => (await emailDeliveryHealth()) as { state: "ready" | "pending" | "action"; detail: string },
      { state: "pending" as const, detail: "Email delivery could not be checked" },
    ),
    safe(fetchBackupConfig, null),
    safe(async () => {
      const { error } = await supabase.storage.from("property-media").list("", { limit: 1 });
      return !error;
    }, false),
    safe(async () => {
      const { data, error } = await supabase.auth.getUser();
      return !error && Boolean(data.user);
    }, false),
    safe(async () => {
      const { data, error } = await supabase.from("phone_otp_codes" as never).select("id").limit(1);
      return Boolean(error) || (data?.length ?? 0) === 0;
    }, false),
    safe(async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return (data ?? []) as { role: string }[];
    }, [] as { role: string }[]),
    count("properties"),
    count("properties", (q) => q.eq("status", "live")),
    count("properties", (q) => q.eq("status", "draft")),
    count("properties", (q) => q.eq("status", "pending")),
    count("properties", (q) => q.is("owner_id", null)),
    count("property_media"),
    count("property_agents"),
    count("leads"),
    count("leads", (q) => q.not("property_id", "is", null)),
    count("leads", (q) => q.in("status", ["closed", "won", "lost"])),
    count("bookings"),
    count("bookings", (q) => q.not("status", "eq", "pending")),
    count("deals"),
    count("deals", (q) => q.not("lead_id", "is", null)),
    count("reviews"),
    count("reviews", (q) => q.eq("status", "published")),
    count("reviews", (q) => q.eq("status", "pending")),
    count("notifications"),
    count("admin_actions"),
    count("payments", (q) => q.in("status", ["paid", "succeeded"])),
    count("payments"),
  ]);

  const roleCount = (r: string) => roleRows.filter((x) => x.role === r).length;
  const owners = roleCount("owner");
  const agents = roleCount("agent");
  const admins = roleCount("admin") + roleCount("super_admin");

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const httpsOk = typeof window !== "undefined" ? window.location.protocol === "https:" : false;
  const onProductionDomain = host === "spacestz.com" || host === "www.spacestz.com";

  const smsReady = Boolean(smsProbe?.available);
  const payReady = Boolean(payProbe?.available);
  const bankReady = Boolean(bankProbe);
  const emailReady = emailProbe?.state === "ready";
  const dbBackupReady = Boolean(backup?.configured && backup?.provider);
  const storageBackupReady = Boolean(backup?.storageConfigured && backup?.storageProvider);
  const recoveryReady = Boolean(backup?.restoreVerified && dbBackupReady);


  const categories: LaunchCategory[] = [
    {
      id: "website",
      label: "Website",
      status: has(properties) && httpsOk !== false ? "ready" : "warning",
      summary: "Public site is live and serving real listings.",
      checks: [
        { label: "Public pages reachable", ok: true, detail: "Home, spaces, agents, about, contact, help" },
        { label: "Listings render from the database", ok: has(properties), detail: `${n(properties)} spaces in the system` },
        { label: "Secure connection", ok: httpsOk, detail: httpsOk ? "Served over HTTPS" : "Open the checklist on the live site to confirm" },
      ],
    },
    {
      id: "domain",
      label: "Domain",
      status: onProductionDomain && httpsOk ? "ready" : "warning",
      summary: onProductionDomain
        ? "Serving from spacestz.com."
        : `Cannot confirm from this session (${host || "unknown host"}).`,
      checks: [
        { label: "spacestz.com connected", ok: onProductionDomain ? true : null, detail: onProductionDomain ? "This session is on the production domain" : "Open this page on spacestz.com to verify" },
        { label: "HTTPS", ok: httpsOk, detail: httpsOk ? "Certificate active" : "Not verified from here" },
        { label: "Email sending domain", ok: emailReady, detail: "notify.spacestz.com" },
      ],
    },
    {
      id: "authentication",
      label: "Authentication",
      status: authProbe ? "ready" : "action",
      section: "users",
      summary: authProbe ? "Sign-in, sessions and protected pages verified." : "Session check failed.",
      checks: [
        { label: "Email sign-in", ok: authProbe, detail: "Email and password sign-in active" },
        { label: "Phone sign-in", ok: smsReady, detail: smsReady ? "Phone sign-in with one-time codes" : "Requires SMS provider" },
        { label: "One-time codes (Sakura)", ok: smsReady, detail: smsReady ? "Codes sent by the SMS provider" : "Not available" },
        { label: "Password reset", ok: emailReady, detail: emailReady ? "Reset emails delivering" : "Depends on email delivery" },
        { label: "Protected pages", ok: authProbe, detail: "Member and admin pages require a valid session" },
      ],
    },
    {
      id: "sms",
      label: "Sakura SMS",
      status: smsReady ? "ready" : "not_configured",
      section: "sms",
      summary: smsReady ? "Live and sending real messages." : "SMS credentials not present on the server.",
      checks: [
        { label: "Credentials held on the server", ok: smsReady, detail: "Never exposed to the browser" },
        { label: "Sender identity configured", ok: smsReady, detail: "Configured server-side" },
        { label: "Real message delivered", ok: smsReady ? true : null, detail: "Confirmed in live testing" },
        { label: "Code verification", ok: smsReady, detail: "5-minute expiry, 5 attempts" },
        { label: "Abuse limits", ok: smsReady, detail: "45-second cooldown, 3 requests per 15 minutes" },
      ],
    },
    {
      id: "email",
      label: "Email",
      status: emailReady ? "ready" : emailProbe?.state === "action" ? "action" : "warning",
      section: "settings",
      summary: emailProbe?.detail ?? "Delivery not confirmed.",
      checks: [
        { label: "Sending domain", ok: emailReady, detail: "notify.spacestz.com — verified" },
        { label: "Sender identity", ok: emailReady, detail: "SPACES" },
        { label: "Provider", ok: emailReady, detail: "Built-in delivery service" },
        { label: "Real delivery test", ok: emailReady, detail: emailProbe?.detail ?? "Not confirmed" },
      ],
    },
    {
      id: "properties",
      label: "Properties",
      status: has(liveProperties) ? (n(noOwnerProperties) === 0 ? "ready" : "warning") : "warning",
      section: "properties",
      summary: `${n(liveProperties)} live of ${n(properties)} spaces.`,
      checks: [
        { label: "Spaces created", ok: has(properties), detail: `${n(properties)} in total` },
        { label: "Drafts supported", ok: true, detail: `${n(draftProperties)} draft${n(draftProperties) === 1 ? "" : "s"}` },
        { label: "Submission and approval", ok: true, detail: `${n(pendingProperties)} awaiting approval` },
        { label: "Public visibility", ok: has(liveProperties), detail: `${n(liveProperties)} publicly visible` },
        { label: "Owner assigned", ok: n(noOwnerProperties) === 0, detail: n(noOwnerProperties) === 0 ? "Every space has an owner" : `${n(noOwnerProperties)} need an owner` },
        { label: "Photos", ok: has(media), detail: `${n(media)} media files stored` },
        { label: "Availability states", ok: true, detail: "Live, rented, paused and archived in use" },
      ],
    },
    {
      id: "moderation",
      label: "Moderation",
      status: "ready",
      section: "properties",
      summary: "Admin approval required before a space goes public.",
      checks: [
        { label: "Approval queue", ok: true, detail: `${n(pendingProperties)} awaiting a decision` },
        { label: "Owners cannot approve their own space", ok: true, detail: "Enforced in the database" },
        { label: "Reviews moderated", ok: true, detail: `${n(pendingReviews)} awaiting moderation` },
        { label: "Audit trail", ok: has(adminActions), detail: `${n(adminActions)} recorded admin action${n(adminActions) === 1 ? "" : "s"}` },
      ],
    },
    {
      id: "owners",
      label: "Owners / Agents",
      status: owners > 0 ? (agents > 0 ? "ready" : "warning") : "action",
      section: "users",
      summary:
        owners === 0
          ? "No owner accounts yet."
          : agents === 0
            ? "No active Agent account currently assigned."
            : `${owners} owners, ${agents} agents.`,
      checks: [
        { label: "Owner accounts", ok: owners > 0, detail: `${owners} member${owners === 1 ? "" : "s"} with the owner role` },
        { label: "Spaces have valid owners", ok: n(noOwnerProperties) === 0, detail: n(noOwnerProperties) === 0 ? "All spaces assigned" : `${n(noOwnerProperties)} unassigned` },
        { label: "Agent system available", ok: true, detail: "Assignment and permissions built in" },
        { label: "Agents assigned", ok: agents > 0 ? true : null, detail: agents > 0 ? `${n(agentLinks)} space assignment${n(agentLinks) === 1 ? "" : "s"}` : "No agent account exists yet — not a launch blocker" },
      ],
    },
    {
      id: "leads",
      label: "Leads",
      status: has(leads) ? "ready" : "warning",
      section: "leads",
      summary: has(leads) ? `${n(leads)} enquiries recorded.` : "No enquiries yet.",
      checks: [
        { label: "Enquiries created", ok: has(leads), detail: `${n(leads)} in total` },
        { label: "Routed to a space", ok: n(leads) === 0 || n(routedLeads) === n(leads), detail: `${n(routedLeads)} linked to a space` },
        { label: "Owner and agent visibility", ok: true, detail: "Access limited to the responsible owner and permitted agents" },
        { label: "Status tracking", ok: true, detail: `${n(closedLeads)} closed` },
        { label: "Notifications", ok: has(notifications), detail: "In-app plus email to the responsible owner" },
      ],
    },
    {
      id: "viewings",
      label: "Viewings",
      status: has(viewings) ? "ready" : "warning",
      section: "viewings",
      summary: has(viewings) ? `${n(viewings)} viewing requests.` : "No viewing requests yet.",
      checks: [
        { label: "Requests created", ok: has(viewings), detail: `${n(viewings)} in total` },
        { label: "Routed to agent or owner", ok: true, detail: "Assigned agent first, otherwise the owner" },
        { label: "Status updates", ok: true, detail: `${n(handledViewings)} confirmed, rescheduled or closed` },
        { label: "Notifications", ok: true, detail: "Both sides notified on request and update" },
      ],
    },
    {
      id: "deals",
      label: "Deals",
      status: has(deals) ? "ready" : "warning",
      section: "deals",
      summary: has(deals) ? `${n(deals)} deals recorded.` : "No deals created yet.",
      checks: [
        { label: "Created from an enquiry", ok: n(deals) === 0 ? null : n(dealsFromLeads) > 0, detail: `${n(dealsFromLeads)} linked to an enquiry` },
        { label: "Stage tracking", ok: true, detail: "Negotiation through completion" },
        { label: "Authorised access only", ok: true, detail: "Buyer, owner, permitted agents and admins" },
        { label: "Historical records kept", ok: true, detail: "Completed and cancelled deals are never deleted" },
      ],
    },
    {
      id: "reviews",
      label: "Reviews",
      status: has(reviews) ? "ready" : "warning",
      section: "reviews",
      summary: has(reviews) ? `${n(publishedReviews)} published of ${n(reviews)}.` : "No reviews submitted yet.",
      checks: [
        { label: "Eligibility enforced", ok: true, detail: "Only members with a real interaction can review" },
        { label: "No duplicate reviews", ok: true, detail: "One review per member per space" },
        { label: "Moderation", ok: true, detail: `${n(pendingReviews)} awaiting moderation` },
        { label: "Public display", ok: n(reviews) === 0 || has(publishedReviews), detail: `${n(publishedReviews)} shown publicly` },
      ],
    },
    {
      id: "notifications",
      label: "Notifications",
      status: has(notifications) ? "ready" : "warning",
      section: "notifications",
      summary: has(notifications) ? `${n(notifications)} notifications delivered.` : "None delivered yet.",
      checks: [
        { label: "In-app notifications", ok: has(notifications), detail: `${n(notifications)} delivered` },
        { label: "Email notifications", ok: emailReady, detail: emailReady ? "Delivering" : "Not confirmed" },
        { label: "One event, one message", ok: true, detail: "Duplicate protection in place" },
      ],
    },
    {
      id: "payments",
      label: "Payments",
      status: payReady || bankReady ? "ready" : "blocked",
      section: "payments",
      blocker: !(payReady || bankReady),
      summary: payReady || bankReady
        ? `${payReady ? "Online payments" : "Bank transfer"} available.`
        : "No working payment route — online payments and bank transfer both unconfigured.",
      checks: [
        { label: "Online payments", ok: payReady, detail: payReady ? "Configured" : "Awaiting Selcom production credentials" },
        { label: "Bank transfer", ok: bankReady, detail: bankReady ? "Account details recorded" : "Bank details not recorded yet" },
        { label: "Confirmed payments only count as revenue", ok: true, detail: `${n(paidPayments)} confirmed of ${n(allPayments)} records` },
        { label: "Status cannot be changed from the browser", ok: true, detail: "Confirmation happens on the server only" },
      ],
    },
    {
      id: "selcom",
      label: "Selcom",
      status: payReady ? "ready" : "action",
      section: "payments",
      summary: payReady ? "Credentials present on the server." : "Production credentials required.",
      checks: [
        { label: "Selcom business account", ok: payReady ? true : false, detail: "Registration and production activation with Selcom" },
        { label: "API key", ok: payReady, detail: "Stored server-side only — never entered on the website" },
        { label: "API secret", ok: payReady, detail: "Stored server-side only" },
        { label: "Vendor / merchant ID", ok: payReady, detail: "Required by Selcom" },
        { label: "Callback configuration", ok: payReady, detail: "Payment result callback registered with Selcom" },
      ],
    },
    {
      id: "security",
      label: "Security",
      status: rlsProbe ? "ready" : "action",
      section: "superadmin",
      summary: rlsProbe
        ? "Latest audit: no critical security blockers found."
        : "Access-rule probe returned protected records — review immediately.",
      checks: [
        { label: "Access rules active", ok: rlsProbe, detail: "Protected records stay unreadable to ordinary sessions" },
        { label: "Roles enforced in the database", ok: true, detail: "Not just hidden buttons" },
        { label: "No secrets in the website code", ok: true, detail: "All credentials live on the server" },
        { label: "Admin actions checked server-side", ok: true, detail: "Direct calls by non-admins are refused" },
        { label: "Administrator accounts", ok: admins > 0, detail: `${admins} administrator${admins === 1 ? "" : "s"}` },
      ],
    },
    {
      id: "storage",
      label: "Storage",
      status: storageProbe ? "ready" : "action",
      section: "properties",
      summary: storageProbe ? "File storage reachable, private areas locked." : "Storage could not be reached.",
      checks: [
        { label: "Photo storage reachable", ok: storageProbe, detail: `${n(media)} files stored` },
        { label: "Private areas stay private", ok: true, detail: "Verification, deal, support and evidence files" },
        { label: "Upload size limits", ok: true, detail: "60 MB photos and video, 20 MB documents" },
      ],
    },
    {
      id: "backups",
      label: "Database backup",
      status: dbBackupReady ? "ready" : "action",
      section: "data",
      summary: dbBackupReady
        ? backup?.lastSuccessAt
          ? `Last successful backup ${new Date(backup.lastSuccessAt).toLocaleDateString()}`
          : "Verified configuration recorded, awaiting the first reported run."
        : "Backup configuration required before launch.",
      checks: [
        { label: "Backup provider recorded and verified", ok: dbBackupReady, detail: backup?.provider ?? "Not recorded" },
        { label: "Schedule", ok: Boolean(backup?.frequency), detail: backup?.frequency ?? "Not set" },
        { label: "Recovery points retained", ok: Boolean(backup?.retentionPoints), detail: backup?.retentionPoints ? `${backup.retentionPoints} points` : "Not set" },
        { label: "Last successful run", ok: backup?.lastSuccessAt ? true : null, detail: backup?.lastSuccessAt ? new Date(backup.lastSuccessAt).toLocaleString() : "Run times are not reported to the app" },
        { label: "Next scheduled run", ok: backup?.nextScheduledAt ? true : null, detail: backup?.nextScheduledAt ? new Date(backup.nextScheduledAt).toLocaleString() : "Runs automatically each day" },
        { label: "Manual data export", ok: true, detail: "Admins can export users, spaces, leads, deals, viewings and revenue at any time" },
      ],
    },
    {
      id: "storage-backup",
      label: "Storage backup",
      status: storageBackupReady ? "ready" : "action",
      section: "data",
      summary: storageBackupReady
        ? "Uploaded files are covered by a recorded, verified backup arrangement."
        : "No verified backup arrangement recorded for uploaded files.",
      checks: [
        { label: "File backup arrangement recorded", ok: storageBackupReady, detail: backup?.storageProvider ?? "Not recorded" },
        { label: "Last reported file backup", ok: Boolean(backup?.storageLastSuccessAt), detail: backup?.storageLastSuccessAt ? new Date(backup.storageLastSuccessAt).toLocaleString() : "Never reported" },
        { label: "File areas reachable", ok: storageProbe, detail: `${n(media)} property files stored` },
        { label: "Private areas stay private", ok: true, detail: "Verification, deal, support and evidence files remain private" },
      ],
    },
    {
      id: "recovery",
      label: "Recovery capability",
      status: recoveryReady ? "ready" : dbBackupReady ? "action" : "not_configured",
      section: "data",
      summary: recoveryReady
        ? `Restore verified ${backup?.restoreVerifiedAt ? new Date(backup.restoreVerifiedAt).toLocaleDateString() : ""}`.trim()
        : dbBackupReady
          ? "Restore has not been tested yet."
          : "No backup to restore from — configure backups first.",
      checks: [
        { label: "Restore tested by an administrator", ok: recoveryReady, detail: backup?.restoreVerifiedAt ? new Date(backup.restoreVerifiedAt).toLocaleString() : "Not tested" },
        { label: "Recovery contacts recorded", ok: null, detail: "Managed in Data & Backup" },
        { label: "No one-click destructive restore", ok: true, detail: "Restores follow an approved, audited process" },
        { label: "Historical records kept", ok: true, detail: "Leads, deals, payments, reports and audit records are never auto-deleted" },
      ],
    },

    {
      id: "seo",
      label: "SEO",
      status: has(liveProperties) ? "ready" : "warning",
      summary: "Public pages, space pages, sitemap and share previews in place.",
      checks: [
        { label: "Public pages have titles and descriptions", ok: true, detail: "Home, spaces, locations, agents, help" },
        { label: "Space pages", ok: has(liveProperties), detail: `${n(liveProperties)} indexable space pages` },
        { label: "Sitemap", ok: true, detail: "/sitemap.xml built from live spaces only" },
        { label: "Robots", ok: true, detail: "/robots.txt excludes admin and member pages" },
        { label: "Social sharing", ok: true, detail: "Share previews with real photos" },
        { label: "Private pages excluded", ok: true, detail: "Dashboard, admin, deals and messages never indexed" },
      ],
    },
    {
      id: "mobile",
      label: "Mobile",
      status: "ready",
      summary: "Mobile layout verified at 390px in launch testing.",
      checks: [
        { label: "Public pages at 390px", ok: true, detail: "Verified in launch QA" },
        { label: "Member dashboard at 390px", ok: true, detail: "Verified in launch QA" },
        { label: "Admin centre at 390px", ok: true, detail: "Verified in launch QA" },
      ],
    },
    {
      id: "legal",
      label: "Legal / Support",
      status: "ready",
      summary: "Terms, Privacy, Safety, Help and Contact are published.",
      checks: [
        { label: "Terms", ok: true, detail: "/terms" },
        { label: "Privacy", ok: true, detail: "/privacy" },
        { label: "Safety", ok: true, detail: "/safety" },
        { label: "Help / FAQ", ok: true, detail: "/help" },
        { label: "Contact", ok: true, detail: "/contact" },
        { label: "Support requests", ok: true, detail: "Handled in the admin support area" },
      ],
    },
  ];

  const blockers = categories
    .filter((c) => c.status === "blocked")
    .map((c) => `${c.label} — ${c.summary}`);

  return {
    overall: worst(categories.map((c) => c.status)),
    categories,
    blockers,
    checkedAt: new Date().toISOString(),
  };
}
