import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DollarSign, CreditCard, Download, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dx } from "@/lib/deal-sw";
import { useI18n } from "@/hooks/use-i18n";
import { fmtTZS } from "@/lib/offers-db";
import { supabase } from "@/integrations/supabase/client";
import { activePaymentProvider } from "@/lib/payment-provider";
import {
  fetchFinanceSummary, fetchAllPayments, fetchPaymentAudit, refundAction, csvDownload,
  type FinanceSummary, type FinPayment,
} from "@/lib/finance-db";
import { payTypeLabel, payStatusLabel, ReceiptDialog, PAY_TYPE } from "./deal-finance";

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{dx(label)}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold text-foreground", tone)}>{value}</p>
    </div>
  );
}

function ProviderBanner() {
  const p = activePaymentProvider();
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
      <PlugZap className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{dx("Payment provider")}:</span>
      <b className="text-foreground">{p.status === "not_connected" ? dx("NOT CONNECTED") : p.name}</b>
    </div>
  );
}

export function AdminRevenuePanel() {
  useI18n();
  const [s, setS] = useState<FinanceSummary | null>(null);
  useEffect(() => { void fetchFinanceSummary().then(setS).catch((e) => toast.error(e.message)); }, []);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">{dx("Revenue")}</h1>
        <p className="text-sm text-muted-foreground">{dx("Estimated, pending and collected revenue are kept separate. Test payments are never counted as collected.")}</p>
      </header>
      <ProviderBanner />
      {!s ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Total transaction value" value={fmtTZS(s.transaction_value)} />
          <Tile label="Estimated SPACES revenue" value={fmtTZS(s.estimated_revenue)} />
          <Tile label="Pending SPACES revenue" value={fmtTZS(s.pending_revenue)} tone="text-warning" />
          <Tile label="Collected SPACES revenue" value={fmtTZS(s.collected_revenue)} tone="text-success" />
          <Tile label="Taxes" value={fmtTZS(s.taxes)} />
          <Tile label="Dalali commissions" value={fmtTZS(s.commissions)} />
          <Tile label="Failed payments" value={`${s.failed_count} · ${fmtTZS(s.failed_amount)}`} tone="text-destructive" />
          <Tile label="Refunds" value={`${s.refund_count} · ${fmtTZS(s.refunded_amount)}`} />
          <Tile label="Test payments (not revenue)" value={fmtTZS(s.test_collected)} tone="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

const STATUSES = ["pending", "processing", "paid", "failed", "cancelled", "refunded"];

export function AdminPaymentsPanel() {
  useI18n();
  const [rows, setRows] = useState<FinPayment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ status: "", type: "", q: "", from: "", to: "" });
  const [open, setOpen] = useState<FinPayment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchAllPayments(); setRows(r);
      const ids = Array.from(new Set(r.map((p) => p.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data } = await supabase.from("public_profiles").select("id,full_name").in("id", ids);
        setNames(Object.fromEntries((data ?? []).map((x: any) => [x.id, x.full_name ?? ""])));
      }
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((p) => {
    const st = p.status === "succeeded" ? "paid" : p.status;
    if (f.status && st !== f.status) return false;
    if (f.type && (p.payment_type ?? p.purpose) !== f.type) return false;
    if (f.from && p.created_at < f.from) return false;
    if (f.to && p.created_at.slice(0, 10) > f.to) return false;
    if (f.q) {
      const hay = [p.reference, p.deal_id, p.receipt_number, names[p.user_id ?? ""]].join(" ").toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  }), [rows, f, names]);

  const counts = STATUSES.map((s) => [s, rows.filter((p) => (p.status === "succeeded" ? "paid" : p.status) === s).length] as const);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">{dx("Payments")}</h1>
        <p className="text-sm text-muted-foreground">{dx("All payment records. Payments are confirmed only by the payment provider or the separate admin test mode.")}</p>
      </header>
      <ProviderBanner />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {counts.map(([s, n]) => (
          <button key={s} onClick={() => setF({ ...f, status: f.status === s ? "" : s })}
            className={cn("rounded-xl border p-3 text-left", f.status === s ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <p className="text-[11px] text-muted-foreground">{payStatusLabel(s)}</p><p className="font-display text-lg font-semibold text-foreground">{n}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="h-10 w-full sm:w-64" placeholder={dx("Search reference, deal or buyer…")} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="">{dx("All payment types")}</option>
          {Object.keys(PAY_TYPE).map((k) => <option key={k} value={k}>{payTypeLabel(k)}</option>)}
          <option value="subscription">{dx("Subscription")}</option><option value="promotion">{dx("Boost")}</option>
        </select>
        <Input type="date" className="h-10 w-40" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label={dx("From")} />
        <Input type="date" className="h-10 w-40" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label={dx("To")} />
        <Button variant="outline" className="h-10" onClick={() => setF({ status: "", type: "", q: "", from: "", to: "" })}>{dx("Clear Filters")}</Button>
        <Button variant="outline" className="h-10" onClick={() => csvDownload("spaces-payments.csv", [
          ["reference", "type", "amount", "currency", "status", "test", "deal", "buyer", "created", "paid", "receipt", "refund"],
          ...filtered.map((p) => [p.reference, p.payment_type ?? p.purpose, p.amount, p.currency, p.status, p.is_test ? "yes" : "no", p.deal_id, names[p.user_id ?? ""], p.created_at, p.paid_at, p.receipt_number, p.refund_status]),
        ])}><Download className="mr-1 h-4 w-4" />{dx("Export CSV")}</Button>
      </div>
      {loading ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><CreditCard className="mx-auto mb-2 h-6 w-6" />{dx("No payments match these filters.")}</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <button onClick={() => setOpen(p)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/40">
                <span className="min-w-0">
                  <span className="block font-mono text-xs text-muted-foreground">{p.reference ?? p.id.slice(0, 8)}</span>
                  <span className="block text-sm font-medium text-foreground">{payTypeLabel(p.payment_type ?? p.purpose)} · {names[p.user_id ?? ""] || "—"}</span>
                  <span className="block text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <b className="whitespace-nowrap text-foreground">{fmtTZS(p.amount, p.currency)}</b>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{payStatusLabel(p.status)}</span>
                  {p.is_test && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">{dx("TEST")}</span>}
                  {p.refund_status && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">{dx(`Refund ${p.refund_status}`)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <PaymentDetail payment={open} buyer={open ? names[open.user_id ?? ""] : ""} onClose={() => setOpen(null)} onChanged={async () => { await load(); setOpen(null); }} />
    </div>
  );
}

function PaymentDetail({ payment, buyer, onClose, onChanged }: { payment: FinPayment | null; buyer: string; onClose: () => void; onChanged: () => void }) {
  const [audit, setAudit] = useState<any[]>([]);
  const [receipt, setReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (payment) void fetchPaymentAudit(payment).then(setAudit); }, [payment]);
  if (!payment) return null;
  const paid = payment.status === "paid" || payment.status === "succeeded" || payment.status === "refunded";
  const rs = payment.refund_status;
  async function run(a: "requested" | "processing" | "refunded" | "failed") {
    const note = a === "failed" || a === "requested" ? window.prompt(dx("Reason (logged)")) ?? undefined : undefined;
    setBusy(true);
    try { await refundAction(payment!.id, a, note); toast.success(dx("Saved")); onChanged(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  const rows: [string, string][] = [
    ["Payment ID", payment.id], ["Deal", payment.deal_id ?? "—"], ["Payer", buyer || "—"],
    ["Payment type", payTypeLabel(payment.payment_type ?? payment.purpose)], ["Amount", fmtTZS(payment.amount, payment.currency)],
    ["Status", payStatusLabel(payment.status)], ["Reference", payment.reference ?? "—"], ["Provider", payment.provider],
    ["Provider transaction ID", payment.provider_transaction_id ?? "—"], ["Created", new Date(payment.created_at).toLocaleString()],
    ["Paid", payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"], ["Test mode", payment.is_test ? dx("Yes") : dx("No")],
    ["Failure reason", payment.failure_reason ?? "—"], ["Refund status", rs ? dx(`Refund ${rs}`) : "—"], ["Receipt number", payment.receipt_number ?? "—"],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{dx("Payment details")}</DialogTitle></DialogHeader>
        {payment.is_test && <p className="rounded-lg bg-warning/10 p-2 text-center text-xs font-bold text-warning">{dx("TEST MODE — NOT A REAL PAYMENT")}</p>}
        <dl className="divide-y divide-border text-sm">
          {rows.map(([l, v]) => <div key={l} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{dx(l)}</dt><dd className="break-all text-right text-foreground">{v}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-2">
          {payment.receipt_number && <Button variant="outline" size="sm" onClick={() => setReceipt(true)}>{dx("Receipt")}</Button>}
          {paid && (!rs || rs === "failed") && <Button size="sm" variant="outline" disabled={busy} onClick={() => run("requested")}>{dx("Request refund")}</Button>}
          {rs === "requested" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run("processing")}>{dx("Mark refund processing")}</Button>}
          {(rs === "requested" || rs === "processing") && <>
            <Button size="sm" disabled={busy} onClick={() => run("refunded")}>{dx("Mark refunded")}</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => run("failed")}>{dx("Refund failed")}</Button>
          </>}
        </div>
        <p className="text-xs text-muted-foreground">{dx("Refunds are recorded here only. No money is moved until a payment provider is connected.")}</p>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{dx("Audit history")}</h4>
          {audit.length === 0 ? <p className="text-xs text-muted-foreground">{dx("No audit entries.")}</p> : (
            <ul className="mt-1 space-y-1 text-xs">{audit.map((a) => <li key={a.id} className="text-muted-foreground"><b className="text-foreground">{auditLabel(a.label)}</b> · {new Date(a.created_at).toLocaleString()}</li>)}</ul>
          )}
        </div>
        {receipt && <ReceiptDialog payment={payment} deal={{ buyer_name: buyer }} onClose={() => setReceipt(false)} />}
      </DialogContent>
    </Dialog>
  );
}

const AUDIT_KIND: Record<string, string> = { Deposit: "deposit", Balance: "balance", "SPACES service fee": "spaces_fee", "Agent commission": "agent_commission" };
function auditLabel(l: string): string {
  let m = l.match(/^Payment created: (\w+)( \(TEST\))?$/);
  if (m) return `${dx("Payment created")}: ${payTypeLabel(m[1])}${m[2] ? ` (${dx("TEST")})` : ""}`;
  m = l.match(/^Refund: (\w+)$/);
  if (m) return dx(`Refund ${m[1]}`);
  m = l.match(/^(.+) created$/);
  if (m && AUDIT_KIND[m[1]]) return `${payTypeLabel(AUDIT_KIND[m[1]])} — ${dx("created")}`;
  return dx(l);
}
