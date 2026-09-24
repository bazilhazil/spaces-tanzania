import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Tab = "plans" | "boosts" | "transaction_fee" | "rental_fee" | "commission" | "tax_discount" | "methods" | "log";
const TABS: { id: Tab; label: string }[] = [
  { id: "plans", label: "Products & Plans" },
  { id: "boosts", label: "Boosts" },
  { id: "transaction_fee", label: "Transaction Fees" },
  { id: "rental_fee", label: "Rental Fees" },
  { id: "commission", label: "Commission Rules" },
  { id: "tax_discount", label: "Taxes & Discounts" },
  { id: "methods", label: "Payment Methods" },
  { id: "log", label: "Change Log" },
];

const ROLES = ["owner", "agent", "property_manager", "developer", "buyer"];
const tzs = (n: number) => new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 2 }).format(n);

export function MonetizationPanel() {
  const [tab, setTab] = useState<Tab>("plans");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Monetization & Deals</h1>
        <p className="mt-1 text-muted-foreground">Set every price, limit, fee and tax here. Changes apply immediately and are logged.</p>
      </header>
      <div className="-mx-1 flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background p-1.5 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("shrink-0 rounded-xl px-4 py-2 text-sm font-semibold",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "plans" && <PlansTab />}
      {tab === "boosts" && <BoostsTab />}
      {tab === "transaction_fee" && <RulesTab types={["transaction_fee", "service_fee"]} />}
      {tab === "rental_fee" && <RulesTab types={["rental_fee"]} />}
      {tab === "commission" && <RulesTab types={["commission"]} />}
      {tab === "tax_discount" && <RulesTab types={["tax", "discount"]} />}
      {tab === "methods" && <MethodsTab />}
      {tab === "log" && <LogTab />}
    </div>
  );
}

/* ───── shared ───── */
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="ds-caption">{label}</span>{children}</label>;
}
function num(v: string): number | null { return v.trim() === "" ? null : Number(v); }
function RolePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLES.map((r) => {
        const on = value.includes(r);
        return (
          <button type="button" key={r} onClick={() => onChange(on ? value.filter((x) => x !== r) : [...value, r])}
            className={cn("rounded-full border px-2.5 py-1 text-xs capitalize",
              on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground")}>
            {r.replace("_", " ")}
          </button>
        );
      })}
    </div>
  );
}
async function save(table: "billing_plans" | "promotion_products" | "pricing_rules", id: string | null, values: Record<string, unknown>) {
  const q = id
    ? supabase.from(table).update(values as never).eq("id", id)
    : supabase.from(table).insert(values as never);
  const { error } = await q;
  if (error) { toast.error(error.message); return false; }
  toast.success("Saved and logged");
  return true;
}

