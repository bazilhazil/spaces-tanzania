import { BadgeCheck, Building2, Home, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerifiedKind = "owner" | "agent" | "space" | "business" | "identity";

const MAP: Record<VerifiedKind, { i18n: string; fallback: string; icon: React.ComponentType<{ className?: string }>; ring: string }> = {
  owner:    { i18n: "verify.badge.owner",    fallback: "Verified Owner",    icon: BadgeCheck,
    ring: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-[color:var(--color-brand-200)]" },
  agent:    { i18n: "verify.badge.agent",    fallback: "Verified Agent",    icon: UserCheck,
    ring: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-[color:var(--color-brand-200)]" },
  space:    { i18n: "verify.badge.space",    fallback: "Verified Space",    icon: Home,
    ring: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]" },
  business: { i18n: "verify.badge.business", fallback: "Verified Business", icon: Building2,
    ring: "bg-[color:var(--color-gold-50)] text-[color:var(--color-gold-800)] ring-[color:var(--color-gold-300)]" },
  identity: { i18n: "verify.badge.identity", fallback: "Verified User",     icon: BadgeCheck,
    ring: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-[color:var(--color-brand-200)]" },
};

/**
 * Only render this when the matching verification record has been APPROVED —
 * the component never infers verification from anything else.
 */
export function VerifiedBadge({
  kind, label, size = "md", withLabel = true, className,
}: {
  kind: VerifiedKind;
  label?: string;
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
  className?: string;
}) {
  const cfg = MAP[kind];
  const Icon = cfg.icon;
  const iconCls = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  const padCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : size === "lg" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset",
      cfg.ring, padCls, className,
    )}>
      <Icon className={iconCls} />
      {withLabel && (label ?? cfg.fallback)}
    </span>
  );
}

export const VERIFIED_BADGE_I18N = MAP;
