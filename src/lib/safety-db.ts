import { supabase } from "@/integrations/supabase/client";

/* ============================ TYPES ============================ */

export type ReportTargetType = "property" | "user" | "message";
export type SafetyReportStatus = "new" | "under_review" | "more_info" | "resolved" | "dismissed";
export type ReportPriority = "normal" | "high" | "urgent";
export type AccountStatus = "active" | "suspended" | "banned";

export const PROPERTY_REPORT_REASONS = [
  "fake_listing",
  "incorrect_information",
  "wrong_price",
  "wrong_location",
  "duplicate_listing",
  "unavailable",
  "suspicious_activity",
  "fraud",
  "other",
] as const;

export const USER_REPORT_REASONS = [
  "fake_account",
  "fraud",
  "harassment",
  "misleading_information",
  "suspicious_activity",
  "other",
] as const;

export const MESSAGE_REPORT_REASONS = [
  "spam",
  "fraud",
  "harassment",
  "suspicious_payment",
  "inappropriate",
  "other",
] as const;

export type ReportReason =
  | (typeof PROPERTY_REPORT_REASONS)[number]
  | (typeof USER_REPORT_REASONS)[number]
  | (typeof MESSAGE_REPORT_REASONS)[number];

export function reasonsFor(target: ReportTargetType): readonly string[] {
  if (target === "property") return PROPERTY_REPORT_REASONS;
  if (target === "user") return USER_REPORT_REASONS;
  return MESSAGE_REPORT_REASONS;
}

export const REPORT_STATUSES: SafetyReportStatus[] = [
  "new",
  "under_review",
  "more_info",
  "resolved",
  "dismissed",
];

export interface SafetyReport {
  id: string;
  reference: string;
  targetType: ReportTargetType;
  propertyId: string | null;
  propertyTitle: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  messageId: string | null;
  conversationId: string | null;
  reporterId: string;
  reporterName: string | null;
  reason: string;
  description: string | null;
  evidencePath: string | null;
  status: SafetyReportStatus;
  priority: ReportPriority;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportAction {
  id: string;
  reportId: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  note: string | null;
  fromStatus: SafetyReportStatus | null;
  toStatus: SafetyReportStatus | null;
  createdAt: string;
}

type Row = Record<string, any>;

/* ============================ HELPERS ============================ */

async function namesFor(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (!unique.length) return {};
  const { data } = await supabase.from("profiles").select("id,full_name").in("id", unique);
  const out: Record<string, string> = {};
  for (const p of (data ?? []) as Row[]) out[p.id] = p.full_name || "SPACES user";
  return out;
}

async function propertyTitles(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (!unique.length) return {};
  const { data } = await supabase.from("properties").select("id,title").in("id", unique);
  const out: Record<string, string> = {};
  for (const p of (data ?? []) as Row[]) out[p.id] = p.title || "Listing";
  return out;
}

function mapReport(row: Row, names: Record<string, string>, titles: Record<string, string>): SafetyReport {
  return {
    id: row.id,
    reference: row.reference,
    targetType: row.target_type,
    propertyId: row.property_id ?? null,
    propertyTitle: row.property_id ? (titles[row.property_id] ?? null) : null,
    reportedUserId: row.reported_user_id ?? null,
    reportedUserName: row.reported_user_id ? (names[row.reported_user_id] ?? null) : null,
    messageId: row.message_id ?? null,
    conversationId: row.conversation_id ?? null,
    reporterId: row.reporter_id,
    reporterName: names[row.reporter_id] ?? null,
    reason: row.reason,
    description: row.description ?? null,
    evidencePath: row.evidence_path ?? null,
    status: row.status,
    priority: row.priority,
    assignedAdminId: row.assigned_admin_id ?? null,
    assignedAdminName: row.assigned_admin_id ? (names[row.assigned_admin_id] ?? null) : null,
    resolution: row.resolution ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function hydrate(rows: Row[]): Promise<SafetyReport[]> {
  const [names, titles] = await Promise.all([
    namesFor(rows.flatMap((r) => [r.reporter_id, r.reported_user_id, r.assigned_admin_id])),
    propertyTitles(rows.map((r) => r.property_id)),
  ]);
  return rows.map((r) => mapReport(r, names, titles));
}

/* ============================ SUBMIT ============================ */

export interface SubmitReportInput {
  targetType: ReportTargetType;
  reason: string;
  description?: string;
  propertyId?: string | null;
  reportedUserId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
  evidence?: File | null;
}

export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; error: "auth" | "duplicate" | "self" | "failed"; message?: string };

export async function submitReport(input: SubmitReportInput): Promise<SubmitResult> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: "auth" };
  if (input.reportedUserId && input.reportedUserId === uid) return { ok: false, error: "self" };

  let evidencePath: string | null = null;
  if (input.evidence) {
    const ext = input.evidence.name.split(".").pop() || "jpg";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("report-evidence")
      .upload(path, input.evidence, { upsert: false });
    if (!upErr) evidencePath = path;
  }

