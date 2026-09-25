import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Receipt, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dx } from "@/lib/deal-sw";
import { useI18n } from "@/hooks/use-i18n";
import { fmtTZS, type PaymentItem } from "@/lib/offers-db";
import { fetchDealPayments, type FinPayment } from "@/lib/finance-db";
import { activePaymentProvider } from "@/lib/payment-provider";
import type { DealLite } from "@/components/offers/deal-engine-panel";

export const PAY_TYPE: Record<string, string> = {
  deposit: "Deposit", balance: "Balance", spaces_fee: "SPACES Service Fee",
  agent_commission: "Dalali Commission", other: "Other Charge",
};
export const PAY_STATUS: Record<string, string> = {
  pending: "PENDING", processing: "PROCESSING", paid: "PAID", succeeded: "PAID", failed: "FAILED", cancelled: "CANCELLED", refunded: "REFUNDED",
};
export const payTypeLabel = (k: string | null) => dx(PAY_TYPE[k ?? ""] ?? (k ?? "—"));
export const payStatusLabel = (s: string) => dx(PAY_STATUS[s] ?? s.toUpperCase());

export function DealFinance({ deal, items, userId }: { deal: DealLite; items: PaymentItem[]; userId: string | null }) {
  useI18n();
  const [payments, setPayments] = useState<FinPayment[]>([]);
  const [receipt, setReceipt] = useState<FinPayment | null>(null);
  useEffect(() => { void fetchDealPayments(deal.id).then(setPayments); }, [deal.id, items]);
  if (!deal.agreed_price) return null;

  const cur = deal.currency || "TZS";
  const isBuyer = userId === deal.buyer_id;
  const it = (k: string) => items.find((i) => i.kind === k);
  const deposit = Number(it("deposit")?.amount ?? 0);
  const balance = Number(it("balance")?.amount ?? 0);
  const fee = Number(deal.estimated_spaces_fee ?? 0);
  const tax = Number(deal.spaces_fee_tax ?? 0);
  const comm = Number(deal.agent_commission ?? 0);
  const other = Number(deal.other_charges ?? 0);
  const buyerItems = items.filter((i) => i.payer === "buyer" && Number(i.amount) > 0);
  const totalPayable = deposit + balance + fee + tax + other;
  const totalPaid = buyerItems.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const remaining = Math.max(totalPayable - totalPaid, 0);
  const anyTest = buyerItems.some((i) => i.status === "paid" && (i as any).is_test);

  const rows: [string, number | null][] = [
    ["Property value", deal.asking_price ?? null], ["Agreed price", Number(deal.agreed_price)], ["Deposit", deposit],
    ["Balance", balance], ["SPACES service fee", fee], ["Tax", tax], ["Dalali commission", comm], ["Other charges", other],
  ];

  function payNow() {
    void activePaymentProvider().startPayment({ paymentItemId: "", dealId: deal.id, amount: remaining, currency: cur }).then((r) => {
      if (!r.ok) toast.info(dx("Online payment is not yet available. SPACES payment integration will be enabled soon."));
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4" data-testid="deal-finance">
      <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /><h3 className="font-display text-base font-semibold text-foreground">{dx("Financial summary")}</h3></div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {rows.map(([l, v]) => (
          <div key={l}><dt className="text-xs text-muted-foreground">{dx(l)}</dt><dd className="font-semibold text-foreground">{v == null ? "—" : fmtTZS(v, cur)}</dd></div>
        ))}
      </dl>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
        <div><p className="text-xs text-muted-foreground">{dx("Total payable")}</p><p className="font-display font-semibold text-foreground">{fmtTZS(totalPayable, cur)}</p></div>
        <div><p className="text-xs text-muted-foreground">{dx("Total paid")}</p><p className="font-display font-semibold text-success">{fmtTZS(totalPaid, cur)}</p></div>
        <div><p className="text-xs text-muted-foreground">{dx("Balance remaining")}</p><p className="font-display font-semibold text-foreground">{fmtTZS(remaining, cur)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{dx("Fees and commission are locked when the offer is accepted and never change afterwards.")}</p>

      {buyerItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground">{dx("Payment plan")}</h4>
          <ul className="mt-2 divide-y divide-border">
            {buyerItems.map((i) => {
              const p = payments.find((x) => x.id === i.payment_id);
              const test = i.status === "paid" && (i as any).is_test;
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-foreground">{payTypeLabel(i.kind)}</span>
                  <span className="flex items-center gap-2">
                    <b className="text-foreground">{fmtTZS(Number(i.amount), i.currency)}</b>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", i.status === "paid" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {test ? dx("PAID — TEST MODE") : payStatusLabel(i.status)}
                    </span>
                    {p?.receipt_number && <Button size="sm" variant="ghost" className="h-8" onClick={() => setReceipt(p)}><Receipt className="mr-1 h-4 w-4" />{dx("Receipt")}</Button>}
                  </span>
                </li>
              );
            })}
          </ul>
          {anyTest && <p className="mt-2 text-xs font-semibold text-warning">{dx("TEST MODE — NOT A REAL PAYMENT")}</p>}
          {isBuyer && remaining > 0 && deal.stage !== "cancelled" && (
            <Button className="mt-3 h-11 w-full sm:w-auto" onClick={payNow}>{dx("PAY NOW")}</Button>
          )}
        </div>
      )}

      <ReceiptDialog payment={receipt} deal={deal} onClose={() => setReceipt(null)} />
    </section>
  );
}

export function ReceiptDialog({ payment, deal, onClose }: { payment: FinPayment | null; deal?: Partial<DealLite> & { reference?: string | null }; onClose: () => void }) {
  if (!payment) return null;
  const rows: [string, string][] = [
    ["Receipt number", payment.receipt_number ?? "—"],
    ["Date", new Date(payment.paid_at ?? payment.created_at).toLocaleString()],
    ["Deal reference", (deal as any)?.reference ?? payment.deal_id?.slice(0, 8) ?? "—"],
    ["Property", deal?.property_title ?? "—"],
    ["Buyer", deal?.buyer_name ?? "—"],
    ["Payment type", payTypeLabel(payment.payment_type)],
    ["Amount", fmtTZS(payment.amount, payment.currency)],
    ["Payment method", payment.is_test ? dx("Test mode") : payment.provider],
    ["Reference", payment.reference ?? "—"],
    ["Status", payStatusLabel(payment.status)],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">SPACES — {dx("Receipt")}</DialogTitle></DialogHeader>
        {payment.is_test && <p className="rounded-lg border border-warning/40 bg-warning/10 p-2 text-center text-xs font-bold text-warning">{dx("TEST PAYMENT — NOT A REAL PAYMENT")}</p>}
        <dl className="divide-y divide-border text-sm">
          {rows.map(([l, v]) => <div key={l} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{dx(l)}</dt><dd className="text-right font-medium text-foreground">{v}</dd></div>)}
        </dl>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />{dx("Print")}</Button>
      </DialogContent>
    </Dialog>
  );
}
