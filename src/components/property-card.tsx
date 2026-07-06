import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bath, BedDouble, Car, Heart, MapPin, Ruler, Sparkles } from "lucide-react";
import { formatPrice, type Property } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  className?: string;
}

export function PropertyCard({ property, className }: PropertyCardProps) {
  return (
    <Link
      to="/properties/$slug"
      params={{ slug: property.slug }}
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
          <div className="flex flex-wrap gap-1.5">
            {property.premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground shadow-[var(--shadow-gold)]">
                <Sparkles className="h-3 w-3" /> Premium
              </span>
            )}
            {property.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                <BadgeCheck className="h-3 w-3" /> Verified
              </span>
            )}
            {property.new && !property.premium && (
              <span className="rounded-full bg-success px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success-foreground">
                New
              </span>
            )}
          </div>
          <button
            aria-label="Save to favorites"
            onClick={(e) => {
              e.preventDefault();
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground/70 backdrop-blur transition hover:text-destructive"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3">
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/90">
            For {property.listingType === "sale" ? "Sale" : property.listingType === "rent" ? "Rent" : "Lease"}
          </span>
          <span className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium text-foreground">
            {property.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="font-display text-lg font-semibold text-primary">
            {formatPrice(property.price, property.currency, property.listingType)}
          </p>
          <h3 className="mt-0.5 line-clamp-1 font-display text-base font-medium text-foreground">
            {property.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {property.ward}, {property.city}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {property.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {property.bedrooms}</span>
          )}
          <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {property.bathrooms}</span>
          {property.parking > 0 && (
            <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {property.parking}</span>
          )}
          <span className="ml-auto inline-flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {property.size} m²</span>
        </div>
      </div>
    </Link>
  );
}
