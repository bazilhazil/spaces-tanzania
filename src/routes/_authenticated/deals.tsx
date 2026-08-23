import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { DealsCenter } from "@/components/deals/deals-center";

export const Route = createFileRoute("/_authenticated/deals")({
  head: () => ({
    meta: [
      { title: "My Deals — SPACES" },
      { name: "description", content: "Follow every property deal from first message to completion on SPACES." },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">My Deals</h1>
          <p className="mt-1 text-muted-foreground">Follow each buyer from first message to completion — simply.</p>
        </header>
        <DealsCenter />
      </div>
    </DashboardShell>
  );
}