/* ───── plans ───── */
type Plan = {
  id: string; name: string; description: string | null; price_monthly: number; price_annual: number; currency: string;
  listing_limit: number | null; unit_limit: number | null; team_limit: number | null; billing_frequency: string;
  target_roles: string[]; tax_rate: number; effective_from: string; active: boolean;
};
function PlansTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await supabase.from("billing_plans").select("*").order("sort_order")).data as Plan[] | null,
  });
  if (isLoading) return <Loader2 className="animate-spin" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(data ?? []).map((p) => <PlanCard key={p.id} plan={p} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-plans"] })} />)}
    </div>
  );
}
function PlanCard({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const [f, setF] = useState({
    name: plan.name, description: plan.description ?? "", price_monthly: String(plan.price_monthly),
    price_annual: String(plan.price_annual), listing_limit: plan.listing_limit?.toString() ?? "",
    unit_limit: plan.unit_limit?.toString() ?? "", team_limit: plan.team_limit?.toString() ?? "",
    billing_frequency: plan.billing_frequency, tax_rate: String(plan.tax_rate), effective_from: plan.effective_from,
    target_roles: plan.target_roles, active: plan.active,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  async function submit() {
    if (f.active && Number(f.price_monthly) === 0 && plan.id !== "free" && f.billing_frequency !== "free") {
      if (!confirm("This plan will be free. Activate anyway?")) return;
    }
    setBusy(true);
    const ok = await save("billing_plans", plan.id, {
      name: f.name, description: f.description, price_monthly: Number(f.price_monthly), price_annual: Number(f.price_annual),
      listing_limit: num(f.listing_limit), unit_limit: num(f.unit_limit), team_limit: num(f.team_limit),
      billing_frequency: f.billing_frequency, tax_rate: Number(f.tax_rate), effective_from: f.effective_from,
      target_roles: f.target_roles, active: f.active,
    });
    setBusy(false);
    if (ok) onSaved();
  }
  return (
    <div className="ds-card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{plan.id}</Badge>
        <label className="flex items-center gap-2 text-sm">{f.active ? "Active" : "Hidden"}<Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /></label>
      </div>
      <F label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></F>
      <F label="Description"><Input value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Price / month (TZS)"><Input type="number" min={0} value={f.price_monthly} onChange={(e) => set("price_monthly", e.target.value)} /></F>
        <F label="Price / year (TZS)"><Input type="number" min={0} value={f.price_annual} onChange={(e) => set("price_annual", e.target.value)} /></F>
        <F label="Listing limit (blank = unlimited)"><Input type="number" min={0} value={f.listing_limit} onChange={(e) => set("listing_limit", e.target.value)} /></F>
        <F label="Unit limit"><Input type="number" min={0} value={f.unit_limit} onChange={(e) => set("unit_limit", e.target.value)} /></F>
        <F label="Team members"><Input type="number" min={0} value={f.team_limit} onChange={(e) => set("team_limit", e.target.value)} /></F>
        <F label="Billing">
          <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.billing_frequency} onChange={(e) => set("billing_frequency", e.target.value)}>
            <option value="monthly">Monthly</option><option value="annual">Annual</option><option value="one_time">One-time</option><option value="free">Free</option>
          </select>
        </F>
        <F label="Tax %"><Input type="number" min={0} max={100} value={f.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} /></F>
        <F label="Effective from"><Input type="date" value={f.effective_from} onChange={(e) => set("effective_from", e.target.value)} /></F>
      </div>
      <F label="For roles"><RolePicker value={f.target_roles} onChange={(v) => set("target_roles", v)} /></F>
      <Button onClick={submit} disabled={busy} className="w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save plan</Button>
    </div>
  );
}

/* ───── boosts ───── */
type Boost = {
  id: string; name: string; description: string; price: number; duration_days: number; placement: string;
  priority_score: number; badge_label: string; target_roles: string[]; tax_rate: number; effective_from: string; active: boolean;
};
function BoostsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-boosts"],
    queryFn: async () => (await supabase.from("promotion_products").select("*").order("sort_order")).data as Boost[] | null,
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(data ?? []).map((b) => <BoostCard key={b.id} b={b} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-boosts"] })} />)}
    </div>
  );
}
function BoostCard({ b, onSaved }: { b: Boost; onSaved: () => void }) {
  const [f, setF] = useState({ ...b, price: String(b.price), duration_days: String(b.duration_days), priority_score: String(b.priority_score), tax_rate: String(b.tax_rate) });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (Number(f.duration_days) < 1) return toast.error("Duration must be at least 1 day");
    setBusy(true);
    const ok = await save("promotion_products", b.id, {
      name: f.name, description: f.description, price: Number(f.price), duration_days: Number(f.duration_days),
      placement: f.placement, priority_score: Number(f.priority_score), badge_label: f.badge_label,
      target_roles: f.target_roles, tax_rate: Number(f.tax_rate), effective_from: f.effective_from, active: f.active,
    });
    setBusy(false);
    if (ok) onSaved();
  }
  return (
    <div className="ds-card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <Badge className="bg-primary/15 text-foreground">{f.badge_label}</Badge>
        <label className="flex items-center gap-2 text-sm">{f.active ? "Active" : "Hidden"}<Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /></label>
      </div>
      <F label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></F>
      <F label="Description"><Input value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Price (TZS)"><Input type="number" min={0} value={f.price} onChange={(e) => set("price", e.target.value)} /></F>
        <F label="Duration (days)"><Input type="number" min={1} value={f.duration_days} onChange={(e) => set("duration_days", e.target.value)} /></F>
        <F label="Placement">
          <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.placement} onChange={(e) => set("placement", e.target.value)}>
            <option value="search">Search results</option><option value="homepage">Homepage</option><option value="both">Both</option>
          </select>
        </F>
        <F label="Priority score"><Input type="number" min={0} value={f.priority_score} onChange={(e) => set("priority_score", e.target.value)} /></F>
        <F label="Badge text"><Input value={f.badge_label} onChange={(e) => set("badge_label", e.target.value)} /></F>
        <F label="Tax %"><Input type="number" min={0} value={f.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} /></F>
      </div>
      <F label="For roles"><RolePicker value={f.target_roles} onChange={(v) => set("target_roles", v)} /></F>
      <Button onClick={submit} disabled={busy} className="w-full">Save boost</Button>
    </div>
  );
}

