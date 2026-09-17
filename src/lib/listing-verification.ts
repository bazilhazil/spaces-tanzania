// SPACES listing verification operations.
//
// Reads the existing properties / property_reports / safety_reports / leads /
// bookings / property_agents tables and writes only through the existing
// moderation columns plus the shared admin_actions audit log. No second
// verification system, no invented data.
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin-ops";
import { displayNameOr } from "@/lib/display-name";

export type ListingVerificationState =
  | "in_progress"
  | "more_info"
  | "verified"
  | "issue"
  | "paused";

export const LISTING_STATE_LABEL: Record<ListingVerificationState, string> = {
  in_progress: "Verification in progress",
  more_info: "Information requested",
  verified: "Verified by SPACES",
  issue: "Verification issue",
  paused: "Paused",
};

export interface ListingVerificationItem {
  id: string;
  title: string;
  reference: string;
  ownerId: string;
  ownerName: string;
  agentName: string | null;
  location: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  submittedAt: string;
  state: ListingVerificationState;
  reason: string | null;
  reports: number;
  openReports: number;
  views: number;
  leads: number;
  viewings: number;
  ageDays: number;
  overdue: boolean;
}

export interface ListingVerificationMetrics {
  live: number;
  verified: number;
  inProgress: number;
  moreInfo: number;
  issue: number;
  paused: number;
  /** Average days a still-unverified live listing has waited; null when too few records. */
  averageAgeDays: number | null;
  overdue: number;
  slaDays: number;
}

