import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingSummaryBlock } from "./rating-summary";
import { ReviewList } from "./review-list";
import { StarDisplay } from "./star-rating";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserReviews, type RatingSummary, type Review } from "@/lib/reviews-db";

const EMPTY: RatingSummary = { average: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

/** Compact inline rating, e.g. next to an agent name. */
export function PersonRatingInline({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<RatingSummary>(EMPTY);
  useEffect(() => {
    let alive = true;
    void fetchUserReviews(userId).then((r) => { if (alive) setSummary(r.summary); });
    return () => { alive = false; };
  }, [userId]);
  if (!summary.total) return <span className="text-xs text-muted-foreground">{t("reviews.noRatingsYet")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <StarDisplay value={summary.average} />
      <span className="font-medium">{summary.average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        {t("reviews.basedOn").replace("{count}", String(summary.total))}
      </span>
    </span>
  );
}

/** Full reviews block for an owner / agent profile. */
export function PersonReviews({ userId, responseTime }: { userId: string; responseTime?: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchUserReviews(userId);
    setReviews(res.reviews);
    setSummary(res.summary);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">{t("reviews.person.title")}</h2>
        {responseTime && (
          <span className="text-xs text-muted-foreground">
            {t("reviews.person.responseTime")}: <span className="font-medium">{responseTime}</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("reviews.person.note")}</p>
      <div className="mt-4">{loading ? <Skeleton className="h-20 w-full" /> : <RatingSummaryBlock summary={summary} />}</div>
      {!loading && (
        <div className="mt-5">
          <ReviewList
            reviews={reviews}
            canRespond={user?.id === userId}
            responderLabel={t("reviews.response.agent")}
            emptyLabel={t("reviews.person.empty")}
            onChanged={load}
          />
        </div>
      )}
    </section>
  );
}
