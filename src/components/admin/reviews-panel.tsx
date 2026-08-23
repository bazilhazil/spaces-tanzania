import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, EyeOff, Flag, Trash2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/panels";
import { StarDisplay } from "@/components/reviews/star-rating";
import {
  fetchAllReviews, fetchReviewReports, moderateReview, resolveReviewReport,
  fetchModerationEvents, type ModerationEvent, type Review, type ReviewReportRow, type ReviewStatus,
} from "@/lib/reviews-db";

const STATUSES: (ReviewStatus | "all")[] = ["all", "pending", "published", "flagged", "removed"];

export function ReviewsPanel() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<ReviewReportRow[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");
  const [q, setQ] = useState("");
  const [action, setAction] = useState<{ review: Review; status: ReviewStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [historyFor, setHistoryFor] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, rep] = await Promise.all([fetchAllReviews(), fetchReviewReports()]);
    setReviews(r);
    setReports(rep);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reportCount = useMemo(() => {
    const m = new Map<string, number>();
    reports.filter((r) => r.status === "open").forEach((r) => m.set(r.reviewId, (m.get(r.reviewId) ?? 0) + 1));
    return m;
  }, [reports]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!needle) return true;
      return (
        (r.comment ?? "").toLowerCase().includes(needle) ||
        r.reviewerName.toLowerCase().includes(needle) ||
        (r.propertyTitle ?? "").toLowerCase().includes(needle) ||
        (r.subjectName ?? "").toLowerCase().includes(needle)
      );
    });
  }, [reviews, filter, q]);

  async function apply() {
    if (!action) return;
    setBusy(true);
    const res = await moderateReview(action.review.id, action.status, reason || undefined);
    setBusy(false);
    if (!res.ok) { toast.error(res.error ?? "Could not update the review"); return; }
    toast.success(`Review ${action.status}`);
    setAction(null);
    setReason("");
    void load();
  }

  async function openHistory(r: Review) {
    setHistoryFor(r);
    setEvents(await fetchModerationEvents(r.id));
  }

  async function resolveReport(id: string, status: "resolved" | "dismissed") {
    const res = await resolveReviewReport(id, status);
    if (!res.ok) { toast.error("Could not update the report"); return; }
    toast.success(`Report ${status}`);
    void load();
  }

  return (
    <div>
      <PageHeader
        kicker="Trust & Safety"
        title="Reviews"
        subtitle="Moderate reviews, investigate reports and keep ratings genuine."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search reviews" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="capitalize">
              {s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No reviews match this filter.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="ds-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StarDisplay value={r.rating} />
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
                <Badge variant="secondary" className="capitalize">{r.subjectType}</Badge>
                {(reportCount.get(r.id) ?? 0) > 0 && (
                  <Badge variant="destructive">{reportCount.get(r.id)} report(s)</Badge>
                )}
                <span className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-medium">{r.reviewerName}</span>
                <span className="text-muted-foreground"> → {r.subjectType === "property" ? (r.propertyTitle ?? "Property") : (r.subjectName ?? "Member")}</span>
              </p>
              {r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.comment}</p>}
              {r.statusReason && <p className="mt-1 text-xs text-amber-600">{r.statusReason}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setAction({ review: r, status: "published" })}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAction({ review: r, status: "pending" })}>
                  <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAction({ review: r, status: "flagged" })}>
                  <Flag className="mr-1 h-3.5 w-3.5" /> Flag
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setAction({ review: r, status: "removed" })}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void openHistory(r)}>History</Button>
              </div>

              {reports.filter((rep) => rep.reviewId === r.id).length > 0 && (
                <div className="mt-3 space-y-2 rounded-lg bg-secondary/40 p-3">
                  {reports.filter((rep) => rep.reviewId === r.id).map((rep) => (
                    <div key={rep.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>
                        <span className="font-medium capitalize">{rep.reason.replace("_", " ")}</span>
                        {rep.details ? ` — ${rep.details}` : ""}
                        <Badge variant="outline" className="ml-2 capitalize">{rep.status}</Badge>
                      </span>
                      {rep.status === "open" && (
                        <span className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => void resolveReport(rep.id, "resolved")}>Resolve</Button>
                          <Button size="sm" variant="ghost" onClick={() => void resolveReport(rep.id, "dismissed")}>Dismiss</Button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!action} onOpenChange={(v) => { if (!v) { setAction(null); setReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Set review to {action?.status}</DialogTitle>
            <DialogDescription>The reviewer is notified and the action is recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder="Reason (recorded with your name and the date)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button disabled={busy} onClick={apply}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(v) => { if (!v) setHistoryFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Moderation history</DialogTitle>
            <DialogDescription>Every action taken on this review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border p-3 text-xs">
                <p className="font-medium capitalize">{e.action.replace("_", " ")}</p>
                <p className="text-muted-foreground">
                  {e.fromStatus ? `${e.fromStatus} → ` : ""}{e.toStatus} · {new Date(e.createdAt).toLocaleString()}
                </p>
                {e.reason && <p className="mt-1 text-muted-foreground">{e.reason}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
