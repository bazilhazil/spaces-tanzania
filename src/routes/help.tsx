import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchInput } from "@/components/ds/search-input";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({
    meta: [
      { title: "Help Center | SPACES support and FAQs" },
      {
        name: "description",
        content:
          "Find answers about searching, listing, accounts, viewing requests, payments, verification and safety on SPACES.",
      },
      { property: "og:title", content: "SPACES Help Center" },
      { property: "og:description", content: "Answers to the most common questions about using SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/help" }],
  }),
});

function HelpPage() {
  const { lang } = useI18n();
  const c = SITE_CONTENT[lang].help;
  const [q, setQ] = useState("");

  const categories = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return c.categories;
    return c.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.q.toLowerCase().includes(term) ||
            i.a.toLowerCase().includes(term) ||
            cat.title.toLowerCase().includes(term),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [c.categories, q]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{c.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{c.subtitle}</p>
            <div className="mt-6 max-w-xl">
              <SearchInput value={q} onChange={setQ} placeholder={c.searchPlaceholder} />
            </div>
          </div>
        </section>

        <section className="container-page py-12">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.noResults}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground">{cat.title}</h2>
                  <Accordion type="single" collapsible className="mt-2">
                    {cat.items.map((item, i) => (
                      <AccordionItem key={item.q} value={`${cat.id}-${i}`}>
                        <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <LifeBuoy className="h-5 w-5 text-primary" /> {c.stillNeedHelp}
            </p>
            <Link to="/contact">
              <Button className="rounded-full">{c.contactCta}</Button>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