/* ───── pricing rules ───── */
type Rule = {
  id: string; rule_type: string; name: string; description: string | null; applies_to: string; payer: string;
  percentage: number; fixed_amount: number; min_amount: number | null; max_amount: number | null; tax_rate: number;
  active: boolean; effective_from: string; effective_to: string | null;
};
function RulesTab({ types }: { types: string[] }) {
  const qc = useQueryClient();
  const key = ["admin-rules", types.join()];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("pricing_rules").select("*").in("rule_type", types).order("sort_order")).data as Rule[] | null,
  });
  const [adding, setAdding] = useState(false);
  const refresh = () => { setAdding(false); void qc.invalidateQueries({ queryKey: key }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />Add rule</Button></div>
      <div className="grid gap-4 md:grid-cols-2">
        {adding && <RuleCard rule={null} defaultType={types[0]} types={types} onSaved={refresh} />}
        {(data ?? []).map((r) => <RuleCard key={r.id} rule={r} defaultType={r.rule_type} types={types} onSaved={refresh} />)}
        {!adding && (data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No rules yet. Nothing is charged until you add one.</p>}
      </div>
    </div>
  );
}
function RuleCard({ rule, defaultType, types, onSaved }: { rule: Rule | null; defaultType: string; types: string[]; onSaved: () => void }) {
  const [f, setF] = useState({
    rule_type: rule?.rule_type ?? defaultType, name: rule?.name ?? "", description: rule?.description ?? "",
    applies_to: rule?.applies_to ?? "any", payer: rule?.payer ?? "buyer", percentage: String(rule?.percentage ?? 0),
    fixed_amount: String(rule?.fixed_amount ?? 0), min_amount: rule?.min_amount?.toString() ?? "", max_amount: rule?.max_amount?.toString() ?? "",
    tax_rate: String(rule?.tax_rate ?? 0), active: rule?.active ?? true,
    effective_from: rule?.effective_from ?? new Date().toISOString().slice(0, 10), effective_to: rule?.effective_to ?? "",
  });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const example = (() => {
    const v = 100_000_000;
    let fee = (v * Number(f.percentage)) / 100 + Number(f.fixed_amount);
    if (f.min_amount) fee = Math.max(fee, Number(f.min_amount));
    if (f.max_amount) fee = Math.min(fee, Number(f.max_amount));
    return { fee, tax: (fee * Number(f.tax_rate)) / 100 };
  })();
  async function submit() {
    if (!f.name.trim()) return toast.error("Name is required");
    if (f.min_amount && f.max_amount && Number(f.min_amount) > Number(f.max_amount)) return toast.error("Minimum cannot exceed maximum");
    const ok = await save("pricing_rules", rule?.id ?? null, {
      rule_type: f.rule_type, name: f.name.trim(), description: f.description, applies_to: f.applies_to, payer: f.payer,
      percentage: Number(f.percentage), fixed_amount: Number(f.fixed_amount), min_amount: num(f.min_amount), max_amount: num(f.max_amount),
      tax_rate: Number(f.tax_rate), active: f.active, effective_from: f.effective_from, effective_to: f.effective_to || null,
    });
    if (ok) onSaved();
  }
  const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="ds-card space-y-3 p-5">
      <div className="flex items-center justify-between">
        {types.length > 1
          ? <select className={cn(sel, "w-auto")} value={f.rule_type} onChange={(e) => set("rule_type", e.target.value)}>{types.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
          : <Badge variant="outline" className="capitalize">{f.rule_type.replace("_", " ")}</Badge>}
        <label className="flex items-center gap-2 text-sm">{f.active ? "Active" : "Off"}<Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /></label>
      </div>
      <F label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></F>
      <F label="Description"><Input value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Transaction type"><select className={sel} value={f.applies_to} onChange={(e) => set("applies_to", e.target.value)}>
          <option value="any">Any</option><option value="sale">Sale</option><option value="rent">Rent</option><option value="developer">Developer</option></select></F>
        <F label="Paid by"><select className={sel} value={f.payer} onChange={(e) => set("payer", e.target.value)}>
          {["buyer", "seller", "agent", "tenant", "landlord", "any"].map((p) => <option key={p} value={p}>{p}</option>)}</select></F>
        <F label="Percentage %"><Input type="number" step="0.01" min={0} max={100} value={f.percentage} onChange={(e) => set("percentage", e.target.value)} /></F>
        <F label="Fixed amount (TZS)"><Input type="number" min={0} value={f.fixed_amount} onChange={(e) => set("fixed_amount", e.target.value)} /></F>
        <F label="Minimum (floor)"><Input type="number" min={0} value={f.min_amount} onChange={(e) => set("min_amount", e.target.value)} /></F>
        <F label="Maximum (cap)"><Input type="number" min={0} value={f.max_amount} onChange={(e) => set("max_amount", e.target.value)} /></F>
        <F label="Tax %"><Input type="number" min={0} max={100} value={f.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} /></F>
        <F label="Effective from"><Input type="date" value={f.effective_from} onChange={(e) => set("effective_from", e.target.value)} /></F>
      </div>
      <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
        Example on 100,000,000 TZS: fee {tzs(example.fee)} TZS + tax {tzs(example.tax)} TZS
      </p>
      <Button onClick={submit} className="w-full">{rule ? "Save rule" : "Create rule"}</Button>
    </div>
  );
}

/* ───── payment methods ───── */
const METHODS = [
  { id: "mpesa", name: "M-Pesa" }, { id: "tigopesa", name: "Mixx by Yas (Tigo Pesa)" }, { id: "airtelmoney", name: "Airtel Money" },
  { id: "halopesa", name: "HaloPesa" }, { id: "card", name: "Card" }, { id: "bank_transfer", name: "Bank transfer" }, { id: "cash", name: "Cash (manual)" },
];
function MethodsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "payment_methods").maybeSingle();
      return ((data?.value as { enabled?: string[] } | null)?.enabled) ?? METHODS.map((m) => m.id);
    },
  });
  async function toggle(id: string, on: boolean) {
    const next = on ? [...(data ?? []), id] : (data ?? []).filter((x) => x !== id);
    const { error } = await supabase.from("admin_settings").upsert({ key: "payment_methods", value: { enabled: next } });
    if (error) return toast.error(error.message);
    toast.success("Saved and logged");
    void qc.invalidateQueries({ queryKey: ["admin-methods"] });
  }
  return (
    <div className="ds-card divide-y divide-border/60">
      {METHODS.map((m) => (
        <label key={m.id} className="flex items-center justify-between p-4">
          <span className="font-medium">{m.name}</span>
          <Switch checked={(data ?? []).includes(m.id)} onCheckedChange={(v) => toggle(m.id, v)} />
        </label>
      ))}
      <p className="p-4 text-xs text-muted-foreground">Online payments go live once the Selcom gateway credentials are connected. Until then, orders stay pending and are never marked paid automatically.</p>
    </div>
  );
}

