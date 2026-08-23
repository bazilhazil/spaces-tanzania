import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { REPORT_REASONS, reportReview, type ReviewReportReason } from "@/lib/reviews-db";

export function ReviewReportDialog({
  open,
  onOpenChange,
  reviewId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewId: string | null;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReviewReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reviewId) return;
    setBusy(true);
    const res = await reportReview(reviewId, reason, details);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error === "duplicate" ? t("reviews.report.already") : t("reviews.errors.failed"));
      return;
    }
    toast.success(t("reviews.report.sent"));
    setDetails("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reviews.report.title")}</DialogTitle>
          <DialogDescription>{t("reviews.report.subtitle")}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReviewReportReason)} className="gap-2">
          {REPORT_REASONS.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-lg border p-3">
              <RadioGroupItem value={r} id={`rr-${r}`} />
              <Label htmlFor={`rr-${r}`} className="cursor-pointer text-sm font-normal">
                {t(`reviews.report.reasons.${r}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          rows={3}
          placeholder={t("reviews.report.detailsPlaceholder")}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            {t("reviews.form.cancel")}
          </Button>
          <Button variant="destructive" className="w-full sm:w-auto" disabled={busy} onClick={submit}>
            {busy ? t("reviews.form.submitting") : t("reviews.report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
