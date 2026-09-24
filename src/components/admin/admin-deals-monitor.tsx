import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, X, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";
import { fetchAdminDealSummary, fmtTZS } from "@/lib/offers-db";
import { STAGE_LABEL, type DealStage } from "@/lib/deals-db";

type Row = {
  id: string; reference: string; stage: string; created_at: string; property_title: string | null; region: string | null; district: string | null;
  property_type: string | null; availability: string | null; transaction_type: string | null; agreed_price: number | null; value: number | null;
  estimated_spaces_fee: number | null; agent_commission: number | null; owner_name: string | null; agent_name: string | null; buyer_name: string | null;
  owner_id: string | null; agent_id: string | null; buyer_id: string | null; payment_status: string;
};
const EMPTY = { from: "", to: "", stage: "", region: "", ptype: "", agent: "", owner: "", buyer: "", ttype: "", pay: "", avail: "" };

const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

export function AdminDealsMonitor() {
  const { t } = useI18n();
  const [f, setF] = useState(EMPTY);
  const [rows, setRows] = useState<Row[]>([]);
  const [all, setAll] = useState<Row[]>([]);
  const [s, setS] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  async function run(filters = f) {
    setLoading(true); setErr(null);
    const nz = (v: string) => (v ? v : null);
    const { data, error } = await (supabase.rpc as any)("admin_search_deals", {
      _from: filters.from ? new Date(filters.from).toISOString() : null,
      _to: filters.to ? new Date(new Date(filters.to).getTime() + 86400000).toISOString() : null,
      _stage: nz(filters.stage), _region: nz(filters.region), _ptype: nz(filters.ptype), _agent: nz(filters.agent), _owner: nz(filters.owner),
      _buyer: nz(filters.buyer), _ttype: nz(filters.ttype), _pay: null, _avail: nz(filters.avail),
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    let r = (data ?? []) as Row[];
    if (filters.pay) r = r.filter((x) => x.payment_status === filters.pay);
    setRows(r); setLoading(false);
  }

  useEffect(() => {
    void run(EMPTY).then(() => undefined);
    void (supabase.rpc as any)("admin_search_deals", { _from: null, _to: null, _stage: null, _region: null, _ptype: null, _agent: null, _owner: null, _buyer: null, _ttype: null, _pay: null, _avail: null })
      .then(({ data }: any) => setAll((data ?? []) as Row[]));
    void fetchAdminDealSummary(null).then(setS).catch((e) => setErr(e.message));
    void supabase.from("admin_settings").select("value").eq("key", "payment_test_mode").maybeSingle()
      .then(({ data }) => setTestMode(!!(data?.value as any)?.enabled));
  }, []);

  const opts = useMemo(() => {
    const uniq = (xs: (string | null)[]) => Array.from(new Set(xs.filter(Boolean) as string[])).sort();
    const people = (k: "agent" | "owner" | "buyer") => {
      const m = new Map<string, string>();
      for (const r of all) { const id = r[`${k}_id`]; if (id) m.set(id, r[`${k}_name`] ?? id.slice(0, 8)); }
      return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    };
    return { regions: uniq(all.map((r) => r.region)), ptypes: uniq(all.map((r) => r.property_type)), agents: people("agent"), owners: people("owner"), buyers: people("buyer") };
  }, [all]);

  async function toggleTest(v: boolean) {
    const { error } = await supabase.from("admin_settings").upsert({ key: "payment_test_mode", value: { enabled: v } } as never, { onConflict: "key" });
    if (error) return toast.error(error.message);
    setTestMode(v); toast.success(v ? t("offer.testModeOn") : t("offer.testModeOff"));
  }

  function exportCsv() {
    const cols: (keyof Row)[] = ["reference", "stage", "created_at", "property_title", "region", "district", "property_type", "availability", "transaction_type", "agreed_price", "value", "estimated_spaces_fee", "agent_commission", "owner_name", "agent_name", "buyer_name", "payment_status"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `spaces-deals-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const tiles: [string, string][] = s ? [
    ["Active deals", String(s.active)], ["Offers today", String(s.offers_today)], ["Negotiations", String(s.negotiation)],
    ["Agreements", String(s.agreement)], ["Verification", String(s.verification)], ["Payments", String(s.payment)],
    ["Completed", String(s.completed)], ["Cancelled", String(s.cancelled)],
    ["Transaction value", fmtTZS(s.transaction_value)], ["Agent commissions", fmtTZS(s.agent_commissions)],
    ["Estimated revenue", fmtTZS(s.estimated_revenue)], ["Pending revenue", fmtTZS(s.pending_revenue)],
    ["Collected revenue", fmtTZS(s.collected_revenue)], ["Test payments (not revenue)", fmtTZS(s.test_collected_revenue)],
  ] : [];

  return (
    <section className="mb-6 space-y-4" data-testid="admin-deals-monitor">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Offers & deal revenue</h2>
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-base font-semibold text-foreground">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Collected revenue counts only confirmed real payments. Estimated fees and test payments are never counted as earned.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-foreground"><FlaskConical className="h-4 w-4 text-warning" /> {t("offer.testModeTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("offer.testModeHelp")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Switch checked={testMode} onCheckedChange={(v) => void toggleTest(v)} aria-label={t("offer.testModeTitle")} />
          {testMode ? t("offer.testModeOn") : t("offer.testModeOff")}
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          <label className="text-xs text-muted-foreground">From<Input type="date" value={f.from} onChange={set("from")} /></label>
          <label className="text-xs text-muted-foreground">To<Input type="date" value={f.to} onChange={set("to")} /></label>
          <label className="text-xs text-muted-foreground">Deal status<select className={sel} value={f.stage} onChange={set("stage")}><option value="">All</option>{(Object.keys(STAGE_LABEL) as DealStage[]).map((k) => <option key={k} value={k}>{STAGE_LABEL[k]}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Location<select className={sel} value={f.region} onChange={set("region")}><option value="">All</option>{opts.regions.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Property type<select className={sel} value={f.ptype} onChange={set("ptype")}><option value="">All</option>{opts.ptypes.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Dalali<select className={sel} value={f.agent} onChange={set("agent")}><option value="">All</option>{opts.agents.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Owner<select className={sel} value={f.owner} onChange={set("owner")}><option value="">All</option>{opts.owners.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Buyer<select className={sel} value={f.buyer} onChange={set("buyer")}><option value="">All</option>{opts.buyers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Transaction<select className={sel} value={f.ttype} onChange={set("ttype")}><option value="">All</option><option value="sale">Sale</option><option value="rent">Rent</option></select></label>
          <label className="text-xs text-muted-foreground">Payment<select className={sel} value={f.pay} onChange={set("pay")}><option value="">All</option><option value="none">No payments yet</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="paid">Paid</option></select></label>
          <label className="text-xs text-muted-foreground">Property status<select className={sel} value={f.avail} onChange={set("avail")}><option value="">All</option>{["available", "offer_received", "negotiation", "reserved", "under_transaction", "sold", "rented"].map((a) => <option key={a} value={a}>{t(`offer.avail_${a}`)}</option>)}</select></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void run()}>Apply filters</Button>
          <Button variant="outline" onClick={() => { setF(EMPTY); void run(EMPTY); }}><X className="h-4 w-4" /> Clear Filters</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</Button>
          <span className="self-center text-sm text-muted-foreground" data-testid="admin-deal-count">{loading ? "…" : `${rows.length} deals`}</span>
        </div>
        <div className="mt-3 grid gap-2 md:hidden">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="font-medium text-foreground">{r.property_title ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{r.reference} · {STAGE_LABEL[r.stage as DealStage] ?? r.stage} · {r.region ?? "—"}</p>
              <p className="mt-1 text-foreground">{fmtTZS(r.agreed_price ?? r.value)} · fee {fmtTZS(r.estimated_spaces_fee)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>
              {["Ref", "Property", "Location", "Status", "Property status", "Value", "SPACES fee", "Commission", "Owner", "Dalali", "Buyer", "Payment"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border text-foreground">
                  <td className="px-2 py-2 font-mono text-xs">{r.reference}</td>
                  <td className="max-w-[200px] truncate px-2 py-2">{r.property_title ?? "—"}</td>
                  <td className="px-2 py-2">{r.region ?? "—"}</td>
                  <td className="px-2 py-2">{STAGE_LABEL[r.stage as DealStage] ?? r.stage}</td>
                  <td className="px-2 py-2">{r.availability ? t(`offer.avail_${r.availability}`) : "—"}</td>
                  <td className="px-2 py-2">{fmtTZS(r.agreed_price ?? r.value)}</td>
                  <td className="px-2 py-2">{fmtTZS(r.estimated_spaces_fee)}</td>
                  <td className="px-2 py-2">{fmtTZS(r.agent_commission)}</td>
                  <td className="px-2 py-2">{r.owner_name ?? "—"}</td>
                  <td className="px-2 py-2">{r.agent_name ?? "—"}</td>
                  <td className="px-2 py-2">{r.buyer_name ?? "—"}</td>
                  <td className="px-2 py-2 capitalize">{r.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
