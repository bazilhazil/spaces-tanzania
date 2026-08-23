import { supabase } from "@/integrations/supabase/client";

export type ReviewSubjectType = "property" | "user";
export type ReviewStatus = "pending" | "published" | "flagged" | "removed";

export const PROPERTY_CATEGORIES = [
  "accuracy",
  "location",
  "cleanliness",
  "value",
  "overall",
] as const;

export const PERSON_CATEGORIES = [
  "communication",
  "professionalism",
  "responseTime",
  "accuracy",
  "overall",
] as const;

export type CategoryKey =
  | (typeof PROPERTY_CATEGORIES)[number]
  | (typeof PERSON_CATEGORIES)[number];

export const REPORT_REASONS = [
  "spam",
  "fake",
  "offensive",
  "personal_info",
  "misleading",
  "other",
] as const;
export type ReviewReportReason = (typeof REPORT_REASONS)[number];

export interface Review {
  id: string;
  subjectType: ReviewSubjectType;
  propertyId: string | null;
  propertyTitle: string | null;
  subjectUserId: string | null;
  subjectName: string | null;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  rating: number;
  categories: Partial<Record<CategoryKey, number>>;
  comment: string | null;
  status: ReviewStatus;
  statusReason: string | null;
  response: string | null;
  responseAt: string | null;
  createdAt: string;
  bookingId: string | null;
  dealId: string | null;
}

export interface ReviewOpportunity {
  source: "booking" | "deal";
  sourceId: string;
  propertyId: string | null;
  propertyTitle: string | null;
  counterpartId: string | null;
  counterpartName: string | null;
  occurredAt: string | null;
  propertyReviewed: boolean;
  counterpartReviewed: boolean;
  canReviewProperty: boolean;
}

export interface RatingSummary {
  average: number;
  total: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

const EMPTY_SUMMARY: RatingSummary = {
  average: 0,
  total: 0,
  breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): Review {
  const reviewer = row.reviewer ?? null;
  const subject = row.subject ?? null;
  return {
    id: row.id,
    subjectType: row.subject_type,
    propertyId: row.property_id ?? null,
    propertyTitle: row.property?.title ?? null,
    subjectUserId: row.subject_user_id ?? null,
    subjectName: subject?.full_name ?? null,
    reviewerId: row.reviewer_id,
    reviewerName: reviewer?.full_name || "SPACES member",
    reviewerAvatar: reviewer?.avatar_url ?? null,
    rating: Number(row.rating ?? 0),
    categories: (row.categories ?? {}) as Partial<Record<CategoryKey, number>>,
    comment: row.comment ?? null,
    status: row.status,
    statusReason: row.status_reason ?? null,
    response: row.response ?? null,
    responseAt: row.response_at ?? null,
    createdAt: row.created_at,
    bookingId: row.booking_id ?? null,
    dealId: row.deal_id ?? null,
  };
}

const SELECT =
  "id, subject_type, property_id, subject_user_id, reviewer_id, rating, categories, comment, status, status_reason, response, response_at, created_at, booking_id, deal_id";

async function decorate(rows: any[]): Promise<Review[]> {
  const reviews = rows.map(mapRow);
  const userIds = Array.from(
    new Set(reviews.flatMap((r) => [r.reviewerId, r.subjectUserId]).filter(Boolean) as string[]),
  );
  const propIds = Array.from(new Set(reviews.map((r) => r.propertyId).filter(Boolean) as string[]));

  const [profiles, props] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    propIds.length
      ? supabase.from("properties").select("id, title").in("id", propIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const pMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
  const prMap = new Map((props.data ?? []).map((p: any) => [p.id, p]));

  return reviews.map((r) => ({
    ...r,
    reviewerName: pMap.get(r.reviewerId)?.full_name || "SPACES member",
    reviewerAvatar: pMap.get(r.reviewerId)?.avatar_url ?? null,
    subjectName: r.subjectUserId ? (pMap.get(r.subjectUserId)?.full_name ?? null) : null,
    propertyTitle: r.propertyId ? (prMap.get(r.propertyId)?.title ?? null) : null,
  }));
}

function summarise(reviews: Review[]): RatingSummary {
  if (!reviews.length) return { ...EMPTY_SUMMARY, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["breakdown"];
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    const key = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[key] += 1;
  }
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    total: reviews.length,
    breakdown,
  };
}

/** Published reviews for a property (public). */
export async function fetchPropertyReviews(propertyId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(SELECT)
    .eq("property_id", propertyId)
    .eq("subject_type", "property")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[reviews] property reviews", error);
    return { reviews: [] as Review[], summary: EMPTY_SUMMARY };
  }
  const reviews = await decorate(data ?? []);
  return { reviews, summary: summarise(reviews) };
}

