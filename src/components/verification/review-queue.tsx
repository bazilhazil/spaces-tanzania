import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Search, FileText, ExternalLink, Check, X, AlertCircle,
  Loader2, StickyNote, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusPill, SUBJECT_META } from "@/components/verification/verification-center";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import {
  fetchAllVerifications, fetchVerificationEvents, decideVerification,
  addInternalNote, verificationDocUrl,
  type VerificationRequest, type VerificationEvent, type VerificationStatus,
} from "@/lib/verification-db";

type SubjectFilter = Exclude<VerificationRequest["subject_type"], "business"> | "all";
const SUBJECT_FILTERS: SubjectFilter[] = ["all", "user", "owner", "agent", "property"];

export function VerificationReviewQueue() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAllVerifications("all"));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-verification-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const counts = useMemo(() => SUBJECT_FILTERS.reduce<Record<SubjectFilter, number>>((result, item) => {
    result[item] = item === "all" ? rows.length : rows.filter((row) => row.subject_type === item).length;
    return result;
  }, { all: 0, user: 0, owner: 0, agent: 0, property: 0 }), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => subject === "all" || row.subject_type === subject)
      .filter((row) => !q || `${row.subject_type} ${row.requester_id} ${row.property_title ?? ""} ${Object.values(row.details).join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const pendingOrder = Number(b.status === "pending") - Number(a.status === "pending");
        return pendingOrder || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [rows, query, subject]);

  async function approve(request: VerificationRequest) {
    try {
      await decideVerification(request.id, "approved", "");
      toast.success(t("verify.admin.decisionSaved"));
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

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

      <div className="flex w-full gap-2 overflow-x-auto pb-1">
        {SUBJECT_FILTERS.map((filter) => (
          <Button key={filter} type="button" size="sm" variant={subject === filter ? "default" : "outline"}
            className="shrink-0" onClick={() => setSubject(filter)}>
            {filter === "all" ? t("common.all") : t(`verify.type.${filter}`).replace(" Verification", "").replace("Uhakiki wa ", "")}
            <span className="ml-1.5 text-xs opacity-70">{counts[filter]}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="ds-card p-8 text-center text-sm text-muted-foreground">{t("verify.admin.empty")}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const meta = SUBJECT_META[r.subject_type];
            return (
              <article key={r.id} className="ds-card w-full min-w-0 p-4">
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
                <div className="mt-1 break-all text-xs text-muted-foreground">ID: {r.id} · User: {r.requester_id}</div>
                {r.property_id && <div className="mt-1 text-xs text-muted-foreground">Property: {r.property_title ?? r.property_id}</div>}
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                  <span className="mx-1">·</span>
                  <FileText className="h-3 w-3" /> {r.documents.length}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>{t("verify.admin.open")}</Button>
                  {r.status !== "approved" && <Button size="sm" variant="success" onClick={() => void approve(r)}><Check className="mr-1 h-4 w-4" />{t("verify.admin.approve")}</Button>}
                  {r.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => setSelected(r)}><X className="mr-1 h-4 w-4" />{t("verify.admin.reject")}</Button>}
                </div>
              </article>
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
          <DialogDescription>ID: {request.id} · {new Date(request.created_at).toLocaleString()}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={request.status} />
          <Badge variant="muted">{t("verify.admin.riskNotCalculated")}</Badge>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
          {Object.entries(request.details).map(([k, v]) => v ? (
            <div key={k} className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
              <span className="truncate font-medium">{v}</span>
            </div>
          ) : null)}
          {request.notes && <p className="mt-2 text-muted-foreground">{request.notes}</p>}
          <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            <div className="break-all">User ID: {request.requester_id}</div>
            {request.property_id && <div>Property: {request.property_title ?? request.property_id}</div>}
            {request.reviewer_id && <div className="break-all">Reviewed by: {request.reviewer_id}</div>}
            {request.reviewed_at && <div>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</div>}
          </div>
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
