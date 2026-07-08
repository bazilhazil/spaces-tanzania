import { useRef, useState } from "react";
import { Upload, File as FileIcon, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VERIFICATION_STATUS_META, type VerificationRecord, type VerificationStatus } from "@/lib/trust-engine";
import { toast } from "sonner";

const ICONS: Record<VerificationStatus, React.ComponentType<{ className?: string }>> = {
  not_started: AlertCircle,
  pending:     Clock,
  verified:    CheckCircle2,
  rejected:    XCircle,
  resubmit:    AlertCircle,
};

const TONE_CLS: Record<VerificationStatus, string> = {
  not_started: "bg-muted text-foreground/70",
  pending:     "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]",
  verified:    "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  rejected:    "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
  resubmit:    "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]",
};

type Props = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  record: VerificationRecord;
  requirements: { key: string; label: string; hint?: string; required?: boolean }[];
};

export function VerificationCard({ title, description, icon: Icon, record, requirements }: Props) {
  const [uploaded, setUploaded] = useState<string[]>(record.documents.map((d) => d.name));
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const statusMeta = VERIFICATION_STATUS_META[record.status];
  const StatusIcon = ICONS[record.status];

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((f) => f.name);
    setUploaded((prev) => [...prev, ...names]);
    toast.success(`${names.length} file${names.length > 1 ? "s" : ""} added — will submit for review.`);
  }

  return (
    <div className="ds-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="ds-h-sm truncate">{title}</div>
            <p className="ds-body mt-0.5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
          TONE_CLS[record.status],
        )}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusMeta.label}
        </span>
      </div>

      {record.notes && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-2xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-4 py-3 text-sm text-[color:var(--color-warning-900)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Reviewer notes</div>
            <div className="text-xs opacity-90">{record.notes}</div>
          </div>
        </div>
      )}

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div>
          <div className="ds-caption mb-2">Required documents</div>
          <ul className="space-y-2">
            {requirements.map((r) => (
              <li key={r.key} className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--color-brand-600)] shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    {r.label}
                    {r.required && <span className="text-[10px] font-semibold uppercase text-[color:var(--color-danger-700)]">Required</span>}
                  </div>
                  {r.hint && <div className="text-xs text-muted-foreground">{r.hint}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="ds-caption mb-2">Your submissions</div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              dragging
                ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]/60"
                : "border-border hover:border-[color:var(--color-brand-300)] hover:bg-accent/40",
            )}
          >
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-semibold">Drop files or click to upload</div>
            <div className="text-xs text-muted-foreground">PDF, JPG, PNG — up to 10MB each</div>
            <input
              ref={fileRef} type="file" multiple accept="image/*,application/pdf"
              className="hidden" onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {uploaded.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {uploaded.map((name, i) => {
                const doc = record.documents.find((d) => d.name === name);
                const s = doc?.status ?? "pending";
                const DocIcon = ICONS[s];
                return (
                  <li key={`${name}-${i}`} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {doc?.size && <span className="text-xs text-muted-foreground">{doc.size}</span>}
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", TONE_CLS[s])}>
                      <DocIcon className="h-3 w-3" /> {VERIFICATION_STATUS_META[s].label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploaded((p) => p.filter((_, j) => j !== i)); }}
                      className="rounded p-1 text-muted-foreground hover:text-[color:var(--color-danger-700)]"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
        <div className="space-x-3">
          {record.submittedAt && <span>Submitted <strong className="text-foreground/80">{record.submittedAt}</strong></span>}
          {record.reviewedAt && <span>· Reviewed <strong className="text-foreground/80">{record.reviewedAt}</strong></span>}
          {record.reviewer && <span>· by {record.reviewer}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Save draft</Button>
          <Button size="sm" onClick={() => toast.success("Submitted for review")}>
            {record.status === "verified" ? "Update documents" : "Submit for review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
