import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { X, MapPin, BedDouble, Bath, Ruler, Car, Star, ShieldCheck, GitCompare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { properties, agents, formatPrice } from "@/lib/mock-data";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export function CompareView() {
  const { compare, removeFromCompare, clearCompare } = useFavorites();

  const items = useMemo(() => {
    const map = new Map(properties.map((p) => [p.id, p]));
    return compare.map((id) => map.get(id)).filter((p): p is typeof properties[number] => Boolean(p));
  }, [compare]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <GitCompare className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Nothing to compare yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add up to 4 properties from any listing card.</p>
        </div>
        <Link to="/properties" className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90">
          Browse properties
        </Link>
      </div>
    );
  }

  const rows: { label: string; render: (p: typeof properties[number]) => React.ReactNode }[] = [
    { label: "Price", render: (p) => <span className="font-display text-lg font-semibold text-primary">{formatPrice(p.price, p.currency, p.listingType)}</span> },
    { label: "Location", render: (p) => <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {p.ward}, {p.city}</span> },
    { label: "Category", render: (p) => p.category },
    { label: "Bedrooms", render: (p) => <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-muted-foreground" /> {p.bedrooms || "—"}</span> },
    { label: "Bathrooms", render: (p) => <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-muted-foreground" /> {p.bathrooms || "—"}</span> },
    { label: "Parking", render: (p) => <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5 text-muted-foreground" /> {p.parking || "—"}</span> },
    { label: "Size", render: (p) => <span className="inline-flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-muted-foreground" /> {p.size} m²</span> },
    { label: "Year built", render: (p) => p.yearBuilt },
    { label: "Furnished", render: (p) => (p.furnished ? "Yes" : "No") },
    {
      label: "Amenities",
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.amenities.slice(0, 8).map((a) => (
            <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">{a}</span>
          ))}
        </div>
      ),
    },
    {
      label: "Verification",
      render: (p) => p.verified ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-3 w-3" /> Verified property
        </span>
      ) : <span className="text-xs text-muted-foreground">Unverified</span>,
    },
    {
      label: "Owner / Agent",
      render: (p) => {
        const agent = agents.find((a) => a.id === p.agentId);
        if (!agent) return "—";
        return (
          <div className="flex items-center gap-2">
            <img src={agent.avatar} alt={agent.name} className="h-6 w-6 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {agent.rating.toFixed(1)}
                {agent.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
              </p>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Comparing {items.length} of 4 properties</p>
        <Button variant="outline" size="sm" onClick={() => { clearCompare(); toast.success("Cleared"); }}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear all
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-40 bg-background/95 p-3 text-left align-top text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"> </th>
              {items.map((p) => (
                <th key={p.id} className="min-w-[240px] border-l border-border/60 p-3 text-left align-top">
                  <div className="relative">
                    <button
                      onClick={() => { removeFromCompare(p.id); toast.success("Removed"); }}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/95 text-foreground/70 shadow-[var(--shadow-soft)] hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <Link to="/properties/$slug" params={{ slug: p.slug }} className="block">
                      <img src={p.images[0]} alt={p.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
                      <p className="mt-2 line-clamp-1 font-display text-sm font-semibold text-foreground">{p.title}</p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={cn(i % 2 === 1 && "bg-muted/30")}>
                <td className="sticky left-0 z-10 w-40 bg-inherit p-3 align-top text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </td>
                {items.map((p) => (
                  <td key={p.id} className="border-l border-border/60 p-3 align-top text-sm text-foreground/90">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