/* ───── change log ───── */
type Log = { id: string; table_name: string; record_id: string; action: string; changed_by: string | null; old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; created_at: string };
function diff(o: Record<string, unknown> | null, n: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(o ?? {}), ...Object.keys(n ?? {})]);
  return [...keys].filter((k) => !["updated_at", "created_at"].includes(k) && JSON.stringify(o?.[k]) !== JSON.stringify(n?.[k]))
    .map((k) => ({ k, from: o?.[k], to: n?.[k] }));
}
function LogTab() {
  const { data } = useQuery({
    queryKey: ["pricing-log"],
    queryFn: async () => (await supabase.from("pricing_change_log").select("*").order("created_at", { ascending: false }).limit(100)).data as Log[] | null,
  });
  const { data: names } = useQuery({
    queryKey: ["pricing-log-names", (data ?? []).map((d) => d.changed_by).join()],
    enabled: !!data,
    queryFn: async () => {
      const ids = [...new Set((data ?? []).map((d) => d.changed_by).filter(Boolean))] as string[];
      if (!ids.length) return {};
      const { data: p } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name || x.email]));
    },
  });
  if (!data?.length) return <p className="text-sm text-muted-foreground">No pricing changes yet.</p>;
  return (
    <div className="space-y-3">
      {data.map((l) => (
        <div key={l.id} className="ds-card p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{l.action}</Badge>
            <span className="font-medium">{l.table_name.replace("_", " ")} · {String((l.new_values ?? l.old_values)?.name ?? l.record_id)}</span>
            <span className="ml-auto text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()} · {l.changed_by ? (names?.[l.changed_by] ?? "Admin") : "System"}</span>
          </div>
          {l.action === "UPDATE" && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {diff(l.old_values, l.new_values).map((d) => (
                <li key={d.k}><span className="font-medium text-foreground">{d.k}</span>: {JSON.stringify(d.from)} → {JSON.stringify(d.to)}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
