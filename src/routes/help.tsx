import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchInput } from "@/components/ds/search-input";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { SITE_CONTENT } from "@/i18n/site-content";
import { NewTicketDialog } from "@/components/support/new-ticket-dialog";
import { listPublishedFaqs, type SupportFaq } from "@/lib/support-db";
import { cn } from "@/lib/utils";

type HelpSearch = { topic?: string };

// Display order requested for the Help Center.
const ORDER = [
  "account", "finding", "listing", "viewings", "messages",
  "deals", "verification", "payments", "safety", "technical",
];

export const Route = createFileRoute("/help")({
  component: HelpPage,
  validateSearch: (search: Record<string, unknown>): HelpSearch => ({
    topic: typeof search.topic === "string" ? search.topic.slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Help Center | SPACES support and FAQs" },
      {
        name: "description",
        content:
          "Find answers about accounts, searching, listing, viewing requests, messages, deals, verification, payments and safety on SPACES.",
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
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const c = SITE_CONTENT[lang].help;
  const search = useSearch({ from: "/help" });
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(search.topic ?? null);
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);

  useEffect(() => { void listPublishedFaqs().then(setFaqs); }, []);

  // Admin-managed FAQs are merged into the matching category.
  const merged = useMemo(() => {
    const base = c.categories.map((cat) => ({ ...cat, items: [...cat.items] }));
    const byId = new Map(base.map((cat) => [cat.id, cat]));
    for (const f of faqs) {
      const target = byId.get(f.category);
      const item = {
        q: (lang === "sw" && f.questionSw) || f.question,
        a: (lang === "sw" && f.answerSw) || f.answer,
      };
      if (target) target.items.push(item);
      else {
        const cat = { id: f.category, title: t(`support.cat.${f.category}`), items: [item] };
        base.push(cat);
        byId.set(f.category, cat);
      }
    }
    return base.sort((a, b) => {
      const ia = ORDER.indexOf(a.id); const ib = ORDER.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [c.categories, faqs, lang, t]);

  const categories = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = merged;
    if (topic) list = list.filter((cat) => cat.id === topic);
    if (!term) return list;
    return list
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
  }, [merged, q, topic]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{c.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{c.subtitle}</p>
            <div className="mt-6 max-w-xl">
              <SearchInput value={q} onChange={setQ} placeholder={t("support.help.searchPlaceholder")} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip active={!topic} onClick={() => setTopic(null)}>{t("support.help.all")}</Chip>
              {merged.map((cat) => (
                <Chip key={cat.id} active={topic === cat.id} onClick={() => setTopic(cat.id)}>
                  {cat.title}
                </Chip>
              ))}
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
                      <AccordionItem key={`${item.q}-${i}`} value={`${cat.id}-${i}`}>
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
            <div className="flex flex-wrap gap-2">
              {user ? (
                <>
                  <NewTicketDialog
                    defaultCategory={topic ?? "technical"}
                    trigger={<Button className="h-11 rounded-full">{t("support.contactSupport")}</Button>}
                  />
                  <Link to="/dashboard/support">
                    <Button variant="outline" className="h-11 rounded-full">{t("support.my.title")}</Button>
                  </Link>
                </>
              ) : (
                <Link to="/contact">
                  <Button className="h-11 rounded-full">{c.contactCta}</Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition",
        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
