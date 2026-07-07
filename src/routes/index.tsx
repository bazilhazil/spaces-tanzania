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
import { agents, locations, properties, stats, testimonials } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const featured = properties.filter((p) => p.featured);
  const latest = [...properties]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 4);
  const verified = properties.filter((p) => p.verified).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Categories />
        <FeaturedSection
          eyebrow="Handpicked"
          title="Featured Properties"
          subtitle="Extraordinary spaces curated by our team."
          items={featured}
        />
        <Locations />
        <FeaturedSection
          eyebrow="Fresh listings"
          title="Latest Properties"
          subtitle="Just added by owners and agents across Tanzania."
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
          <Sparkles className="h-3.5 w-3.5 text-gold" /> Tanzania · Est. 2026
        </span>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
          Find your perfect <span className="text-gold">space</span> in Tanzania.
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/85 md:text-lg">
          Verified homes, apartments, and commercial properties to rent or buy —
          from Masaki penthouses to Zanzibari beach villas.
        </p>
        <div className="mt-8 max-w-4xl">
          <HeroSearch />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/80">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" /> Verified by SPACES
          </span>
          <span className="inline-flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-gold" /> Trusted agents
          </span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-gold" /> 4.9 average rating
          </span>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-b border-border/60 bg-secondary/40">
      <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-semibold text-primary md:text-4xl">{s.value}</p>
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
  items: typeof properties;
  tone?: "default" | "muted";
}) {
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
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Locations() {
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow="Popular locations"
          title="Where Tanzania lives, works, and unwinds"
          subtitle="Explore listings in the country's most sought-after neighbourhoods."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {locations.map((l) => (
            <Link
              key={l.slug}
              to="/properties"
              search={{ city: l.name }}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
            >
              <img
                src={l.image}
                alt={l.name}
                loading="lazy"
                width={1200}
                height={900}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[10px] uppercase tracking-widest text-white/70">{l.region}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{l.name}</h3>
                <p className="mt-1 text-sm text-white/80">{l.listings.toLocaleString()} listings</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Verified({ verified }: { verified: typeof properties }) {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.1fr_1.6fr] md:py-20">
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gold">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified by SPACES
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold md:text-4xl">
            Every verified listing is inspected. That's the SPACES promise.
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            We physically visit or vet every verified property. Real photos.
            Real prices. Real owners.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-primary-foreground/90">
            {[
              "Owner and title document check",
              "On-site photos & video walkthrough",
              "Direct contact — no middlemen fees",
              "48-hour response guarantee",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link to="/properties" className="mt-8 inline-block">
            <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
              Browse verified listings
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
  return (
    <section className="bg-secondary/40">
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow="Trusted people"
          title="Featured Agents"
          subtitle="Local experts who know every corner of Tanzania."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-border/70 bg-card p-6 text-center transition hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="relative mx-auto h-20 w-20">
                <img
                  src={a.avatar}
                  alt={a.name}
                  loading="lazy"
                  width={240}
                  height={240}
                  className="h-20 w-20 rounded-full object-cover"
                />
                {a.verified && (
                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                    <BadgeCheck className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {a.name}
              </h3>
              <p className="text-xs text-muted-foreground">{a.agency}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.city}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-gold">
                <Star className="h-3.5 w-3.5 fill-current" /> {a.rating.toFixed(1)}
                <span className="text-muted-foreground">· {a.listings} listings</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow="Customer stories"
          title="Loved by owners and renters alike"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.id}
              className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <Quote className="h-6 w-6 text-gold" />
              <blockquote className="mt-3 font-display text-lg leading-snug text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.city}
                  </p>
                </div>
                <div className="flex text-gold">
                  {Array.from({ length: t.rating }).map((_, i) => (
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
  return (
    <section className="container-page py-16 md:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-glow p-10 text-primary-foreground md:p-14">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              <Upload className="h-3.5 w-3.5" /> For owners & agents
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              Have a space? List it in minutes.
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/85">
              Reach thousands of qualified buyers and renters across Tanzania.
              Free basic listings, premium placement available.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Link to="/auth">
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <HomeIcon className="mr-2 h-4 w-4" /> Upload your property
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Building2 className="mr-2 h-4 w-4" /> Become an agent
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const categoryItems = [
  { label: "Houses", icon: HomeIcon, category: "House", count: "3,200+ listings", tint: "from-primary/10 to-primary/0" },
  { label: "Apartments", icon: Building2, category: "Apartment", count: "2,140+ listings", tint: "from-gold/15 to-gold/0" },
  { label: "Offices", icon: Landmark, category: "Office", count: "540+ listings", tint: "from-primary/10 to-primary/0" },
  { label: "Commercial", icon: Store, category: "Shop", count: "310+ listings", tint: "from-gold/15 to-gold/0" },
  { label: "Land", icon: Trees, category: "Land", count: "980+ listings", tint: "from-primary/10 to-primary/0" },
  { label: "Warehouses", icon: Warehouse, category: "Warehouse", count: "120+ listings", tint: "from-gold/15 to-gold/0" },
];

function Categories() {
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow="Browse by category"
          title="Featured Categories"
          subtitle="Every kind of space you might need — all in one trusted marketplace."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryItems.map((c) => (
            <Link
              key={c.label}
              to="/properties"
              search={{ category: c.category }}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.tint} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{c.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.count}</p>
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
  {
    icon: ShieldCheck,
    title: "Verified Listings",
    body: "Every verified property is physically inspected and title-checked by our team.",
  },
  {
    icon: Users,
    title: "Trusted Agents",
    body: "Licensed local agents with proven track records and transparent reviews.",
  },
  {
    icon: SearchIcon,
    title: "Fast Search",
    body: "Filter by city, price, and amenities in seconds. Save searches for later.",
  },
  {
    icon: Headphones,
    title: "Professional Support",
    body: "Real humans on WhatsApp, phone, and email — 7 days a week.",
  },
];

function WhyChooseUs() {
  return (
    <section>
      <div className="container-page py-16 md:py-20">
        <SectionHeader
          eyebrow="Why SPACES"
          title="Built on trust, designed for you"
          subtitle="Tanzania's most reliable place to find, list, and manage property."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyItems.map((w) => (
            <div
              key={w.title}
              className="group rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
