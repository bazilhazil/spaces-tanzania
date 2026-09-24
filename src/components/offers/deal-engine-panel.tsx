import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ShieldCheck, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  fetchDealEngine, respondOffer, setChecklistItem, confirmCompletion, fmtTZS, timeLeft,
  OFFER_STATUS_LABEL, COMMISSION_LABEL, type Offer,
} from "@/lib/offers-db";

type DealLite = {
  id: string; stage: string; buyer_id: string | null; owner_id: string | null; agent_id: string | null;
  asking_price?: number | null; agreed_price?: number | null; currency: string;
  estimated_spaces_fee?: number | null; spaces_fee_tax?: number | null; agent_commission?: number | null;
  commission_rate?: number | null; other_charges?: number | null; transaction_type?: string | null;
  buyer_confirmed_at?: string | null; seller_confirmed_at?: string | null;
  buyer_name?: string | null; owner_name?: string | null; agent_name?: string | null; property_title?: string | null;
};

const JOURNEY: { key: string; label: string; stages: string[] }[] = [
  { key: "inquiry", label: "Inquiry", stages: ["new_inquiry"] },
  { key: "contacted", label: "Contacted", stages: ["contacted"] },
  { key: "viewing", label: "Viewing", stages: ["viewing_scheduled", "viewing_completed"] },
  { key: "offer", label: "Offer submitted", stages: ["offer_made"] },
  { key: "negotiation", label: "Negotiation", stages: ["negotiation"] },
  { key: "agreement", label: "Agreement reached", stages: ["offer_accepted", "agreement_signed"] },
  { key: "verification", label: "Verification", stages: ["verification"] },
  { key: "payment", label: "Payment", stages: ["payment"] },
  { key: "completed", label: "Completed", stages: ["completed"] },
];

