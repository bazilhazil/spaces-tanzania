import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, EyeOff, Flag, Home, Loader2, MessageSquare,
  ShieldAlert, User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ds";
import {
  evidenceUrl, listAllReports, listReportActions, logModerationAction, REPORT_STATUSES,
  setAccountStatus, setPropertyUnderReview, updateReport,
  type ReportAction, type SafetyReport, type SafetyReportStatus,
} from "@/lib/safety-db";

const TABS: { key: "all" | SafetyReportStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "under_review", label: "Investigating" },
  { key: "more_info", label: "Needs info" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const TARGET_ICON = { property: Home, user: UserIcon, message: MessageSquare } as const;

function statusBadge(s: SafetyReportStatus) {
  if (s === "new") return <Badge variant="destructive">New</Badge>;
  if (s === "under_review") return <Badge variant="warning">Investigating</Badge>;
  if (s === "more_info") return <Badge variant="muted">Needs info</Badge>;
  if (s === "resolved") return <Badge variant="success">Resolved</Badge>;
  return <Badge variant="muted">Dismissed</Badge>;
}

export function SafetyPanel() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | SafetyReportStatus>("new");
  const [selected, setSelected] = useState<SafetyReport | null>(null);

  const load = useCallback(async () => {
    const rows = await listAllReports();
    setReports(rows);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // New reports must land here without a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel("admin-safety-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_reports" }, () => void load())
      .subscribe();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [load]);


  const filtered = useMemo(
    () => (tab === "all" ? reports : reports.filter((r) => r.status === tab)),
    [reports, tab],
  );

  const stats = useMemo(() => ({
    open: reports.filter((r) => r.status === "new" || r.status === "under_review").length,
    urgent: reports.filter((r) => r.priority === "urgent" && r.status !== "resolved" && r.status !== "dismissed").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    total: reports.length,
  }), [reports]);

  return (
    <>
      <header className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust &amp; Safety</div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Safety &amp; Reports</h1>
        <p className="text-sm text-muted-foreground">Investigate reported listings, users and messages.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open" value={String(stats.open)} tone="danger" icon={Flag} />
        <StatCard label="Urgent" value={String(stats.urgent)} tone="danger" icon={AlertTriangle} />
        <StatCard label="Resolved" value={String(stats.resolved)} tone="success" icon={CheckCircle2} />
        <StatCard label="Total" value={String(stats.total)} tone="brand" icon={Clock} />
      </div>

      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === tItem.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {tItem.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card">
        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <ShieldAlert className="h-6 w-6" />
            No reports in this view.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((r) => {
              const Icon = TARGET_ICON[r.targetType];
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r)}
                    className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-secondary/40"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {r.propertyTitle ?? r.reportedUserName ?? "Message"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{r.reference}</span>
                        {r.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        {r.priority === "high" && <Badge variant="warning">High</Badge>}
                      </div>
                      <div className="mt-0.5 text-sm capitalize text-muted-foreground">
                        {r.reason.replace(/_/g, " ")}
                        {r.description ? ` — ${r.description}` : ""}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()} · {r.reporterName ?? "Reporter"}
                      </div>
                    </div>
                    <div className="shrink-0">{statusBadge(r.status)}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReportDetailDialog
        report={selected}
        onClose={() => setSelected(null)}
        onChanged={() => { void load(); }}
      />
    </>
  );
}

function ReportDetailDialog({
  report, onClose, onChanged,
}: { report: SafetyReport | null; onClose: () => void; onChanged: () => void }) {
  const [actions, setActions] = useState<ReportAction[]>([]);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote(""); setActions([]); setEvidence(null);
    if (!report) return;
    void listReportActions(report.id).then(setActions);
    void evidenceUrl(report.evidencePath).then(setEvidence);
  }, [report]);

  if (!report) return null;

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    if (!report) return;
    setBusy(true);
    const res = await fn();
    if (res.ok) await logModerationAction(report.id, label, note || undefined);
    setBusy(false);
    if (!res.ok) { toast.error(res.error ?? "Action failed"); return; }
    toast.success(`${label.replace(/_/g, " ")} applied`);
    setNote("");
    void listReportActions(report.id).then(setActions);
    onChanged();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> {report.reference}
          </DialogTitle>
          <DialogDescription className="capitalize">
            {report.targetType} report — {report.reason.replace(/_/g, " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-secondary/50 p-3 text-sm">
            <div className="font-semibold">
              {report.propertyTitle ?? report.reportedUserName ?? "Reported message"}
            </div>
            {report.description && <p className="mt-1 text-muted-foreground">{report.description}</p>}
            <div className="mt-2 text-[11px] text-muted-foreground">
              Reported by {report.reporterName ?? "user"} · {new Date(report.createdAt).toLocaleString()}
            </div>
          </div>

          {evidence && (
            <a href={evidence} target="_blank" rel="noreferrer" className="block">
              <img src={evidence} alt="Report evidence" className="max-h-64 w-full rounded-xl object-cover" />
            </a>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Status</div>
              <Select
                value={report.status}
                onValueChange={(v) =>
                  void run(`status_${v}`, () =>
                    updateReport(report.id, { status: v as SafetyReportStatus, assignToMe: true, resolution: note || undefined }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Priority</div>
              <Select
                value={report.priority}
                onValueChange={(v) => void run(`priority_${v}`, () => updateReport(report.id, { priority: v as "normal" | "high" | "urgent" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note / resolution (visible to admins only)"
          />

          <div className="flex flex-wrap gap-2">
            {report.propertyId && (
              <>
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => void run("listing_under_review", () => setPropertyUnderReview(report.propertyId!, true, note || "Under investigation"))}>
                  <EyeOff className="mr-1.5 h-4 w-4" /> Hide listing
                </Button>
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => void run("listing_restored", () => setPropertyUnderReview(report.propertyId!, false))}>
                  Restore listing
                </Button>
              </>
            )}
            {report.reportedUserId && (
              <>
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => void run("user_suspended", () => setAccountStatus(report.reportedUserId!, "suspended", note || "Under investigation"))}>
                  Suspend user
                </Button>
                <Button size="sm" variant="destructive" disabled={busy}
                  onClick={() => void run("user_banned", () => setAccountStatus(report.reportedUserId!, "banned", note || "Policy violation"))}>
                  Ban user
                </Button>
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => void run("user_reinstated", () => setAccountStatus(report.reportedUserId!, "active"))}>
                  Reinstate
                </Button>
              </>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Moderation log</div>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions yet.</p>
            ) : (
              <ul className="space-y-2">
                {actions.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border/60 p-2.5 text-xs">
                    <span className="font-semibold capitalize">{a.action.replace(/_/g, " ")}</span>
                    {a.note && <span className="text-muted-foreground"> — {a.note}</span>}
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {a.actorName ?? "Admin"} · {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
