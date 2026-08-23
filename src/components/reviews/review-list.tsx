import { useState } from "react";
import { toast } from "sonner";
import { Flag, MessageSquareReply, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StarDisplay } from "./star-rating";
import { ReviewReportDialog } from "./review-report-dialog";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { respondToReview, type Review } from "@/lib/reviews-db";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join("");
}

export function ReviewItem({
  review,
  canRespond,
  responderLabel,
  onChanged,
}: {
  review: Review;
  canRespond?: boolean;
  responderLabel?: string;
  onChanged?: () => void;
}) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const long = (review.comment?.length ?? 0) > 220;
  const text = review.comment ?? "";
  const shown = expanded || !long ? text : `${text.slice(0, 220)}…`;
  const cats = Object.entries(review.categories ?? {}).filter(([, v]) => Number(v) > 0);

  async function sendReply() {
    if (reply.trim().length < 2) return;
    setBusy(true);
    const res = await respondToReview(review.id, reply);
    setBusy(false);
    if (!res.ok) {
      toast.error(t("reviews.errors.failed"));
      return;
    }
    toast.success(t("reviews.response.sent"));
    setReplying(false);
    setReply("");
    onChanged?.();
  }

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {review.reviewerAvatar ? <AvatarImage src={review.reviewerAvatar} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials(review.reviewerName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{review.reviewerName}</span>
            <StarDisplay value={review.rating} />
            <span className="text-[11px] text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
            {review.status !== "published" && (
              <Badge variant="outline" className="text-[10px]">
                {t(`reviews.status.${review.status}`)}
              </Badge>
            )}
          </div>

          {text && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{shown}</p>}
          {long && (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? t("reviews.showLess") : t("reviews.readMore")}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}

          {cats.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {cats.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{t(`reviews.categories.${k}`)}</span>
                  <StarDisplay value={Number(v)} />
                </div>
              ))}
            </div>
          )}

          {review.response && (
            <div className="mt-3 rounded-lg border-l-2 border-primary bg-secondary/40 p-3">
              <p className="text-xs font-semibold">{responderLabel ?? t("reviews.response.owner")}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{review.response}</p>
            </div>
          )}

          {canRespond && !review.response && review.status === "published" && (
            <div className="mt-3">
              {replying ? (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("reviews.response.placeholder")}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={sendReply}>
                      {t("reviews.response.submit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                      {t("reviews.form.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setReplying(true)}>
                  <MessageSquareReply className="mr-1 h-3.5 w-3.5" />
                  {t("reviews.response.cta")}
                </Button>
              )}
            </div>
          )}

          {user && user.id !== review.reviewerId && review.status === "published" && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="h-3 w-3" /> {t("reviews.report.cta")}
            </button>
          )}
        </div>
      </div>

      <ReviewReportDialog open={reportOpen} onOpenChange={setReportOpen} reviewId={review.id} />
    </article>
  );
}

export function ReviewList({
  reviews,
  canRespond,
  responderLabel,
  emptyLabel,
  initialCount = 3,
  onChanged,
}: {
  reviews: Review[];
  canRespond?: boolean;
  responderLabel?: string;
  emptyLabel?: string;
  initialCount?: number;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  if (!reviews.length) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyLabel ?? t("reviews.empty")}</p>;
  }
  const visible = showAll ? reviews : reviews.slice(0, initialCount);
  return (
    <div className="space-y-3">
      {visible.map((r) => (
        <ReviewItem key={r.id} review={r} canRespond={canRespond} responderLabel={responderLabel} onChanged={onChanged} />
      ))}
      {reviews.length > initialCount && (
        <Button variant="outline" className="w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t("reviews.showLess") : t("reviews.showAllCount").replace("{count}", String(reviews.length))}
        </Button>
      )}
    </div>
  );
}