/** Published reviews about a person (owner / agent / buyer). */
export async function fetchUserReviews(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(SELECT)
    .eq("subject_user_id", userId)
    .eq("subject_type", "user")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[reviews] user reviews", error);
    return { reviews: [] as Review[], summary: EMPTY_SUMMARY };
  }
  const reviews = await decorate(data ?? []);
  return { reviews, summary: summarise(reviews) };
}

/** All reviews written by the signed-in user. */
export async function fetchMyReviews(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(SELECT)
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[reviews] mine", error);
    return [] as Review[];
  }
  return decorate(data ?? []);
}

/** Reviews about the signed-in user (any status they can see). */
export async function fetchReviewsAboutMe(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(SELECT)
    .eq("subject_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[reviews] about me", error);
    return [] as Review[];
  }
  return decorate(data ?? []);
}

/** Completed viewings / deals the signed-in user may still review. */
export async function fetchReviewOpportunities(): Promise<ReviewOpportunity[]> {
  const { data, error } = await supabase.rpc("my_review_opportunities");
  if (error) {
    console.error("[reviews] opportunities", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    source: r.source,
    sourceId: r.source_id,
    propertyId: r.property_id ?? null,
    propertyTitle: r.property_title ?? null,
    counterpartId: r.counterpart_id ?? null,
    counterpartName: r.counterpart_name ?? null,
    occurredAt: r.occurred_at ?? null,
    propertyReviewed: !!r.property_reviewed,
    counterpartReviewed: !!r.counterpart_reviewed,
    canReviewProperty: !!r.can_review_property,
  }));
}

export interface CreateReviewInput {
  subjectType: ReviewSubjectType;
  propertyId?: string | null;
  subjectUserId?: string | null;
  bookingId?: string | null;
  dealId?: string | null;
  rating: number;
  categories?: Partial<Record<CategoryKey, number>>;
  comment?: string;
}

export async function createReview(
  input: CreateReviewInput,
): Promise<{ ok: boolean; status?: ReviewStatus; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: "auth" };

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      subject_type: input.subjectType,
      property_id: input.propertyId ?? null,
      subject_user_id: input.subjectUserId ?? null,
      booking_id: input.bookingId ?? null,
      deal_id: input.dealId ?? null,
      reviewer_id: uid,
      rating: input.rating,
      categories: input.categories ?? {},
      comment: input.comment?.trim() || null,
    })
    .select("id, status")
    .single();

  if (error) {
    console.error("[reviews] create failed", error);
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    if (error.code === "42501") return { ok: false, error: "not_eligible" };
    return { ok: false, error: error.message };
  }
  return { ok: true, status: (data as any)?.status };
}

