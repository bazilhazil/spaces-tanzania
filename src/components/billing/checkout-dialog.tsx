import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Settings2, Smartphone, CreditCard, Building2 } from "lucide-react";
import { PAYMENT_METHODS, formatTZS, type PaymentMethodId } from "@/lib/billing-mock";
import { isGatewayConfigured, setGatewayConfigured, recordPayment, type PaymentIntent } from "@/lib/payments-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

const CATEGORY_ICON = { mobile: Smartphone, card: CreditCard, bank: Building2 } as const;

export function CheckoutDialog({
  open, onOpenChange, intent, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  intent: PaymentIntent | null;
  onSuccess?: (invoiceId: string) => void;
}) {
  const [method, setMethod] = useState<PaymentMethodId>("mpesa");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const configured = isGatewayConfigured();

  if (!intent) return null;

  function reset() { setDone(null); setBusy(false); }

  async function pay() {
    if (!intent) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const inv = recordPayment(intent, method);
    setBusy(false);
    setDone(inv.id);
    toast.success("Payment successful", { description: `${intent.label} · ${formatTZS(intent.amountTZS)}` });
    onSuccess?.(inv.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {done ? "Payment confirmed" : "Secure checkout"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? "Your invoice has been generated and your account updated."
              : `${intent.label} · ${formatTZS(intent.amountTZS)}${intent.durationDays ? ` · ${intent.durationDays} days` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <div className="font-semibold">Invoice {done}</div>
                <div className="text-xs text-muted-foreground">Paid via {PAYMENT_METHODS.find(m => m.id === method)?.name}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1"><Link to="/billing/history">View history</Link></Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : !configured ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-semibold">Payment gateway setup required</div>
                <p className="mt-1 text-sm text-foreground/75">
                  Connect a payment provider to accept live payments. You can enable a preview flow to test the checkout experience.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => { setGatewayConfigured(true); toast.success("Preview gateway enabled"); }}>
                <Settings2 className="mr-2 h-4 w-4" /> Configure payment provider
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-xl font-semibold">{formatTZS(intent.amountTZS)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose method</div>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethodId)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = CATEGORY_ICON[m.category];
                  const active = method === m.id;
                  return (
                    <Label
                      key={m.id}
                      htmlFor={`pm-${m.id}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                        active ? "border-primary bg-primary/[0.04] shadow-[var(--shadow-soft)]" : "border-border/60 hover:border-primary/40",
                      )}
                    >
                      <RadioGroupItem id={`pm-${m.id}`} value={m.id} className="shrink-0" />
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{m.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{m.description}</div>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Secured checkout · we never store your card details
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={pay} disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</> : `Pay ${formatTZS(intent.amountTZS)}`}
              </Button>
            </DialogFooter>
          </>
        )}

        {done && <Badge variant="outline" className="hidden">{done}</Badge>}
      </DialogContent>
    </Dialog>
  );
}
