import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { fetchLiveProperties } from "@/lib/properties-db";
import { listSavedSearches } from "@/lib/saved-searches-db";
import { recommend } from "@/lib/recommend";
import type { Property } from "@/lib/mock-data";
import { PropertyCard } from "@/components/property-card";

/** Small, transparent rule-based "Recommended for You" strip. */
export function RecommendedForYou({ limit = 6 }: { limit?: number }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const fav = useFavorites() as unknown as {
    favorites?: { propertyId: string }[];
    recentlyViewed?: { propertyId: string }[];
  };
  const [items, setItems] = useState<{ p: Property; reason: string }[] | null>(null);

  const favKey = (fav.favorites ?? []).map((f) => f.propertyId).join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, searches] = await Promise.all([
        fetchLiveProperties(80),
        user ? listSavedSearches() : Promise.resolve([]),
      ]);
      const out = recommend(all, {
        searches: searches.map((s) => s.filters),
        savedIds: (fav.favorites ?? []).map((f) => f.propertyId),
        viewedIds: (fav.recentlyViewed ?? []).map((f) => f.propertyId),
      }, limit);
      if (alive) setItems(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, favKey, limit]);

  if (!items || items.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="rec-title">
      <div>
        <h2 id="rec-title" className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-gold" /> {t("s3.recommended")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("s3.recommendedSub")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ p, reason }) => (
          <div key={p.id} className="space-y-1">
            <PropertyCard property={p} />
            <p className="px-1 text-xs text-muted-foreground">{t(`s3.why.${reason}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
