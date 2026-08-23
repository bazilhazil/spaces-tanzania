import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Home, User2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewList } from "./review-list";
import { RatingSummaryBlock } from "./rating-summary";
import { ReviewFormDialog, type ReviewTarget } from "./review-form-dialog";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyReviews, fetchReviewsAboutMe, fetchReviewOpportunities,
  computeTrustBreakdown, type Review, type ReviewOpportunity,
} from "@/lib/reviews-db";

export function ReviewsCenter() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<ReviewOpportunity[]>([]);
  const [mine, setMine] = useState<Review[]>([]);
  const [about, setAbout] = useState<Review[]>([]);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [o, m, a] = await Promise.all([
      fetchReviewOpportunities(),
      fetchMyReviews(user.id),
      fetchReviewsAboutMe(user.id),
    ]);
    setOpps(o);
    setMine(m);
    setAbout(a);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const published = useMemo(() => about.filter((r) => r.status === "published"), [about]);
  const summary = useMemo(() => {
    const total = published.length;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    let sum = 0;
    published.forEach((r) => {
      sum += r.rating;
      breakdown[Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5] += 1;
    });
    return { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, breakdown };
  }, [published]);

  const trust = useMemo(
    () =>
      computeTrustBreakdown({
        reviewAverage: summary.average,
        reviewCount: summary.total,
        verifications: 0,
        completedDeals: opps.filter((o) => o.source === "deal").length,
        responseMinutes: null,
        listingQuality: 60,
        activeDays: 60,
      }),
    [summary, opps],
  );

  const pending = opps.filter((o) => !o.propertyReviewed || !o.counterpartReviewed);

  function openFor(o: ReviewOpportunity, kind: "property" | "user") {
    setTarget(
      kind === "property"
        ? {
            subjectType: "property",
            propertyId: o.propertyId,
            bookingId: o.source === "booking" ? o.sourceId : null,
            dealId: o.source === "deal" ? o.sourceId : null,
            title: o.propertyTitle ?? t("reviews.thisProperty"),
          }
        : {
            subjectType: "user",
            subjectUserId: o.counterpartId,
            propertyId: o.propertyId,
            bookingId: o.source === "booking" ? o.sourceId : null,
            dealId: o.source === "deal" ? o.sourceId : null,
            title: o.counterpartName ?? t("reviews.thisPerson"),
          },
    );
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("reviews.center.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reviews.center.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("reviews.center.yourRating")}
          </p>
          <div className="mt-3">
            <RatingSummaryBlock summary={summary} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("reviews.center.trustScore")}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">{trust.score}<span className="text-base text-muted-foreground">/100</span></p>
          <p className="text-xs text-muted-foreground">{t("reviews.center.trustNote")}</p>
          <div className="mt-3 space-y-1">
            {trust.parts.map((p) => (
              <div key={p.key} className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{t(`reviews.trust.${p.key}`)}</span>
                <span className="tabular-nums">{p.points}/{p.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="eligible">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="eligible" className="flex-1 whitespace-nowrap">
            {t("reviews.center.tabs.eligible")}
            {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 whitespace-nowrap">{t("reviews.center.tabs.mine")}</TabsTrigger>
          <TabsTrigger value="about" className="flex-1 whitespace-nowrap">{t("reviews.center.tabs.about")}</TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="mt-4 space-y-3">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : pending.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("reviews.center.noEligible")}
            </p>
          ) : (
            pending.map((o) => (
              <div key={`${o.source}-${o.sourceId}`} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t(o.source === "booking" ? "reviews.source.viewing" : "reviews.source.deal")}
                  </Badge>
                  {o.occurredAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(o.occurredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-medium">{o.propertyTitle ?? t("reviews.thisProperty")}</p>
                {o.counterpartName && (
                  <p className="text-xs text-muted-foreground">{t("reviews.with")} {o.counterpartName}</p>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {o.canReviewProperty && o.propertyId && (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={o.propertyReviewed}
                      onClick={() => openFor(o, "property")}
                    >
                      <Home className="mr-1 h-3.5 w-3.5" />
                      {o.propertyReviewed ? t("reviews.done") : t("reviews.center.reviewProperty")}
                    </Button>
                  )}
                  {o.counterpartId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={o.counterpartReviewed}
                      onClick={() => openFor(o, "user")}
                    >
                      <User2 className="mr-1 h-3.5 w-3.5" />
                      {o.counterpartReviewed ? t("reviews.done") : t("reviews.center.reviewPerson")}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <ReviewList reviews={mine} emptyLabel={t("reviews.center.noneWritten")} initialCount={5} onChanged={load} />
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <ReviewList
              reviews={about}
              canRespond
              emptyLabel={t("reviews.center.noneAbout")}
              initialCount={5}
              onChanged={load}
            />
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        <Star className="mr-1 inline h-3 w-3" />
        {t("reviews.center.eligibilityNote")}{" "}
        <Link to="/viewings" className="font-medium text-primary hover:underline">
          {t("reviews.center.viewViewings")}
        </Link>
      </p>

      <ReviewFormDialog open={formOpen} onOpenChange={setFormOpen} target={target} onSubmitted={load} />
    </div>
  );
}
