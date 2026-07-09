import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { LeadsCenter } from "@/components/crm/leads-center";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads & CRM — SPACES" },
      { name: "description", content: "Manage every inquiry professionally with the SPACES lead management system." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Leads</h1>
          <p className="mt-1 text-muted-foreground">Every inquiry, from first message to closed deal — in one place.</p>
        </header>
        <LeadsCenter />
      </div>
    </DashboardShell>
  );
}
