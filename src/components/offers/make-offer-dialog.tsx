import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitOffer, fmtTZS, type Financing } from "@/lib/offers-db";
import { cn } from "@/lib/utils";

export function MakeOfferDialog({
  open, onOpenChange, property, isRent, defaultName, defaultEmail,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  property: { id: string; title: string; location: string; price: number; currency: string; availability: string };
  isRent: boolean; defaultName?: string; defaultEmail?: string;
}) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [date, setDate] = useState("");
  const [financing, setFinancing] = useState<Financing>("cash");
  const [conditions, setConditions] = useState("");
  const [expiryHours, setExpiryHours] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const diff = num - property.price;

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await submitOffer({
        propertyId: property.id, amount: num,
        deposit: deposit ? Number(deposit.replace(/[^\d.]/g, "")) : null,
        completion: date || null, financing, conditions,
        expiresAt: expiryHours ? new Date(Date.now() + Number(expiryHours) * 3600000).toISOString() : null,
        name, phone, email,
      });
      toast.success("Offer sent to the seller");
      onOpenChange(false);
      navigate({ to: "/deals", search: { deal: res.deal_id } as any });
    } catch (e: any) {
      setError(e?.message || "Couldn't complete this action.");
      setStep("form");
    } finally { setBusy(false); }
  }

  const canNext = num > 0 && agree && name.trim().length > 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep("form"); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isRent ? "Apply / Make Rental Offer" : "Make Offer"}</DialogTitle>
          <DialogDescription>Free to submit. The seller can accept, decline or counter.</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Property</p>
          <p className="font-medium text-foreground">{property.title}</p>
          <p className="text-muted-foreground">{property.location}</p>
          <div className="mt-2 flex flex-wrap justify-between gap-2">
            <span>Asking: <b className="text-foreground">{fmtTZS(property.price, property.currency)}</b></span>
            <span className="capitalize text-muted-foreground">{property.availability.replace("_", " ")}</span>
          </div>
        </div>

        {step === "form" ? (
          <div className="space-y-3">
            <div>
              <Label>{isRent ? "Offered rent" : "Offer amount"} ({property.currency})</Label>
              <Input inputMode="numeric" className="h-12 text-lg font-semibold" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder={String(property.price)} />
              {num > 0 && (
                <p className={cn("mt-1 text-xs", diff < 0 ? "text-warning" : "text-success")}>
                  {diff === 0 ? "Same as asking price" : `${diff < 0 ? "Below" : "Above"} asking by ${fmtTZS(Math.abs(diff), property.currency)}`}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Deposit (optional)</Label><Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
              <div><Label>{isRent ? "Move-in date" : "Completion date"}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>Payment method</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["cash", "mortgage", "other"] as Financing[]).map((f) => (
                  <Button key={f} type="button" variant={financing === f ? "default" : "outline"} className="h-11" onClick={() => setFinancing(f)}>
                    {f === "cash" ? "Cash" : f === "mortgage" ? "Mortgage" : "Other"}
                  </Button>
                ))}
              </div>
            </div>
            <div><Label>Conditions / notes</Label><Textarea rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
            <div>
              <Label>Offer valid for (optional)</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}>
                <option value="">No expiry</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">You can upload supporting documents from the deal page after sending.</p>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <span>I confirm this is a genuine offer.</span>
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full text-base" disabled={!canNext} onClick={() => setStep("confirm")}>Review offer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs uppercase text-muted-foreground">Your offer</p>
              <p className="font-display text-2xl font-semibold text-foreground">{fmtTZS(num, property.currency)}</p>
              {date && <p className="text-sm text-muted-foreground">{isRent ? "Move-in" : "Completion"}: {date}</p>}
            </div>
            <p className="text-sm text-foreground">You are submitting an offer for this property. The seller will be able to accept, decline or make a counter-offer.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" onClick={() => setStep("form")} disabled={busy}>Back</Button>
              <Button className="h-12" onClick={() => void submit()} disabled={busy}>{busy ? "Sending…" : "Submit Offer"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
