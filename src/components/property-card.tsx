import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, Car, Eye, GitCompare, Heart, MapPin, Ruler } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Property } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { useFavorites } from "@/hooks/use-favorites";
import { ListingBadgeStrip } from "@/components/trust/listing-badge";
import { QualityScorePill } from "@/components/trust/quality-score";
import type { ListingBadgeKind } from "@/lib/trust-engine";

interface PropertyCardProps {
  property: Property;
  className?: string;
  qualityScore?: number;
}



export function PropertyCard({ property, className, qualityScore }: PropertyCardProps) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite, isComparing, toggleCompare, trackView } = useFavorites();
  const favorited = isFavorite(property.id);
  const comparing = isComparing(property.id);
  const listingLabel =
    property.listingType === "sale"
      ? t("card.forSale")
      : property.listingType === "rent"
      ? t("card.forRent")
      : t("card.forLease");
  const categoryLabel = t(`search.types.${property.category}`);

  const badges: ListingBadgeKind[] = [];
  if (property.verified) badges.push("verified_property");
  if (property.premium) badges.push("premium");
  if (property.featured && !property.premium) badges.push("featured");
  if (property.new && !property.premium && !property.featured) badges.push("new");

  return (
    <Link
      to="/properties/$slug"
      params={{ slug: property.slug }}
      onClick={() => trackView(property.id)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
    >

      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          width={1200}
          height={900}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {badges.length > 0 ? (
            <ListingBadgeStrip kinds={badges} size="xs" max={3} />
          ) : <span />}
          <button
            aria-label={t("card.save")}
            onClick={(e) => {
              e.preventDefault();
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground/70 backdrop-blur transition hover:text-destructive"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3">
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/90">
            {listingLabel}
          </span>
          <span className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium text-foreground">
            {categoryLabel}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] backdrop-blur">
              <Eye className="h-3.5 w-3.5" /> {t("card.quickView")}
            </span>
            <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)]">
              {t("card.viewDetails")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="font-display text-lg font-semibold text-primary">
            {formatPrice(property.price, property.currency, property.listingType)}
          </p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <h3 className="line-clamp-1 font-display text-base font-medium text-foreground">
              {property.title}
            </h3>
            {typeof qualityScore === "number" && <QualityScorePill score={qualityScore} />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {property.ward}, {property.city}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {property.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1" title={t("card.bedrooms")}><BedDouble className="h-3.5 w-3.5" /> {property.bedrooms}</span>
          )}
          <span className="inline-flex items-center gap-1" title={t("card.bathrooms")}><Bath className="h-3.5 w-3.5" /> {property.bathrooms}</span>
          {property.parking > 0 && (
            <span className="inline-flex items-center gap-1" title={t("card.parking")}><Car className="h-3.5 w-3.5" /> {property.parking}</span>
          )}
          <span className="ml-auto inline-flex items-center gap-1" title={t("card.size")}><Ruler className="h-3.5 w-3.5" /> {property.size} m²</span>
        </div>
      </div>
    </Link>
  );
}
