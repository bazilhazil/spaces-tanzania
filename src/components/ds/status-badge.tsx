import { BadgeCheck, Crown, Sparkles, Home, Key, FileText, Clock, Flame, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "verified" | "premium" | "featured" | "sold" | "rented"
  | "draft" | "pending" | "new" | "live";

const MAP: Record<StatusKind, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  verified: { label: "Verified", icon: BadgeCheck,
    className: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-1 ring-inset ring-[color:var(--color-brand-200)]" },
  premium:  { label: "Premium",  icon: Crown,
    className: "bg-[color:var(--color-gold-50)] text-[color:var(--color-gold-800)] ring-1 ring-inset ring-[color:var(--color-gold-300)]" },
  featured: { label: "Featured", icon: Sparkles,
    className: "bg-linear-to-r from-[color:var(--color-gold-100)] to-[color:var(--color-gold-200)] text-[color:var(--color-gold-900)]" },
  sold:     { label: "Sold",     icon: Home,
    className: "bg-[color:var(--color-gray-900)] text-white" },
  rented:   { label: "Rented",   icon: Key,
    className: "bg-[color:var(--color-brand-800)] text-white" },
  draft:    { label: "Draft",    icon: FileText,
    className: "bg-[color:var(--color-gray-100)] text-[color:var(--color-gray-700)] ring-1 ring-inset ring-[color:var(--color-gray-200)]" },
  pending:  { label: "Pending",  icon: Clock,
    className: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-1 ring-inset ring-[color:var(--color-warning-200)]" },
  new:      { label: "New",      icon: Flame,
    className: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-1 ring-inset ring-[color:var(--color-danger-200)]" },
  live:     { label: "Live",     icon: CircleDot,
    className: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-800)] ring-1 ring-inset ring-[color:var(--color-success-200)]" },
};

export function StatusBadge({ kind, label, className }: { kind: StatusKind; label?: string; className?: string }) {
  const cfg = MAP[kind];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        cfg.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label ?? cfg.label}
    </span>
  );
}
