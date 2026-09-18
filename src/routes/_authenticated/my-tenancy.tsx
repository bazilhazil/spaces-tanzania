import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { TenantPortal } from "@/components/management/tenant-portal";

export const Route = createFileRoute("/_authenticated/my-tenancy")({
  head: () => ({
    meta: [
      { title: "My Tenancy — SPACES" },
      { name: "description", content: "See your home, rent, lease and maintenance requests in one simple place on SPACES." },
      { property: "og:title", content: "My Tenancy — SPACES" },
      { property: "og:description", content: "See your home, rent, lease and maintenance requests in one simple place on SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TenancyPage,
});

function TenancyPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">My Tenancy</h1>
          <p className="mt-1 text-muted-foreground">Your home, rent, lease and maintenance requests.</p>
        </header>
        <TenantPortal />
      </div>
    </DashboardShell>
  );
}
