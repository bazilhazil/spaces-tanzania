// SPACES production data review.
//
// Read-only audit of the real records already in the database, plus two
// deliberate admin actions (mark reviewed / archive) that always require
// confirmation. Nothing is deleted, nothing is changed automatically, and the
// existing admin_actions log is the only audit trail used.
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin-ops";

export type ReviewTable =
  | "profiles" | "properties" | "leads" | "bookings" | "deals"
  | "reviews" | "notifications" | "payments";

export interface ReviewCounts {
  users: number;
  owners: number;
  agents: number;
  buyers: number;
  properties: number;
  liveProperties: number;
  verifiedProperties: number;
  verifyingProperties: number;
  propertyMedia: number;
  leads: number;
  viewings: number;
  deals: number;
  reviews: number;
  notifications: number;
  payments: number;
  confirmedPayments: number;
  verifications: number;
  reports: number;
  auditEntries: number;
}

export interface FlaggedRecord {
  table: ReviewTable;
  id: string;
  label: string;
  evidence: string;
  createdAt: string;
  reviewed: boolean;
  /** What an admin may do beyond "keep", if anything. */
  archiveAction: "archive_property" | "suspend_user" | "remove_review" | "soft_delete" | null;
}

export interface ProductionBaseline {
  confirmedAt: string | null;
  confirmedBy: string | null;
  note: string | null;
}

export interface ProductionReview {
  counts: ReviewCounts;
  flagged: FlaggedRecord[];
  baseline: ProductionBaseline;
  /** Records created strictly after the baseline, when one exists. */
  sinceBaseline: { properties: number; leads: number; viewings: number; deals: number; payments: number } | null;
}

const TEST_WORDS = /\b(test|tests|testing|demo|sample|placeholder|dummy|lorem ipsum|asdf|qwerty|foobar|xxx)\b/i;
const TEST_EMAIL = /@(.*\.)?(test|example|invalid|localhost|mailinator\.com|spacesdiag\.test)(\.|$)/i;

function flaggedText(...parts: (string | null | undefined)[]): string | null {
  for (const part of parts) {
    if (!part) continue;
    const hit = part.match(TEST_WORDS);
    if (hit) return `Contains “${hit[0]}”`;
  }
  return null;
}

export async function fetchProductionBaseline(): Promise<ProductionBaseline> {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "production_baseline")
    .maybeSingle();
  const value = (data as { value?: Record<string, string | null> } | null)?.value ?? {};
  return {
    confirmedAt: value.confirmed_at ?? null,
    confirmedBy: value.confirmed_by_name ?? null,
    note: value.note ?? null,
  };
}

/** Records the moment the administrator declares the production baseline. */
export async function confirmProductionBaseline(note: string, adminName: string): Promise<ProductionBaseline> {
  const confirmedAt = new Date().toISOString();
  const { data: auth } = await supabase.auth.getUser();
  const value = {
    confirmed_at: confirmedAt,
    confirmed_by: auth.user?.id ?? null,
    confirmed_by_name: adminName,
    note: note.trim() || null,
  };
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "production_baseline", value } as never, { onConflict: "key" });
  if (error) throw error;
  await logAdminAction({
    action: "production_data_reviewed",
    targetType: "platform",
    targetLabel: "Production baseline",
    reason: note.trim() || null,
    meta: { confirmed_at: confirmedAt },
  });
  return { confirmedAt, confirmedBy: adminName, note: value.note };
}

async function reviewedIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from("admin_actions")
    .select("target_id,action")
    .in("action", ["production_record_reviewed", "production_record_archived"])
    .limit(2000);
  return new Set(((data ?? []) as { target_id: string | null }[]).map((r) => r.target_id).filter(Boolean) as string[]);
}

