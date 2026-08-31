import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Headphones,
  Home as HomeIcon,
  Landmark,
  Quote,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trees,
  Upload,
  Users,
  Warehouse,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSearch } from "@/components/hero-search";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import heroVilla from "@/assets/hero-villa.jpg";
import { locations, type Property } from "@/lib/mock-data";
import { fetchPlatformStats } from "@/lib/properties-db";
import {
  fetchRegionSummaries,
  fetchVerifiedAgents,
  fetchPublishedTestimonials,
  type RegionSummary,
  type PublicAgent,
  type PublicTestimonial,
} from "@/lib/homepage-db";
import { fetchLiveProperties } from "@/lib/properties-db";
import { useI18n } from "@/hooks/use-i18n";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "SPACES — Verified Property for Rent & Sale in Tanzania" },
      {
        name: "description",
        content:
          "Find verified houses, apartments, offices, shops, warehouses and land for rent or sale across Dar es Salaam, Zanzibar, Arusha and all of Tanzania.",
      },
      { property: "og:title", content: "SPACES — Verified Property for Rent & Sale in Tanzania" },
      {
        property: "og:description",
        content:
          "Browse verified listings, connect directly with owners and agents, and book viewings across Tanzania.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://spacestz.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SPACES",
          url: "https://spacestz.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://spacestz.com/properties?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SPACES",
          url: "https://spacestz.com/",
          areaServed: "TZ",
        }),
      },
    ],
  }),
});


function HomePage() {
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  useEffect(() => {
    let alive = true;
    fetchLiveProperties(24).then((rows) => { if (alive) setProperties(rows); });
    return () => { alive = false; };
  }, []);
  const featured = properties.slice(0, 4);
  const latest = [...properties]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 4);
  const verified = properties.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Categories />
        <FeaturedSection
          eyebrow={t("home.featuredEyebrow")}
          title={t("home.featured")}
          subtitle={t("home.featuredSub")}
          items={featured}
        />
        <Locations />
        <FeaturedSection
          eyebrow={t("home.latestEyebrow")}
          title={t("home.latest")}
          subtitle={t("home.latestSub")}
          items={latest}
          tone="muted"
        />
        <WhyChooseUs />
        <Verified verified={verified} />
        <Agents />
        <Testimonials />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}


