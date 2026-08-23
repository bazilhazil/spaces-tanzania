import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Mail, MapPin, Phone, Search, ShieldCheck, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/hooks/use-i18n";
import { SITE_CONTENT } from "@/i18n/site-content";
import { COMPANY, mailHref, telHref } from "@/lib/company";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About SPACES GROUP LTD | Property marketplace in Tanzania" },
      {
        name: "description",
        content:
          "SPACES GROUP LTD runs Tanzania's trusted property marketplace — find a space, list a space, and deal with verified properties and users.",
      },
      { property: "og:title", content: "About SPACES GROUP LTD" },
      {
        property: "og:description",
        content: "Who we are, what we do, and how verification works on SPACES.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/about" }],
  }),
});

const ICONS = [Search, Upload, ShieldCheck];

function AboutPage() {
  const { lang } = useI18n();
  const c = SITE_CONTENT[lang].about;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-12 md:py-16">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <Building2 className="h-4 w-4" /> {COMPANY.legalName}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {c.title}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{c.subtitle}</p>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
            {c.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>

        <section className="container-page pb-12">
          <h2 className="font-display text-2xl font-semibold text-foreground">{c.whatTitle}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {c.what.map((item, i) => {
              const Icon = ICONS[i] ?? Search;
              return (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container-page pb-12">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold text-foreground">{c.missionTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.mission}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold text-foreground">{c.visionTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.vision}</p>
            </div>
          </div>
        </section>

        <section className="container-page pb-12">
          <div className="rounded-2xl border border-border bg-secondary/40 p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">{c.verifiedTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.verified.map((v) => (
                <li key={v} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container-page pb-16">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.contactTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{c.contactBody}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {COMPANY.phone && (
              <a href={telHref(COMPANY.phone)} className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                <Phone className="h-4 w-4" /> {COMPANY.phone}
              </a>
            )}
            {COMPANY.email && (
              <a href={mailHref(COMPANY.email)} className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                <Mail className="h-4 w-4" /> {COMPANY.email}
              </a>
            )}
            {COMPANY.address && (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {COMPANY.address}
              </span>
            )}
          </div>
          <Link
            to="/contact"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {SITE_CONTENT[lang].footer.contact}
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
