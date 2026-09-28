import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { LeadsCenter } from "@/components/crm/leads-center";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/leads")({
  validateSearch: (search: Record<string, unknown>): { lead?: string } =>
    typeof search.lead === "string" ? { lead: search.lead } : {},
  head: () => ({
    meta: [
      { title: "Inquiries — SPACES" },
      { name: "description", content: "See who is interested in your properties and what to do next — all in one simple list." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { t } = useI18n();
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t("inquiriesPage.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("inquiriesPage.subtitle")}</p>
        </header>
        <LeadsCenter />
      </div>
    </DashboardShell>
  );
}
