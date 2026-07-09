import { Calendar, MessageCircle, Timer, Award, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberTrustSnapshot } from "@/lib/trust-engine";

export function BuyerTrustPanel({
  snapshot, className,
}: { snapshot: MemberTrustSnapshot; className?: string }) {
  const items = [
    { icon: Calendar,      label: "Years on SPACES",  value: snapshot.yearsOnSpaces === 0 ? "New" : `${snapshot.yearsOnSpaces}y` },
    { icon: MessageCircle, label: "Response rate",    value: `${snapshot.responseRate}%` },
    { icon: Timer,         label: "Avg response",     value: snapshot.responseTime },
    { icon: Award,         label: "Successful deals", value: snapshot.transactions.toString() },
    { icon: Star,          label: "Rating",           value: `${snapshot.rating.toFixed(1)} ★`, sub: `${snapshot.reviewCount}` },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5", className)}>
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <it.icon className="h-3 w-3" /> {it.label}
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {it.value}
            {it.sub && <span className="ml-1 text-[10px] font-normal text-muted-foreground">({it.sub})</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
