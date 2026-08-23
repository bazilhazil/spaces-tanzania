import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EmptyState } from "@/components/ds/empty-state";
import { fetchVerifiedAgents, type PublicAgent } from "@/lib/homepage-db";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
  head: () => ({
    meta: [
      { title: "Trusted real estate agents in Tanzania | SPACES" },
      {
        name: "description",
        content:
          "Meet verified real estate agents across Tanzania. Connect directly for viewings, listings, and expert local advice.",
      },
      { property: "og:title", content: "Trusted real estate agents in Tanzania | SPACES" },
      {
        property: "og:description",
        content: "Meet verified real estate agents across Tanzania on SPACES.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/agents" }],
  }),
});

function AgentsPage() {
  const { t } = useI18n();
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchVerifiedAgents(60)
      .then((rows) => {
        if (alive) setAgents(rows);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">{t("agents.eyebrow")}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">{t("agents.title")}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("agents.subtitle")}</p>
          </div>
        </section>
        <section className="container-page py-14">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : agents.length === 0 ? (
            <EmptyState icon={Users} title={t("agents.emptyTitle")} description={t("agents.emptyBody")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {a.avatar ? (
                        <img
                          src={a.avatar}
                          alt={a.name}
                          loading="lazy"
                          width={160}
                          height={160}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 font-display text-xl font-semibold text-primary">
                          {a.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-foreground">{a.name}</p>
                      {a.agency && <p className="truncate text-xs text-muted-foreground">{a.agency}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.listings} {t("common.listings")}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