  const { data, error } = await supabase
    .from("safety_reports")
    .insert({
      target_type: input.targetType,
      reason: input.reason,
      description: input.description?.trim() || null,
      property_id: input.propertyId ?? null,
      reported_user_id: input.reportedUserId ?? null,
      message_id: input.messageId ?? null,
      conversation_id: input.conversationId ?? null,
      evidence_path: evidencePath,
      reporter_id: uid,
    } as never)
    .select("reference")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "failed", message: error.message };
  }
  return { ok: true, reference: (data as Row | null)?.reference ?? "" };
}

/* ============================ READ ============================ */

export async function listMyReports(): Promise<SafetyReport[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("safety_reports")
    .select("*")
    .eq("reporter_id", auth.user.id)
    .order("created_at", { ascending: false });
  return hydrate((data ?? []) as Row[]);
}

export async function listAllReports(): Promise<SafetyReport[]> {
  const { data } = await supabase
    .from("safety_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  return hydrate((data ?? []) as Row[]);
}

export async function listReportActions(reportId: string): Promise<ReportAction[]> {
  const { data } = await supabase
    .from("report_actions")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];
  const names = await namesFor(rows.map((r) => r.actor_id));
  return rows.map((r) => ({
    id: r.id,
    reportId: r.report_id,
    actorId: r.actor_id ?? null,
    actorName: r.actor_id ? (names[r.actor_id] ?? null) : null,
    action: r.action,
    note: r.note ?? null,
    fromStatus: r.from_status ?? null,
    toStatus: r.to_status ?? null,
    createdAt: r.created_at,
  }));
}

export async function evidenceUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("report-evidence").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/* ============================ ADMIN ACTIONS ============================ */

export async function updateReport(
  id: string,
  patch: { status?: SafetyReportStatus; priority?: ReportPriority; resolution?: string | null; assignToMe?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const payload: Row = {};
  if (patch.status) payload.status = patch.status;
  if (patch.priority) payload.priority = patch.priority;
  if (patch.resolution !== undefined) payload.resolution = patch.resolution;
  if (patch.assignToMe && auth.user) payload.assigned_admin_id = auth.user.id;
  const { error } = await supabase.from("safety_reports").update(payload as never).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function logModerationAction(
  reportId: string,
  action: string,
  note?: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("report_actions").insert({
    report_id: reportId,
    actor_id: auth.user.id,
    action,
    note: note ?? null,
  } as never);
}

export async function setPropertyUnderReview(
  propertyId: string,
  underReview: boolean,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("properties")
    .update({ under_review: underReview, under_review_reason: reason ?? null } as never)
    .eq("id", propertyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setAccountStatus(
  userId: string,
  status: AccountStatus,
  reason?: string,
  until?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: status,
      suspension_reason: status === "active" ? null : (reason ?? null),
      suspended_until: status === "active" ? null : (until ?? null),
    } as never)
    .eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeReview(reviewId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("moderate_review", {
    _review_id: reviewId,
    _status: "removed",
    _reason: reason,
  } as never);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/* ============================ BLOCKING ============================ */

export interface BlockedUser {
  id: string;
  blockedId: string;
  name: string;
  createdAt: string;
}

export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("user_blocks")
    .select("*")
    .eq("blocker_id", auth.user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const names = await namesFor(rows.map((r) => r.blocked_id));
  return rows.map((r) => ({
    id: r.id,
    blockedId: r.blocked_id,
    name: names[r.blocked_id] ?? "SPACES user",
    createdAt: r.created_at,
  }));
}

export async function blockUser(userId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: auth.user.id, blocked_id: userId, reason: reason ?? null } as never);
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  return { ok: true };
}

export async function unblockUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "auth" };
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", auth.user.id)
    .eq("blocked_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function isBlockedWith(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_blocked_with", { _other: userId } as never);
  return data === true;
}

/* ============================ ACCOUNT STATUS ============================ */

export interface MyAccountStatus {
  status: AccountStatus;
  reason: string | null;
  until: string | null;
}

export async function fetchMyAccountStatus(): Promise<MyAccountStatus | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.rpc("my_account_status");
  const row = Array.isArray(data) ? (data[0] as Row | undefined) : (data as Row | null);
  if (!row) return null;
  return { status: row.status, reason: row.reason ?? null, until: row.until ?? null };
}

/* ============================ UI HELPERS ============================ */

export function statusTone(status: SafetyReportStatus): "muted" | "warning" | "success" | "danger" | "brand" {
  switch (status) {
    case "new": return "danger";
    case "under_review": return "warning";
    case "more_info": return "brand";
    case "resolved": return "success";
    default: return "muted";
  }
}

/** Errors raised by the database safety guards. */
export function safetyErrorKey(message?: string | null): "blocked" | "restricted" | null {
  if (!message) return null;
  if (message.includes("USER_BLOCKED")) return "blocked";
  if (message.includes("ACCOUNT_RESTRICTED")) return "restricted";
  return null;
}
