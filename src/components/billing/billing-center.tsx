import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminPayments, fetchAdminSubscriptions } from "@/lib/admin-db";
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
import { VERIFICATION_FEES, type PaymentIntent } from "@/lib/payments-store";
import { useMyPayments, useMySubscription, useMyListingCount, type InvoiceLike } from "@/lib/billing-db";
import {
  PLANS, ADDONS, PAYMENT_METHODS,
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

function PlansPanel({ cycle, onCycleChange, onCheckout }: { cycle: BillingCycle; onCycleChange: (c: BillingCycle) => void; onCheckout: (i: PaymentIntent) => void }) {
  const { subscription } = useMySubscription();
  const currentId = (subscription?.plan ?? null) as PlanId | null;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  onClick={() => {
                    if (price == null) {
                      toast.success("Sales team notified", { description: "We'll reach out about Enterprise pricing." });
                      return;
                    }
                    if (price === 0) {
                      toast.success("You're on the Free plan");
                      return;
                    }
                    onCheckout({
                      purpose: "subscription",
                      reference: plan.id,
                      label: `${plan.name} — ${cycle === "monthly" ? "Monthly" : "Annual"}`,
                      amountTZS: price,
                    });
                  }}
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

function AddOnsPanel({ onCheckout }: { onCheckout: (i: PaymentIntent) => void }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Feature boosts</h2>
        <p className="mt-1 text-sm text-muted-foreground">One-time upgrades to promote a specific listing.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADDONS.map((a) => {
          const Icon = ADDON_ICONS[a.icon];
          const expires = new Date(Date.now() + a.durationDays * 86400_000).toLocaleDateString();
          return (
            <div key={a.id} className="ds-card ds-card-hover flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.durationDays} days · expires {expires}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/80">{a.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="font-display text-xl font-semibold">{formatTZS(a.priceTZS)}</div>
                <Button size="sm" onClick={() => onCheckout({
                  purpose: "boost",
                  reference: a.id,
                  label: `${a.name} — ${a.durationDays} days`,
                  amountTZS: a.priceTZS,
                  durationDays: a.durationDays,
                })}>
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
  const { subscription, loading } = useMySubscription();
  const { invoices, loading: invoicesLoading } = useMyPayments();
  const listingsUsed = useMyListingCount();

  const plan = subscription ? PLANS.find((p) => p.id === subscription.plan) ?? null : null;
  const quotaLimit = !plan || plan.listingsQuota === "unlimited" ? Infinity : plan.listingsQuota;
  const quotaPct = quotaLimit === Infinity ? 0 : Math.min(100, (listingsUsed / quotaLimit) * 100);
  const renews = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ds-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="ds-caption">Current plan</div>
              <div className="mt-1 font-display text-2xl font-semibold">
                {loading ? "…" : plan?.name ?? "No active plan"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {plan?.tagline ?? "You're on the free listing experience."}
              </div>
            </div>
            {subscription && (
              <Badge className="bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] hover:bg-[color:var(--color-success-50)]">
                <Sparkles className="mr-1 h-3 w-3" /> {subscription.status}
              </Badge>
            )}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="ds-caption">Renews on</div>
              <div className="mt-1 font-semibold">
                {renews ? renews.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </div>
            </div>
            <div>
              <div className="ds-caption">Billing cycle</div>
              <div className="mt-1 font-semibold capitalize">{subscription?.billing_cycle ?? "—"}</div>
            </div>
            <div>
              <div className="ds-caption">Payment method</div>
              <div className="mt-1 font-semibold">—</div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 text-sm text-foreground/75">
            Payment gateway setup required — plan changes are handled by our team for now.
          </div>
        </div>

        <div className="ds-card p-5">
          <div className="ds-caption">Listing quota</div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {listingsUsed}
            <span className="text-lg text-muted-foreground"> / {quotaLimit === Infinity ? "∞" : quotaLimit}</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${quotaPct}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {quotaLimit === Infinity
              ? "Unlimited listings included."
              : `${Math.max(0, quotaLimit - listingsUsed)} listings remaining this cycle.`}
          </p>
        </div>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <div className="font-semibold">Invoice history</div>
            <div className="text-xs text-muted-foreground">Download receipts for accounting.</div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/billing/history"><History className="mr-1 h-4 w-4" /> Full history</Link>
          </Button>
        </div>

        {invoicesLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No payments yet. Your invoices will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {invoices.slice(0, 5).map((inv: InvoiceLike) => (
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
  const mobile = PAYMENT_METHODS.filter(m => m.category === "mobile");
  const card = PAYMENT_METHODS.filter(m => m.category === "card");
  const bank = PAYMENT_METHODS.filter(m => m.category === "bank");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  return (
    <section className="space-y-6">
      <div className="ds-card border-amber-500/30 bg-amber-500/[0.05] p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Wallet className="h-6 w-6" />
        </div>
        <div className="mt-3 font-display text-lg font-semibold">Payment gateway setup required</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-foreground/75">
          No payment provider is connected yet, so online payments are unavailable. The methods
          below are the ones SPACES will support once setup is complete.
        </p>
      </div>

      <PaymentGroup title="Mobile money" icon={Smartphone} items={mobile} />
      <PaymentGroup title="Cards" icon={CreditCard} items={card} />
      <PaymentGroup title="Bank" icon={Building2} items={bank} />

      <VerificationFeesPanel onCheckout={setIntent} />

      <CheckoutDialog open={intent !== null} onOpenChange={(v) => !v && setIntent(null)} intent={intent} />
    </section>
  );
}

function VerificationFeesPanel({ onCheckout }: { onCheckout: (i: PaymentIntent) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <div className="font-semibold">Verification payments</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VERIFICATION_FEES.map((v) => (
          <div key={v.id} className="ds-card flex flex-col p-4">
            <div className="font-semibold">{v.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{v.description}</div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-display text-lg font-semibold">{formatTZS(v.priceTZS)}</span>
              <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-300">Pending</Badge>
            </div>
            <Button size="sm" className="mt-3" onClick={() => onCheckout({
              purpose: "verification",
              reference: v.id,
              label: v.name,
              amountTZS: v.priceTZS,
            })}>
              Pay & submit for review
            </Button>
          </div>
        ))}
      </div>
    </div>
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const [payments, subs] = await Promise.all([fetchAdminPayments(), fetchAdminSubscriptions()]);
      return { payments, subs };
    },
  });

  const payments = data?.payments ?? [];
  const subs = data?.subs ?? [];

  const succeeded = payments.filter((p) => p.status === "succeeded" || p.status === "paid");
  const collected = succeeded.reduce((a, p) => a + p.amount, 0);
  const activeSubs = subs.reduce((a, s) => a + s.active, 0);
  const last30 = succeeded.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 30 * 86400000);
  const last30Total = last30.reduce((a, p) => a + p.amount, 0);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <span className="font-semibold">No payment provider is connected yet.</span>{" "}
        <span className="text-muted-foreground">
          Figures below come only from records already saved in the database. They stay at zero until a live
          gateway (M-Pesa, Selcom, Airtel Money or a card processor) is configured.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Collected (all time)" value={isLoading ? "…" : formatTZS(collected)} icon={TrendingUp} tone="brand" />
        <StatCard label="Collected (last 30 days)" value={isLoading ? "…" : formatTZS(last30Total)} icon={Building2} tone="gold" />
        <StatCard label="Active subscriptions" value={isLoading ? "…" : activeSubs} icon={Users} tone="success" />
        <StatCard label="Payment records" value={isLoading ? "…" : payments.length} icon={Receipt} tone="muted" />
      </div>

      <div className="ds-card p-5">
        <div className="font-semibold">Subscriptions by plan</div>
        {subs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No subscription records yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {subs.map((s) => (
              <div key={s.plan} className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{s.plan}</span>
                <span className="text-muted-foreground">{s.active} active · {s.total} total</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ds-card p-5">
        <div className="font-semibold">Recent payments</div>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No payments have been recorded yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60">
            {payments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-semibold">{formatTZS(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.provider} · {new Date(p.createdAt).toLocaleDateString("en-GB")}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
