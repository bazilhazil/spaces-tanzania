import { BadgeCheck, Building2, Home, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationKind } from "@/lib/trust-engine";

const MAP: Record<VerificationKind, { label: string; icon: React.ComponentType<{ className?: string }>; ring: string }> = {
  identity: { label: "Identity Verified", icon: BadgeCheck,
    ring: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-[color:var(--color-brand-200)]" },
  property: { label: "Property Verified", icon: Home,
    ring: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]" },
  business: { label: "Business Verified", icon: Building2,
    ring: "bg-[color:var(--color-gold-50)] text-[color:var(--color-gold-800)] ring-[color:var(--color-gold-300)]" },
  agent:    { label: "Agent Verified",     icon: UserCheck,
    ring: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-[color:var(--color-brand-200)]" },
};

export function VerificationBadge({
  kind, size = "md", withLabel = true, className,
}: {
  kind: VerificationKind;
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
  className?: string;
}) {
  const cfg = MAP[kind];
  const Icon = cfg.icon;
  const sizeCls = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  const padCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : size === "lg" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset",
      cfg.ring, padCls, className,
    )}>
      <Icon className={sizeCls} />
      {withLabel && cfg.label}
    </span>
  );
}
