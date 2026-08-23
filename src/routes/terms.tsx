import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service | SPACES GROUP LTD" },
      {
        name: "description",
        content:
          "The rules for using SPACES: accounts, listings, verification, messaging, viewings, payments, reviews, reports and limitation of responsibility.",
      },
      { property: "og:title", content: "SPACES Terms of Service" },
      { property: "og:description", content: "The rules for using the SPACES property marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/terms" }],
  }),
});

function TermsPage() {
  const { lang } = useI18n();
  const c = SITE_CONTENT[lang].terms;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{c.title}</h1>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{c.updated}</p>
            <p className="mt-4 max-w-3xl text-muted-foreground">{c.intro}</p>
          </div>
        </section>
        <section className="container-page py-12">
          <div className="max-w-3xl space-y-8">
            {c.sections.map((s) => (
              <article key={s.heading}>
                <h2 className="font-display text-xl font-semibold text-foreground">{s.heading}</h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
