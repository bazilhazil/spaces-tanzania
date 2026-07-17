import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PropertiesManager } from "@/components/property-management/manager";

export const Route = createFileRoute("/_authenticated/dashboard/properties")({
  component: PropertiesPage,
  head: () => ({
    meta: [
      { title: "My Properties — SPACES" },
      { name: "description", content: "Manage your property listings on SPACES." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PropertiesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            My Properties
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your listings and monitor performance.
          </p>
        </header>
        <PropertiesManager />
      </div>
    </DashboardShell>
  );
}
