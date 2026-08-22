import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PropertiesManager } from "@/components/property-management/manager";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/properties")({
  component: PropertiesPage,
  head: () => ({
    meta: [
      { title: "My Spaces — SPACES" },
      { name: "description", content: "Manage your property listings, leads and viewing requests on SPACES." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PropertiesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  // Layout parent for /dashboard/properties/:id/manage — render child when nested.
  if (pathname !== "/dashboard/properties" && pathname !== "/dashboard/properties/") {
    return <Outlet />;
  }
  return (
    <DashboardShell>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-hidden animate-fade-in">
        <header>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {t("nav.dashboard")}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("spaces.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("spaces.subtitle")}</p>
        </header>
        <PropertiesManager />
      </div>
    </DashboardShell>
  );
}

