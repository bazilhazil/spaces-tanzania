import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { SavedSearchesPanel } from "@/components/favorites/saved-searches-panel";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard/searches")({
  component: SavedSearchesPage,
  head: () => ({
    meta: [
      { title: "Saved Searches — SPACES" },
      { name: "description", content: "Manage your saved property searches and alerts on SPACES." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SavedSearchesPage() {
  const { t } = useI18n();
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <header>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {t("favoritesPage.back")}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("saved.searchesTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("saved.searchesSubtitle")}</p>
        </header>
        <SavedSearchesPanel />
      </div>
    </DashboardShell>
  );
}
