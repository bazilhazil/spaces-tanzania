import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ShieldCheck, Clock, Lock, FileText, Upload, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { fetchDocuments, uploadDocument, documentSignedUrl, type DealDocument, type DealDocumentKind } from "@/lib/deals-db";
import {
  fetchDealEngine, respondOffer, setChecklistItem, confirmCompletion, fmtTZS, timeLeft,
  simulateTestPayment, isTestModeOn, type Offer,
} from "@/lib/offers-db";

export type DealLite = {
  id: string; stage: string; buyer_id: string | null; owner_id: string | null; agent_id: string | null;
  asking_price?: number | null; agreed_price?: number | null; currency: string;
  estimated_spaces_fee?: number | null; spaces_fee_tax?: number | null; agent_commission?: number | null;
  commission_rate?: number | null; other_charges?: number | null; transaction_type?: string | null;
  buyer_confirmed_at?: string | null; seller_confirmed_at?: string | null;
  fee_rate_used?: number | null; commission_rule_label?: string | null; fees_locked_at?: string | null;
  buyer_name?: string | null; owner_name?: string | null; agent_name?: string | null; property_title?: string | null;
};

const JOURNEY: { key: string; stages: string[] }[] = [
  { key: "inquiry", stages: ["new_inquiry"] },
  { key: "contacted", stages: ["contacted"] },
  { key: "viewing", stages: ["viewing_scheduled", "viewing_completed"] },
  { key: "offer", stages: ["offer_made"] },
  { key: "negotiation", stages: ["negotiation"] },
  { key: "agreement", stages: ["offer_accepted", "agreement_signed"] },
  { key: "verification", stages: ["verification"] },
  { key: "payment", stages: ["payment"] },
  { key: "completed", stages: ["completed"] },
];

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOC_KINDS: DealDocumentKind[] = ["proof_of_funds", "financing_document", "identification", "sale_agreement", "lease_agreement", "ownership_document", "inspection_report", "other"];

/** What the signed-in person needs to DO next — not just the stage. */
export function nextActionKey(deal: DealLite, userId: string | null, openOffer?: Offer | null): { key: string; vars?: Record<string, string> } {
  const isBuyer = userId === deal.buyer_id;
  const isSeller = userId === deal.owner_id || userId === deal.agent_id;
  const isAgent = userId === deal.agent_id && deal.agent_id !== deal.owner_id;
  const cur = deal.currency || "TZS";
  if (deal.stage === "cancelled") return { key: "na_closed" };
  if (deal.stage === "completed") return { key: "na_done" };
  if (openOffer) {
    const amount = fmtTZS(openOffer.amount, cur);
    if (openOffer.made_by_side === "seller") return isBuyer ? { key: "na_buyerRespond", vars: { amount } } : { key: "na_waitBuyer" };
    return isSeller ? { key: "na_sellerReview", vars: { amount } } : { key: "na_waitSeller" };
  }
  if (deal.stage === "offer_accepted" || deal.stage === "agreement_signed" || deal.stage === "verification") return isSeller ? { key: "na_sellerVerify" } : { key: "na_buyerVerify" };
  if (deal.stage === "payment") {
    const mine = isBuyer ? deal.buyer_confirmed_at : deal.seller_confirmed_at;
    if (!mine && (isBuyer || isSeller)) return isBuyer ? { key: "na_buyerPay" } : { key: "na_sellerPay" };
    return { key: "na_confirm" };
  }
  if (isAgent) return { key: "na_dalaliViewing" };
  if (isBuyer) return { key: "na_buyerMakeOffer" };
  return { key: "na_noOffer" };
}

