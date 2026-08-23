import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REPORT_REASONS, type ReportReason } from "@/lib/trust-engine";
import { Flag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { submitReport } from "@/lib/safety-db";

/** The legacy dialog uses its own reason keys — map them onto the safety reasons. */
const LEGACY_REASON_MAP: Record<string, string> = {
  fake_listing: "fake_listing",
  wrong_price: "wrong_price",
  wrong_location: "wrong_location",
  already_sold: "unavailable",
  duplicate: "duplicate_listing",
  spam: "suspicious_activity",
  scam: "fraud",
  offensive: "other",
};


type Props = {
  target: string;
  /** When provided the report is stored against this listing. */
  propertyId?: string;
  trigger?: React.ReactNode;
};

export function ReportDialog({ target, propertyId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) return toast.error("Please choose a reason");
    if (submitting) return; // guard against double clicks / slow connections
    if (!propertyId) return toast.error("This listing can't be reported right now.");
    setSubmitting(true);
    const res = await submitReport({
      targetType: "property",
      reason: LEGACY_REASON_MAP[reason] ?? "other",
      description: details,
      propertyId,
    });
    setSubmitting(false);

    if (!res.ok) {
      if (res.error === "auth") toast.error("Please sign in to report this listing.");
      else if (res.error === "duplicate") toast.error("You have already reported this listing.");
      else toast.error("Report couldn't be submitted. Please try again.");
      return; // keep the form open so nothing typed is lost
    }

    setOpen(false);
    setReason(""); setDetails("");
    toast.success("Report submitted", { description: `Reference ${res.reference}` });
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-[color:var(--color-danger-700)]">
            <Flag className="h-4 w-4" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="ds-h-sm">Report {target}</DialogTitle>
          <DialogDescription>
            Reports are confidential and reviewed by our trust & safety team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.key}
                htmlFor={`rr-${r.key}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 transition-colors",
                  reason === r.key
                    ? "border-[color:var(--color-brand-300)] bg-[color:var(--color-brand-50)]/60"
                    : "hover:bg-accent/40",
                )}
              >
                <RadioGroupItem id={`rr-${r.key}`} value={r.key} className="mt-1" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.description}</div>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-xs uppercase tracking-wider text-muted-foreground">
              Additional details (optional)
            </Label>
            <Textarea
              id="report-details"
              placeholder="Share anything that helps our team investigate…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Confidential</span>
              <span>{details.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason} className="min-w-32">
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
