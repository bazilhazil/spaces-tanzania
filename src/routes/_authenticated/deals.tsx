import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { DealsCenter } from "@/components/deals/deals-center";

export const Route = createFileRoute("/_authenticated/deals")({
  head: () => ({
    meta: [
      { title: "Deals & Transactions — SPACES" },
      { name: "description", content: "Manage every property transaction from inquiry to completion with the SPACES deal engine." },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Deals</h1>
          <p className="mt-1 text-muted-foreground">Every transaction, from inquiry to closing — with documents, offers and timelines in one place.</p>
        </header>
        <DealsCenter />
      </div>
    </DashboardShell>
  );
}
