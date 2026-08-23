import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Smartphone, CreditCard, Building2 } from "lucide-react";
import { PAYMENT_METHODS, formatTZS } from "@/lib/billing-mock";
import { type PaymentIntent } from "@/lib/payments-store";

const CATEGORY_ICON = { mobile: Smartphone, card: CreditCard, bank: Building2 } as const;

/**
 * Checkout is display-only until a payment provider is connected.
 * No payment is ever simulated or recorded here.
 */
export function CheckoutDialog({
  open, onOpenChange, intent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  intent: PaymentIntent | null;
  onSuccess?: (invoiceId: string) => void;
}) {
  if (!intent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Payment gateway setup required</DialogTitle>
          <DialogDescription>
            {intent.label} · {formatTZS(intent.amountTZS)}
            {intent.durationDays ? ` · ${intent.durationDays} days` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-foreground/75">
            SPACES is not yet connected to a live payment provider, so this purchase can't be
            completed online. Our team will contact you to arrange payment.
          </p>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Methods coming soon
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = CATEGORY_ICON[m.category];
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 opacity-70">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{m.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
