import { StarDisplay } from "./star-rating";
import { useI18n } from "@/hooks/use-i18n";
import type { RatingSummary } from "@/lib/reviews-db";

export function RatingSummaryBlock({ summary }: { summary: RatingSummary }) {
  const { t } = useI18n();
  if (!summary.total) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <StarDisplay value={0} size="md" />
        <span>{t("reviews.noRatingsYet")}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <span className="font-display text-3xl font-semibold leading-none">{summary.average.toFixed(1)}</span>
        <div>
          <StarDisplay value={summary.average} size="md" />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("reviews.basedOn").replace("{count}", String(summary.total))}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = summary.breakdown[n as 1 | 2 | 3 | 4 | 5] ?? 0;
          const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
          return (
            <div key={n} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3 tabular-nums">{n}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-[color:var(--color-gold-500,#f5b301)]" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
