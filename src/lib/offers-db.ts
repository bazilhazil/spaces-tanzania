import { supabase } from "@/integrations/supabase/client";

export type OfferStatus = "submitted" | "viewed" | "countered" | "accepted" | "declined" | "withdrawn" | "expired";
export type Financing = "cash" | "mortgage" | "other";

export type Offer = {
  id: string;
  reference: string;
  deal_id: string;
  property_id: string;
  buyer_id: string;
  owner_id: string | null;
  agent_id: string | null;
  parent_offer_id: string | null;
  made_by: string;
  made_by_side: "buyer" | "seller";
  amount: number;
  deposit_amount: number | null;
  currency: string;
  completion_date: string | null;
  financing_method: Financing | null;
  conditions: string | null;
  message: string | null;
  buyer_name: string | null;
  status: OfferStatus;
  expires_at: string | null;
  submitted_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type ChecklistItem = {
  id: string; deal_id: string; key: string; label: string;
  phase: "verification" | "payment" | "completion"; required: boolean;
  sort_order: number; completed_at: string | null;
};
export type PaymentItem = {
  id: string; kind: string; label: string; payer: string; amount: number; currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "refunded" | "cancelled"; paid_at: string | null;
};
export type Commission = {
  id: string; deal_id: string; agent_id: string; rate: number | null; amount: number; currency: string;
  status: "estimated" | "protected" | "pending_completion" | "payable" | "paid" | "cancelled";
  completion_condition: string; protected_at: string | null;
};
export type AuditEntry = {
  id: string; deal_id: string; offer_id: string | null; actor_id: string | null; action: string; label: string;
  amount: number | null; note: string | null; old_value: any; new_value: any; created_at: string;
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  submitted: "Waiting for reply", viewed: "Seen", countered: "Countered",
  accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", expired: "Expired",
};
export const COMMISSION_LABEL: Record<Commission["status"], string> = {
  estimated: "Estimated", protected: "Protected", pending_completion: "Pending completion",
  payable: "Payable", paid: "Paid", cancelled: "Cancelled",
};

export function fmtTZS(n: number | null | undefined, cur = "TZS") {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${cur} ${Math.round(Number(n)).toLocaleString("en-US")}`;
}

function errMsg(e: any) {
  return (e?.message as string | undefined)?.replace(/^.*?:\s*/, "") ?? "Couldn't complete this action.";
}

export async function submitOffer(input: {
  propertyId: string; amount: number; deposit: number | null; completion: string | null; financing: Financing;
  conditions: string; expiresAt: string | null; name: string; phone: string; email: string;
}) {
  const { data, error } = await (supabase.rpc as any)("submit_offer", {
    _property_id: input.propertyId, _amount: input.amount, _deposit: input.deposit, _completion: input.completion,
    _financing: input.financing, _conditions: input.conditions, _expires_at: input.expiresAt,
    _name: input.name, _phone: input.phone, _email: input.email,
  });
  if (error) throw new Error(error.message || errMsg(error));
  return data as { offer_id: string; deal_id: string };
}

export async function respondOffer(offerId: string, action: "accept" | "decline" | "counter" | "withdraw" | "viewed",
  extra: { amount?: number; deposit?: number | null; completion?: string | null; conditions?: string; message?: string } = {}) {
  const { data, error } = await (supabase.rpc as any)("respond_offer", {
    _offer_id: offerId, _action: action, _amount: extra.amount ?? null, _deposit: extra.deposit ?? null,
    _completion: extra.completion ?? null, _conditions: extra.conditions ?? null, _message: extra.message ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function setChecklistItem(id: string, done: boolean) {
  const { error } = await (supabase.rpc as any)("set_checklist_item", { _item_id: id, _done: done });
  if (error) throw new Error(error.message);
}
export async function confirmCompletion(dealId: string) {
  const { error } = await (supabase.rpc as any)("confirm_deal_completion", { _deal_id: dealId });
  if (error) throw new Error(error.message);
}

export async function fetchDealEngine(dealId: string) {
  await (supabase.rpc as any)("expire_offers");
  const [offers, checklist, payments, commission, audit] = await Promise.all([
    supabase.from("offers" as any).select("*").eq("deal_id", dealId).order("created_at", { ascending: true }),
    supabase.from("deal_checklist_items" as any).select("*").eq("deal_id", dealId).order("sort_order"),
    supabase.from("deal_payment_items" as any).select("*").eq("deal_id", dealId).order("created_at"),
    supabase.from("deal_commissions" as any).select("*").eq("deal_id", dealId).maybeSingle(),
    supabase.from("deal_audit_log" as any).select("*").eq("deal_id", dealId).order("created_at", { ascending: true }),
  ]);
  return {
    offers: (offers.data ?? []) as unknown as Offer[],
    checklist: (checklist.data ?? []) as unknown as ChecklistItem[],
    payments: (payments.data ?? []) as unknown as PaymentItem[],
    commission: (commission.data ?? null) as unknown as Commission | null,
    audit: (audit.data ?? []) as unknown as AuditEntry[],
  };
}

export async function fetchMyOpenOffer(propertyId: string, userId: string) {
  const { data } = await supabase.from("offers" as any).select("id,deal_id,status,amount")
    .eq("property_id", propertyId).eq("buyer_id", userId).in("status", ["submitted", "viewed"]).maybeSingle();
  return data as unknown as { id: string; deal_id: string; status: string; amount: number } | null;
}

export async function fetchCommissionSummary() {
  const { data } = await (supabase.rpc as any)("my_commission_summary");
  return (data ?? { protected: 0, pending: 0, paid: 0, count: 0 }) as { protected: number; pending: number; paid: number; count: number };
}

export async function fetchAdminDealSummary(from?: string | null) {
  const { data, error } = await (supabase.rpc as any)("admin_deal_summary", { _from: from ?? null, _to: null });
  if (error) throw new Error(error.message);
  return data as Record<string, number>;
}

export function timeLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 48 ? `${Math.floor(h / 24)} days` : `${h}h ${m}m`;
}
