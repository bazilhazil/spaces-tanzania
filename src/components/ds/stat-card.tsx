import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  delta?: number; // percentage change
  icon?: LucideIcon;
  tone?: "brand" | "gold" | "success" | "danger" | "muted";
  className?: string;
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  brand:   "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  gold:    "bg-[color:var(--color-gold-50)] text-[color:var(--color-gold-800)]",
  success: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  danger:  "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
  muted:   "bg-muted text-foreground/70",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "brand", className }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn("ds-card ds-card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="ds-caption">{label}</div>
          <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", TONE[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div className={cn(
          "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          positive
            ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]"
            : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
        )}>
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(delta)}% this week
        </div>
      )}
    </div>
  );
}
