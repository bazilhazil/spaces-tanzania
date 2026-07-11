import { cn } from "@/lib/utils";

/**
 * SPACES unified brand system.
 *
 * Single source of truth for the SPACES mark + wordmark across the entire app
 * (marketing site, auth, dashboards, admin, mobile menus). Any future brand
 * tweak should happen here — every surface will pick it up automatically.
 *
 * Rules:
 *  • Blue only. No gold accents on the mark. No drop shadows.
 *  • Mark is an inline SVG using currentColor so it perfectly matches wordmark.
 *  • `size` controls mark + wordmark + gap together for perfect vertical alignment.
 *  • `tone="inherit"` lets the mark/wordmark ride the parent color (e.g. white
 *    on the primary hero panels). Default tone is brand blue.
 */

type BrandSize = "sm" | "md" | "lg" | "xl";
type BrandTone = "brand" | "inherit";
type BrandVariant = "full" | "mark";

interface BrandProps {
  size?: BrandSize;
  tone?: BrandTone;
  variant?: BrandVariant;
  className?: string;
  /** Accessible label for icon-only usage. */
  label?: string;
}

const SIZE: Record<BrandSize, { mark: string; text: string; gap: string }> = {
  sm: { mark: "h-6 w-6",   text: "text-base",  gap: "gap-1.5" },
  md: { mark: "h-8 w-8",   text: "text-xl",    gap: "gap-2"   },
  lg: { mark: "h-10 w-10", text: "text-2xl",   gap: "gap-2.5" },
  xl: { mark: "h-16 w-16", text: "text-4xl",   gap: "gap-3"   },
};

function BrandMark({ className }: { className?: string }) {
  // Crescent-style SPACES mark. Solid disc with a circular notch taken from
  // the lower edge. Rendered in currentColor for perfect color parity with
  // whatever text sits beside it.
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block shrink-0", className)}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <mask id="spaces-mark-notch">
        <rect width="64" height="64" fill="white" />
        <circle cx="32" cy="60" r="14" fill="black" />
      </mask>
      <circle cx="32" cy="30" r="22" mask="url(#spaces-mark-notch)" />
    </svg>
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
        className={cn("inline-flex items-center justify-center", toneCls, className)}
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
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          s.text,
        )}
      >
        SPACES
      </span>
    </span>
  );
}

export { BrandMark };
