import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronDown, Home, Landmark, Search, SlidersHorizontal, Store, Trees, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSearchInput } from "@/components/location-search-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { fetchLocationFacets, type RegionFacet } from "@/lib/location-facets";
import { AMENITY_OPTIONS, DISCOVERY_CATEGORIES } from "@/lib/property-options";
import { track } from "@/lib/analytics";

type Tab = "rent" | "sale" | "commercial";

const tabIds: Tab[] = ["rent", "sale", "commercial"];

const shortcuts = [
  { icon: Home, category: "House" },
  { icon: Building2, category: "Apartment" },
  { icon: Landmark, category: "Office" },
  { icon: Store, category: "Shop" },
  { icon: Trees, category: "Land" },
  { icon: Warehouse, category: "Warehouse" },
];

export function HeroSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("rent");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string | undefined>();
  const [area, setArea] = useState<string | undefined>();
  const [facets, setFacets] = useState<RegionFacet[]>([]);
  const [beds, setBeds] = useState<string>("");
  const [baths, setBaths] = useState<string>("");
  const [minSize, setMinSize] = useState<string>("");
  const [maxSize, setMaxSize] = useState<string>("");
  const [furnished, setFurnished] = useState(false);
  const [parking, setParking] = useState<boolean | undefined>();
  const [verified, setVerified] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Suggestions come from places that actually have live listings; the static
  // Tanzania list is only a fallback while the facets are still loading.
  useEffect(() => {
    let alive = true;
    void fetchLocationFacets().then((f) => {
      if (alive) setFacets(f);
    });
    return () => { alive = false; };
  }, []);
  const advancedCount = [beds, baths, minSize, maxSize, furnished, parking, verified, amenities.length]
    .filter((value) => value !== "" && value !== undefined && value !== false && value !== 0).length;
  const priceLabel = minPrice || maxPrice
    ? `${minPrice ? `TZS ${Number(minPrice).toLocaleString()}` : t("search.anyPrice")} – ${maxPrice ? `TZS ${Number(maxPrice).toLocaleString()}` : t("search.noMaximum")}`
    : t("search.anyPrice");

  function toggleAmenity(value: string) {
    setAmenities((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  return (
    <div className="w-full">
      <div className="inline-flex rounded-t-2xl bg-background/95 p-1 backdrop-blur">
        {tabIds.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              tab === id
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            {t(`search.tab.${id}`)}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          track("search_performed", { listing_type: tab, city, category, query: q });
          navigate({
            to: "/properties",
            search: {
              type: tab,
              city: city || undefined,
              district: district || undefined,
              area: area || undefined,
              category: category || undefined,
              minPrice: minPrice ? Number(minPrice) : undefined,
              maxPrice: maxPrice ? Number(maxPrice) : undefined,
              beds: beds ? Number(beds) : undefined,
              baths: baths ? Number(baths) : undefined,
              minSize: minSize ? Number(minSize) : undefined,
              maxSize: maxSize ? Number(maxSize) : undefined,
              furnished: furnished || undefined,
              parking,
              verified: verified || undefined,
              amenities: amenities.length ? amenities.join(",") : undefined,
              q: q || undefined,
            },
          });
        }}
        className="relative z-30 grid grid-cols-2 gap-3 rounded-r-2xl rounded-bl-2xl bg-background/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur md:grid-cols-12 md:items-center md:p-3"
      >
        <LocationSearchInput
          className="z-50 col-span-2 md:col-span-4"
          facets={facets}
          selected={{ region: city || undefined, district, ward: area }}
          text={q}
          onTextChange={setQ}
          placeholder={t("search.placeholder")}
          onSelect={(h) => {
            setCity(h.region);
            setDistrict(h.district);
            setArea(h.ward);
            setQ("");
          }}
          onClear={() => {
            setCity("");
            setDistrict(undefined);
            setArea(undefined);
            setQ("");
          }}
          inputClassName="border-transparent bg-secondary/60"
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-3">
            <SelectValue placeholder={t("search.propertyType")} />
          </SelectTrigger>
          <SelectContent>
            {DISCOVERY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`search.types.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" className="h-12 justify-between border-0 bg-secondary/60 px-3 font-normal hover:bg-secondary md:col-span-3">
              <span className="truncate">{priceLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{t("search.price")}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>
                {t("search.anyPrice")}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" inputMode="numeric" min={0} placeholder={t("discovery.minPrice")} />
              <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" inputMode="numeric" min={0} placeholder={t("discovery.maxPrice")} />
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="submit"
          size="lg"
          className="col-span-2 h-12 gap-2 bg-primary px-6 text-primary-foreground hover:bg-primary/90 md:col-span-2"
        >
          <Search className="h-4 w-4" /> {t("search.submit")}
        </Button>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" className="col-span-2 h-10 w-fit gap-2 px-2 text-muted-foreground md:col-span-12">
              <SlidersHorizontal className="h-4 w-4" /> {t("discovery.filters")}
              {advancedCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{advancedCount}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(92vw,25rem)] overflow-y-auto">
            <SheetHeader><SheetTitle>{t("discovery.filters")}</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("discovery.bedrooms")}</Label>
                  <Select value={beds || "any"} onValueChange={(v) => setBeds(v === "any" ? "" : v)}>
                    <SelectTrigger className="mt-2 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">{t("discovery.any")}</SelectItem>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("discovery.bathrooms")}</Label>
                  <Select value={baths || "any"} onValueChange={(v) => setBaths(v === "any" ? "" : v)}>
                    <SelectTrigger className="mt-2 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">{t("discovery.any")}</SelectItem>{[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("discovery.size")}</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input value={minSize} onChange={(e) => setMinSize(e.target.value)} type="number" inputMode="numeric" min={0} placeholder={t("discovery.minSize")} />
                  <Input value={maxSize} onChange={(e) => setMaxSize(e.target.value)} type="number" inputMode="numeric" min={0} placeholder={t("discovery.maxSize")} />
                </div>
              </div>
              <div className="space-y-4 rounded-xl border border-border p-4">
                <FilterSwitch label={t("discovery.furnished")} checked={furnished} onChange={setFurnished} />
                <FilterSwitch label={t("card.parkingAvailable")} checked={parking === true} onChange={(value) => setParking(value ? true : undefined)} />
                <FilterSwitch label={t("discovery.verifiedOnly")} checked={verified} onChange={setVerified} />
              </div>
              <div>
                <Label>{t("discovery.amenities")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <Button key={amenity.value} type="button" size="sm" variant={amenities.includes(amenity.value) ? "default" : "outline"} onClick={() => toggleAmenity(amenity.value)}>
                      {amenity.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="button" className="h-12 w-full" onClick={() => setFiltersOpen(false)}>{t("discovery.apply")}</Button>
            </div>
          </SheetContent>
        </Sheet>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Link
            key={s.category}
            to="/properties"
            search={{ category: s.category }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <s.icon className="h-3.5 w-3.5 text-gold" />
            {t(`search.shortcuts.${s.category}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
