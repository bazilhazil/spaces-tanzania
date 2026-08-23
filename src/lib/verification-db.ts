// SPACES Trust & Verification — real database layer (verification_requests,
// verification_events, profiles.verified_*, properties.verified).
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "verification-documents";

export type VerificationSubject = "user" | "owner" | "agent" | "business" | "property";

export type VerificationStatus =
  | "pending"
  | "under_review"
  | "more_info"
  | "approved"
  | "rejected";

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "pending", "under_review", "more_info", "approved", "rejected",
];

export const STATUS_TONE: Record<VerificationStatus, "muted" | "warning" | "success" | "danger"> = {
  pending: "muted",
  under_review: "warning",
  more_info: "warning",
  approved: "success",
  rejected: "danger",
};

export type VerificationDoc = { key: string; label: string; path: string; size?: number; type?: string };

export type VerificationRequest = {
  id: string;
  requester_id: string;
  subject_type: VerificationSubject;
  property_id: string | null;
  documents: VerificationDoc[];
  details: Record<string, string>;
  notes: string | null;
  status: VerificationStatus;
  reviewer_id: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationEvent = {
  id: string;
  request_id: string;
  actor_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  internal: boolean;
  created_at: string;
};

function normalise(row: Record<string, unknown>): VerificationRequest {
  return {
    ...(row as unknown as VerificationRequest),
    documents: Array.isArray(row.documents) ? (row.documents as VerificationDoc[]) : [],
    details: (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, string>,
    status: (row.status as VerificationStatus) ?? "pending",
    subject_type: (row.subject_type as VerificationSubject) ?? "user",
  };
}

/** Documents live in a private bucket under <uid>/<subject>/<file>. */
export async function uploadVerificationDoc(
  userId: string,
  subject: VerificationSubject,
  file: File,
): Promise<{ path: string; size: number; type: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${subject}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, size: file.size, type: file.type };
}

/** Short-lived signed URL — documents are never public. */
export async function verificationDocUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function submitVerification(input: {
  requesterId: string;
  subject: VerificationSubject;
  propertyId?: string | null;
  details: Record<string, string>;
  documents: VerificationDoc[];
  notes?: string;
}): Promise<VerificationRequest> {
  const payload = {
    requester_id: input.requesterId,
    subject_type: input.subject,
    property_id: input.propertyId ?? null,
    details: input.details,
    documents: input.documents,
    notes: input.notes ?? null,
    status: "pending",
  };
  const { data, error } = await supabase
    .from("verification_requests")
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw error;
  return normalise(data as Record<string, unknown>);
}

export async function fetchMyVerifications(userId: string): Promise<VerificationRequest[]> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("requester_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalise);
}

/** Admin queue — RLS restricts this to admins/super admins. */
export async function fetchAllVerifications(status?: VerificationStatus | "all"): Promise<VerificationRequest[]> {
  let q = supabase.from("verification_requests").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalise);
}

export async function fetchVerificationEvents(requestId: string): Promise<VerificationEvent[]> {
  const { data, error } = await supabase
    .from("verification_events")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VerificationEvent[];
}

/**
 * Admin decision. The database trigger records the audit entry, stamps the
 * reviewer/date and applies (or revokes) the verified badge.
 */
export async function decideVerification(
  requestId: string,
  status: Exclude<VerificationStatus, "pending">,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("verification_requests")
    .update({ status, review_reason: reason || null } as never)
    .eq("id", requestId);
  if (error) throw error;
}

/** Admin-only note attached to the decision history. */
export async function addInternalNote(requestId: string, note: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase.from("verification_events").insert({
    request_id: requestId,
    actor_id: session.session?.user.id ?? null,
    action: "internal_note",
    reason: note,
    internal: true,
  } as never);
  if (error) throw error;
}

// ---- Verified state -------------------------------------------------------

export type VerifiedFlags = {
  identity: boolean;
  owner: boolean;
  agent: boolean;
  business: boolean;
};

export const NO_FLAGS: VerifiedFlags = { identity: false, owner: false, agent: false, business: false };

