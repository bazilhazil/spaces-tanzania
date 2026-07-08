import { cn } from "@/lib/utils";
import { TRUST_TIER_META, type TrustScore } from "@/lib/trust-engine";

const TONE: Record<string, { ring: string; text: string; badgeBg: string; badgeText: string }> = {
  muted:   { ring: "oklch(0.70 0 0)",                           text: "text-foreground",                                       badgeBg: "bg-muted",                                              badgeText: "text-foreground/70" },
  brand:   { ring: "var(--color-brand-500)",                    text: "text-[color:var(--color-brand-700)]",                   badgeBg: "bg-[color:var(--color-brand-50)]",                       badgeText: "text-[color:var(--color-brand-700)]" },
  success: { ring: "var(--color-success-500)",                  text: "text-[color:var(--color-success-700)]",                 badgeBg: "bg-[color:var(--color-success-50)]",                     badgeText: "text-[color:var(--color-success-700)]" },
  gold:    { ring: "var(--color-gold-600)",                     text: "text-[color:var(--color-gold-800)]",                    badgeBg: "bg-[color:var(--color-gold-50)]",                        badgeText: "text-[color:var(--color-gold-800)]" },
};

export function TrustScoreRing({
  score, tier, size = 132, className,
}: { score: TrustScore["score"]; tier: TrustScore["tier"]; size?: number; className?: string }) {
  const meta = TRUST_TIER_META[tier];
  const t = TONE[meta.tone];
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="oklch(0.92 0.005 250)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={t.ring} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={cn("font-display text-3xl font-semibold tracking-tight", t.text)}>{score}</div>
          <div className="ds-caption mt-0.5">Trust Score</div>
        </div>
      </div>
      <span className={cn(
        "absolute -bottom-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        t.badgeBg, t.badgeText,
      )}>{meta.label}</span>
    </div>
  );
}
