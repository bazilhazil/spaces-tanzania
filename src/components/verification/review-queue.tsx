import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Search, FileText, ExternalLink, Check, X, AlertCircle,
  Loader2, StickyNote, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill, SUBJECT_META } from "@/components/verification/verification-center";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import {
  fetchAllVerifications, fetchVerificationEvents, decideVerification,
  addInternalNote, verificationDocUrl,
  type VerificationRequest, type VerificationEvent, type VerificationStatus,
} from "@/lib/verification-db";

const FILTERS: (VerificationStatus | "all")[] = ["pending", "under_review", "more_info", "approved", "rejected", "all"];

export function VerificationReviewQueue() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<VerificationStatus | "all">("pending");
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await fetchAllVerifications(filter));
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.subject_type} ${r.requester_id} ${Object.values(r.details).join(" ")}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[color:var(--color-brand-700)]" />
          <h2 className="ds-h-sm">{t("verify.admin.title")}</h2>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t("verify.admin.search")} className="h-11 rounded-2xl pl-9" />
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as VerificationStatus | "all")}>
        <TabsList className="flex w-full justify-start overflow-x-auto rounded-2xl bg-muted p-1">
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f} className="shrink-0 rounded-xl px-3">
              {f === "all" ? t("common.all") : t(`verify.status.${f}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="ds-card p-8 text-center text-sm text-muted-foreground">{t("verify.admin.empty")}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const meta = SUBJECT_META[r.subject_type];
            return (
              <button key={r.id} type="button" onClick={() => setSelected(r)}
                className="ds-card w-full min-w-0 p-4 text-left transition hover:border-[color:var(--color-brand-300)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <meta.icon className="h-4 w-4 text-[color:var(--color-brand-700)]" />
                    {t(meta.titleKey)}
                  </span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {r.details.full_name || r.details.business_name || r.details.ownership || r.requester_id}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                  <span className="mx-1">·</span>
                  <FileText className="h-3 w-3" /> {r.documents.length}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <ReviewDialog request={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); void load(); }} />
      )}
    </div>
  );
}

function ReviewDialog({
  request, onClose, onDone,
}: { request: VerificationRequest; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const meta = SUBJECT_META[request.subject_type];
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void fetchVerificationEvents(request.id).then(setEvents); }, [request.id]);

  async function openDoc(path: string) {
    const url = await verificationDocUrl(path);
    if (!url) { toast.error(t("verify.admin.docFailed")); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function decide(status: Exclude<VerificationStatus, "pending">) {
    if ((status === "rejected" || status === "more_info") && !reason.trim()) {
      toast.error(t("verify.admin.reasonRequired"));
      return;
    }
    setBusy(true);
    try {
      await decideVerification(request.id, status, reason.trim());
      if (note.trim()) await addInternalNote(request.id, note.trim());
      toast.success(t("verify.admin.decisionSaved"));
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="ds-h-sm">{t(meta.titleKey)}</DialogTitle>
          <DialogDescription>{new Date(request.created_at).toLocaleString()}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
          {Object.entries(request.details).map(([k, v]) => v ? (
            <div key={k} className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
              <span className="truncate font-medium">{v}</span>
            </div>
          ) : null)}
          {request.notes && <p className="mt-2 text-muted-foreground">{request.notes}</p>}
        </div>

        <div className="space-y-2">
          <div className="ds-caption">{t("verify.admin.documents")}</div>
          {request.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : request.documents.map((d) => (
            <button key={d.path} type="button" onClick={() => void openDoc(d.path)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
              <span className="inline-flex items-center gap-2 truncate"><FileText className="h-4 w-4" /> {d.label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {events.length > 0 && (
          <ol className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="text-xs text-muted-foreground">
                <strong className="text-foreground">{t(`verify.event.${e.action}`)}</strong> · {new Date(e.created_at).toLocaleString()}
                {e.reason ? ` — ${e.reason}` : ""}
              </li>
            ))}
          </ol>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="v-reason">{t("verify.admin.reason")}</Label>
          <Textarea id="v-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-note" className="inline-flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> {t("verify.admin.internalNote")}
          </Label>
          <Textarea id="v-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" className="h-11 rounded-2xl" disabled={busy} onClick={() => void decide("more_info")}>
            <AlertCircle className="mr-1.5 h-4 w-4" /> {t("verify.admin.requestInfo")}
          </Button>
          <Button variant="outline" className="h-11 rounded-2xl text-[color:var(--color-danger-700)]" disabled={busy} onClick={() => void decide("rejected")}>
            <X className="mr-1.5 h-4 w-4" /> {t("verify.admin.reject")}
          </Button>
          <Button className="h-11 rounded-2xl" disabled={busy} onClick={() => void decide("approved")}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            {t("verify.admin.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
