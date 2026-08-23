import { createFileRoute, Link } from "@tanstack/react-router";
import { Flag, ShieldAlert, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";

export const Route = createFileRoute("/safety")({
  component: PublicSafetyPage,
  head: () => ({
    meta: [
      { title: "Safety tips and reporting | SPACES" },
      {
        name: "description",
        content:
          "Stay safe on SPACES: use verified users, inspect before paying, keep conversations on the platform, and report suspicious listings or users.",
      },
      { property: "og:title", content: "Safety on SPACES" },
      { property: "og:description", content: "Simple steps that protect you when finding or listing a space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/safety" }],
  }),
});

function PublicSafetyPage() {
  const { lang } = useI18n();
  const c = SITE_CONTENT[lang].safety;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <ShieldCheck className="h-4 w-4" /> SPACES
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {c.title}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{c.subtitle}</p>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {c.tips.map((tip) => (
              <div key={tip.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h2 className="mt-4 font-display text-base font-semibold text-foreground">{tip.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-page pb-16">
          <div className="rounded-2xl border border-border bg-secondary/40 p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" /> {c.reportTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.reportBody}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/contact" search={{ subject: c.reportSpace }} className="sm:w-auto">
                <Button className="w-full gap-2 rounded-full sm:w-auto">
                  <Flag className="h-4 w-4" /> {c.reportSpace}
                </Button>
              </Link>
              <Link to="/contact" search={{ subject: c.reportUser }} className="sm:w-auto">
                <Button variant="outline" className="w-full gap-2 rounded-full sm:w-auto">
                  <Flag className="h-4 w-4" /> {c.reportUser}
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{c.signInNote}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
