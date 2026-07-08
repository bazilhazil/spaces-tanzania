import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_LIFECYCLE, type PropertyLifecycleStage } from "@/lib/trust-engine";

const CORE: PropertyLifecycleStage[] = [
  "draft", "pending_verification", "approved", "live",
];

export function PropertyLifecycleStepper({
  current, className,
}: { current: PropertyLifecycleStage; className?: string }) {
  const stages = CORE;
  const idx = Math.max(0, stages.indexOf(current));
  return (
    <ol className={cn("flex w-full items-center gap-2", className)}>
      {stages.map((s, i) => {
        const meta = PROPERTY_LIFECYCLE.find((x) => x.key === s)!;
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s} className="flex flex-1 items-center gap-2 min-w-0">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold ring-2 transition-colors",
                  done   && "bg-[color:var(--color-success-500)] text-white ring-[color:var(--color-success-200)]",
                  active && "bg-[color:var(--color-brand-600)] text-white ring-[color:var(--color-brand-200)] shadow-[var(--shadow-soft)]",
                  !done && !active && "bg-muted text-muted-foreground ring-transparent",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
                {meta.label}
              </div>
              {active && <div className="truncate text-[10px] text-muted-foreground">{meta.description}</div>}
            </div>
            {i < stages.length - 1 && (
              <div className={cn(
                "h-px flex-1 min-w-4 transition-colors",
                done ? "bg-[color:var(--color-success-300)]" : "bg-border",
              )} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
