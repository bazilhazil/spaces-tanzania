import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PropertyCard } from "@/components/property-card";
import { HeroSearch } from "@/components/hero-search";
import { properties } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/hooks/use-i18n";

const searchSchema = z.object({
  type: fallback(z.enum(["rent", "sale", "commercial"]).optional(), undefined),
  city: fallback(z.string().optional(), undefined),
  category: fallback(z.string().optional(), undefined),
  minPrice: fallback(z.number().optional(), undefined),
  maxPrice: fallback(z.number().optional(), undefined),
  q: fallback(z.string().optional(), undefined),
  sort: fallback(z.enum(["newest", "popular", "price-asc", "price-desc"]).optional(), undefined),
});

export const Route = createFileRoute("/properties")({
  validateSearch: zodValidator(searchSchema),
  component: PropertiesPage,
  head: () => ({
    meta: [
      { title: "Properties for rent and sale in Tanzania | SPACES" },
      {
        name: "description",
        content:
          "Browse verified homes, apartments, offices, and land for rent or sale across Tanzania on SPACES.",
      },
      { property: "og:title", content: "Properties in Tanzania | SPACES" },
      {
        property: "og:description",
        content: "Discover verified listings across Dar es Salaam, Zanzibar, Arusha and more.",
      },
    ],
  }),
});

function PropertiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();

  const filtered = properties.filter((p) => {
    if (search.type && p.listingType !== search.type) return false;
    if (search.city && p.city !== search.city) return false;
    if (search.category && p.category !== search.category) return false;
    if (search.minPrice && p.price < search.minPrice) return false;
    if (search.maxPrice && p.price > search.maxPrice) return false;
    if (search.q) {
      const q = search.q.toLowerCase();
      const hay = `${p.title} ${p.ward} ${p.district} ${p.city} ${p.street}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (search.sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "popular":
        return b.views - a.views;
      case "newest":
      default:
        return a.createdAt < b.createdAt ? 1 : -1;
    }
  });

  const noun = sorted.length === 1 ? t("common.listing") : t("common.listings");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-8">
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">{t("properties.breadcrumbHome")}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{t("properties.breadcrumbProperties")}</span>
            </nav>
            <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
              {search.city ? t("properties.titleIn", { city: search.city }) : t("properties.titleAll")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("properties.matchCount", { count: sorted.length, noun })}
            </p>
            <div className="mt-6">
              <HeroSearch />
            </div>
          </div>
        </section>

        <section className="container-page py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              {t("properties.showing", { count: sorted.length })}
            </div>
            <Select
              value={search.sort ?? "newest"}
              onValueChange={(v) =>
                navigate({
                  to: "/properties",
                  search: (prev: Record<string, unknown>) => ({ ...prev, sort: v as never }),
                })
              }
            >
              <SelectTrigger className="h-10 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("properties.sort.newest")}</SelectItem>
                <SelectItem value="popular">{t("properties.sort.popular")}</SelectItem>
                <SelectItem value="price-asc">{t("properties.sort.priceAsc")}</SelectItem>
                <SelectItem value="price-desc">{t("properties.sort.priceDesc")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {t("properties.emptyTitle")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("properties.emptyBody")}
              </p>
              <Link
                to="/properties"
                className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {t("properties.reset")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sorted.map((p) => (
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
