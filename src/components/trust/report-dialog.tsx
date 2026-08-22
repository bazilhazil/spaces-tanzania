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
import { supabase } from "@/integrations/supabase/client";

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
    setSubmitting(true);
    try {
      if (propertyId) {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from("property_reports").insert({
          property_id: propertyId,
          reporter_id: auth.user?.id ?? null,
          reason,
          details: details.trim() || null,
          status: "open",
        } as never);
        if (error) throw error;
      }
      setOpen(false);
      setReason(""); setDetails("");
      toast.success("Report submitted", { description: "Our moderation team will review within 24 hours." });
    } catch (e) {
      toast.error((e as Error).message || "Could not submit report");
    } finally {
      setSubmitting(false);
    }
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
