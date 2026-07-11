import { cn } from "@/lib/utils";
import markAsset from "@/assets/spaces-logo-mark.png.asset.json";

/**
 * SPACES unified brand system.
 *
 * Single source of truth for the SPACES mark + wordmark across the entire app
 * (marketing site, auth, dashboards, admin, mobile menus). Any future brand
 * tweak should happen here — every surface picks it up automatically.
 *
 * Rules:
 *  • One mark asset, one wordmark, one set of size presets.
 *  • No drop shadows, no ad-hoc spacing — sizes control mark + text + gap together.
 *  • `tone="inherit"` lets the wordmark ride the parent color (e.g. white on
 *    the primary hero panels). Default tone is brand blue.
 */

type BrandSize = "sm" | "md" | "lg" | "xl";
type BrandTone = "brand" | "inherit";
type BrandVariant = "full" | "mark";

interface BrandProps {
  size?: BrandSize;
  tone?: BrandTone;
  variant?: BrandVariant;
  className?: string;
  label?: string;
}

// Bumped one notch across the board vs. the earlier system so the mark reads
// clearly at every breakpoint without breaking navbar rhythm.
const SIZE: Record<BrandSize, { mark: string; text: string; gap: string }> = {
  sm: { mark: "h-8 w-8",   text: "text-lg",  gap: "gap-2"   },
  md: { mark: "h-10 w-10", text: "text-xl",  gap: "gap-2.5" },
  lg: { mark: "h-12 w-12", text: "text-2xl", gap: "gap-3"   },
  xl: { mark: "h-20 w-20", text: "text-4xl", gap: "gap-3.5" },
};

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("block shrink-0 select-none object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}

export function Brand({
  size = "md",
  tone = "brand",
  variant = "full",
  className,
  label = "SPACES",
}: BrandProps) {
  const s = SIZE[size];
  const toneCls = tone === "brand" ? "text-primary" : "text-current";

  if (variant === "mark") {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        aria-label={label}
        role="img"
      >
        <BrandMark className={s.mark} />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center leading-none", s.gap, toneCls, className)}
      aria-label={label}
      role="img"
    >
      <BrandMark className={s.mark} />
      <span className={cn("font-display font-semibold tracking-tight", s.text)}>
        SPACES
      </span>
    </span>
  );
}

export { BrandMark };

