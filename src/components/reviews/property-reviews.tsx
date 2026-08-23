import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingSummaryBlock } from "./rating-summary";
import { ReviewList } from "./review-list";
import { useI18n } from "@/hooks/use-i18n";
import { fetchPropertyReviews, type RatingSummary, type Review } from "@/lib/reviews-db";

export function PropertyReviews({
  propertyId,
  canRespond,
}: {
  propertyId: string;
  canRespond?: boolean;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({
    average: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchPropertyReviews(propertyId);
    setReviews(res.reviews);
    setSummary(res.summary);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="mt-10 rounded-2xl border bg-card p-5">
      <h2 className="font-display text-xl font-semibold">{t("reviews.property.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("reviews.property.note")}</p>
      <div className="mt-4">
        {loading ? <Skeleton className="h-20 w-full" /> : <RatingSummaryBlock summary={summary} />}
      </div>
      {!loading && (
        <div className="mt-5">
          <ReviewList
            reviews={reviews}
            canRespond={canRespond}
            emptyLabel={t("reviews.property.empty")}
            onChanged={load}
          />
        </div>
      )}
    </section>
  );
}

export function UserReviewsBlock({
  reviews,
  summary,
  canRespond,
  onChanged,
}: {
  reviews: Review[];
  summary: RatingSummary;
  canRespond?: boolean;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-display text-xl font-semibold">{t("reviews.person.title")}</h2>
      <div className="mt-4">
        <RatingSummaryBlock summary={summary} />
      </div>
      <div className="mt-5">
        <ReviewList reviews={reviews} canRespond={canRespond} emptyLabel={t("reviews.person.empty")} onChanged={onChanged} />
      </div>
    </section>
  );
}
