import { BadgeCheck, Sparkles, Star, ShieldCheck, UserCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LISTING_BADGE_META, type ListingBadgeKind } from "@/lib/trust-engine";

const ICON: Record<ListingBadgeKind, React.ComponentType<{ className?: string }>> = {
  verified_property: ShieldCheck,
  verified_owner:    BadgeCheck,
  verified_agent:    UserCheck,
  premium:           Sparkles,
  featured:          Star,
  new:               Zap,
};

const TONE: Record<"brand" | "success" | "gold" | "info", string> = {
  brand:   "bg-[color:var(--color-brand-600)] text-white shadow-[var(--shadow-soft)]",
  success: "bg-[color:var(--color-success-600)] text-white shadow-[var(--shadow-soft)]",
  gold:    "bg-gold text-gold-foreground shadow-[var(--shadow-gold)]",
  info:    "bg-background/95 text-foreground ring-1 ring-inset ring-border",
};

export function ListingBadge({
  kind, size = "sm", withLabel = true, className,
}: {
  kind: ListingBadgeKind;
  size?: "xs" | "sm" | "md";
  withLabel?: boolean;
  className?: string;
}) {
  const meta = LISTING_BADGE_META[kind];
  const Icon = ICON[kind];
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  const iconCls = size === "xs" ? "h-2.5 w-2.5" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider whitespace-nowrap",
        TONE[meta.tone], pad, className,
      )}
    >
      <Icon className={iconCls} />
      {withLabel && (size === "md" ? meta.label : meta.short)}
    </span>
  );
}

export function ListingBadgeStrip({
  kinds, size = "sm", max, className,
}: {
  kinds: ListingBadgeKind[];
  size?: "xs" | "sm" | "md";
  max?: number;
  className?: string;
}) {
  const shown = max ? kinds.slice(0, max) : kinds;
  const overflow = max && kinds.length > max ? kinds.length - max : 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((k) => <ListingBadge key={k} kind={k} size={size} />)}
      {overflow > 0 && (
        <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-inset ring-border">
          +{overflow}
        </span>
      )}
    </div>
  );
}