function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroVilla}
          alt="Luxury Tanzanian villa overlooking the ocean at dusk"
          width={1920}
          height={1200}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/40 to-background" />
      </div>
      <div className="container-page flex min-h-[640px] flex-col justify-center py-20 md:min-h-[720px] md:py-28">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-gold" /> {t("home.hero.badge")}
        </span>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
          {t("home.hero.titleLead")} <span className="text-gold">{t("home.hero.titleAccent")}</span> {t("home.hero.titleTail")}
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/85 md:text-lg">
          {t("home.hero.subtitle")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/properties" onClick={() => track("find_space_clicked", { source: "hero" })}>
            <Button size="lg" className="h-12 w-full gap-2 bg-gold text-gold-foreground hover:bg-gold/90 sm:w-auto">
              <SearchIcon className="h-4 w-4" /> {t("convert.findSpace")}
            </Button>
          </Link>
          <Link to="/upload" onClick={() => track("list_space_clicked", { source: "hero" })}>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
            >
              <Upload className="h-4 w-4" /> {t("convert.listSpace")}
            </Button>
          </Link>
        </div>
        <div className="mt-6 max-w-4xl">
          <HeroSearch />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/80">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" /> {t("home.hero.verifiedBadge")}
          </span>
          <span className="inline-flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-gold" /> {t("home.hero.trustedBadge")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-gold" /> {t("home.hero.ratingBadge")}
          </span>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<{ liveListings: number; verifiedListings: number; cities: number; partners: number } | null>(null);
  useEffect(() => {
    let alive = true;
    fetchPlatformStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);

  // Real, database-derived platform statistics.
  const items = [
    { label: t("home.stats.liveListings"), value: stats?.liveListings },
    { label: t("home.stats.verifiedListings"), value: stats?.verifiedListings },
    { label: t("home.stats.cities"), value: stats?.cities },
    { label: t("home.stats.partners"), value: stats?.partners },
  ];

  return (
    <section className="border-b border-border/60 bg-secondary/40">
      <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
        {items.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-semibold text-primary md:text-4xl">
              {s.value === undefined ? "—" : s.value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground md:text-sm">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">{eyebrow}</p>
        )}
        <h2 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function FeaturedSection({
  eyebrow,
  title,
  subtitle,
  items,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Property[];
  tone?: "default" | "muted";
}) {
  const { t } = useI18n();
  return (
    <section className={tone === "muted" ? "bg-secondary/40" : ""}>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          action={
            <Link to="/properties">
              <Button variant="ghost" className="gap-1 text-primary hover:bg-primary/5">
                {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        />

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center text-sm text-muted-foreground">
            No listings yet. <Link to="/upload" className="font-medium text-primary hover:underline">Be the first to list</Link>.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Locations() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  useEffect(() => {
    let alive = true;
    fetchRegionSummaries().then((r) => { if (alive) setRegions(r.slice(0, 4)); });
    return () => { alive = false; };
  }, []);

  if (regions.length === 0) return null;

  // Decorative imagery only — names and counts come from the database.
  const imageFor = (name: string) =>
    locations.find((l) => l.name.toLowerCase() === name.toLowerCase())?.image ?? locations[0].image;

  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={t("home.locationsEyebrow")}
          title={t("home.locationsTitle")}
          subtitle={t("home.locationsSub")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((l) => (
            <Link
              key={l.name}
              to="/properties"
              search={{ city: l.name }}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
            >
              <img
                src={imageFor(l.name)}
                alt={l.name}
                loading="lazy"
                width={1200}
                height={900}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="mt-1 font-display text-2xl font-semibold">{l.name}</h3>
                <p className="mt-1 text-sm text-white/80">{l.listings.toLocaleString()} {t("common.listings")}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Verified({ verified }: { verified: Property[] }) {
  const { t } = useI18n();
  const points = [
    t("home.verifiedPoints.title"),
    t("home.verifiedPoints.photos"),
    t("home.verifiedPoints.direct"),
    t("home.verifiedPoints.response"),
  ];
  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.1fr_1.6fr] md:py-20">
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("home.verifiedEyebrow")}
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold md:text-4xl">
            {t("home.verifiedTitle")}
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            {t("home.verifiedBody")}
          </p>
          <ul className="mt-6 space-y-3 text-sm text-primary-foreground/90">
            {points.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link to="/properties" className="mt-8 inline-block">
            <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
              {t("home.verifiedCta")}
            </Button>
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {verified.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Agents() {
  const { t } = useI18n();
  const [list, setList] = useState<PublicAgent[]>([]);
  useEffect(() => {
    let alive = true;
    fetchVerifiedAgents(4).then((a) => { if (alive) setList(a); });
    return () => { alive = false; };
  }, []);

  if (list.length === 0) return null;

  return (
    <section className="bg-secondary/40">
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={t("home.agentsEyebrow")}
          title={t("home.agentsTitle")}
          subtitle={t("home.agentsSub")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-border/70 bg-card p-6 text-center transition hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="relative mx-auto h-20 w-20">
                {a.avatar ? (
                  <img
                    src={a.avatar}
                    alt={a.name}
                    loading="lazy"
                    width={240}
                    height={240}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 font-display text-2xl font-semibold text-primary">
                    {a.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">{a.name}</h3>
              {a.agency && <p className="text-xs text-muted-foreground">{a.agency}</p>}
              {a.location && <p className="mt-1 text-xs text-muted-foreground">{a.location}</p>}
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                {a.listings} {t("common.listings")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useI18n();
  const [list, setList] = useState<PublicTestimonial[]>([]);
  useEffect(() => {
    let alive = true;
    fetchPublishedTestimonials(3).then((r) => { if (alive) setList(r); });
    return () => { alive = false; };
  }, []);

  if (list.length === 0) return null;

  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={t("home.testimonialsEyebrow")}
          title={t("home.testimonialsTitle")}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {list.map((ti) => (
            <figure
              key={ti.id}
              className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <Quote className="h-6 w-6 text-gold" />
              <blockquote className="mt-3 font-display text-lg leading-snug text-foreground">
                “{ti.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-foreground">{ti.name}</p>
                </div>
                <div className="flex text-gold">
                  {Array.from({ length: Math.max(1, Math.min(5, ti.rating)) }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useI18n();
  return (
    <section className="container-page py-16 md:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-glow p-10 text-primary-foreground md:p-14">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <Upload className="h-3.5 w-3.5" /> {t("home.cta.eyebrow")}
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              {t("home.cta.title")}
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/85">
              {t("home.cta.body")}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Link to="/upload" onClick={() => track("list_space_clicked", { source: "home_cta" })}>
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <HomeIcon className="mr-2 h-4 w-4" /> {t("convert.listSpace")}
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Building2 className="mr-2 h-4 w-4" /> {t("home.cta.becomeAgent")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const categoryItems = [
  { key: "houses", icon: HomeIcon, category: "House", count: "3,200+" },
  { key: "apartments", icon: Building2, category: "Apartment", count: "2,140+" },
  { key: "offices", icon: Landmark, category: "Office", count: "540+" },
  { key: "commercial", icon: Store, category: "Shop", count: "310+" },
  { key: "land", icon: Trees, category: "Land", count: "980+" },
  { key: "warehouses", icon: Warehouse, category: "Warehouse", count: "120+" },
] as const;

const tints: Record<string, string> = {
  houses: "from-primary/10 to-primary/0",
  apartments: "from-gold/15 to-gold/0",
  offices: "from-primary/10 to-primary/0",
  commercial: "from-gold/15 to-gold/0",
  land: "from-primary/10 to-primary/0",
  warehouses: "from-gold/15 to-gold/0",
};

function Categories() {
  const { t } = useI18n();
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={t("home.categoriesEyebrow")}
          title={t("home.categories")}
          subtitle={t("home.categoriesSub")}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryItems.map((c) => (
            <Link
              key={c.key}
              to="/properties"
              search={{ category: c.category }}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tints[c.key]} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{t(`categories.${c.key}`)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.count} {t("categories.countSuffix")}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const whyItems = [
  { icon: ShieldCheck, key: "verified" },
  { icon: Users, key: "trusted" },
  { icon: SearchIcon, key: "fast" },
  { icon: Headphones, key: "support" },
] as const;

function WhyChooseUs() {
  const { t } = useI18n();
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow={t("home.whyEyebrow")}
          title={t("home.whyTitle")}
          subtitle={t("home.whySub")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyItems.map((w) => (
            <div
              key={w.key}
              className="group rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{t(`home.whyItems.${w.key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`home.whyItems.${w.key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