function reference(id: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear().toString().slice(-2);
  return `SP-${year}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function stateFor(row: {
  status: string;
  verified: boolean | null;
  verification_status: string | null;
}): ListingVerificationState {
  if (row.verified === true) return "verified";
  if (row.status === "paused") return "paused";
  if (row.verification_status === "issue") return "issue";
  if (row.verification_status === "more_info") return "more_info";
  return "in_progress";
}

export async function fetchVerificationSlaDays(): Promise<number> {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "verification_sla_days")
    .maybeSingle();
  const days = Number((data as { value?: { days?: number } } | null)?.value?.days);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export async function setVerificationSlaDays(days: number): Promise<void> {
  const { error } = await supabase
    .from("admin_settings")
    .update({ value: { days } as never })
    .eq("key", "verification_sla_days");
  if (error) throw error;
  await logAdminAction({
    action: "verification_sla_updated",
    targetType: "setting",
    targetLabel: "verification_sla_days",
    meta: { days },
  });
}

export interface ListingVerificationData {
  items: ListingVerificationItem[];
  metrics: ListingVerificationMetrics;
}

export async function fetchListingVerification(): Promise<ListingVerificationData> {
  const slaDays = await fetchVerificationSlaDays();

  const [props, reports, safety, leads, bookings, agents] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id,owner_id,title,region,district,ward,property_type,listing_type,price,currency,status,verified,verification_status,under_review_reason,rejection_reason,view_count,created_at",
      )
      .is("deleted_at", null)
      .limit(2000),
    supabase.from("property_reports").select("property_id,status").limit(5000),
    supabase.from("safety_reports").select("property_id,status").not("property_id", "is", null).limit(5000),
    supabase.from("leads").select("property_id").is("deleted_at", null).limit(5000),
    supabase.from("bookings").select("property_id").is("deleted_at", null).limit(5000),
    supabase.from("property_agents").select("property_id,agent_id").limit(2000),
  ]);

  const rows = (props.data ?? []) as Record<string, any>[];
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));
  const agentRows = (agents.data ?? []) as { property_id: string; agent_id: string }[];
  const peopleIds = Array.from(new Set([...ownerIds, ...agentRows.map((a) => a.agent_id)]));

  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", peopleIds)
    : { data: [] as Record<string, any>[] };
  const nameOf = new Map(
    ((people ?? []) as Record<string, any>[]).map((p) => [
      p.id,
      displayNameOr({ full_name: p.full_name }, "Member"),
    ]),
  );

  const tally = (list: { property_id: string | null }[] | null) => {
    const map = new Map<string, number>();
    for (const r of list ?? []) {
      if (!r.property_id) continue;
      map.set(r.property_id, (map.get(r.property_id) ?? 0) + 1);
    }
    return map;
  };

  const OPEN = ["new", "open", "under_review", "more_info"];
  const allReportRows = [
    ...((reports.data ?? []) as { property_id: string; status: string }[]),
    ...((safety.data ?? []) as { property_id: string; status: string }[]),
  ];
  const reportCount = tally(allReportRows);
  const openReportCount = tally(allReportRows.filter((r) => OPEN.includes(r.status)));
  const leadCount = tally((leads.data ?? []) as { property_id: string }[]);
  const viewingCount = tally((bookings.data ?? []) as { property_id: string }[]);
  const agentOf = new Map(agentRows.map((a) => [a.property_id, nameOf.get(a.agent_id) ?? null]));

  const now = Date.now();
  const items: ListingVerificationItem[] = rows
    .filter((r) => r.status !== "draft" && r.status !== "archived" && r.status !== "rejected")
    .map((r) => {
      const state = stateFor(r as never);
      const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / 86400000);
      return {
        id: r.id,
        title: r.title,
        reference: reference(r.id, r.created_at),
        ownerId: r.owner_id,
        ownerName: nameOf.get(r.owner_id) ?? "Owner",
        agentName: agentOf.get(r.id) ?? null,
        location: [r.ward, r.district, r.region].filter(Boolean).join(", ") || "—",
        propertyType: r.property_type,
        listingType: r.listing_type,
        price: Number(r.price ?? 0),
        currency: r.currency ?? "TZS",
        submittedAt: r.created_at,
        state,
        reason: r.under_review_reason ?? r.rejection_reason ?? null,
        reports: reportCount.get(r.id) ?? 0,
        openReports: openReportCount.get(r.id) ?? 0,
        views: Number(r.view_count ?? 0),
        leads: leadCount.get(r.id) ?? 0,
        viewings: viewingCount.get(r.id) ?? 0,
        ageDays,
        overdue: state === "in_progress" && ageDays >= slaDays,
      };
    })
    .sort((a, b) => {
      // Oldest submission first, but genuine reports and overdue cases lift up.
      const weight = (i: ListingVerificationItem) =>
        (i.openReports > 0 ? 2 : 0) + (i.overdue ? 1 : 0);
      return (
        weight(b) - weight(a) ||
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );
    });

  const waiting = items.filter((i) => i.state === "in_progress");
  const metrics: ListingVerificationMetrics = {
    live: rows.filter((r) => r.status === "live").length,
    verified: items.filter((i) => i.state === "verified").length,
    inProgress: waiting.length,
    moreInfo: items.filter((i) => i.state === "more_info").length,
    issue: items.filter((i) => i.state === "issue").length,
    paused: items.filter((i) => i.state === "paused").length,
    averageAgeDays:
      waiting.length >= 3
        ? Math.round(waiting.reduce((a, i) => a + i.ageDays, 0) / waiting.length)
        : null,
    overdue: waiting.filter((i) => i.overdue).length,
    slaDays,
  };

  return { items, metrics };
}

// ------------------------------------------------------------- actions

export const INFO_REASONS = [
  "Ownership or document information",
  "Property details",
  "Location clarification",
  "Contact information",
  "Photos or information quality",
  "Other",
] as const;

async function update(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("properties").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function verifyListing(item: ListingVerificationItem, reason: string) {
  await update(item.id, { verified: true, verification_status: "verified", under_review: false, under_review_reason: null });
  await logAdminAction({
    action: "listing_verified",
    targetType: "property",
    targetId: item.id,
    targetLabel: item.title,
    reason,
    meta: { from: item.state, to: "verified" },
  });
}

export async function requestListingInfo(item: ListingVerificationItem, category: string, detail: string) {
  const message = detail.trim() ? `${category}: ${detail.trim()}` : category;
  // The listing stays live: verification runs separately from moderation.
  await update(item.id, { verification_status: "more_info", under_review: false, under_review_reason: message });
  await logAdminAction({
    action: "listing_info_requested",
    targetType: "property",
    targetId: item.id,
    targetLabel: item.title,
    reason: message,
    meta: { from: item.state, to: "more_info", category },
  });
}

export async function pauseListing(item: ListingVerificationItem, reason: string) {
  await update(item.id, { status: "paused", under_review: true, under_review_reason: reason });
  await logAdminAction({
    action: "listing_paused",
    targetType: "property",
    targetId: item.id,
    targetLabel: item.title,
    reason,
    meta: { from: item.state, to: "paused" },
  });
}

export async function flagListingIssue(item: ListingVerificationItem, reason: string) {
  await update(item.id, { verified: false, verification_status: "issue", under_review: false, under_review_reason: reason });
  await logAdminAction({
    action: "listing_verification_issue",
    targetType: "property",
    targetId: item.id,
    targetLabel: item.title,
    reason,
    meta: { from: item.state, to: "issue" },
  });
}

/** Clear an issue / resume a paused listing and put it back in the queue. */
export async function resumeListingVerification(item: ListingVerificationItem, reason: string) {
  await update(item.id, {
    ...(item.state === "paused" ? { status: "live" } : {}),
    verification_status: "in_progress",
    under_review: false,
    under_review_reason: null,
  });
  await logAdminAction({
    action: "listing_verification_resumed",
    targetType: "property",
    targetId: item.id,
    targetLabel: item.title,
    reason,
    meta: { from: item.state, to: "in_progress" },
  });
}

export interface ListingVerificationHistoryEntry {
  id: string;
  action: string;
  adminName: string;
  reason: string | null;
  createdAt: string;
  from?: string;
  to?: string;
}

export async function fetchListingVerificationHistory(propertyId: string): Promise<ListingVerificationHistoryEntry[]> {
  const { data } = await supabase
    .from("admin_actions")
    .select("id,action,admin_id,reason,meta,created_at")
    .eq("target_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Record<string, any>[];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.admin_id)));
  const { data: people } = await supabase.from("profiles").select("id,full_name").in("id", ids);
  const names = new Map(
    ((people ?? []) as Record<string, any>[]).map((p) => [
      p.id,
      displayNameOr({ full_name: p.full_name }, "Administrator"),
    ]),
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    adminName: names.get(r.admin_id) ?? "Administrator",
    reason: r.reason ?? null,
    createdAt: r.created_at,
    from: r.meta?.from,
    to: r.meta?.to,
  }));
}
