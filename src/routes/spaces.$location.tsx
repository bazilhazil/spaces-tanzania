import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PropertyCard } from "@/components/property-card";
import { SkeletonCard } from "@/components/ds";
import { Button } from "@/components/ui/button";
import type { Property } from "@/lib/mock-data";
import { fetchLiveProperties } from "@/lib/properties-db";
import { getLocationSeo } from "@/lib/public-listings.functions";
import { locationSlug, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/spaces/$location")({
  loader: async ({ params }) => {
    const data = await getLocationSeo({ data: { slug: params.location } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Location unavailable · SPACES" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Property for rent and sale in ${loaderData.name} | SPACES`;
    const description = `Browse ${loaderData.count} verified space${loaderData.count === 1 ? "" : "s"} in ${loaderData.name}, Tanzania — ${loaderData.forRent} for rent and ${loaderData.forSale} for sale on SPACES.`;
    const url = `${SITE_URL}/spaces/${params.location}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
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
        <h1 className="font-display text-3xl font-semibold">No spaces here yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We don't have listings in this area right now.
        </p>
        <Link to="/properties" className="mt-6 inline-block">
          <Button>View similar spaces</Button>
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function LocationPage() {
  const { location } = Route.useParams();
  const data = Route.useLoaderData();
  const [all, setAll] = useState<Property[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchLiveProperties(60).then((rows) => {
      if (alive) setAll(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(
    () =>
      (all ?? []).filter((p) =>
        [p.ward, p.district, p.city].some((v) => v && locationSlug(v) === location),
      ),
    [all, location],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-10">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
              <MapPin className="h-3.5 w-3.5" /> Tanzania
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Spaces in {data.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {data.count} listing{data.count === 1 ? "" : "s"} available in {data.name} — {data.forRent} for rent
              and {data.forSale} for sale.
            </p>
          </div>
        </section>

        <section className="container-page py-10">
          {all === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-border/70 p-10 text-center">
              <h2 className="font-display text-xl font-semibold">No matching spaces right now</h2>
              <Link to="/properties" className="mt-4 inline-block">
                <Button>View similar spaces</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
