import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Mail, MessageCircle, Phone, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { agents } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
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
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/agents" }],
  }),
});

function AgentsPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">{t("agents.eyebrow")}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">
              {t("agents.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t("agents.subtitle")}
            </p>
          </div>
        </section>
        <section className="container-page py-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={a.avatar}
                      alt={a.name}
                      loading="lazy"
                      width={160}
                      height={160}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    {a.verified && (
                      <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.agency}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                      <Star className="h-3.5 w-3.5 fill-current" /> {a.rating.toFixed(1)} · {a.listings} {t("common.listings")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <a href={`https://wa.me/${a.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={t("properties.detail.whatsapp")}>
                    <Button size="sm" variant="outline" className="w-full">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={`tel:${a.phone.replace(/\s/g, "")}`} aria-label={t("properties.detail.call", { phone: a.phone })}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={`mailto:${a.email}`} aria-label={t("properties.detail.email")}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
