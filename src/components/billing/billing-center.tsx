import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check, Star, Flame, ShieldCheck, Home, Search, Crown, Sparkles,
  CreditCard, Receipt, Download, Tag, TrendingUp, Users, BadgePercent,
  Smartphone, Wallet, Building2, ArrowRight, Plus, Pause, Play, X, History, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ds/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CheckoutDialog } from "@/components/billing/checkout-dialog";
import { isGatewayConfigured, setGatewayConfigured, VERIFICATION_FEES, type PaymentIntent } from "@/lib/payments-store";
import {
  PLANS, ADDONS, PAYMENT_METHODS, CURRENT_SUBSCRIPTION, INVOICES, COUPONS,
  REVENUE_KPI, REVENUE_BY_PLAN, REVENUE_TREND,
  formatTZS, planById, type PlanId, type BillingCycle, type AddOn,
} from "@/lib/billing-mock";


const ADDON_ICONS: Record<AddOn["icon"], typeof Star> = {
  star: Star, flame: Flame, shield: ShieldCheck, home: Home, search: Search, crown: Crown,
};

type Tab = "plans" | "addons" | "billing" | "payments" | "admin";

export function BillingCenter() {
  const { primaryRole } = useAuth();
  const isAdmin = primaryRole === "admin" || primaryRole === "super_admin";
  const [tab, setTab] = useState<Tab>("plans");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const openIntent = (i: PaymentIntent) => setIntent(i);


  const tabs: { id: Tab; label: string }[] = [
    { id: "plans", label: "Plans" },
    { id: "addons", label: "Feature Boosts" },
    { id: "billing", label: "Billing & Invoices" },
    { id: "payments", label: "Payment Methods" },
    ...(isAdmin ? [{ id: "admin" as const, label: "Revenue Admin" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background p-1.5 shadow-[var(--shadow-soft)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              tab === t.id ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                           : "text-foreground/70 hover:bg-accent hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansPanel cycle={cycle} onCycleChange={setCycle} onCheckout={openIntent} />}
      {tab === "addons" && <AddOnsPanel onCheckout={openIntent} />}
      {tab === "billing" && <BillingPanel />}
      {tab === "payments" && <PaymentMethodsPanel />}
      {tab === "admin" && isAdmin && <AdminPanel />}

      <CheckoutDialog open={intent !== null} onOpenChange={(v) => !v && setIntent(null)} intent={intent} />
    </div>
  );
}


/* ─────────────────────────── Plans ─────────────────────────── */

function PlansPanel({ cycle, onCycleChange }: { cycle: BillingCycle; onCycleChange: (c: BillingCycle) => void }) {
  const currentId = CURRENT_SUBSCRIPTION.planId;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Choose your plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Simple, transparent pricing. Cancel or change anytime.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1">
          {(["monthly", "annual"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => onCycleChange(c)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
                cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}{c === "annual" && <span className="ml-1 text-[10px] opacity-80">−17%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentId;
          const price = cycle === "monthly" ? plan.priceMonthlyTZS : plan.priceAnnualTZS;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6 transition-all",
                plan.featured
                  ? "border-primary/50 bg-primary/[0.03] shadow-[var(--shadow-lifted)]"
                  : "border-border/60 bg-background shadow-[var(--shadow-soft)]",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  {plan.badge}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.name}</div>
                <div className="mt-1 text-sm text-foreground/75">{plan.tagline}</div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight">
                    {price == null ? "Custom" : price === 0 ? "Free" : formatTZS(price)}
                  </span>
                  {price != null && price > 0 && (
                    <span className="text-xs text-muted-foreground">/{cycle === "monthly" ? "mo" : "yr"}</span>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-6 border-t border-border/60">
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.featured ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => toast.success(`Plan change queued — ${plan.name}`, { description: "Payment gateway will be enabled soon." })}
                >
                  {isCurrent ? "Current plan" : plan.cta}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────── Add-ons ─────────────────────────── */

function AddOnsPanel() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Feature boosts</h2>
        <p className="mt-1 text-sm text-muted-foreground">One-time upgrades to promote a specific listing.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADDONS.map((a) => {
          const Icon = ADDON_ICONS[a.icon];
          return (
            <div key={a.id} className="ds-card ds-card-hover flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.durationDays} days</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/80">{a.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="font-display text-xl font-semibold">{formatTZS(a.priceTZS)}</div>
                <Button size="sm" onClick={() => toast.success(`Added: ${a.name}`, { description: "Complete checkout when payments launch." })}>
                  <Plus className="mr-1 h-4 w-4" /> Purchase
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────── Billing (owner) ─────────────────────────── */

function BillingPanel() {
  const sub = CURRENT_SUBSCRIPTION;
  const plan = planById(sub.planId);
  const quotaLimit = plan.listingsQuota === "unlimited" ? Infinity : plan.listingsQuota;
  const quotaPct = quotaLimit === Infinity ? 0 : Math.min(100, (sub.listingsUsed / quotaLimit) * 100);
  const renews = new Date(sub.renewsOn);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ds-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="ds-caption">Current plan</div>
              <div className="mt-1 font-display text-2xl font-semibold">{plan.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{plan.tagline}</div>
            </div>
            <Badge className="bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] hover:bg-[color:var(--color-success-50)]">
              <Sparkles className="mr-1 h-3 w-3" /> {sub.status}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="ds-caption">Renews on</div>
              <div className="mt-1 font-semibold">{renews.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
            </div>
            <div>
              <div className="ds-caption">Billing cycle</div>
              <div className="mt-1 font-semibold capitalize">{sub.cycle}</div>
            </div>
            <div>
              <div className="ds-caption">Payment method</div>
              <div className="mt-1 font-semibold">{PAYMENT_METHODS.find(m => m.id === sub.paymentMethod)?.name ?? "—"}</div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast("Renewal management coming soon.")}>
              Manage renewal
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast("Downgrade requested.")}>Change plan</Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => toast("Cancellation flow will open here.")}>
              Cancel subscription
            </Button>
          </div>
        </div>

        <div className="ds-card p-5">
          <div className="ds-caption">Listing quota</div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {sub.listingsUsed}
            <span className="text-lg text-muted-foreground"> / {plan.listingsQuota === "unlimited" ? "∞" : plan.listingsQuota}</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${quotaPct}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {plan.listingsQuota === "unlimited" ? "Unlimited listings included." : `${Math.max(0, quotaLimit - sub.listingsUsed)} listings remaining this cycle.`}
          </p>
        </div>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <div className="font-semibold">Invoice history</div>
            <div className="text-xs text-muted-foreground">Download receipts for accounting.</div>
          </div>
          <Receipt className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="divide-y divide-border/60">
          {INVOICES.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="font-medium text-foreground">{inv.description}</div>
                <div className="text-xs text-muted-foreground">{inv.id} · {new Date(inv.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatTZS(inv.amountTZS)}</span>
                <Badge variant="outline" className={cn(
                  "capitalize",
                  inv.status === "paid" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                  inv.status === "refunded" && "border-amber-500/30 text-amber-700 dark:text-amber-300",
                  inv.status === "failed" && "border-red-500/30 text-red-700 dark:text-red-300",
                )}>
                  {inv.status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => toast.success(`Receipt ${inv.id} downloaded`)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Payment methods ─────────────────────────── */

function PaymentMethodsPanel() {
  const mobile = PAYMENT_METHODS.filter(m => m.category === "mobile");
  const card = PAYMENT_METHODS.filter(m => m.category === "card");

  return (
    <section className="space-y-6">
      <div className="ds-card border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Payment gateways launching soon</div>
            <p className="mt-1 text-sm text-foreground/75">
              SPACES is preparing local mobile money and international card acceptance. Gateway integration is on track — the architecture below
              is ready to receive payments the moment gateways are activated.
            </p>
          </div>
        </div>
      </div>

      <PaymentGroup title="Mobile money" icon={Smartphone} items={mobile} />
      <PaymentGroup title="Cards" icon={CreditCard} items={card} />
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
              Planned
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Admin revenue ─────────────────────────── */

function AdminPanel() {
  const [couponCode, setCouponCode] = useState("");
  const [couponPct, setCouponPct] = useState(10);
  const maxTrend = Math.max(...REVENUE_TREND.map((t) => t.mrrTZS));

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={formatTZS(REVENUE_KPI.mrrTZS)} delta={REVENUE_KPI.mrrDelta} icon={TrendingUp} tone="brand" />
        <StatCard label="ARR" value={formatTZS(REVENUE_KPI.arrTZS)} icon={Building2} tone="gold" />
        <StatCard label="Active subscribers" value={REVENUE_KPI.activeSubs} delta={REVENUE_KPI.activeSubsDelta} icon={Users} tone="success" />
        <StatCard label="Churn" value={`${REVENUE_KPI.churnPct}%`} delta={REVENUE_KPI.churnDelta} icon={BadgePercent} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ds-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">MRR trend</div>
              <div className="text-xs text-muted-foreground">Last 6 months</div>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-6 flex h-40 items-end gap-3">
            {REVENUE_TREND.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-primary/70 to-primary transition-all"
                    style={{ height: `${(t.mrrTZS / maxTrend) * 100}%` }}
                    title={formatTZS(t.mrrTZS)}
                  />
                </div>
                <div className="text-[10px] font-medium text-muted-foreground">{t.month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-card p-5">
          <div className="font-semibold">Revenue by plan</div>
          <div className="mt-4 space-y-3">
            {REVENUE_BY_PLAN.map((r) => (
              <div key={r.plan}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.plan}</span>
                  <span className="text-muted-foreground">{r.subs} subs · {formatTZS(r.mrrTZS)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (r.mrrTZS / REVENUE_KPI.mrrTZS) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ds-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Promotions & coupons</div>
            <div className="text-xs text-muted-foreground">Create discount codes for campaigns.</div>
          </div>
          <Tag className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="max-w-[200px]"
            placeholder="COUPON CODE"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <Input
            type="number"
            className="max-w-[120px]"
            value={couponPct}
            onChange={(e) => setCouponPct(Number(e.target.value))}
            min={1} max={100}
          />
          <Button
            onClick={() => {
              if (!couponCode) return toast.error("Enter a code");
              toast.success(`Coupon ${couponCode} created (${couponPct}% off)`);
              setCouponCode("");
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Create coupon
          </Button>
        </div>
        <div className="mt-5 divide-y divide-border/60 rounded-2xl border border-border/60">
          {COUPONS.map((c) => (
            <div key={c.code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-mono font-semibold">{c.code}</div>
                <div className="text-xs text-muted-foreground">
                  {c.discountPct}% off · {c.appliesTo === "all" ? "all plans" : c.appliesTo.join(", ")} · used {c.usage}/{c.cap}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={c.active ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : ""}>
                  {c.active ? "Active" : "Disabled"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => toast(`${c.active ? "Paused" : "Resumed"} ${c.code}`)}>
                  {c.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.success(`Deleted ${c.code}`)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-card p-5">
        <div className="font-semibold">Subscription controls</div>
        <div className="mt-1 text-xs text-muted-foreground">Manually upgrade, downgrade, or suspend accounts.</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => toast.success("Upgrade queued")}>
            <ArrowRight className="mr-1 h-4 w-4" /> Upgrade user
          </Button>
          <Button variant="outline" onClick={() => toast.success("Downgrade queued")}>
            <ArrowRight className="mr-1 h-4 w-4 rotate-180" /> Downgrade user
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => toast.success("Subscription suspended")}>
            <Pause className="mr-1 h-4 w-4" /> Suspend subscription
          </Button>
        </div>
      </div>
    </section>
  );
}