export async function respondToReview(reviewId: string, response: string) {
  const { error } = await supabase.rpc("respond_to_review", {
    _review_id: reviewId,
    _response: response,
  });
  if (error) {
    console.error("[reviews] respond failed", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function reportReview(
  reviewId: string,
  reason: ReviewReportReason,
  details?: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: "auth" };
  const { error } = await supabase.from("review_reports").insert({
    review_id: reviewId,
    reporter_id: uid,
    reason,
    details: details?.trim() || null,
  });
  if (error) {
    console.error("[reviews] report failed", error);
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/* ---------------- Admin ---------------- */

export async function fetchAllReviews(status?: ReviewStatus) {
  let q = supabase.from("reviews").select(SELECT).order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("[reviews] admin list", error);
    return [] as Review[];
  }
  return decorate(data ?? []);
}

export async function moderateReview(reviewId: string, status: ReviewStatus, reason?: string) {
  const { error } = await supabase.rpc("moderate_review", {
    _review_id: reviewId,
    _status: status,
    _reason: reason,
  });
  if (error) {
    console.error("[reviews] moderate failed", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export interface ReviewReportRow {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
}

export async function fetchReviewReports() {
  const { data, error } = await supabase
    .from("review_reports")
    .select("id, review_id, reporter_id, reason, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[reviews] reports", error);
    return [] as ReviewReportRow[];
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    reviewId: r.review_id,
    reporterId: r.reporter_id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function resolveReviewReport(reportId: string, status: "resolved" | "dismissed") {
  const { error } = await supabase.from("review_reports").update({ status }).eq("id", reportId);
  if (error) {
    console.error("[reviews] resolve report", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export interface ModerationEvent {
  id: string;
  reviewId: string;
  actorId: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: string;
}

export async function fetchModerationEvents(reviewId: string) {
  const { data, error } = await supabase
    .from("review_moderation_events")
    .select("id, review_id, actor_id, action, from_status, to_status, reason, created_at")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false });
  if (error) return [] as ModerationEvent[];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    reviewId: r.review_id,
    actorId: r.actor_id,
    action: r.action,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

/* ---------------- Trust score contribution ---------------- */

export interface TrustInputs {
  reviewAverage: number;   // 0..5
  reviewCount: number;
  verifications: number;   // count of approved verifications (0..4)
  completedDeals: number;
  responseMinutes: number | null;
  listingQuality: number;  // 0..100
  activeDays: number;      // account activity signal
}

export interface TrustBreakdown {
  score: number;
  tier: "new" | "rising" | "trusted" | "elite";
  parts: { key: string; label: string; points: number; max: number }[];
}

/**
 * Balanced Trust Score. Reviews are capped at 25 points and their weight ramps
 * up with volume, so a single review can never swing the score dramatically.
 */
export function computeTrustBreakdown(i: TrustInputs): TrustBreakdown {
  const confidence = Math.min(1, i.reviewCount / 10); // needs ~10 reviews for full weight
  const reviewPoints = i.reviewCount
    ? Math.round(((i.reviewAverage - 2.5) / 2.5) * 25 * confidence)
    : 0;

  const parts = [
    { key: "reviews", label: "Reviews", points: Math.max(-10, Math.min(25, reviewPoints)), max: 25 },
    { key: "verification", label: "Verification", points: Math.min(25, i.verifications * 8), max: 25 },
    { key: "deals", label: "Completed deals", points: Math.min(20, i.completedDeals * 4), max: 20 },
    {
      key: "response",
      label: "Response time",
      points:
        i.responseMinutes == null ? 0 : i.responseMinutes <= 15 ? 10 : i.responseMinutes <= 60 ? 7 : i.responseMinutes <= 360 ? 4 : 1,
      max: 10,
    },
    { key: "quality", label: "Listing quality", points: Math.round((i.listingQuality / 100) * 10), max: 10 },
    { key: "activity", label: "Account activity", points: Math.min(10, Math.round(i.activeDays / 18)), max: 10 },
  ];

  const score = Math.max(0, Math.min(100, parts.reduce((a, p) => a + p.points, 0)));
  const tier: TrustBreakdown["tier"] =
    score >= 85 ? "elite" : score >= 65 ? "trusted" : score >= 40 ? "rising" : "new";
  return { score, tier, parts };
}
