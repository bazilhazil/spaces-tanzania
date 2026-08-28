import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check, Star, Crown, Search as SearchIcon, CreditCard, Receipt, TrendingUp, Users,
  Smartphone, Wallet, Building2, History, Settings2, Loader2, ShieldCheck, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ds/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog, type CheckoutRequest } from "@/components/billing/checkout-dialog";
import { useMyPayments, useMySubscription, type InvoiceLike } from "@/lib/billing-db";
import { PAYMENT_METHODS } from "@/lib/billing-mock";
import { fetchAdminPayments, fetchAdminSubscriptions } from "@/lib/admin-db";
import {
  fetchPlans, fetchPromotionProducts, fetchPlanUsage, fetchMyPromotions,
  checkSubscriptionExpiry, updatePlan, updatePromotionProduct, adminSetPaymentStatus,
  formatTZS, planPrice,
  type BillingPlan, type BillingCycle, type PromotionProduct, type PlanUsage,
} from "@/lib/monetization-db";

const PROMO_ICONS: Record<string, typeof Star> = {
  featured: Star, premium: Crown, top_search: SearchIcon,
};

type Tab = "plans" | "promotions" | "billing" | "payments" | "admin";

export function BillingCenter() {
  const { primaryRole } = useAuth();
  const { t } = useI18n();
  const isAdmin = primaryRole === "admin" || primaryRole === "super_admin";
  const [tab, setTab] = useState<Tab>("plans");
  const [request, setRequest] = useState<CheckoutRequest | null>(null);
  const queryClient = useQueryClient();

  // One expiry reminder per billing period (backend enforces the de-duplication).
  useEffect(() => { void checkSubscriptionExpiry().catch(() => {}); }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "plans", label: t("billing.tabs.plans") },
    { id: "promotions", label: t("billing.tabs.promotions") },
    { id: "billing", label: t("billing.tabs.billing") },
    { id: "payments", label: t("billing.tabs.payments") },
    ...(isAdmin ? [{ id: "admin" as const, label: t("billing.tabs.admin") }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background p-1.5 shadow-[var(--shadow-soft)] [scrollbar-width:none]">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              tab === tb.id ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                            : "text-foreground/70 hover:bg-accent hover:text-foreground",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansPanel onCheckout={setRequest} />}
      {tab === "promotions" && <PromotionsPanel onCheckout={setRequest} />}
      {tab === "billing" && <BillingPanel />}
      {tab === "payments" && <PaymentMethodsPanel />}
      {tab === "admin" && isAdmin && <AdminPanel />}

      <CheckoutDialog
        open={request !== null}
        onOpenChange={(v) => { if (!v) setRequest(null); }}
        request={request}
        onOrdered={() => {
          void queryClient.invalidateQueries({ queryKey: ["my-promotions"] });
          void queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
        }}
      />
    </div>
  );
}

/* ─────────────────────────── Plan usage hook ─────────────────────────── */

function usePlanUsage() {
  return useQuery<PlanUsage | null>({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage });
}

/* ─────────────────────────── Plans ─────────────────────────── */

function PlansPanel({ onCheckout }: { onCheckout: (r: CheckoutRequest) => void }) {
  const { t } = useI18n();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { data: plans = [], isLoading } = useQuery({ queryKey: ["billing-plans"], queryFn: () => fetchPlans() });
  const { data: usage } = usePlanUsage();

  const currentId = usage?.plan_id ?? "free";
  const currentName = usage?.plan_name ?? "Free";

  return (
    <section className="space-y-5">
      <SubscriptionStatusCard usage={usage} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("billing.choosePlan")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("billing.choosePlanSub")}</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1">
          {(["monthly", "annual"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "monthly" ? t("billing.monthly") : t("billing.annual")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="ds-card p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentId;
            const price = planPrice(plan, cycle);
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-6 transition-all",
                  plan.badge
                    ? "border-primary/50 bg-primary/[0.03] shadow-[var(--shadow-lifted)]"
                    : "border-border/60 bg-background shadow-[var(--shadow-soft)]",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    {plan.badge}
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.name}</div>
                <div className="mt-1 text-sm text-foreground/75">{plan.tagline}</div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight">{formatTZS(price)}</span>
                  {price > 0 && (
                    <span className="text-xs text-muted-foreground">
                      /{cycle === "monthly" ? t("billing.perMonth") : t("billing.perYear")}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {plan.listing_limit == null
                    ? t("billing.unlimitedListings")
                    : t("billing.listingsIncluded", { count: plan.listing_limit })}
                </div>

                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Button
                    className="w-full"
                    variant={isCurrent || !plan.badge ? "outline" : "default"}
                    disabled={isCurrent || price === 0}
                    onClick={() => onCheckout({ kind: "plan", plan, currentPlanName: currentName, cycle })}
                  >
                    {isCurrent ? t("billing.currentPlan") : price === 0 ? t("billing.freePlan") : t("billing.upgradeTo", { plan: plan.name })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SubscriptionStatusCard({ usage }: { usage: PlanUsage | null | undefined }) {
  const { t } = useI18n();
  const limit = usage?.listing_limit ?? null;
  const used = usage?.listings_used ?? 0;
  const pct = limit == null ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const status = usage?.status ?? "active";
  const end = usage?.current_period_end ? new Date(usage.current_period_end) : null;
  const expiringSoon = !!end && end.getTime() - Date.now() < 7 * 86400000 && end.getTime() > Date.now();

  const statusLabel = usage?.cancel_at_period_end
    ? t("billing.status.cancelled")
    : status === "expired"
      ? t("billing.status.expired")
      : expiringSoon
        ? t("billing.status.expiring")
        : status === "trialing"
          ? t("billing.status.trial")
          : t("billing.status.active");

  return (
    <div className="ds-card grid gap-4 p-5 sm:grid-cols-3">
      <div>
        <div className="ds-caption">{t("billing.currentPlan")}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-2xl font-semibold">{usage?.plan_name ?? "Free"}</span>
          <Badge variant="outline" className="capitalize">{statusLabel}</Badge>
        </div>
      </div>
      <div>
        <div className="ds-caption">{t("billing.renewalDate")}</div>
        <div className="mt-1 font-semibold">
          {end ? end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </div>
      </div>
      <div>
        <div className="ds-caption">{t("billing.listingAllowance")}</div>
        <div className="mt-1 font-semibold">
          {used} / {limit == null ? "∞" : limit}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Promotions ─────────────────────────── */

function PromotionsPanel({ onCheckout }: { onCheckout: (r: CheckoutRequest) => void }) {
  const { t } = useI18n();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promotion-products"], queryFn: () => fetchPromotionProducts(),
  });
  const { data: properties = [] } = useQuery({
    queryKey: ["my-properties-min"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [] as { id: string; title: string }[];
      const { data } = await supabase
        .from("properties").select("id, title").eq("owner_id", uid)
        .order("created_at", { ascending: false }).limit(50);
      return (data as { id: string; title: string }[] | null) ?? [];
    },
  });
  const { data: promotions = [] } = useQuery({ queryKey: ["my-promotions"], queryFn: fetchMyPromotions });

  const [propertyId, setPropertyId] = useState<string>("");
  const selected = properties.find((p) => p.id === propertyId) ?? properties[0];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t("billing.promo.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("billing.promo.subtitle")}</p>
      </div>

      <div className="ds-card p-4">
        <label className="ds-caption" htmlFor="promo-property">{t("billing.promo.chooseProperty")}</label>
        {properties.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("billing.promo.noProperties")}</p>
        ) : (
          <select
            id="promo-property"
            className="mt-2 h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
            value={selected?.id ?? ""}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="ds-card p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const Icon = PROMO_ICONS[p.id] ?? Star;
            return (
              <div key={p.id} className="ds-card ds-card-hover flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.duration_days} {t("billing.days")}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{p.description}</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="font-display text-xl font-semibold">{formatTZS(p.price)}</div>
                  <Button
                    size="sm"
                    disabled={!selected}
                    onClick={() => selected && onCheckout({
                      kind: "promotion", product: p, propertyId: selected.id, propertyTitle: selected.title,
                    })}
                  >
                    {t("billing.promo.promote")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="ds-card overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4 font-semibold">{t("billing.promo.myPromotions")}</div>
        {promotions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("billing.promo.none")}</div>
        ) : (
          <div className="divide-y divide-border/60">
            {promotions.map((pr) => (
              <div key={pr.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div>
                  <div className="font-medium capitalize">{pr.product_id.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {pr.starts_at ? new Date(pr.starts_at).toLocaleDateString() : "—"}
                    {" → "}
                    {pr.ends_at ? new Date(pr.ends_at).toLocaleDateString() : "—"}
                    {" · "}{pr.duration_days} {t("billing.days")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatTZS(pr.price)}</span>
                  <Badge variant="outline" className="capitalize">
                    {pr.status === "pending_payment" ? t("billing.status.pending") : pr.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Billing & invoices ─────────────────────────── */

function BillingPanel() {
  const { t } = useI18n();
  const { invoices, loading } = useMyPayments();
  const { subscription } = useMySubscription();
  const { data: usage } = usePlanUsage();

  return (
    <section className="space-y-6">
      <SubscriptionStatusCard usage={usage} />

      <div className="ds-card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="ds-caption">{t("billing.billingPeriod")}</div>
            <div className="mt-1 font-semibold capitalize">{subscription?.billing_cycle ?? "—"}</div>
          </div>
          <div>
            <div className="ds-caption">{t("billing.paymentStatus")}</div>
            <div className="mt-1 font-semibold capitalize">{subscription?.status ?? t("billing.status.active")}</div>
          </div>
          <div>
            <div className="ds-caption">{t("billing.paymentMethod")}</div>
            <div className="mt-1 font-semibold">—</div>
          </div>
        </div>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <div className="font-semibold">{t("billing.invoiceHistory")}</div>
            <div className="text-xs text-muted-foreground">{t("billing.invoiceHistorySub")}</div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/billing/history"><History className="mr-1 h-4 w-4" /> {t("billing.fullHistory")}</Link>
          </Button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("billing.noInvoices")}</div>
        ) : (
          <div className="divide-y divide-border/60">
            {invoices.slice(0, 8).map((inv: InvoiceLike) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{inv.description}</div>
                  <div className="text-xs text-muted-foreground">{inv.id} · {new Date(inv.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatTZS(inv.amountTZS)}</span>
                  <Badge variant="outline" className={cn(
                    "capitalize",
                    (inv.status === "paid" || inv.status === "succeeded") && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                    inv.status === "pending" && "border-amber-500/30 text-amber-700 dark:text-amber-300",
                    inv.status === "failed" && "border-red-500/30 text-red-700 dark:text-red-300",
                  )}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Payment methods ─────────────────────────── */

function PaymentMethodsPanel() {
  const { t } = useI18n();
  const mobile = PAYMENT_METHODS.filter((m) => m.category === "mobile");
  const card = PAYMENT_METHODS.filter((m) => m.category === "card");
  const bank = PAYMENT_METHODS.filter((m) => m.category === "bank");

  return (
    <section className="space-y-6">
      <div className="ds-card border-amber-500/30 bg-amber-500/[0.05] p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Wallet className="h-6 w-6" />
        </div>
        <div className="mt-3 font-display text-lg font-semibold">{t("billing.gatewayTitle")}</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-foreground/75">{t("billing.gatewayBody")}</p>
      </div>

      <PaymentGroup title={t("billing.mobileMoney")} icon={Smartphone} items={mobile} />
      <PaymentGroup title={t("billing.cards")} icon={CreditCard} items={card} />
      <PaymentGroup title={t("billing.bank")} icon={Building2} items={bank} />
    </section>
  );
}

function PaymentGroup({ title, icon: Icon, items }: { title: string; icon: typeof Smartphone; items: typeof PAYMENT_METHODS }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="font-semibold">{title}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <div key={m.id} className="ds-card flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300">
              {m.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Admin: revenue + configuration ─────────────────────────── */

function AdminPanel() {
  const { t } = useI18n();
  const [section, setSection] = useState<"revenue" | "config">("revenue");

  return (
    <section className="space-y-5">
      <div className="inline-flex rounded-xl border border-border/60 p-1">
        {(["revenue", "config"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold",
              section === s ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {s === "revenue" ? t("billing.admin.revenue") : t("billing.admin.config")}
          </button>
        ))}
      </div>
      {section === "revenue" ? <AdminRevenue /> : <AdminConfig />}
    </section>
  );
}

function AdminRevenue() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const [payments, subs] = await Promise.all([fetchAdminPayments(), fetchAdminSubscriptions()]);
      return { payments, subs };
    },
  });

  const payments = useMemo(() => data?.payments ?? [], [data]);
  const subs = data?.subs ?? [];

  // Only CONFIRMED payments count towards revenue.
  const confirmed = payments.filter((p) => p.status === "succeeded" || p.status === "paid");
  const collected = confirmed.reduce((a, p) => a + p.amount, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = confirmed.filter((p) => new Date(p.createdAt) >= monthStart);
  const mrr = thisMonth.reduce((a, p) => a + p.amount, 0);
  const promoRevenue = confirmed
    .filter((p) => (p as unknown as { purpose?: string }).purpose === "promotion")
    .reduce((a, p) => a + p.amount, 0);
  const activeSubs = subs.reduce((a, s) => a + s.active, 0);
  const pending = payments.filter((p) => p.status === "pending");
  const failed = payments.filter((p) => p.status === "failed");

  const setStatus = async (id: string, status: string) => {
    try {
      await adminSetPaymentStatus(id, status);
      toast.success(t("billing.admin.paymentUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
    } catch {
      toast.error(t("common.errorGeneric"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("billing.admin.mrr")} value={isLoading ? "…" : formatTZS(mrr)} icon={TrendingUp} tone="brand" />
        <StatCard label={t("billing.admin.collected")} value={isLoading ? "…" : formatTZS(collected)} icon={Receipt} tone="gold" />
        <StatCard label={t("billing.admin.promoRevenue")} value={isLoading ? "…" : formatTZS(promoRevenue)} icon={Star} tone="muted" />
        <StatCard label={t("billing.admin.activeSubs")} value={isLoading ? "…" : activeSubs} icon={Users} tone="success" />
      </div>

      <div className="ds-card p-5">
        <div className="font-semibold">{t("billing.admin.byPlan")}</div>
        {subs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("billing.admin.noSubs")}</p>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            {subs.map((s) => (
              <div key={s.plan} className="flex items-center justify-between">
                <span className="capitalize">{s.plan}</span>
                <span className="font-semibold">{s.active}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ds-card overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="font-semibold">{t("billing.admin.pendingPayments")}</div>
          <div className="text-xs text-muted-foreground">{t("billing.admin.pendingHelp")}</div>
        </div>
        {pending.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">{t("billing.admin.noPending")}</div>
        ) : (
          <div className="divide-y divide-border/60">
            {pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div>
                  <div className="font-medium">{p.reference ?? p.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatTZS(p.amount)}</span>
                  <Button size="sm" onClick={() => void setStatus(p.id, "succeeded")}>{t("billing.admin.confirm")}</Button>
                  <Button size="sm" variant="outline" onClick={() => void setStatus(p.id, "failed")}>{t("billing.admin.markFailed")}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {failed.length > 0 && (
          <div className="border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            {t("billing.admin.failedCount", { count: failed.length })}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminConfig() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["billing-plans-all"], queryFn: () => fetchPlans(true) });
  const { data: products = [] } = useQuery({ queryKey: ["promotion-products-all"], queryFn: () => fetchPromotionProducts(true) });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Settings2 className="mr-2 inline h-4 w-4" />
        {t("billing.admin.configHelp")}
      </div>

      <div className="space-y-3">
        <div className="font-semibold">{t("billing.admin.plans")}</div>
        {plans.map((plan) => (
          <PlanEditor key={plan.id} plan={plan} onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
            void queryClient.invalidateQueries({ queryKey: ["billing-plans-all"] });
          }} />
        ))}
      </div>

      <div className="space-y-3">
        <div className="font-semibold">{t("billing.admin.promotions")}</div>
        {products.map((p) => (
          <PromotionEditor key={p.id} product={p} onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["promotion-products"] });
            void queryClient.invalidateQueries({ queryKey: ["promotion-products-all"] });
          }} />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan, onSaved }: { plan: BillingPlan; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(plan.name);
  const [monthly, setMonthly] = useState(String(plan.price_monthly));
  const [annual, setAnnual] = useState(String(plan.price_annual));
  const [limit, setLimit] = useState(plan.listing_limit == null ? "" : String(plan.listing_limit));
  const [agents, setAgents] = useState(plan.agent_limit == null ? "" : String(plan.agent_limit));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updatePlan(plan.id, {
        name,
        price_monthly: Number(monthly) || 0,
        price_annual: Number(annual) || 0,
        listing_limit: limit === "" ? null : Number(limit),
        agent_limit: agents === "" ? null : Number(agents),
      });
      toast.success(t("billing.admin.saved"));
      onSaved();
    } catch {
      toast.error(t("common.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ds-card space-y-3 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.id}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={t("billing.admin.planName")} value={name} onChange={setName} />
        <Field label={t("billing.admin.monthlyPrice")} value={monthly} onChange={setMonthly} type="number" />
        <Field label={t("billing.admin.annualPrice")} value={annual} onChange={setAnnual} type="number" />
        <Field label={t("billing.admin.listingLimit")} value={limit} onChange={setLimit} type="number" placeholder="∞" />
        <Field label={t("billing.admin.agentLimit")} value={agents} onChange={setAgents} type="number" placeholder="∞" />
      </div>
      <Button size="sm" onClick={() => void save()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("common.save")}
      </Button>
    </div>
  );
}

function PromotionEditor({ product, onSaved }: { product: PromotionProduct; onSaved: () => void }) {
  const { t } = useI18n();
  const [price, setPrice] = useState(String(product.price));
  const [days, setDays] = useState(String(product.duration_days));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updatePromotionProduct(product.id, {
        price: Number(price) || 0,
        duration_days: Number(days) || 1,
      });
      toast.success(t("billing.admin.saved"));
      onSaved();
    } catch {
      toast.error(t("common.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ds-card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-40 flex-1">
        <div className="ds-caption">{product.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{product.description}</div>
      </div>
      <Field label={t("billing.price")} value={price} onChange={setPrice} type="number" />
      <Field label={t("billing.promo.duration")} value={days} onChange={setDays} type="number" />
      <Button size="sm" onClick={() => void save()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {t("common.save")}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="ds-caption">{label}</span>
      <Input className="mt-1" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export { ShieldCheck };
