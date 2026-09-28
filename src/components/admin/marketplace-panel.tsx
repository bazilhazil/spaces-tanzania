import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtTZS } from "@/lib/offers-db";

const RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: null },
] as const;

type Overview = Record<string, number>;

const CARDS: [string, string, boolean?][] = [
  ["users", "Total users"], ["owners", "Owners"], ["dalalis", "Dalalis"], ["agencies", "Agencies"],
  ["properties", "Properties"], ["active_listings", "Active listings"], ["verified_listings", "Verified listings"],
  ["inquiries", "Inquiries"], ["offers", "Offers"], ["active_deals", "Active deals"], ["completed_deals", "Completed deals"],
  ["transaction_value", "Transaction value", true], ["spaces_revenue", "SPACES revenue (collected, real)", true],
  ["dalali_commissions", "Dalali commissions", true], ["referrals", "Referrals"],
];

export function MarketplacePanel() {
  const [days, setDays] = useState<number | null>(30);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    supabase.rpc("admin_marketplace_overview" as never, { _days: days } as never).then(({ data, error }) => {
      if (error) setErr(error.message); else setData(data as unknown as Overview);
    });
  }, [days]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Marketplace overview</h1>
            <p className="text-sm text-muted-foreground">Test payments are never counted as revenue.</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <Button key={r.label} size="sm" variant={days === r.days ? "default" : "outline"} onClick={() => setDays(r.days)}>{r.label}</Button>
            ))}
          </div>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {CARDS.map(([k, label, money]) => (
            <div key={k} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">
                {data ? (money ? fmtTZS(Number(data[k] ?? 0)) : Number(data[k] ?? 0).toLocaleString()) : "…"}
              </p>
            </div>
          ))}
        </div>
      </section>
      <ReferralsList />
    </div>
  );
}

type Ref = { id: string; referrer_id: string; referred_user_id: string; code: string; source: string; status: string; created_at: string };

function ReferralsList() {
  const [rows, setRows] = useState<Ref[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("referrals" as never).select("*").order("created_at", { ascending: false }).limit(200);
      const list = (data ?? []) as Ref[];
      setRows(list);
      const ids = [...new Set(list.flatMap((r) => [r.referrer_id, r.referred_user_id]))];
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id,full_name").in("id", ids);
        setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name ?? "—"])));
      }
    })();
  }, []);
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-foreground">Referral activity</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No referrals yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr><th className="p-2">Referrer</th><th className="p-2">Referred user</th><th className="p-2">Code</th><th className="p-2">Source</th><th className="p-2">Status</th><th className="p-2">Date</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">{names[r.referrer_id] ?? "—"}</td>
                  <td className="p-2">{names[r.referred_user_id] ?? "—"}</td>
                  <td className="p-2 font-mono">{r.code}</td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