export function DealEnginePanel({ deal, userId, onChanged }: { deal: DealLite; userId: string | null; onChanged: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDealEngine>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [counterFor, setCounterFor] = useState<Offer | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const d = await fetchDealEngine(deal.id);
    setData(d);
    const ids = Array.from(new Set(d.audit.map((a) => a.actor_id).concat(d.offers.map((o) => o.made_by)).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: p } = await supabase.from("public_profiles").select("id,full_name").in("id", ids);
      setNames(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name ?? "User"])));
    }
    // mark the open offer as seen by the recipient
    const open = d.offers.find((o) => o.status === "submitted");
    if (open && userId && open.made_by !== userId) void respondOffer(open.id, "viewed").catch(() => {});
  }, [deal.id, userId]);

  useEffect(() => { void load(); }, [load, deal.stage]);

  const isBuyer = userId === deal.buyer_id;
  const isSeller = userId === deal.owner_id || userId === deal.agent_id;
  const isAgent = userId === deal.agent_id && deal.agent_id !== deal.owner_id;

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); await load(); onChanged(); }
    catch (e: any) { toast.error(e?.message || "Couldn't complete this action.", { action: { label: "Try again", onClick: () => void act(key, fn, ok) } }); }
    finally { setBusy(null); }
  }

  if (!data) return <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />;

  const openOffer = data.offers.find((o) => o.status === "submitted" || o.status === "viewed");
  const myTurn = openOffer && ((openOffer.made_by_side === "buyer" && isSeller) || (openOffer.made_by_side === "seller" && isBuyer));
  const accepted = data.offers.find((o) => o.status === "accepted");
  const stageIdx = JOURNEY.findIndex((j) => j.stages.includes(deal.stage));
  const cur = deal.currency || "TZS";
  const price = Number(deal.agreed_price ?? openOffer?.amount ?? deal.asking_price ?? 0);
  const fee = Number(deal.estimated_spaces_fee ?? 0) + Number(deal.spaces_fee_tax ?? 0);
  const comm = Number(deal.agent_commission ?? 0);

  let next = "Waiting for an offer.";
  if (deal.stage === "cancelled") next = "This deal was closed.";
  else if (deal.stage === "completed") next = "All done — the transaction is complete.";
  else if (openOffer && myTurn) next = openOffer.made_by_side === "seller" ? `Seller has countered at ${fmtTZS(openOffer.amount, cur)}. Accept, counter or decline.` : `New offer of ${fmtTZS(openOffer.amount, cur)}. Accept, counter or decline.`;
  else if (openOffer) next = "Waiting for the other side to reply to the latest offer.";
  else if (deal.stage === "offer_accepted" || deal.stage === "verification") next = isSeller ? "Tick off each verification item as it is confirmed." : "The seller is completing verification.";
  else if (deal.stage === "payment") next = "Payments are due. Online payment will open once payments are connected; both sides then confirm completion.";

  return (
    <div className="mt-6 space-y-5">
      {/* Next action */}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</p>
        <p className="mt-1 text-sm text-foreground">{next}</p>
        {openOffer?.expires_at && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Offer expires in: {timeLeft(openOffer.expires_at)}</p>}
        {openOffer && myTurn && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button className="h-12" disabled={!!busy} onClick={() => act("accept", () => respondOffer(openOffer.id, "accept"), "Offer accepted — agreement reached")}>Accept</Button>
            <Button className="h-12" variant="outline" disabled={!!busy} onClick={() => setCounterFor(openOffer)}>Counter</Button>
            <Button className="h-12" variant="outline" disabled={!!busy} onClick={() => act("decline", () => respondOffer(openOffer.id, "decline"), "Offer declined")}>Decline</Button>
          </div>
        )}
        {openOffer && openOffer.made_by === userId && (
          <Button variant="ghost" size="sm" className="mt-2" disabled={!!busy} onClick={() => act("wd", () => respondOffer(openOffer.id, "withdraw"), "Offer withdrawn")}>Withdraw my offer</Button>
        )}
      </section>

      {/* Journey */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-base font-semibold text-foreground">Progress</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {JOURNEY.map((j, i) => {
            const done = deal.stage !== "cancelled" && i <= stageIdx;
            return (
              <li key={j.key} className={cn("flex items-center gap-2 text-sm", done ? "text-foreground" : "text-muted-foreground")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}{j.label}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Negotiation */}
      {data.offers.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">Negotiation</h3>
          <ol className="relative mt-3 space-y-3 border-l-2 border-border pl-4">
            {data.offers.map((o) => (
              <li key={o.id} className="relative">
                <span className={cn("absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-card", o.made_by_side === "buyer" ? "bg-primary" : "bg-warning")} />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-foreground"><b>{o.made_by_side === "buyer" ? "Buyer" : "Seller"}</b> {o.parent_offer_id ? "countered" : "offered"} <span className="font-display text-base font-semibold">{fmtTZS(o.amount, o.currency)}</span></p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                    o.status === "accepted" ? "bg-success/15 text-success ring-success/30" :
                    o.status === "declined" || o.status === "expired" || o.status === "withdrawn" ? "bg-destructive/10 text-destructive ring-destructive/30" :
                    "bg-muted text-foreground ring-border")}>{OFFER_STATUS_LABEL[o.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {names[o.made_by] ?? ""} {o.deposit_amount ? `· Deposit ${fmtTZS(o.deposit_amount, o.currency)}` : ""} {o.completion_date ? `· Completion ${o.completion_date}` : ""} {o.financing_method ? `· ${o.financing_method}` : ""}
                </p>
                {(o.conditions || o.message) && <p className="mt-1 text-sm text-foreground/80">{o.message || o.conditions}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Agreement + charges */}
      {accepted && (
        <section className="rounded-2xl border border-success/40 bg-success/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Agreement reached</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">{fmtTZS(deal.agreed_price, cur)}</p>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            <span>Buyer: <b className="text-foreground">{deal.buyer_name ?? "—"}</b></span>
            <span>Owner: <b className="text-foreground">{deal.owner_name ?? "—"}</b></span>
            <span>Dalali: <b className="text-foreground">{deal.agent_name ?? "None"}</b></span>
          </div>
        </section>
      )}
      {(accepted || deal.estimated_spaces_fee != null) && (
        <section className="rounded-2xl border border-border bg-card p-4 text-sm">
          <h3 className="font-display text-base font-semibold text-foreground">Charges</h3>
          <dl className="mt-2 space-y-1">
            <Row k="Property price" v={fmtTZS(price, cur)} />
            {deal.agent_id && deal.agent_id !== deal.owner_id && <Row k={`Agent commission${deal.commission_rate != null ? ` (${deal.commission_rate}%)` : ""}`} v={fmtTZS(comm, cur)} />}
            <Row k="SPACES service fee" v={fmtTZS(deal.estimated_spaces_fee ?? 0, cur)} />
            {Number(deal.spaces_fee_tax ?? 0) > 0 && <Row k="Tax on service fee" v={fmtTZS(deal.spaces_fee_tax, cur)} />}
            <Row k="Other charges" v={fmtTZS(deal.other_charges ?? 0, cur)} />
            <div className="border-t border-border pt-1"><Row k="Total applicable charges" v={fmtTZS(fee + comm + Number(deal.other_charges ?? 0), cur)} strong /></div>
          </dl>
        </section>
      )}

      {/* Commission (agent/owner/admin see it via RLS) */}
      {data.commission && (
        <section className="rounded-2xl border border-primary/30 bg-card p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-display text-base font-semibold text-foreground">{isAgent ? "Your commission" : "Dalali commission"}</h3></div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold text-foreground">{fmtTZS(data.commission.amount, data.commission.currency)}</p></div>
            <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-semibold text-foreground">{data.commission.rate ?? "—"}%</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold text-primary">{COMMISSION_LABEL[data.commission.status]}</p></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data.commission.completion_condition} The Dalali can only be removed by SPACES admin, and every change is recorded.</p>
        </section>
      )}

      {/* Checklist */}
      {data.checklist.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">Transaction checklist</h3>
          <ul className="mt-2 divide-y divide-border">
            {data.checklist.map((c) => {
              const auto = c.phase !== "verification";
              const pay = data.payments.find((p) => p.kind === c.key);
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    {c.completed_at ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}{c.label}
                    {pay && <span className="text-xs text-muted-foreground">· {fmtTZS(pay.amount, pay.currency)} · <b className="uppercase">{pay.status}</b></span>}
                  </span>
                  {!auto && isSeller && deal.stage !== "completed" && deal.stage !== "cancelled" ? (
                    <Button size="sm" variant={c.completed_at ? "outline" : "default"} disabled={!!busy}
                      onClick={() => act(c.id, () => setChecklistItem(c.id, !c.completed_at), c.completed_at ? "Reopened" : "Confirmed")}>
                      {c.completed_at ? "Undo" : "Confirm"}
                    </Button>
                  ) : auto && !c.completed_at ? <Lock className="h-4 w-4 text-muted-foreground" aria-label="Updated automatically" /> : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Payment items tick automatically only after a confirmed payment. Nothing is marked paid without confirmation.</p>
          {deal.stage === "payment" && (isBuyer || isSeller) && (
            <Button className="mt-3 h-12 w-full" disabled={!!busy || (isBuyer ? !!deal.buyer_confirmed_at : !!deal.seller_confirmed_at)}
              onClick={() => act("complete", () => confirmCompletion(deal.id), "Completion confirmed")}>
              {(isBuyer ? deal.buyer_confirmed_at : deal.seller_confirmed_at) ? "You confirmed — waiting for the other side" : "Complete — confirm handover"}
            </Button>
          )}
        </section>
      )}

      {/* History */}
      {data.audit.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-base font-semibold text-foreground">History</h3>
          <ol className="mt-2 space-y-2">
            {data.audit.slice().reverse().map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-foreground">{a.label}{a.amount != null ? ` — ${fmtTZS(a.amount, cur)}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {a.actor_id ? names[a.actor_id] ?? "User" : "System"}{a.note ? ` · ${a.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <CounterDialog offer={counterFor} currency={cur} onClose={() => setCounterFor(null)}
        onSubmit={(v) => act("counter", () => respondOffer(counterFor!.id, "counter", v), "Counter-offer sent").then(() => setCounterFor(null))} />
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className={cn("text-foreground", strong && "font-semibold")}>{v}</dd></div>;
}

function CounterDialog({ offer, currency, onClose, onSubmit }: {
  offer: Offer | null; currency: string; onClose: () => void;
  onSubmit: (v: { amount: number; deposit: number | null; completion: string | null; conditions: string; message: string }) => void;
}) {
  const [amount, setAmount] = useState(""); const [deposit, setDeposit] = useState("");
  const [date, setDate] = useState(""); const [conditions, setConditions] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { if (offer) { setAmount(String(offer.amount)); setDeposit(offer.deposit_amount ? String(offer.deposit_amount) : ""); setDate(offer.completion_date ?? ""); setConditions(""); setMessage(""); } }, [offer]);
  const n = Number(amount.replace(/[^\d.]/g, ""));
  return (
    <Dialog open={!!offer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Counter offer</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Current offer: <b className="text-foreground">{fmtTZS(offer?.amount, currency)}</b></p>
        <div className="space-y-3">
          <div><Label>Counter amount</Label><Input className="h-12 text-lg font-semibold" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Deposit</Label><Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
            <div><Label>Completion date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Conditions</Label><Input value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <Button className="h-12 w-full" disabled={!(n > 0)} onClick={() => onSubmit({ amount: n, deposit: deposit ? Number(deposit.replace(/[^\d.]/g, "")) : null, completion: date || null, conditions, message })}>Submit Counter Offer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
