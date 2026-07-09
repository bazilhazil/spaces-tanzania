import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { properties } from "@/lib/mock-data";
import { PropertyCard } from "@/components/property-card";
import { useFavorites } from "@/hooks/use-favorites";

export function RecentlyViewedPanel() {
  const { recentlyViewed, clearRecent } = useFavorites();

  const items = useMemo(() => {
    const map = new Map(properties.map((p) => [p.id, p]));
    return recentlyViewed
      .map((r) => ({ r, property: map.get(r.propertyId) }))
      .filter((x): x is { r: typeof recentlyViewed[number]; property: typeof properties[number] } => Boolean(x.property));
  }, [recentlyViewed]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The last {items.length} homes you opened.</p>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => { clearRecent(); toast.success("History cleared"); }}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear history
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/50 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">No browsing history</p>
            <p className="mt-1 text-sm text-muted-foreground">Properties you view will appear here for quick access.</p>
          </div>
          <Link to="/properties" className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90">
            Browse properties
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ property }) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