export function DealEnginePanel({ deal, userId, onChanged }: { deal: DealLite; userId: string | null; onChanged: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDealEngine>> | null>(null);
  const [docs, setDocs] = useState<DealDocument[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [counterFor, setCounterFor] = useState<Offer | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [docKind, setDocKind] = useState<DealDocumentKind>("proof_of_funds");
  const [testMode, setTestMode] = useState(false);

  const load = useCallback(async () => {
    const [d, dd] = await Promise.all([fetchDealEngine(deal.id), fetchDocuments(deal.id).catch(() => [])]);
    setData(d); setDocs(dd);
    const ids = Array.from(new Set([...d.audit.map((a) => a.actor_id), ...d.offers.map((o) => o.made_by), ...dd.map((x) => x.uploaded_by)].filter(Boolean))) as string[];
    if (ids.length) {
      const { data: p } = await supabase.from("public_profiles").select("id,full_name").in("id", ids);
      setNames(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name ?? ""])));
    }
    const open = d.offers.find((o) => o.status === "submitted");
    if (open && userId && open.made_by !== userId) void respondOffer(open.id, "viewed").catch(() => {});
  }, [deal.id, userId]);

  useEffect(() => { void load(); }, [load, deal.stage]);
  useEffect(() => { void isTestModeOn().then(setTestMode); }, []);
  // live updates while the deal is open
  useEffect(() => {
    const ch = supabase.channel(`deal-engine-${deal.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `deal_id=eq.${deal.id}` }, () => { void load(); onChanged(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [deal.id, load, onChanged]);

  const isBuyer = userId === deal.buyer_id;
  const isSeller = userId === deal.owner_id || userId === deal.agent_id;
  const isAgent = userId === deal.agent_id && deal.agent_id !== deal.owner_id;

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); await load(); onChanged(); }
    catch (e: any) { toast.error(e?.message || t("offer.failed"), { action: { label: t("offer.tryAgain"), onClick: () => void act(key, fn, ok) } }); }
    finally { setBusy(null); }
  }

  async function onFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX) return toast.error(t("offer.fileTooBig", { name: f.name }));
    if (!TYPES.includes(f.type)) return toast.error(t("offer.fileType", { name: f.name }));
    await act("upload", () => uploadDocument(deal.id, f, docKind), t("offer.uploaded"));
  }

  if (!data) return <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />;

  const openOffer = data.offers.find((o) => o.status === "submitted" || o.status === "viewed") ?? null;
  const myTurn = !!openOffer && ((openOffer.made_by_side === "buyer" && isSeller) || (openOffer.made_by_side === "seller" && isBuyer));
  const accepted = data.offers.find((o) => o.status === "accepted");
  const stageIdx = JOURNEY.findIndex((j) => j.stages.includes(deal.stage));
  const cur = deal.currency || "TZS";
  const price = Number(deal.agreed_price ?? openOffer?.amount ?? deal.asking_price ?? 0);
  const fee = Number(deal.estimated_spaces_fee ?? 0) + Number(deal.spaces_fee_tax ?? 0);
  const comm = Number(deal.agent_commission ?? 0);
  const na = nextActionKey(deal, userId, openOffer);
  const hasPendingPay = data.payments.some((p) => p.status !== "paid" && p.status !== "cancelled" && p.amount > 0);

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("offer.nextStep")}</p>
        <p className="mt-1 text-base font-medium text-foreground">{t(`offer.${na.key}`, na.vars)}</p>
        {openOffer?.expires_at && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {t("offer.expiresIn", { time: timeLeft(openOffer.expires_at) ?? "" })}</p>}
        {openOffer && myTurn && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button className="h-12" disabled={!!busy} onClick={() => act("accept", () => respondOffer(openOffer.id, "accept"), t("offer.accepted"))}>{t("offer.accept")}</Button>
            <Button className="h-12" variant="outline" disabled={!!busy} onClick={() => setCounterFor(openOffer)}>{t("offer.counter")}</Button>
            <Button className="h-12" variant="outline" disabled={!!busy} onClick={() => act("decline", () => respondOffer(openOffer.id, "decline"), t("offer.declinedToast"))}>{t("offer.decline")}</Button>
          </div>
        )}
        {openOffer && openOffer.made_by === userId && (
          <Button variant="outline" className="mt-3 h-11 w-full" disabled={!!busy} onClick={() => act("wd", () => respondOffer(openOffer.id, "withdraw"), t("offer.withdrawnToast"))}>{t("offer.withdraw")}</Button>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-base font-semibold text-foreground">{t("offer.progress")}</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {JOURNEY.map((j, i) => {
            const done = deal.stage !== "cancelled" && i <= stageIdx;
            return (
              <li key={j.key} className={cn("flex items-center gap-2 text-sm", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}{t(`offer.j_${j.key}`)}
              </li>
            );
          })}
        </ol>
      </section>

      {data.offers.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">{t("offer.negotiation")}</h3>
          <ol className="relative mt-3 space-y-3 border-l-2 border-border pl-4">
            {data.offers.map((o) => (
              <li key={o.id} className="relative" data-testid="offer-row">
                <span className={cn("absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-card", o.made_by_side === "buyer" ? "bg-primary" : "bg-warning")} />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-foreground"><b>{o.made_by_side === "buyer" ? t("offer.buyer") : t("offer.seller")}</b> {o.parent_offer_id ? t("offer.countered") : t("offer.offered")} <span className="font-display text-base font-semibold">{fmtTZS(o.amount, o.currency)}</span></p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                    o.status === "accepted" ? "bg-success/15 text-success ring-success/40" :
                    ["declined", "expired", "withdrawn"].includes(o.status) ? "bg-destructive/15 text-destructive ring-destructive/40" :
                    "bg-muted text-foreground ring-border")}>{t(`offer.st_${o.status}`)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {names[o.made_by] ?? ""}{o.deposit_amount ? ` · ${t("offer.deposit")} ${fmtTZS(o.deposit_amount, o.currency)}` : ""}{o.completion_date ? ` · ${t("offer.completionDate")} ${o.completion_date}` : ""}{o.financing_method ? ` · ${t(`offer.${o.financing_method}`)}` : ""}
                </p>
                {(o.conditions || o.message) && <p className="mt-1 text-sm text-foreground/80">{o.message || o.conditions}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {accepted && (
        <section className="rounded-2xl border border-success/40 bg-success/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">{t("offer.agreementReached")}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">{fmtTZS(deal.agreed_price, cur)}</p>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            <span>{t("offer.buyer")}: <b className="text-foreground">{deal.buyer_name ?? "—"}</b></span>
            <span>{t("offer.owner")}: <b className="text-foreground">{deal.owner_name ?? "—"}</b></span>
            <span>{t("offer.dalali")}: <b className="text-foreground">{deal.agent_name ?? t("offer.none")}</b></span>
          </div>
        </section>
      )}

      {(accepted || deal.estimated_spaces_fee != null) && (
        <section className="rounded-2xl border border-border bg-card p-4 text-sm">
          <h3 className="font-display text-base font-semibold text-foreground">{t("offer.charges")}</h3>
          <dl className="mt-2 space-y-1">
            <Row k={t("offer.propertyPrice")} v={fmtTZS(price, cur)} />
            {deal.agent_id && deal.agent_id !== deal.owner_id && <Row k={`${t("offer.agentCommission")}${deal.commission_rate != null ? ` (${deal.commission_rate}%)` : ""}`} v={fmtTZS(comm, cur)} />}
            <Row k={`${t("offer.serviceFee")}${deal.fee_rate_used != null ? ` (${deal.fee_rate_used}%)` : ""}`} v={fmtTZS(deal.estimated_spaces_fee ?? 0, cur)} />
            {Number(deal.spaces_fee_tax ?? 0) > 0 && <Row k={t("offer.taxOnFee")} v={fmtTZS(deal.spaces_fee_tax, cur)} />}
            <Row k={t("offer.otherCharges")} v={fmtTZS(deal.other_charges ?? 0, cur)} />
            <div className="border-t border-border pt-1"><Row k={t("offer.totalCharges")} v={fmtTZS(fee + comm + Number(deal.other_charges ?? 0), cur)} strong /></div>
          </dl>
          {deal.fees_locked_at && <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><Lock className="mt-0.5 h-3 w-3 shrink-0" />{t("offer.lockedNote")}</p>}
        </section>
      )}

      {data.commission && (
        <section className="rounded-2xl border border-primary/40 bg-card p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-display text-base font-semibold text-foreground">{isAgent ? t("offer.yourCommission") : t("offer.dalaliCommission")}</h3></div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">{t("offer.amount")}</p><p className="font-display text-lg font-semibold text-foreground">{fmtTZS(data.commission.amount, data.commission.currency)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("offer.rate")}</p><p className="font-semibold text-foreground">{data.commission.rate ?? "—"}%</p></div>
            <div><p className="text-xs text-muted-foreground">{t("offer.status")}</p><p className="font-semibold text-primary" data-testid="commission-status">{t(`offer.cm_${data.commission.status}`)}</p></div>
          </div>
          {(data.commission as any).rule_label && <p className="mt-2 text-xs text-muted-foreground">{t("offer.ruleUsed", { rule: (data.commission as any).rule_label })}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t("offer.commissionNote")}</p>
        </section>
      )}

      {data.checklist.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">{t("offer.checklist")}</h3>
          <ul className="mt-2 divide-y divide-border">
            {data.checklist.map((c) => {
              const auto = c.phase !== "verification";
              const pay = data.payments.find((p) => p.kind === c.key);
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-foreground">
                    {c.completed_at ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}{t(`offer.ck_${c.key}`) === `offer.ck_${c.key}` ? c.label : t(`offer.ck_${c.key}`)}
                    {pay && <span className="text-xs text-muted-foreground">· {fmtTZS(pay.amount, pay.currency)} · <b className={cn("uppercase", pay.status === "paid" ? "text-success" : "text-foreground")}>{pay.status === "paid" && (pay as any).is_test ? t("offer.paidTest") : t(`offer.pay_${pay.status}`)}</b></span>}
                  </span>
                  {!auto && isSeller && deal.stage !== "completed" && deal.stage !== "cancelled" ? (
                    <Button size="sm" className="h-10 min-w-[96px]" variant={c.completed_at ? "outline" : "default"} disabled={!!busy}
                      onClick={() => act(c.id, () => setChecklistItem(c.id, !c.completed_at), c.completed_at ? t("offer.reopened") : t("offer.confirmed"))}>
                      {c.completed_at ? t("offer.undo") : t("offer.confirm")}
                    </Button>
                  ) : auto && !c.completed_at ? <Lock className="h-4 w-4 text-muted-foreground" aria-label={t("offer.autoTick")} /> : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("offer.payNote")}</p>
          {deal.stage === "payment" && testMode && hasPendingPay && (
            <Button variant="outline" className="mt-3 h-12 w-full border-warning text-warning" disabled={!!busy}
              onClick={() => act("testpay", () => simulateTestPayment(deal.id), t("offer.testPaymentDone"))}>
              <FlaskConical className="h-4 w-4" /> {t("offer.testPayment")}
            </Button>
          )}
          {deal.stage === "payment" && (isBuyer || isSeller) && (
            <Button className="mt-3 h-12 w-full" disabled={!!busy || !!(isBuyer ? deal.buyer_confirmed_at : deal.seller_confirmed_at)}
              onClick={() => act("complete", () => confirmCompletion(deal.id), t("offer.completionConfirmed"))}>
              {(isBuyer ? deal.buyer_confirmed_at : deal.seller_confirmed_at) ? t("offer.waitingOther") : t("offer.complete")}
            </Button>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-foreground">{t("offer.documents")}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label={t("offer.docType")} className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={docKind} onChange={(e) => setDocKind(e.target.value as DealDocumentKind)}>
              {DOC_KINDS.map((k) => <option key={k} value={k}>{t(`offer.doc_${k}`)}</option>)}
            </select>
            <label className={cn("inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground", busy === "upload" && "opacity-60")}>
              <Upload className="h-4 w-4" /> {t("offer.upload")}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { void onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        {docs.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t("offer.noDocs")}</p> : (
          <ul className="mt-2 divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{d.name}</span>
                    <span className="block text-xs text-muted-foreground">{t(`offer.doc_${d.kind}`)} · {t("offer.uploadedBy", { name: (d.uploaded_by && names[d.uploaded_by]) || "—" })} · {new Date(d.created_at).toLocaleDateString()} · {(d as any).status ?? "submitted"}</span>
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={async () => { const u = await documentSignedUrl(d.storage_path); if (u) window.open(u, "_blank", "noopener"); }}>{t("offer.view")}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.audit.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">{t("offer.history")}</h3>
          <ol className="mt-2 space-y-2">
            {data.audit.slice().reverse().map((a) => (
              <li key={a.id} className="border-l-2 border-border pl-3 text-sm">
                <p className="text-foreground">{t(`offer.au_${a.action}`) === `offer.au_${a.action}` ? a.label : t(`offer.au_${a.action}`)}{a.amount != null ? ` — ${fmtTZS(a.amount, cur)}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {a.actor_id ? names[a.actor_id] || t("offer.user") : t("offer.system")}{a.note ? ` · ${a.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <CounterDialog offer={counterFor} currency={cur} onClose={() => setCounterFor(null)}
        onSubmit={(v) => act("counter", () => respondOffer(counterFor!.id, "counter", v), t("offer.counterSent")).then(() => setCounterFor(null))} />
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className={cn("text-right text-foreground", strong && "font-semibold")}>{v}</dd></div>;
}

export function CounterDialog({ offer, currency, onClose, onSubmit }: {
  offer: Offer | null; currency: string; onClose: () => void;
  onSubmit: (v: { amount: number; deposit: number | null; completion: string | null; conditions: string; message: string }) => void;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(""); const [deposit, setDeposit] = useState("");
  const [date, setDate] = useState(""); const [conditions, setConditions] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { if (offer) { setAmount(""); setDeposit(offer.deposit_amount ? String(offer.deposit_amount) : ""); setDate(offer.completion_date ?? ""); setConditions(""); setMessage(""); } }, [offer]);
  const n = Number(amount.replace(/[^\d.]/g, ""));
  return (
    <Dialog open={!!offer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{t("offer.counterTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("offer.currentOffer")}: <b className="text-foreground">{fmtTZS(offer?.amount, currency)}</b></p>
        <div className="space-y-3">
          <div><Label htmlFor="counter-amount">{t("offer.counterAmount")}</Label><Input id="counter-amount" className="h-12 text-lg font-semibold" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("offer.deposit")}</Label><Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
            <div><Label>{t("offer.completionDate")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div><Label>{t("offer.conditions")}</Label><Input value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
          <div><Label>{t("offer.message")}</Label><Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <Button className="h-12 w-full" disabled={!(n > 0)} onClick={() => onSubmit({ amount: n, deposit: deposit ? Number(deposit.replace(/[^\d.]/g, "")) : null, completion: date || null, conditions, message })}>{t("offer.submitCounter")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