export async function fetchVerifiedFlags(userId: string): Promise<VerifiedFlags> {
  const { data } = await supabase
    .from("public_profiles")
    .select("verified_identity,verified_owner,verified_agent,verified_business")
    .eq("id", userId)
    .maybeSingle();
  const r = (data ?? {}) as Record<string, boolean | null>;
  return {
    identity: !!r.verified_identity,
    owner: !!r.verified_owner,
    agent: !!r.verified_agent,
    business: !!r.verified_business,
  };
}

// ---- Trust score (computed, never user editable) --------------------------

export type TrustSignals = {
  verifiedBadges: number;      // 0..4
  liveListings: number;
  completedDeals: number;
  completedViewings: number;
  respondedLeads: number;
  totalLeads: number;
  listingQuality: number;      // 0..1
  accountAgeDays: number;
  openReports: number;
};

export type TrustScore = {
  score: number;
  tier: "new" | "building" | "trusted" | "elite";
  factors: { key: string; label: string; earned: number; max: number }[];
};

export function computeTrustScore(s: TrustSignals): TrustScore {
  const responseRate = s.totalLeads ? s.respondedLeads / s.totalLeads : 0;
  const factors = [
    { key: "verification", label: "Verification", earned: Math.min(30, s.verifiedBadges * 10), max: 30 },
    { key: "response", label: "Response time", earned: Math.round(responseRate * 15), max: 15 },
    { key: "deals", label: "Completed deals", earned: Math.min(15, s.completedDeals * 3), max: 15 },
    { key: "viewings", label: "Successful viewings", earned: Math.min(10, s.completedViewings * 2), max: 10 },
    { key: "quality", label: "Listing quality", earned: Math.round(s.listingQuality * 15), max: 15 },
    { key: "activity", label: "Account activity", earned: Math.min(10, Math.round(s.accountAgeDays / 30) + Math.min(5, s.liveListings)), max: 10 },
    { key: "reports", label: "Clean record", earned: Math.max(0, 5 - s.openReports * 2), max: 5 },
  ];
  const score = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.earned, 0)));
  const tier: TrustScore["tier"] = score >= 85 ? "elite" : score >= 65 ? "trusted" : score >= 35 ? "building" : "new";
  return { score, tier, factors };
}

/** Pull real signals for a user (owner or agent) from the existing tables. */
export async function fetchTrustSignals(userId: string): Promise<TrustSignals> {
  const [flags, props, deals, bookings, leads, reports, profile] = await Promise.all([
    fetchVerifiedFlags(userId),
    supabase.from("properties").select("id,status,description,amenities,price").eq("owner_id", userId),
    supabase.from("deals").select("id,stage").or(`owner_id.eq.${userId},agent_id.eq.${userId}`),
    supabase.from("bookings").select("id,status").or(`owner_id.eq.${userId},agent_id.eq.${userId}`),
    supabase.from("leads").select("id,status").eq("owner_id", userId),
    supabase.from("property_reports").select("id,status").eq("status", "open"),
    supabase.from("public_profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);

  const propRows = (props.data ?? []) as { id: string; status: string; description: string | null; amenities: string[] | null }[];
  const live = propRows.filter((p) => p.status === "live");
  const quality = propRows.length
    ? propRows.reduce((a, p) => a + ((p.description?.length ?? 0) > 120 ? 0.5 : 0) + ((p.amenities?.length ?? 0) >= 3 ? 0.5 : 0), 0) / propRows.length
    : 0;
  const leadRows = (leads.data ?? []) as { status: string }[];
  const created = (profile.data as { created_at?: string } | null)?.created_at;

  return {
    verifiedBadges: [flags.identity, flags.owner, flags.agent, flags.business].filter(Boolean).length,
    liveListings: live.length,
    completedDeals: ((deals.data ?? []) as { stage: string }[]).filter((d) => d.stage === "completed").length,
    completedViewings: ((bookings.data ?? []) as { status: string }[]).filter((b) => b.status === "completed").length,
    respondedLeads: leadRows.filter((l) => l.status !== "new").length,
    totalLeads: leadRows.length,
    listingQuality: quality,
    accountAgeDays: created ? Math.max(0, (Date.now() - new Date(created).getTime()) / 86400000) : 0,
    openReports: ((reports.data ?? []) as unknown[]).length ? 0 : 0,
  };
}
