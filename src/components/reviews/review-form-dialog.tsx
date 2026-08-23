import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "./star-rating";
import { useI18n } from "@/hooks/use-i18n";
import {
  createReview, PROPERTY_CATEGORIES, PERSON_CATEGORIES,
  type CategoryKey, type CreateReviewInput, type ReviewSubjectType,
} from "@/lib/reviews-db";

export interface ReviewTarget {
  subjectType: ReviewSubjectType;
  propertyId?: string | null;
  subjectUserId?: string | null;
  bookingId?: string | null;
  dealId?: string | null;
  title: string;
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  target,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: ReviewTarget | null;
  onSubmitted?: () => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [cats, setCats] = useState<Partial<Record<CategoryKey, number>>>({});
  const [busy, setBusy] = useState(false);

  const categories: readonly CategoryKey[] =
    target?.subjectType === "property" ? PROPERTY_CATEGORIES : PERSON_CATEGORIES;

  function reset() {
    setRating(0);
    setComment("");
    setCats({});
  }

  async function submit() {
    if (!target) return;
    if (rating < 1) {
      toast.error(t("reviews.form.pickRating"));
      return;
    }
    setBusy(true);
    const payload: CreateReviewInput = {
      subjectType: target.subjectType,
      propertyId: target.propertyId ?? null,
      subjectUserId: target.subjectUserId ?? null,
      bookingId: target.bookingId ?? null,
      dealId: target.dealId ?? null,
      rating,
      categories: cats,
      comment,
    };
    const res = await createReview(payload);
    setBusy(false);
    if (!res.ok) {
      const msg =
        res.error === "duplicate" ? t("reviews.errors.duplicate")
        : res.error === "not_eligible" ? t("reviews.errors.notEligible")
        : res.error === "auth" ? t("reviews.errors.auth")
        : t("reviews.errors.failed");
      toast.error(msg);
      return;
    }
    toast.success(res.status === "published" ? t("reviews.form.published") : t("reviews.form.pending"));
    reset();
    onOpenChange(false);
    onSubmitted?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("reviews.form.title")}</DialogTitle>
          <DialogDescription>{target?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/40 py-5">
            <StarInput value={rating} onChange={setRating} />
            <p className="text-xs text-muted-foreground">{t("reviews.form.tapStars")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("reviews.form.optionalCategories")}
            </p>
            {categories.map((c) => (
              <div key={c} className="flex items-center justify-between gap-3">
                <span className="text-sm">{t(`reviews.categories.${c}`)}</span>
                <StarInput
                  size="md"
                  value={cats[c] ?? 0}
                  onChange={(v) => setCats((prev) => ({ ...prev, [c]: v }))}
                  label={c}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="review-comment">
              {t("reviews.form.commentLabel")}
            </label>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={1500}
              placeholder={t("reviews.form.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t("reviews.form.moderationNote")}</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            {t("reviews.form.cancel")}
          </Button>
          <Button className="w-full sm:w-auto" disabled={busy} onClick={submit}>
            {busy ? t("reviews.form.submitting") : t("reviews.form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
