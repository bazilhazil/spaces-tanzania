import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dx } from "@/lib/deal-sw";
import { useI18n } from "@/hooks/use-i18n";
import { fmtTZS } from "@/lib/offers-db";
import { fetchMyCommissions, csvDownload, type MyCommission } from "@/lib/finance-db";

const GROUP: Record<string, string> = {
  estimated: "Pending", protected: "Protected", pending_completion: "Pending", payable: "Payable", paid: "Paid", cancelled: "Cancelled",
};

/** Dalali commission statement — uses the locked amount stored on each deal. */
export function MyCommission({ userId }: { userId: string }) {
  useI18n();
  const [rows, setRows] = useState<MyCommission[] | null>(null);
  const [f, setF] = useState({ status: "", q: "", from: "", to: "" });
  useEffect(() => { void fetchMyCommissions(userId).then(setRows); }, [userId]);
  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    if (f.status && GROUP[r.status] !== f.status) return false;
    if (f.from && r.created_at < f.from) return false;
    if (f.to && r.created_at.slice(0, 10) > f.to) return false;
    if (f.q && !`${r.property_title ?? ""} ${r.reference ?? ""}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  }), [rows, f]);
  if (!rows || rows.length === 0) return null;
  const sum = (g: string) => rows.filter((r) => GROUP[r.status] === g).reduce((s, r) => s + r.amount, 0);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" data-testid="my-commission">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">{dx("My Commission")}</h2></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Protected", "Pending", "Payable", "Paid"].map((g) => (
          <button key={g} onClick={() => setF({ ...f, status: f.status === g ? "" : g })} className={`rounded-xl border p-3 text-left ${f.status === g ? "border-primary bg-primary/10" : "border-border"}`}>
            <p className="text-xs text-muted-foreground">{dx(g)}</p><p className="font-display font-semibold text-foreground">{fmtTZS(sum(g))}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="h-10 w-full sm:w-60" placeholder={dx("Search property or deal…")} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <Input type="date" className="h-10 w-40" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label={dx("From")} />
        <Input type="date" className="h-10 w-40" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label={dx("To")} />
        <Button variant="outline" className="h-10" onClick={() => csvDownload("my-commission.csv", [
          ["property", "deal", "agreed_price", "rate", "amount", "status", "date"],
          ...filtered.map((r) => [r.property_title, r.reference, r.agreed_price, r.rate, r.amount, GROUP[r.status], r.created_at]),
        ])}><Download className="mr-1 h-4 w-4" />{dx("Export CSV")}</Button>
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((r) => (
          <li key={r.id} className="grid grid-cols-2 gap-1 py-2 text-sm sm:grid-cols-6">
            <span className="col-span-2 font-medium text-foreground">{r.property_title ?? "—"}<span className="block font-mono text-xs text-muted-foreground">{r.reference}</span></span>
            <span><span className="block text-xs text-muted-foreground">{dx("Agreed price")}</span>{fmtTZS(r.agreed_price ?? 0, r.currency)}</span>
            <span><span className="block text-xs text-muted-foreground">{dx("Commission rate")}</span>{r.rate ?? "—"}%</span>
            <span><span className="block text-xs text-muted-foreground">{dx("Commission amount")}</span><b className="text-foreground">{fmtTZS(r.amount, r.currency)}</b></span>
            <span className="font-semibold text-primary">{dx(GROUP[r.status] ?? r.status)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
