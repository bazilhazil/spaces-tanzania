import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck, Clock, Wallet, CheckCircle2, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import type { Deal } from "@/lib/deals-db";
import {
  fetchLatestOffers, fetchOfferCounts, fetchCommissionSummary, respondOffer, fmtTZS,
  type Offer, type CommissionSummary,
} from "@/lib/offers-db";
import { nextActionKey, CounterDialog } from "./deal-engine-panel";

type Group = "new" | "negotiating" | "agreement" | "verification" | "payment" | "completed";
function groupOf(d: Deal, o?: Offer): Group | null {
  if (d.stage === "completed") return "completed";
  if (d.stage === "payment") return "payment";
  if (d.stage === "verification") return "verification";
  if (d.stage === "offer_accepted" || d.stage === "agreement_signed") return "agreement";
  if (d.stage === "negotiation") return "negotiating";
  if (d.stage === "offer_made" || (o && (o.status === "submitted" || o.status === "viewed"))) return "new";
  return null;
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export function MyDealsOverview({ deals, userId, onOpen, onChanged }: {
  deals: Deal[]; userId: string | null; onOpen: (id: string) => void; onChanged: () => void;
}) {
  const { t } = useI18n();
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [counts, setCounts] = useState<Record<string, { count: number; max: number }>>({});
  const [comm, setComm] = useState<CommissionSummary | null>(null);
  const [counterFor, setCounterFor] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);

  const ids = useMemo(() => deals.map((d) => d.id), [deals]);
  useEffect(() => {
    void fetchLatestOffers(ids).then(setOffers);
    void fetchOfferCounts(ids).then(setCounts);
    void fetchCommissionSummary().then(setComm);
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userId) return null;
  const asBuyer = deals.filter((d) => d.buyer_id === userId && groupOf(d, offers[d.id]));
  const asOwner = deals.filter((d) => d.owner_id === userId && groupOf(d, offers[d.id]));
  const asAgent = deals.filter((d) => d.agent_id === userId && d.agent_id !== d.owner_id);

  async function quick(o: Offer, action: "accept" | "decline", ok: string) {
    setBusy(true);
    try { await respondOffer(o.id, action); toast.success(ok); onChanged(); }
    catch (e: any) { toast.error(e?.message || t("offer.failed")); }
    finally { setBusy(false); }
  }

  const card = (d: Deal, role: "buyer" | "owner" | "agent") => {
    const o = offers[d.id];
    const open = o && (o.status === "submitted" || o.status === "viewed") ? o : null;
    const myTurn = open && ((open.made_by_side === "buyer" && role !== "buyer") || (open.made_by_side === "seller" && role === "buyer"));
    const na = nextActionKey(d as any, userId, open);
    const g = groupOf(d, o);
    let headline = "";
    if (g === "completed") headline = t("offer.card_completed");
    else if (g === "payment") headline = t("offer.card_payment");
    else if (g === "agreement" || g === "verification") headline = t("offer.card_accepted");
    else if (open && myTurn) headline = role === "buyer" ? t("offer.card_countered") : t("offer.card_newOffer");
    else if (open) headline = t("offer.card_waitingThem");
    const c = d.property_id ? counts[d.property_id] : undefined;
    return (
      <div key={d.id} className={cn("flex flex-col rounded-2xl border bg-card p-4", myTurn ? "border-primary/60 ring-1 ring-primary/30" : "border-border")} data-testid="deal-card">
        {headline && <p className={cn("text-xs font-semibold uppercase tracking-wide", myTurn ? "text-primary" : "text-muted-foreground")}>{headline}</p>}
        <p className="mt-1 line-clamp-2 font-medium text-foreground">{d.property_title ?? "—"}</p>
        <p className="mt-1 font-display text-xl font-semibold text-foreground">{fmtTZS(d.agreed_price ?? o?.amount ?? d.value, d.currency)}</p>
        {role === "owner" && c && <p className="text-xs text-muted-foreground">{t("offer.offersReceived")}: {c.count} · {t("offer.highestOffer")}: {fmtTZS(c.max, d.currency)}</p>}
        {role === "owner" && <p className="text-xs text-muted-foreground">{t("offer.dalali")}: {d.agent_name && d.agent_id !== d.owner_id ? d.agent_name : t("offer.none")}</p>}
        <p className="mt-2 text-sm text-foreground"><span className="font-semibold">{t("offer.nextStep")}:</span> {t(`offer.${na.key}`, na.vars)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("offer.lastActivity", { time: ago(d.last_activity_at) })}</p>
        <div className="mt-3 grid gap-2">
          {open && myTurn && (
            <div className="grid grid-cols-3 gap-2">
              <Button className="h-11" disabled={busy} onClick={() => quick(open, "accept", t("offer.accepted"))}>{t("offer.accept")}</Button>
              <Button className="h-11" variant="outline" disabled={busy} onClick={() => setCounterFor(open)}>{t("offer.counter")}</Button>
              <Button className="h-11" variant="outline" disabled={busy} onClick={() => quick(open, "decline", t("offer.declinedToast"))}>{t("offer.decline")}</Button>
            </div>
          )}
          <Button variant="secondary" className="h-11" onClick={() => onOpen(d.id)}>{t("offer.openDeal")}</Button>
        </div>
      </div>
    );
  };

  const counter = (list: Deal[], groups: Group[]) => groups.map((g) => [g, list.filter((d) => groupOf(d, offers[d.id]) === g).length] as const);
  const tile = (label: string, value: string | number, Icon: any, tone: string) => (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={cn("h-4 w-4", tone)} />{label}</div>
      <p className="mt-1 font-display text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
  const gLabel: Record<Group, string> = {
    new: t("offer.dash_new"), negotiating: t("offer.dash_negotiating"), agreement: t("offer.dash_agreements"),
    verification: t("offer.dash_verification"), payment: t("offer.dash_payment"), completed: t("offer.dash_completed"),
  };

  return (
    <div className="space-y-8">
      {asAgent.length > 0 || (comm && comm.count > 0) ? (
        <section className="space-y-3" data-testid="dalali-section">
          <h2 className="font-display text-xl font-semibold text-foreground">{t("offer.dalaliTitle")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tile(t("offer.c_protected"), fmtTZS(comm?.protected ?? 0), ShieldCheck, "text-primary")}
            {tile(t("offer.c_pending"), fmtTZS(comm?.pending ?? 0), Clock, "text-warning")}
            {tile(t("offer.c_payable"), fmtTZS(comm?.payable ?? 0), Wallet, "text-primary")}
            {tile(t("offer.c_paid"), fmtTZS(comm?.paid ?? 0), CheckCircle2, "text-success")}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10"><Link to="/leads"><Users className="h-4 w-4" /> {t("offer.myLeads")}</Link></Button>
            <Button asChild variant="outline" className="h-10"><Link to="/viewings"><Calendar className="h-4 w-4" /> {t("offer.myViewings")}</Link></Button>
          </div>
          {([
            ["myOffers", asAgent.filter((d) => d.stage === "offer_made")],
            ["myNegotiations", asAgent.filter((d) => d.stage === "negotiation")],
            ["myDeals", asAgent.filter((d) => ["offer_accepted", "agreement_signed", "verification", "payment"].includes(d.stage))],
            ["protectedCommissions", asAgent.filter((d) => d.agent_commission != null && d.stage !== "cancelled")],
          ] as const).map(([k, list]) => list.length > 0 && (
            <div key={k}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t(`offer.${k}`)} ({list.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((d) => card(d, "agent"))}</div>
            </div>
          ))}
        </section>
      ) : null}

      {asOwner.length > 0 && (
        <section className="space-y-3" data-testid="owner-section">
          <h2 className="font-display text-xl font-semibold text-foreground">{t("offer.propertiesOffers")}</h2>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {counter(asOwner, ["new", "negotiating", "agreement", "verification", "payment", "completed"]).map(([g, n]) => tile(gLabel[g], n, CheckCircle2, "text-primary"))}
          </div>
          {(["new", "negotiating", "agreement", "verification", "payment", "completed"] as Group[]).map((g) => {
            const list = asOwner.filter((d) => groupOf(d, offers[d.id]) === g);
            return list.length > 0 && (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{gLabel[g]}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((d) => card(d, "owner"))}</div>
              </div>
            );
          })}
        </section>
      )}

      {asBuyer.length > 0 && (
        <section className="space-y-3" data-testid="buyer-section">
          <h2 className="font-display text-xl font-semibold text-foreground">{t("offer.myOffersTitle")}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {tile(t("offer.dash_active"), asBuyer.filter((d) => groupOf(d, offers[d.id]) === "new").length, Clock, "text-primary")}
            {tile(t("offer.dash_negotiating"), asBuyer.filter((d) => groupOf(d, offers[d.id]) === "negotiating").length, Clock, "text-warning")}
            {tile(t("offer.dash_agreements"), asBuyer.filter((d) => ["agreement", "verification", "payment"].includes(groupOf(d, offers[d.id]) ?? "")).length, ShieldCheck, "text-primary")}
            {tile(t("offer.dash_completed"), asBuyer.filter((d) => groupOf(d, offers[d.id]) === "completed").length, CheckCircle2, "text-success")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{asBuyer.map((d) => card(d, "buyer"))}</div>
        </section>
      )}

      {asBuyer.length === 0 && asOwner.length === 0 && asAgent.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("offer.noDeals")}</p>
      )}

      <CounterDialog offer={counterFor} currency="TZS" onClose={() => setCounterFor(null)}
        onSubmit={async (v) => {
          if (!counterFor) return;
          setBusy(true);
          try { await respondOffer(counterFor.id, "counter", v); toast.success(t("offer.counterSent")); setCounterFor(null); onChanged(); }
          catch (e: any) { toast.error(e?.message || t("offer.failed")); }
          finally { setBusy(false); }
        }} />
    </div>
  );
}
