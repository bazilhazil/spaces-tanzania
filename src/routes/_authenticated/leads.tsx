import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { LeadsCenter } from "@/components/crm/leads-center";

export const Route = createFileRoute("/_authenticated/leads")({
  validateSearch: (search: Record<string, unknown>) => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inquiries — SPACES" },
      { name: "description", content: "See who is interested in your properties and what to do next — all in one simple list." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Inquiries</h1>
          <p className="mt-1 text-muted-foreground">Everyone who asked about your properties — messages, calls and viewings in one place.</p>
        </header>
        <LeadsCenter />
      </div>
    </DashboardShell>
  );
}
