import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { BillingCenter } from "@/components/billing/billing-center";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plans — SPACES" },
      { name: "description", content: "Manage your SPACES subscription, feature boosts, invoices and payment methods." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Billing & Plans
          </h1>
          <p className="mt-1 text-muted-foreground">
            Choose the right plan, boost individual listings, and manage invoices — all in one place.
          </p>
        </header>
        <BillingCenter />
      </div>
    </DashboardShell>
  );
}
