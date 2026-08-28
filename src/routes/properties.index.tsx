import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { BookmarkPlus, ChevronRight, Map as MapIcon, MapPin, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { AuthGateDialog } from "@/components/auth-gate-dialog";
import { SaveSearchDialog } from "@/components/favorites/save-search-dialog";
import { useAuth } from "@/hooks/use-auth";
import type { SavedSearchFilters } from "@/lib/saved-searches-db";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PropertyCard } from "@/components/property-card";
import { SkeletonCard } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property } from "@/lib/mock-data";
import { fetchLiveProperties } from "@/lib/properties-db";
import { AMENITY_OPTIONS, DISCOVERY_CATEGORIES } from "@/lib/property-options";
import {
  fetchLocationFacets,
  searchFacets,
  type DistrictFacet,
  type RegionFacet,
  type WardFacet,
} from "@/lib/location-facets";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  type: fallback(z.string().optional(), undefined),
  city: fallback(z.string().optional(), undefined),
  district: fallback(z.string().optional(), undefined),
  area: fallback(z.string().optional(), undefined),
  category: fallback(z.string().optional(), undefined),
  minPrice: fallback(z.number().optional(), undefined),
  maxPrice: fallback(z.number().optional(), undefined),
  beds: fallback(z.number().optional(), undefined),
  baths: fallback(z.number().optional(), undefined),
  minSize: fallback(z.number().optional(), undefined),
  maxSize: fallback(z.number().optional(), undefined),
  furnished: fallback(z.boolean().optional(), undefined),
  parking: fallback(z.boolean().optional(), undefined),
  amenities: fallback(z.string().optional(), undefined),
  verified: fallback(z.boolean().optional(), undefined),
  q: fallback(z.string().optional(), undefined),
  sort: fallback(z.string().optional(), undefined),
  view: fallback(z.string().optional(), undefined),
});

type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/properties/")({
  validateSearch: zodValidator(searchSchema),
  component: PropertiesPage,
  head: () => ({
    meta: [
      { title: "Find spaces for rent and sale in Tanzania | SPACES" },
      {
        name: "description",
        content:
          "Search verified homes, apartments, offices, shops, warehouses and land for rent or sale across Tanzania on SPACES.",
      },
      { property: "og:title", content: "Find your next space | SPACES" },
      {
        property: "og:description",
        content: "Search by area, landmark or property type across Dar es Salaam, Zanzibar, Arusha and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://spacestz.com/properties" },
    ],
    links: [{ rel: "canonical", href: "https://spacestz.com/properties" }],
  }),
});

function PropertiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState(search.q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { user } = useAuth();
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [authGate, setAuthGate] = useState(false);

  // Filters currently applied on screen — reused when saving the search.
  const currentFilters: SavedSearchFilters = useMemo(() => ({
    q: search.q,
    type: search.type,
    category: search.category,
    city: search.city,
    district: search.district,
    area: search.area,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    beds: search.beds,
    baths: search.baths,
    furnished: search.furnished,
    verified: search.verified,
    amenities: search.amenities,
  }), [search]);


  useEffect(() => setQueryText(search.q ?? ""), [search.q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLiveProperties(200).then((rows) => {
      if (!alive) return;
      setProperties(rows);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  function patch(next: Partial<SearchState>) {
    void navigate({
      to: "/properties",
      search: (prev: Record<string, unknown>) => {
        const merged: Record<string, unknown> = { ...prev, ...next };
        for (const k of Object.keys(merged)) {
          const v = merged[k];
          if (v === undefined || v === "" || v === false) delete merged[k];
        }
        return merged as never;
      },
    });
  }

  function clearAll() {
    void navigate({ to: "/properties", search: {} as never });
  }

  const selectedAmenities = (search.amenities ?? "").split(",").filter(Boolean);

  const activeCount = [
    search.type, search.city, search.district, search.area, search.category,
    search.minPrice, search.maxPrice, search.beds, search.baths,
    search.minSize, search.maxSize, search.furnished, search.parking,
    search.verified, selectedAmenities.length ? "a" : undefined,
  ].filter((v) => v !== undefined && v !== null && v !== "").length;

  const filtered = useMemo(() => properties.filter((p) => {
    if (search.type && p.listingType !== search.type) return false;
    if (search.city && p.city !== search.city) return false;
    if (search.district && p.district !== search.district) return false;
    if (search.area && p.ward !== search.area) return false;
    if (search.category && p.category !== search.category) return false;
    if (search.minPrice && p.price < search.minPrice) return false;
    if (search.maxPrice && p.price > search.maxPrice) return false;
    if (search.beds && p.bedrooms < search.beds) return false;
    if (search.baths && p.bathrooms < search.baths) return false;
    if (search.minSize && p.size < search.minSize) return false;
    if (search.maxSize && p.size > search.maxSize) return false;
    if (search.furnished && !p.furnished) return false;
    if (search.parking && !(p.parking > 0 || p.amenities.includes("parking"))) return false;
    if (search.verified && !p.verified) return false;
    if (selectedAmenities.length && !selectedAmenities.every((a) => p.amenities.includes(a))) return false;
    if (search.q) {
      const terms = search.q.toLowerCase().split(/\s+/).filter(Boolean);
      const hay = [
        p.title, p.description, p.ward, p.district, p.city, p.street,
        p.landmark ?? "", p.category, p.listingType,
      ].join(" ").toLowerCase();
      // Bedroom hints like "2 bedroom" are matched against the field too.
      const bedHint = /(\d+)\s*(bed|bedroom|chumba|vyumba)/.exec(search.q.toLowerCase());
      if (bedHint && p.bedrooms < Number(bedHint[1])) return false;
      const meaningful = terms.filter((x) => x.length > 2 && !["bed", "bedroom", "in", "for", "the"].includes(x) && !/^\d+$/.test(x));
      if (meaningful.length && !meaningful.some((x) => hay.includes(x))) return false;
    }
    return true;
  }), [properties, search, selectedAmenities.join(",")]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    switch (search.sort) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "views": return b.views - a.views;
      case "newest": return a.createdAt < b.createdAt ? 1 : -1;
      default: {
        const score = (p: Property) =>
          (p.verified ? 4 : 0) + (p.premium ? 3 : 0) + (p.featured ? 2 : 0) + (p.new ? 1 : 0);
        return score(b) - score(a) || b.views - a.views ||
          (a.createdAt < b.createdAt ? 1 : -1);
      }
    }
  }), [filtered, search.sort]);

  const mapped = sorted.filter((p) => p.latitude != null && p.longitude != null);
  const mapView = search.view === "map";
  const regions = TZ_REGIONS;
  const districts = regions.find((r) => r.name === search.city)?.districts ?? [];
  const wards = districts.find((d) => d.name === search.district)?.wards ?? [];

  const filterPanel = (
    <FilterPanel
      search={search}
      selectedAmenities={selectedAmenities}
      patch={patch}
      regions={regions}
      districts={districts}
      wards={wards}
    />
  );

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="container-page py-6 md:py-8">
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">{t("properties.breadcrumbHome")}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{t("properties.breadcrumbProperties")}</span>
            </nav>
            <h1 className="font-display text-2xl font-semibold text-foreground md:text-4xl">
              {search.city ? t("properties.titleIn", { city: search.city }) : t("properties.titleAll")}
            </h1>

            {/* Prominent search bar */}
            <form
              onSubmit={(e) => { e.preventDefault(); patch({ q: queryText || undefined }); }}
              className="mt-4 flex w-full flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder={t("discovery.searchPlaceholder")}
                  aria-label={t("discovery.search")}
                  className="h-12 w-full rounded-xl border-border bg-background pl-10 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-12 flex-1 gap-2 rounded-xl px-6 sm:flex-none">
                  <Search className="h-4 w-4" /> {t("discovery.search")}
                </Button>
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline" className="h-12 gap-2 rounded-xl lg:hidden">
                      <SlidersHorizontal className="h-4 w-4" /> {t("discovery.filters")}
                      {activeCount > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {activeCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
                    <SheetHeader className="text-left">
                      <SheetTitle>{t("discovery.filters")}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">{filterPanel}</div>
                    <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-border bg-background pt-3">
                      <Button variant="outline" className="flex-1" onClick={clearAll}>
                        {t("discovery.clear")}
                      </Button>
                      <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                        {t("discovery.apply")}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </form>

            {/* Quick property-type chips */}
            <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <Chip
                active={!search.category}
                onClick={() => patch({ category: undefined })}
                label={t("discovery.any")}
              />
              {DISCOVERY_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  active={search.category === c}
                  onClick={() => patch({ category: search.category === c ? undefined : c })}
                  label={t(`search.types.${c}`)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="container-page py-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Desktop filters */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
                    <SlidersHorizontal className="h-4 w-4" /> {t("discovery.filters")}
                  </h2>
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <X className="h-3 w-3" /> {t("discovery.clear")}
                    </button>
                  )}
                </div>
                {filterPanel}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {t("discovery.results", { count: sorted.length })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl"
                    onClick={() => (user ? setSaveSearchOpen(true) : setAuthGate(true))}
                  >
                    <BookmarkPlus className="h-4 w-4" /> {t("saved.saveSearch")}
                  </Button>

                  <div className="hidden rounded-xl border border-border p-0.5 sm:flex">
                    <button
                      onClick={() => patch({ view: undefined })}
                      className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium", !mapView ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                      <Rows3 className="h-3.5 w-3.5" /> {t("discovery.list")}
                    </button>
                    <button
                      onClick={() => patch({ view: "map" })}
                      className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium", mapView ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                      <MapIcon className="h-3.5 w-3.5" /> {t("discovery.map")}
                    </button>
                  </div>
                  <Select
                    value={search.sort ?? "recommended"}
                    onValueChange={(v) => patch({ sort: v === "recommended" ? undefined : v })}
                  >
                    <SelectTrigger className="h-10 w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">{t("discovery.sortRecommended")}</SelectItem>
                      <SelectItem value="newest">{t("discovery.sortNewest")}</SelectItem>
                      <SelectItem value="price-asc">{t("discovery.sortPriceAsc")}</SelectItem>
                      <SelectItem value="price-desc">{t("discovery.sortPriceDesc")}</SelectItem>
                      <SelectItem value="views">{t("discovery.sortViews")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : sorted.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center md:p-16">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {t("discovery.noResultsTitle")}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t("discovery.noResultsBody")}</p>
                  <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button onClick={clearAll}>{t("discovery.clear")}</Button>
                    <Button
                      variant="outline"
                      onClick={() => patch({ city: undefined, district: undefined, area: undefined })}
                    >
                      {t("discovery.changeLocation")}
                    </Button>
                  </div>
                </div>
              ) : mapView ? (
                <div className="grid gap-4">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border md:aspect-[16/9]">
                    {mapped.length > 0 ? (
                      <iframe
                        title="Property map"
                        loading="lazy"
                        className="h-full w-full"
                        src={`https://maps.google.com/maps?q=${mapped[0]!.latitude},${mapped[0]!.longitude}&z=12&output=embed`}
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                        {t("discovery.mapEmpty")}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {sorted.map((p) => <PropertyCard key={p.id} property={p} />)}
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sorted.map((p) => <PropertyCard key={p.id} property={p} />)}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <SaveSearchDialog
        open={saveSearchOpen}
        onOpenChange={setSaveSearchOpen}
        filters={currentFilters}
      />
      <AuthGateDialog open={authGate} onOpenChange={setAuthGate} />

    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/80 hover:border-primary/50",
      )}
    >
      {label}
    </button>
  );
}

function FilterPanel({
  search, selectedAmenities, patch, regions, districts, wards,
}: {
  search: SearchState;
  selectedAmenities: string[];
  patch: (n: Partial<SearchState>) => void;
  regions: { name: string; districts: { name: string; wards: string[] }[] }[];
  districts: { name: string; wards: string[] }[];
  wards: string[];
}) {
  const { t } = useI18n();
  const ANY = "__any";

  function toggleAmenity(value: string) {
    const next = selectedAmenities.includes(value)
      ? selectedAmenities.filter((a) => a !== value)
      : [...selectedAmenities, value];
    patch({ amenities: next.length ? next.join(",") : undefined });
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.listingType")}</Label>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            { v: undefined, l: t("discovery.any") },
            { v: "rent", l: t("discovery.forRent") },
            { v: "sale", l: t("discovery.forSale") },
          ].map((o) => (
            <button
              key={o.l}
              type="button"
              onClick={() => patch({ type: o.v })}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-medium transition",
                (search.type ?? undefined) === o.v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.region")}</Label>
        <Select
          value={search.city ?? ANY}
          onValueChange={(v) => patch({ city: v === ANY ? undefined : v, district: undefined, area: undefined })}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder={t("discovery.allRegions")} /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>{t("discovery.allRegions")}</SelectItem>
            {regions.map((r) => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.district")}</Label>
        <Select
          value={search.district ?? ANY}
          disabled={!search.city}
          onValueChange={(v) => patch({ district: v === ANY ? undefined : v, area: undefined })}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder={t("discovery.allDistricts")} /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>{t("discovery.allDistricts")}</SelectItem>
            {districts.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.area")}</Label>
        <Select
          value={search.area ?? ANY}
          disabled={!search.district}
          onValueChange={(v) => patch({ area: v === ANY ? undefined : v })}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder={t("discovery.allAreas")} /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>{t("discovery.allAreas")}</SelectItem>
            {wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.priceRange")}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input
            type="number" inputMode="numeric" className="h-10"
            placeholder={t("discovery.minPrice")}
            defaultValue={search.minPrice ?? ""}
            onBlur={(e) => patch({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Input
            type="number" inputMode="numeric" className="h-10"
            placeholder={t("discovery.maxPrice")}
            defaultValue={search.maxPrice ?? ""}
            onBlur={(e) => patch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.bedrooms")}</Label>
          <Select
            value={search.beds ? String(search.beds) : ANY}
            onValueChange={(v) => patch({ beds: v === ANY ? undefined : Number(v) })}
          >
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("discovery.any")}</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.bathrooms")}</Label>
          <Select
            value={search.baths ? String(search.baths) : ANY}
            onValueChange={(v) => patch({ baths: v === ANY ? undefined : Number(v) })}
          >
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("discovery.any")}</SelectItem>
              {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.size")}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input
            type="number" inputMode="numeric" className="h-10"
            placeholder={t("discovery.minSize")}
            defaultValue={search.minSize ?? ""}
            onBlur={(e) => patch({ minSize: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Input
            type="number" inputMode="numeric" className="h-10"
            placeholder={t("discovery.maxSize")}
            defaultValue={search.maxSize ?? ""}
            onBlur={(e) => patch({ maxSize: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <ToggleRow label={t("discovery.furnished")} checked={!!search.furnished} onChange={(v) => patch({ furnished: v || undefined })} />
        <ToggleRow label={t("discovery.parking")} checked={!!search.parking} onChange={(v) => patch({ parking: v || undefined })} />
        <ToggleRow label={t("discovery.verifiedOnly")} checked={!!search.verified} onChange={(v) => patch({ verified: v || undefined })} />
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("discovery.amenities")}</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              active={selectedAmenities.includes(a.value)}
              onClick={() => toggleAmenity(a.value)}
            />
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" /> {t("discovery.changeLocation")}
      </p>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
