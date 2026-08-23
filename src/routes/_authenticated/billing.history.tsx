import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { methodName } from "@/lib/payments-store";
import { useMyPayments, type InvoiceLike } from "@/lib/billing-db";
import { formatTZS } from "@/lib/billing-mock";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ds/empty-state";

export const Route = createFileRoute("/_authenticated/billing/history")({
  head: () => ({
    meta: [
      { title: "Payment history — SPACES" },
      { name: "description", content: "View your SPACES invoices, payment methods and download receipts." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { invoices, loading } = useMyPayments();
  const [q, setQ] = useState("");

  const filtered = invoices.filter((i) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return i.id.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
  });

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div>
          <Link to="/billing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Billing & Plans
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Payment history
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every invoice, receipt and payment across your SPACES account.
          </p>
        </div>

        <div className="ds-card p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice number or description" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="ds-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Your paid subscriptions, boosts and verifications will appear here."
          />
        ) : (
          <div className="ds-card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.6fr] gap-3 border-b border-border/60 bg-secondary/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Invoice</div><div>Method</div><div>Date</div><div>Amount</div><div>Status</div><div />
              </div>
              <div className="divide-y divide-border/60">
                {filtered.map((inv: InvoiceLike) => (
                  <div key={inv.id} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.6fr] items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{inv.description}</div>
                      <div className="text-xs text-muted-foreground">{inv.id}</div>
                    </div>
                    <div className="text-sm">{methodName(inv.method)}</div>
                    <div className="text-sm text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</div>
                    <div className="text-sm font-semibold">{formatTZS(inv.amountTZS)}</div>
                    <div>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile stack */}
            <div className="divide-y divide-border/60 md:hidden">
              {filtered.map((inv: InvoiceLike) => (
                <div key={inv.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{inv.description}</div>
                      <div className="text-xs text-muted-foreground">{inv.id} · {new Date(inv.date).toLocaleDateString()}</div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{methodName(inv.method)}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatTZS(inv.amountTZS)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(
      "capitalize",
      status === "paid" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
      status === "refunded" && "border-amber-500/30 text-amber-700 dark:text-amber-300",
      status === "failed" && "border-red-500/30 text-red-700 dark:text-red-300",
      status === "pending" && "border-blue-500/30 text-blue-700 dark:text-blue-300",
    )}>
      {status}
    </Badge>
  );
}