export async function fetchProductionReview(): Promise<ProductionReview> {
  const [
    baseline, reviewed,
    profiles, roles, properties, media, leads, bookings, deals, reviews,
    notifications, payments, verifications, safety, propertyReports, audit,
  ] = await Promise.all([
    fetchProductionBaseline(),
    reviewedIds(),
    supabase.from("profiles").select("id,full_name,email,phone,created_at,account_status").limit(5000),
    supabase.from("user_roles").select("user_id,role").limit(5000),
    supabase
      .from("properties")
      .select("id,title,description,price,status,verified,verification_status,owner_id,region,district,created_at,deleted_at")
      .limit(5000),
    supabase.from("property_media").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id,visitor_name,message,status,created_at,deleted_at").limit(5000),
    supabase.from("bookings").select("id,buyer_name,message,notes,status,created_at,deleted_at").limit(5000),
    supabase.from("deals").select("id,reference,buyer_name,notes,stage,created_at,deleted_at").limit(5000),
    supabase.from("reviews").select("id,comment,rating,status,reviewer_id,created_at,deleted_at").limit(5000),
    supabase.from("notifications").select("id,title,body,user_id,created_at").limit(5000),
    supabase.from("payments").select("id,status,amount,currency,purpose,created_at").limit(5000),
    supabase.from("verification_requests").select("id", { count: "exact", head: true }),
    supabase.from("safety_reports").select("id", { count: "exact", head: true }),
    supabase.from("property_reports").select("id", { count: "exact", head: true }),
    supabase.from("admin_actions").select("id", { count: "exact", head: true }),
  ]);

  const profileRows = (profiles.data ?? []) as Record<string, any>[];
  const roleRows = (roles.data ?? []) as { user_id: string; role: string }[];
  const propertyRows = ((properties.data ?? []) as Record<string, any>[]).filter((p) => !p.deleted_at);
  const leadRows = ((leads.data ?? []) as Record<string, any>[]).filter((r) => !r.deleted_at);
  const bookingRows = ((bookings.data ?? []) as Record<string, any>[]).filter((r) => !r.deleted_at);
  const dealRows = ((deals.data ?? []) as Record<string, any>[]).filter((r) => !r.deleted_at);
  const reviewRows = ((reviews.data ?? []) as Record<string, any>[]).filter((r) => !r.deleted_at);
  const notificationRows = (notifications.data ?? []) as Record<string, any>[];
  const paymentRows = (payments.data ?? []) as Record<string, any>[];

  const ownerIds = new Set(roleRows.filter((r) => r.role === "owner").map((r) => r.user_id));
  const agentIds = new Set(roleRows.filter((r) => r.role === "agent").map((r) => r.user_id));

  const counts: ReviewCounts = {
    users: profileRows.length,
    owners: ownerIds.size,
    agents: agentIds.size,
    buyers: profileRows.filter((p) => !ownerIds.has(p.id) && !agentIds.has(p.id)).length,
    properties: propertyRows.length,
    liveProperties: propertyRows.filter((p) => p.status === "live").length,
    verifiedProperties: propertyRows.filter((p) => p.verified === true).length,
    verifyingProperties: propertyRows.filter((p) => p.status === "live" && p.verified !== true).length,
    propertyMedia: media.count ?? 0,
    leads: leadRows.length,
    viewings: bookingRows.length,
    deals: dealRows.length,
    reviews: reviewRows.length,
    notifications: notificationRows.length,
    payments: paymentRows.length,
    confirmedPayments: paymentRows.filter((p) => p.status === "paid" || p.status === "succeeded").length,
    verifications: verifications.count ?? 0,
    reports: (safety.count ?? 0) + (propertyReports.count ?? 0),
    auditEntries: audit.count ?? 0,
  };

  const flagged: FlaggedRecord[] = [];
  const add = (r: Omit<FlaggedRecord, "reviewed">) => flagged.push({ ...r, reviewed: reviewed.has(r.id) });

  // --- accounts
  const suspectUsers = new Set<string>();
  for (const p of profileRows) {
    const evidence =
      (p.email && TEST_EMAIL.test(p.email) ? `Non-routable address ${p.email}` : null) ??
      flaggedText(p.full_name);
    if (!evidence) continue;
    suspectUsers.add(p.id);
    add({
      table: "profiles",
      id: p.id,
      label: p.full_name || p.email || "Unnamed account",
      evidence,
      createdAt: p.created_at,
      archiveAction: "suspend_user",
    });
  }

  // --- listings
  for (const p of propertyRows) {
    const evidence =
      flaggedText(p.title, p.description) ??
      (suspectUsers.has(p.owner_id) ? "Belongs to an account flagged for review" : null);
    if (!evidence) continue;
    add({
      table: "properties",
      id: p.id,
      label: p.title,
      evidence,
      createdAt: p.created_at,
      archiveAction: "archive_property",
    });
  }

  // --- transaction records (never altered automatically)
  for (const l of leadRows) {
    const evidence = flaggedText(l.visitor_name, l.message);
    if (evidence) add({ table: "leads", id: l.id, label: l.visitor_name || "Inquiry", evidence, createdAt: l.created_at, archiveAction: "soft_delete" });
  }
  for (const b of bookingRows) {
    const evidence = flaggedText(b.buyer_name, b.message, b.notes);
    if (evidence) add({ table: "bookings", id: b.id, label: b.buyer_name || "Viewing request", evidence, createdAt: b.created_at, archiveAction: "soft_delete" });
  }
  for (const d of dealRows) {
    const evidence = flaggedText(d.buyer_name, d.notes);
    if (evidence) add({ table: "deals", id: d.id, label: d.reference, evidence, createdAt: d.created_at, archiveAction: "soft_delete" });
  }
  for (const r of reviewRows) {
    const evidence = flaggedText(r.comment) ?? (suspectUsers.has(r.reviewer_id) ? "Written by an account flagged for review" : null);
    if (evidence) add({ table: "reviews", id: r.id, label: `${r.rating}★ review`, evidence, createdAt: r.created_at, archiveAction: "remove_review" });
  }
  for (const n of notificationRows) {
    const evidence = flaggedText(n.title, n.body) ?? (suspectUsers.has(n.user_id) ? "Sent to an account flagged for review" : null);
    if (evidence) add({ table: "notifications", id: n.id, label: n.title, evidence, createdAt: n.created_at, archiveAction: null });
  }
  // Payments are never archived or altered here — they are listed for awareness only.
  for (const p of paymentRows) {
    const evidence = flaggedText(p.purpose);
    if (evidence) add({ table: "payments", id: p.id, label: `${p.currency} ${p.amount} · ${p.status}`, evidence, createdAt: p.created_at, archiveAction: null });
  }

  flagged.sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || a.createdAt.localeCompare(b.createdAt));

  const since = baseline.confirmedAt;
  const after = (rows: Record<string, any>[]) => (since ? rows.filter((r) => r.created_at > since).length : 0);

  return {
    counts,
    flagged,
    baseline,
    sinceBaseline: since
      ? {
          properties: after(propertyRows),
          leads: after(leadRows),
          viewings: after(bookingRows),
          deals: after(dealRows),
          payments: after(paymentRows),
        }
      : null,
  };
}

