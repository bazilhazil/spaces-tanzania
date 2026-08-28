import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PropertyCard } from "@/components/property-card";
import { SkeletonCard } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Property } from "@/lib/mock-data";
import { fetchLiveProperties } from "@/lib/properties-db";
import { getLocationSeo } from "@/lib/public-listings.functions";
import { locationSlug, SITE_URL } from "@/lib/seo";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/spaces/$location")({
  loader: async ({ params }) => {
    const data = await getLocationSeo({ data: { slug: params.location } });
    // Location pages only exist where there are real, active listings.
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Location unavailable · SPACES" }, { name: "robots", content: "noindex" }] };
    }
    const place = loaderData.parent ? `${loaderData.name}, ${loaderData.parent}` : loaderData.name;
    const title = `Properties for Rent & Sale in ${place} | SPACES`;
    const description = `Browse ${loaderData.count} available space${loaderData.count === 1 ? "" : "s"} in ${place}, Tanzania - ${loaderData.forRent} for rent and ${loaderData.forSale} for sale on SPACES.`;
    const url = `${SITE_URL}/spaces/${params.location}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: LocationNotFound,
  component: LocationPage,
});

function LocationNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container-page flex-1 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">No spaces found in this location.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We don't have listings in this area right now.
        </p>
        <Link to="/properties" className="mt-6 inline-block">
          <Button className="h-11">View nearby spaces</Button>
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function LocationPage() {
  const { location } = Route.useParams();
  const data = Route.useLoaderData();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [all, setAll] = useState<Property[] | null>(null);
  const [listingType, setListingType] = useState<"all" | "rent" | "sale">("all");
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchLiveProperties(200).then((rows) => {
      if (alive) setAll(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => setVisible(PAGE_SIZE), [listingType, category]);

  const inLocation = useMemo(
    () =>
      (all ?? []).filter((p) =>
        [p.ward, p.district, p.city].some((v) => v && locationSlug(v) === location),
      ),
    [all, location],
  );

  const matches = useMemo(
    () =>
      inLocation.filter((p) => {
        if (listingType !== "all" && p.listingType !== listingType) return false;
        if (category && p.category !== category) return false;
        return true;
      }),
    [inLocation, listingType, category],
  );

  // Which filter level the URL slug represents, so "see all" keeps the place.
  const level = useMemo(() => {
    const p = inLocation[0];
    if (!p) return {} as { city?: string; district?: string; area?: string };
    if (p.ward && locationSlug(p.ward) === location) {
      return { city: p.city, district: p.district, area: p.ward };
    }
    if (p.district && locationSlug(p.district) === location) return { city: p.city, district: p.district };
    return { city: p.city };
  }, [inLocation, location]);

  const priceRange =
    data.minPrice > 0
      ? `${data.currency} ${data.minPrice.toLocaleString("en-US")} – ${data.maxPrice.toLocaleString("en-US")}`
      : null;

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-8 md:py-10">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
              <MapPin className="h-3.5 w-3.5" /> {data.parent ?? t("location.eyebrow")}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold md:text-4xl">
              {t("location.heading", { name: data.name })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("location.summary", {
                count: data.count,
                rent: data.forRent,
                sale: data.forSale,
              })}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:max-w-xl">
              <div className="rounded-xl border border-border bg-card p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("location.types")}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {data.types.slice(0, 3).map((x) => `${x.label} (${x.count})`).join(", ")}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("location.priceFrom")}
                </dt>
                <dd className="mt-1 text-sm font-medium">{priceRange ?? "—"}</dd>
              </div>
            </dl>

            {/* Refine: search + quick filters, all backed by real listings */}
            <form
              className="mt-5 flex w-full flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({
                  to: "/properties",
                  search: { ...level, q: q || undefined } as never,
                });
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("location.searchIn", { name: data.name })}
                  aria-label={t("location.refine")}
                  className="h-12 w-full rounded-xl pl-10 text-sm"
                />
              </div>
              <Button type="submit" className="h-12 rounded-xl px-6">
                {t("location.refine")}
              </Button>
            </form>

            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {([
                ["all", t("discovery.any")],
                ["rent", t("location.forRent")],
                ["sale", t("location.forSale")],
              ] as const).map(([v, label]) => (
                <FilterChip
                  key={v}
                  label={label}
                  active={listingType === v}
                  onClick={() => setListingType(v)}
                />
              ))}
              {data.types.map((x) => (
                <FilterChip
                  key={x.label}
                  label={`${x.label} (${x.count})`}
                  active={category === x.label}
                  onClick={() => setCategory(category === x.label ? null : x.label)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="container-page py-8 md:py-10">
          {all === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-border/70 p-8 text-center md:p-12">
              <h2 className="font-display text-xl font-semibold">{t("location.noMatches")}</h2>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button
                  className="h-11"
                  onClick={() => {
                    setListingType("all");
                    setCategory(null);
                  }}
                >
                  {t("discovery.clear")}
                </Button>
                <Link to="/properties">
                  <Button variant="outline" className="h-11 w-full">
                    {t("discovery.viewNearby")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("discovery.results", { count: matches.length })}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {matches.slice(0, visible).map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              {visible < matches.length && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl px-8"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    {t("discovery.loadMore")}
                  </Button>
                </div>
              )}
              <div className="mt-8 text-center">
                <Link to="/properties" search={level as never}>
                  <Button variant="ghost" className="h-11">{t("location.browseAll")}</Button>
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/80 hover:border-primary/50",
      )}
    >
      {label}
    </button>
  );
}
