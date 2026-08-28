// SPACES monetization — plans, promotions and orders.
// Prices, limits and durations are ADMIN-CONFIGURABLE and always read from the
// database (billing_plans / promotion_products). Nothing here ever marks a
// payment as successful: orders are created as `pending` and only a confirmed
// payment (gateway or admin reconciliation) activates paid features.

import { supabase } from "@/integrations/supabase/client";

export type BillingCycle = "monthly" | "annual";

export type BillingPlan = {
  id: string;
  name: string;
  tagline: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  listing_limit: number | null; // null = unlimited
  agent_limit: number | null;
  features: string[];
  badge: string | null;
  sort_order: number;
  active: boolean;
};

export type PromotionProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_days: number;
  sort_order: number;
  active: boolean;
};

export type PlanUsage = {
  plan_id: string;
  plan_name: string;
  listing_limit: number | null;
  agent_limit: number | null;
  listings_used: number;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type PropertyPromotion = {
  id: string;
  property_id: string;
  product_id: string;
  status: string;
  price: number;
  duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export function formatTZS(v: number | null | undefined): string {
  if (v == null) return "Custom";
  if (v === 0) return "Free";
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(v) + " TZS";
}

export function planPrice(plan: BillingPlan, cycle: BillingCycle): number {
  return cycle === "annual" ? Number(plan.price_annual) : Number(plan.price_monthly);
}

function normalisePlan(row: Record<string, unknown>): BillingPlan {
  const raw = row.features;
  const features = Array.isArray(raw) ? raw.map((f) => String(f)) : [];
  return {
    id: String(row.id),
    name: String(row.name),
    tagline: String(row.tagline ?? ""),
    price_monthly: Number(row.price_monthly ?? 0),
    price_annual: Number(row.price_annual ?? 0),
    currency: String(row.currency ?? "TZS"),
    listing_limit: row.listing_limit == null ? null : Number(row.listing_limit),
    agent_limit: row.agent_limit == null ? null : Number(row.agent_limit),
    features,
    badge: (row.badge as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
  };
}

export async function fetchPlans(includeInactive = false): Promise<BillingPlan[]> {
  let query = supabase.from("billing_plans").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalisePlan);
}

export async function fetchPromotionProducts(includeInactive = false): Promise<PromotionProduct[]> {
  let query = supabase.from("promotion_products").select("*").order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data as PromotionProduct[] | null) ?? []).map((p) => ({
    ...p,
    price: Number(p.price),
    duration_days: Number(p.duration_days),
  }));
}

export async function fetchPlanUsage(): Promise<PlanUsage | null> {
  const { data, error } = await supabase.rpc("my_plan_usage");
  if (error) throw error;
  const row = (data as PlanUsage[] | null)?.[0];
  return row ?? null;
}

export async function fetchMyPromotions(): Promise<PropertyPromotion[]> {
  const { data, error } = await supabase
    .from("property_promotions")
    .select("id, property_id, product_id, status, price, duration_days, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as PropertyPromotion[] | null) ?? []).map((p) => ({ ...p, price: Number(p.price) }));
}

/** Ask the backend to raise (at most one per period) an expiry reminder. */
export async function checkSubscriptionExpiry(): Promise<void> {
  await supabase.rpc("check_my_subscription_expiry");
}

function reference(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export type PendingOrder = {
  paymentId: string;
  reference: string;
  amount: number;
};

/**
 * Creates a PENDING subscription payment. The plan is NOT changed here —
 * only a confirmed payment activates it (see the payments status trigger).
 */
export async function createSubscriptionOrder(
  plan: BillingPlan,
  cycle: BillingCycle,
  method: string,
): Promise<PendingOrder> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("not_signed_in");

  const amount = planPrice(plan, cycle);
  const ref = reference("SPX");
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: uid,
      provider: method,
      amount,
      currency: plan.currency || "TZS",
      status: "pending",
      purpose: "subscription",
      plan_id: plan.id,
      billing_cycle: cycle,
      reference: ref,
      metadata: { label: `${plan.name} — ${cycle}`, method },
    })
    .select("id")
    .single();
  if (error) throw error;
  return { paymentId: (data as { id: string }).id, reference: ref, amount };
}

/** Creates a PENDING promotion order for one property. */
export async function createPromotionOrder(
  product: PromotionProduct,
  propertyId: string,
  method: string,
): Promise<PendingOrder> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("not_signed_in");

  const ref = reference("SPP");
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: uid,
      provider: method,
      amount: product.price,
      currency: product.currency || "TZS",
      status: "pending",
      purpose: "promotion",
      reference: ref,
      metadata: { label: product.name, method, property_id: propertyId, product_id: product.id },
    })
    .select("id")
    .single();
  if (error) throw error;

  const paymentId = (data as { id: string }).id;
  const { error: promoError } = await supabase.from("property_promotions").insert({
    property_id: propertyId,
    user_id: uid,
    product_id: product.id,
    payment_id: paymentId,
    status: "pending_payment",
    price: product.price,
    currency: product.currency || "TZS",
    duration_days: product.duration_days,
  });
  if (promoError) throw promoError;

  return { paymentId, reference: ref, amount: product.price };
}

/* ── Admin configuration ──────────────────────────────────────────── */

export async function updatePlan(id: string, patch: Partial<BillingPlan>): Promise<void> {
  const { error } = await supabase.from("billing_plans").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function updatePromotionProduct(id: string, patch: Partial<PromotionProduct>): Promise<void> {
  const { error } = await supabase.from("promotion_products").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function adminSetPaymentStatus(paymentId: string, status: string): Promise<void> {
  const { error } = await supabase.rpc("admin_set_payment_status", {
    _payment_id: paymentId,
    _status: status,
  });
  if (error) throw error;
}

/** Human-readable listing-limit check used before opening the upload wizard. */
export function listingLimitReached(usage: PlanUsage | null): boolean {
  if (!usage || usage.listing_limit == null) return false;
  return usage.listings_used >= usage.listing_limit;
}