// ---------------------------------------------------------------- actions

/** "Keep it" — records the decision in the shared audit log. Changes no data. */
export async function markRecordReviewed(record: FlaggedRecord, reason: string) {
  await logAdminAction({
    action: "production_record_reviewed",
    targetType: record.table,
    targetId: record.id,
    targetLabel: record.label,
    reason: reason || "Confirmed as a genuine production record",
    meta: { evidence: record.evidence, outcome: "kept" },
  });
}

/**
 * Archive / remove after explicit admin confirmation. Every path is reversible
 * (archive, suspend, soft delete); nothing is hard deleted.
 */
export async function archiveRecord(record: FlaggedRecord, reason: string) {
  const { data: auth } = await supabase.auth.getUser();
  let previous = "";
  let next = "";

  if (record.archiveAction === "archive_property") {
    const { data, error } = await supabase
      .from("properties")
      .update({ status: "archived" } as never)
      .eq("id", record.id)
      .select("status")
      .maybeSingle();
    if (error) throw error;
    previous = "live/paused"; next = (data as { status?: string } | null)?.status ?? "archived";
  } else if (record.archiveAction === "suspend_user") {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "suspended", suspension_reason: reason } as never)
      .eq("id", record.id);
    if (error) throw error;
    previous = "active"; next = "suspended";
  } else if (record.archiveAction === "remove_review") {
    const { error } = await supabase.rpc("moderate_review", {
      _review_id: record.id,
      _status: "removed",
      _reason: reason,
    } as never);
    if (error) throw error;
    previous = "published"; next = "removed";
  } else if (record.archiveAction === "soft_delete") {
    const table = record.table as "leads" | "bookings" | "deals";
    const { error } = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: auth.user?.id ?? null,
        delete_reason: reason,
      } as never)
      .eq("id", record.id);
    if (error) throw error;
    previous = "active"; next = "archived";
  } else {
    throw new Error("This record type cannot be archived here.");
  }

  await logAdminAction({
    action: "production_record_archived",
    targetType: record.table,
    targetId: record.id,
    targetLabel: record.label,
    reason,
    meta: { evidence: record.evidence, from: previous, to: next, outcome: "archived" },
  });
}
