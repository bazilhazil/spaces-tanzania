import { supabase } from "@/integrations/supabase/client";

export type FinPayment = {
  id: string; user_id: string | null; deal_id: string | null; payment_type: string | null; purpose: string | null;
  amount: number; currency: string; status: string; reference: string | null; provider: string;
  provider_transaction_id: string | null; created_at: string; paid_at: string | null; is_test: boolean;
  failure_reason: string | null; refund_status: string | null; receipt_number: string | null;
};

export type FinanceSummary = {
  transaction_value: number; estimated_revenue: number; pending_revenue: number; collected_revenue: number;
  test_collected: number; taxes: number; commissions: number; failed_count: number; failed_amount: number;
  refund_count: number; refunded_amount: number;
};

const COLS = "id,user_id,deal_id,payment_type,purpose,amount,currency,status,reference,provider,provider_transaction_id,created_at,paid_at,is_test,failure_reason,refund_status,receipt_number";

export async function fetchFinanceSummary(): Promise<FinanceSummary> {
  const { data, error } = await (supabase.rpc as any)("admin_finance_summary");
  if (error) throw new Error(error.message);
  return data as FinanceSummary;
}

export async function fetchAllPayments(): Promise<FinPayment[]> {
  const { data, error } = await supabase.from("payments").select(COLS).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((p) => ({ ...p, amount: Number(p.amount) }));
}

export async function fetchDealPayments(dealId: string): Promise<FinPayment[]> {
  const { data } = await supabase.from("payments").select(COLS).eq("deal_id", dealId).order("created_at");
  return ((data ?? []) as any[]).map((p) => ({ ...p, amount: Number(p.amount) }));
}

export async function refundAction(paymentId: string, action: "requested" | "processing" | "refunded" | "failed", note?: string) {
  const { error } = await (supabase.rpc as any)("admin_refund_action", { _payment_id: paymentId, _action: action, _note: note ?? null });
  if (error) throw new Error(error.message);
}

export async function fetchPaymentAudit(p: FinPayment) {
  if (!p.deal_id) return [];
  const { data } = await supabase.from("deal_audit_log" as any).select("id,action,label,amount,created_at,new_value")
    .eq("deal_id", p.deal_id).order("created_at");
  return ((data ?? []) as any[]).filter((a) => a.action.startsWith("payment") || a.action.startsWith("refund") || a.new_value?.payment_id === p.id);
}

export type MyCommission = {
  id: string; deal_id: string; rate: number | null; amount: number; currency: string; status: string; created_at: string;
  reference?: string; property_title?: string; agreed_price?: number | null;
};

export async function fetchMyCommissions(userId: string): Promise<MyCommission[]> {
  const { data } = await supabase.from("deal_commissions" as any).select("id,deal_id,rate,amount,currency,status,created_at")
    .eq("agent_id", userId).order("created_at", { ascending: false });
  const rows = ((data ?? []) as any[]) as MyCommission[];
  if (!rows.length) return [];
  const { data: deals } = await supabase.from("deals").select("id,reference,agreed_price,property_id").in("id", rows.map((r) => r.deal_id));
  const pids = (deals ?? []).map((d: any) => d.property_id).filter(Boolean);
  const { data: props } = pids.length ? await supabase.from("properties").select("id,title").in("id", pids) : { data: [] as any[] };
  const dm = Object.fromEntries((deals ?? []).map((d: any) => [d.id, d]));
  const pm = Object.fromEntries((props ?? []).map((p: any) => [p.id, p.title]));
  return rows.map((r) => ({ ...r, amount: Number(r.amount), reference: dm[r.deal_id]?.reference, agreed_price: dm[r.deal_id]?.agreed_price, property_title: pm[dm[r.deal_id]?.property_id] }));
}

export function csvDownload(name: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
