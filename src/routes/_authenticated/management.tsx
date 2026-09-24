import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManagementCenter } from "@/components/management/management-center";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/management")({
  head: () => ({
    meta: [
      { title: "Property Management — SPACES" },
      { name: "description", content: "Manage units, tenants, leases, rent and maintenance for your Tanzanian properties on SPACES." },
      { property: "og:title", content: "Property Management — SPACES" },
      { property: "og:description", content: "Manage units, tenants, leases, rent and maintenance for your Tanzanian properties on SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagementPage,
});

function ManagementPage() {
  const { t } = useI18n();
  return (
    <DashboardShell>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("mgmt.nav")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("modeUi.mgmtSub")}
          </p>
        </header>
        <ManagementCenter />
      </div>
    </DashboardShell>
  );
}
