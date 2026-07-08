import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Home, Landmark, MapPin, Search, Store, Trees, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { TZ_REGION_NAMES, searchLocations } from "@/lib/tz-locations";

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

const CATEGORIES = ["House", "Apartment", "Office", "Shop", "Warehouse", "Land"] as const;

export function HeroSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("rent");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [q, setQ] = useState("");

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
          navigate({
            to: "/properties",
            search: {
              type: tab,
              city: city || undefined,
              category: category || undefined,
              minPrice: minPrice ? Number(minPrice) : undefined,
              maxPrice: maxPrice ? Number(maxPrice) : undefined,
              q: q || undefined,
            },
          });
        }}
        className="grid gap-3 rounded-r-2xl rounded-bl-2xl bg-background/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur md:grid-cols-12 md:items-center md:p-3"
      >
        <div className="relative md:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setShowHits(true); }}
            onFocus={() => setShowHits(true)}
            onBlur={() => setTimeout(() => setShowHits(false), 150)}
            placeholder={t("search.placeholder")}
            className="h-12 border-transparent bg-secondary/60 pl-10 text-sm focus-visible:border-ring"
          />
          {showHits && q && hits.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-lg)]">
              {hits.map((h, i) => (
                <button
                  key={`${h.label}-${i}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCity(h.region);
                    setQ(h.ward ?? h.district ?? h.region);
                    setShowHits(false);
                  }}
                  className="flex w-full items-start gap-3 border-b border-border/50 px-4 py-2.5 text-left last:border-0 hover:bg-muted"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{h.label}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{h.kind}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-2">
            <SelectValue placeholder={t("search.city")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {TZ_REGION_NAMES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-2">
            <SelectValue placeholder={t("search.type")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`search.types.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minPrice} onValueChange={setMinPrice}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-1">
            <SelectValue placeholder={t("search.min")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="200000">TZS 200K</SelectItem>
            <SelectItem value="1000000">TZS 1M</SelectItem>
            <SelectItem value="5000000">TZS 5M</SelectItem>
            <SelectItem value="50000000">TZS 50M</SelectItem>
            <SelectItem value="200000000">TZS 200M</SelectItem>
          </SelectContent>
        </Select>
        <Select value={maxPrice} onValueChange={setMaxPrice}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-1">
            <SelectValue placeholder={t("search.max")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="500000">TZS 500K</SelectItem>
            <SelectItem value="1500000">TZS 1.5M</SelectItem>
            <SelectItem value="3000000">TZS 3M</SelectItem>
            <SelectItem value="10000000">TZS 10M</SelectItem>
            <SelectItem value="500000000">TZS 500M</SelectItem>
            <SelectItem value="2000000000">TZS 2B</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2 bg-primary px-6 text-primary-foreground hover:bg-primary/90 md:col-span-2"
        >
          <Search className="h-4 w-4" /> {t("search.submit")}
        </Button>
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
