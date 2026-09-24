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
import { useI18n } from "@/hooks/use-i18n";
import { uploadDocument, type DealDocumentKind } from "@/lib/deals-db";

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOC_KINDS: DealDocumentKind[] = ["proof_of_funds", "financing_document", "identification", "other"];

export function MakeOfferDialog({
  open, onOpenChange, property, isRent, defaultName, defaultEmail,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  property: { id: string; title: string; location: string; price: number; currency: string; availability: string };
  isRent: boolean; defaultName?: string; defaultEmail?: string;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [files, setFiles] = useState<{ file: File; kind: DealDocumentKind }[]>([]);
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
      for (const f of files) {
        try { await uploadDocument(res.deal_id, f.file, f.kind, null, res.offer_id); } catch { toast.error(t("offer.failed")); }
      }
      toast.success(t("offer.sent"));
      onOpenChange(false);
      navigate({ to: "/deals", search: { deal: res.deal_id } as any });
    } catch (e: any) {
      setError(e?.message || t("offer.failed"));
      setStep("form");
    } finally { setBusy(false); }
  }

  const canNext = num > 0 && agree && name.trim().length > 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep("form"); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isRent ? t("offer.makeRentOffer") : t("offer.makeOffer")}</DialogTitle>
          <DialogDescription>{t("offer.freeToSubmit")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("offer.property")}</p>
          <p className="font-medium text-foreground">{property.title}</p>
          <p className="text-muted-foreground">{property.location}</p>
          <div className="mt-2 flex flex-wrap justify-between gap-2">
            <span>{t("offer.asking")}: <b className="text-foreground">{fmtTZS(property.price, property.currency)}</b></span>
            <span className="text-muted-foreground">{t(`offer.avail_${property.availability}`)}</span>
          </div>
        </div>

        {step === "form" ? (
          <div className="space-y-3">
            <div>
              <Label>{isRent ? t("offer.offeredRent") : t("offer.offerAmount")} ({property.currency})</Label>
              <Input inputMode="numeric" className="h-12 text-lg font-semibold" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder={String(property.price)} />
              {num > 0 && (
                <p className={cn("mt-1 text-xs", diff < 0 ? "text-warning" : "text-success")}>
                  {diff === 0 ? t("offer.same") : t(diff < 0 ? "offer.below" : "offer.above", { amount: fmtTZS(Math.abs(diff), property.currency) })}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("offer.depositOpt")}</Label><Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
              <div><Label>{isRent ? t("offer.moveInDate") : t("offer.completionDate")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t("offer.paymentMethod")}</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["cash", "mortgage", "other"] as Financing[]).map((f) => (
                  <Button key={f} type="button" variant={financing === f ? "default" : "outline"} className="h-11" onClick={() => setFinancing(f)}>
                    {t(`offer.${f}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div><Label>{t("offer.conditions")}</Label><Textarea rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
            <div>
              <Label>{t("offer.validFor")}</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}>
                <option value="">{t("offer.noExpiry")}</option><option value="24">{t("offer.h24")}</option><option value="72">{t("offer.d3")}</option><option value="168">{t("offer.d7")}</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>{t("offer.yourName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>{t("offer.phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>{t("offer.email")}</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t("offer.attachments")}</Label>
              <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="mt-1" onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                const ok: { file: File; kind: DealDocumentKind }[] = [];
                for (const f of picked) {
                  if (f.size > MAX) { toast.error(t("offer.fileTooBig", { name: f.name })); continue; }
                  if (!TYPES.includes(f.type)) { toast.error(t("offer.fileType", { name: f.name })); continue; }
                  ok.push({ file: f, kind: "proof_of_funds" });
                }
                setFiles((prev) => [...prev, ...ok]); e.target.value = "";
              }} />
              <p className="mt-1 text-xs text-muted-foreground">{t("offer.attachHint")}</p>
              {files.map((f, i) => (
                <div key={i} className="mt-2 flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-foreground">{f.file.name}</span>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground" value={f.kind}
                    onChange={(e) => setFiles((p) => p.map((x, j) => j === i ? { ...x, kind: e.target.value as DealDocumentKind } : x))}>
                    {DOC_KINDS.map((k) => <option key={k} value={k}>{t(`offer.doc_${k}`)}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>✕</Button>
                </div>
              ))}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <span>{t("offer.confirmGenuine")}</span>
            </label>
            {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full text-base" disabled={!canNext} onClick={() => setStep("confirm")}>{t("offer.review")}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs uppercase text-muted-foreground">{t("offer.yourOffer")}</p>
              <p className="font-display text-2xl font-semibold text-foreground">{fmtTZS(num, property.currency)}</p>
              {date && <p className="text-sm text-muted-foreground">{isRent ? t("offer.moveInDate") : t("offer.completionDate")}: {date}</p>}
            </div>
            <p className="text-sm text-foreground">{t("offer.confirmText")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" onClick={() => setStep("form")} disabled={busy}>{t("offer.back")}</Button>
              <Button className="h-12" onClick={() => void submit()} disabled={busy}>{busy ? t("offer.sending") : t("offer.submit")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
