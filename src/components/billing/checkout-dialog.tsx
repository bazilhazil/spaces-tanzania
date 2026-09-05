import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Smartphone, CreditCard, Building2, Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { PAYMENT_METHODS } from "@/lib/billing-mock";
import { onlinePaymentsAvailable, bankTransferDetails, startOnlinePayment } from "@/lib/selcom.functions";
import {
  formatTZS, planPrice,
  createSubscriptionOrder, createPromotionOrder,
  type BillingPlan, type BillingCycle, type PromotionProduct,
} from "@/lib/monetization-db";

const CATEGORY_ICON = { mobile: Smartphone, card: CreditCard, bank: Building2 } as const;

export type CheckoutRequest =
  | { kind: "plan"; plan: BillingPlan; currentPlanName: string; cycle: BillingCycle }
  | { kind: "promotion"; product: PromotionProduct; propertyId: string; propertyTitle: string };

/**
 * Upgrade / promotion checkout.
 * Creates a PENDING payment record and hands it to the secure payment
 * backend. Paid features are never unlocked here — activation happens
 * exclusively when the provider confirms the payment.
 */
export function CheckoutDialog({
  open, onOpenChange, request, onOrdered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: CheckoutRequest | null;
  onOrdered?: () => void;
}) {
  const { t } = useI18n();
  const [method, setMethod] = useState<string>("mpesa");
  const [busy, setBusy] = useState(false);
  const [ordered, setOrdered] = useState<{ reference: string; bank: boolean } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const { data: gateway } = useQuery({
    queryKey: ["online-payments-available"],
    queryFn: () => onlinePaymentsAvailable(),
    staleTime: 5 * 60_000,
  });
  const { data: bank } = useQuery({
    queryKey: ["bank-transfer-details"],
    queryFn: () => bankTransferDetails(),
    staleTime: 5 * 60_000,
    enabled: method === "bank",
  });

  useEffect(() => { if (open) { setOrdered(null); setFailed(null); } }, [open]);

  if (!request) return null;

  const amount = request.kind === "plan"
    ? planPrice(request.plan, request.cycle)
    : request.product.price;

  const title = request.kind === "plan" ? request.plan.name : request.product.name;

  const close = (v: boolean) => {
    if (!v) { setOrdered(null); setFailed(null); }
    onOpenChange(v);
  };

  const submit = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = request.kind === "plan"
        ? await createSubscriptionOrder(request.plan, request.cycle, method)
        : await createPromotionOrder(request.product, request.propertyId, method);
      onOrdered?.();

      if (method === "bank") {
        setOrdered({ reference: res.reference, bank: true });
        return;
      }

      const start = await startOnlinePayment({ data: { reference: res.reference } });
      if (start.ok) {
        toast.info(t("billing.pay.redirecting"));
        window.location.href = start.gatewayUrl;
        return;
      }
      setOrdered({ reference: res.reference, bank: false });
      setFailed(start.reason === "unconfigured" ? "unconfigured" : "provider");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFailed(msg);
      toast.error(t("billing.pay.couldNotStart"));
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {ordered ? t("billing.checkout.orderCreated") : t("billing.checkout.title")}
          </DialogTitle>
          <DialogDescription>
            {title} · {formatTZS(amount)}
            {request.kind === "promotion" ? ` · ${request.product.duration_days} ${t("billing.days")}` : ""}
          </DialogDescription>
        </DialogHeader>

        {ordered ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-foreground/80">
              <div className="font-semibold text-foreground">{t("billing.checkout.pendingTitle")}</div>
              <p className="mt-1">{t("billing.checkout.pendingBody")}</p>
              <p className="mt-2 font-mono text-xs">{ordered.reference}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>{t("common.close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {request.kind === "plan" && (
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="ds-caption">{t("billing.currentPlan")}</div>
                    <div className="mt-0.5 font-semibold">{request.currentPlanName}</div>
                  </div>
                  <div>
                    <div className="ds-caption">{t("billing.selectedPlan")}</div>
                    <div className="mt-0.5 font-semibold">{request.plan.name}</div>
                  </div>
                  <div>
                    <div className="ds-caption">{t("billing.billingPeriod")}</div>
                    <div className="mt-0.5 font-semibold capitalize">
                      {request.cycle === "annual" ? t("billing.annual") : t("billing.monthly")}
                    </div>
                  </div>
                  <div>
                    <div className="ds-caption">{t("billing.price")}</div>
                    <div className="mt-0.5 font-semibold">{formatTZS(amount)}</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm">
                  {request.plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {request.kind === "promotion" && (
              <div className="rounded-2xl border border-border/60 p-4 text-sm">
                <div className="ds-caption">{t("billing.promo.property")}</div>
                <div className="mt-0.5 font-semibold">{request.propertyTitle}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="ds-caption">{t("billing.promo.duration")}</div>
                    <div className="mt-0.5 font-semibold">{request.product.duration_days} {t("billing.days")}</div>
                  </div>
                  <div>
                    <div className="ds-caption">{t("billing.price")}</div>
                    <div className="mt-0.5 font-semibold">{formatTZS(amount)}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t("billing.promo.startsAfterPayment")}</p>
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("billing.paymentMethod")}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = CATEGORY_ICON[m.category];
                  const selected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        selected ? "border-primary bg-primary/5" : "border-border/60 hover:bg-accent",
                      )}
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{m.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{m.description}</div>
                      </div>
                      {selected && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {failed && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="text-sm">
                  <div className="font-semibold">{t("billing.checkout.failed")}</div>
                  <p className="text-foreground/75">{t("billing.checkout.failedBody")}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("billing.checkout.security")}</span>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => close(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="w-full sm:w-auto" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("billing.continueToPayment")}
              </Button>
            </DialogFooter>

            <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-700 dark:text-amber-300">
              {t("billing.checkout.manualNote")}
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
