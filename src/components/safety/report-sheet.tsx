import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Flag, ImagePlus, ShieldCheck, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { reasonsFor, submitReport, type ReportTargetType } from "@/lib/safety-db";

export type ReportTarget = {
  type: ReportTargetType;
  label: string;
  propertyId?: string | null;
  userId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
};

type Props = {
  target: ReportTarget;
  trigger?: ReactNode;
  /** Controlled mode — omit `trigger` when using these. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

export function ReportSheet({ target, trigger, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));

  const reasons = reasonsFor(target.type);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setReason(""); setDetails(""); setFile(null);
  }

  async function handleSubmit() {
    if (!reason) { toast.error(t("safety.report.chooseReason")); return; }
    setBusy(true);
    const res = await submitReport({
      targetType: target.type,
      reason,
      description: details,
      propertyId: target.propertyId ?? null,
      reportedUserId: target.userId ?? null,
      messageId: target.messageId ?? null,
      conversationId: target.conversationId ?? null,
      evidence: file,
    });
    setBusy(false);

    if (!res.ok) {
      if (res.error === "auth") toast.error(t("safety.report.signIn"));
      else if (res.error === "duplicate") toast.error(t("safety.report.duplicate"));
      else if (res.error === "self") toast.error(t("safety.report.self"));
      else toast.error(t("safety.report.failed"));
      return;
    }

    setOpen(false);
    reset();
    toast.success(t("safety.report.sent"), {
      description: t("safety.report.sentDetail", { reference: res.reference }),
    });
  }

  const titleKey =
    target.type === "property" ? "safety.report.titleProperty"
    : target.type === "user" ? "safety.report.titleUser"
    : "safety.report.titleMessage";

  const body = (
    <DialogContent
      className={cn(
        "max-h-[92vh] overflow-y-auto p-0 sm:max-w-lg",
        // mobile bottom sheet
        "max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:w-full max-sm:max-w-none",
        "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl",
      )}
    >
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background px-5 pb-4 pt-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Flag className="h-4 w-4 text-destructive" /> {t(titleKey)}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {target.label} — {t("safety.report.confidential")}
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="space-y-4 px-5 py-4">
        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {reasons.map((r) => (
            <label
              key={r}
              htmlFor={`sr-${r}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-sm transition-colors",
                reason === r
                  ? "border-[color:var(--color-brand-300)] bg-[color:var(--color-brand-50)]/60"
                  : "border-border hover:bg-accent/40",
              )}
            >
              <RadioGroupItem id={`sr-${r}`} value={r} />
              <span className="font-medium">{t(`safety.reasons.${r}`)}</span>
            </label>
          ))}
        </RadioGroup>

        <div className="space-y-1.5">
          <Label htmlFor="sr-details" className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("safety.report.detailsLabel")}
          </Label>
          <Textarea
            id="sr-details"
            rows={3}
            maxLength={800}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("safety.report.detailsPlaceholder")}
          />
          <div className="text-right text-[10px] text-muted-foreground">{details.length}/800</div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("safety.report.evidenceLabel")}
          </Label>
          {file ? (
            <div className="flex items-center justify-between rounded-2xl border border-border p-3 text-sm">
              <span className="truncate">{file.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border p-3.5 text-sm text-muted-foreground hover:bg-accent/40">
              <ImagePlus className="h-4 w-4" />
              {t("safety.report.evidenceHint")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {t("safety.report.privacyNote")}
        </div>
      </div>

      <DialogFooter className="sticky bottom-0 gap-2 border-t border-border/60 bg-background px-5 py-4 max-sm:flex-col">
        <Button variant="ghost" className="max-sm:w-full" onClick={() => setOpen(false)}>
          {t("safety.report.cancel")}
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="max-sm:w-full"
          disabled={busy || !reason}
          onClick={handleSubmit}
        >
          {busy ? t("safety.report.submitting") : t("safety.report.submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {body}
    </Dialog>
  );
}
