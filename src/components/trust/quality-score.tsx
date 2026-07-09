import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { qualityTier } from "@/lib/trust-engine";

const TONE: Record<"success" | "warning" | "danger" | "brand", { bar: string; text: string; bg: string }> = {
  success: { bar: "bg-[color:var(--color-success-500)]", text: "text-[color:var(--color-success-700)]", bg: "bg-[color:var(--color-success-50)]" },
  brand:   { bar: "bg-[color:var(--color-brand-500)]",   text: "text-[color:var(--color-brand-700)]",   bg: "bg-[color:var(--color-brand-50)]"   },
  warning: { bar: "bg-[color:var(--color-warning-500)]", text: "text-[color:var(--color-warning-800)]", bg: "bg-[color:var(--color-warning-50)]" },
  danger:  { bar: "bg-[color:var(--color-danger-500)]",  text: "text-[color:var(--color-danger-700)]",  bg: "bg-[color:var(--color-danger-50)]"  },
};

export function QualityScorePill({ score, className }: { score: number; className?: string }) {
  const t = TONE[qualityTier(score).tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", t.bg, t.text, className)}>
      <Gauge className="h-3 w-3" /> {score}/100
    </span>
  );
}

export function QualityScoreBar({ score, className }: { score: number; className?: string }) {
  const tier = qualityTier(score);
  const t = TONE[tier.tone];
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">Listing Quality</span>
        <span className={cn("font-semibold", t.text)}>{score}/100 · {tier.label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", t.bar)}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Higher quality listings rank higher in SPACES search.</p>
    </div>
  );
}
