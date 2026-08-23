import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ViewingsCenter } from "@/components/viewings/viewings-center";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/viewings")({
  validateSearch: (search: Record<string, unknown>): { property?: string } =>
    typeof search.property === "string" ? { property: search.property } : {},
  component: ViewingsPage,
  head: () => ({
    meta: [
      { title: "Viewings · SPACES" },
      { name: "description", content: "Schedule property viewings, approve requests and manage your appointment calendar on SPACES." },
    ],
  }),
});

function ViewingsPage() {
  const { primaryRole } = useAuth();
  const { property } = Route.useSearch();
  const role: "buyer" | "owner" | "admin" =
    primaryRole === "admin" || primaryRole === "super_admin" ? "admin"
    : primaryRole === "owner" || primaryRole === "agent" ? "owner"
    : "buyer";
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl">
        <ViewingsCenter role={role} propertyId={property ?? null} />
      </div>
    </DashboardShell>
  );
}
