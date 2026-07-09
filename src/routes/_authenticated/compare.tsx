import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { CompareView } from "@/components/favorites/compare-view";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({
    meta: [
      { title: "Compare Properties — SPACES" },
      { name: "description", content: "Compare up to four properties side by side on SPACES." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Compare properties</h1>
          <p className="mt-1 text-muted-foreground">Weigh price, location, amenities and verification — all in one view.</p>
        </header>
        <CompareView />
      </div>
    </DashboardShell>
  );
}
