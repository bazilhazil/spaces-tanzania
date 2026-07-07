import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Home, Landmark, Search, Store, Trees, Warehouse } from "lucide-react";
import { useState } from "react";
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

type Tab = "rent" | "sale" | "commercial";

const tabs: { id: Tab; label: string }[] = [
  { id: "rent", label: "Rent" },
  { id: "sale", label: "Buy" },
  { id: "commercial", label: "Commercial" },
];

const shortcuts = [
  { label: "Houses", icon: Home, category: "House" },
  { label: "Apartments", icon: Building2, category: "Apartment" },
  { label: "Offices", icon: Landmark, category: "Office" },
  { label: "Commercial", icon: Store, category: "Shop" },
  { label: "Land", icon: Trees, category: "Land" },
  { label: "Warehouse", icon: Warehouse, category: "Warehouse" },
];

export function HeroSearch() {
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
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            {t.label}
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="City, area, street…"
            className="h-12 border-transparent bg-secondary/60 pl-10 text-sm focus-visible:border-ring"
          />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-2">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dar es Salaam">Dar es Salaam</SelectItem>
            <SelectItem value="Zanzibar">Zanzibar</SelectItem>
            <SelectItem value="Arusha">Arusha</SelectItem>
            <SelectItem value="Mwanza">Mwanza</SelectItem>
            <SelectItem value="Dodoma">Dodoma</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-2">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="House">House</SelectItem>
            <SelectItem value="Apartment">Apartment</SelectItem>
            <SelectItem value="Office">Office</SelectItem>
            <SelectItem value="Shop">Shop</SelectItem>
            <SelectItem value="Warehouse">Warehouse</SelectItem>
            <SelectItem value="Land">Land</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minPrice} onValueChange={setMinPrice}>
          <SelectTrigger className="h-12 border-transparent bg-secondary/60 md:col-span-1">
            <SelectValue placeholder="Min" />
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
            <SelectValue placeholder="Max" />
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
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Link
            key={s.label}
            to="/properties"
            search={{ category: s.category }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <s.icon className="h-3.5 w-3.5 text-gold" />
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
