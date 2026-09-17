// Admin listing verification queue — part of the existing Verification Hub.
// Uses only real property records and the shared admin audit log.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, AlertTriangle, Clock, Flag, Eye, MessageSquare, Calendar,
  RefreshCw, MapPin, Search, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ds/empty-state";
import { StatCard } from "@/components/ds/stat-card";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import {
  fetchListingVerification, fetchListingVerificationHistory, verifyListing,
  requestListingInfo, pauseListing, flagListingIssue, resumeListingVerification,
  INFO_REASONS, LISTING_STATE_LABEL,
  type ListingVerificationItem, type ListingVerificationMetrics,
  type ListingVerificationState, type ListingVerificationHistoryEntry,
} from "@/lib/listing-verification";

const nf = new Intl.NumberFormat("en-US");

const TABS: { key: ListingVerificationState; label: string }[] = [
  { key: "in_progress", label: "In progress" },
  { key: "more_info", label: "Information requested" },
  { key: "verified", label: "Verified" },
  { key: "issue", label: "Issue" },
  { key: "paused", label: "Paused" },
];

const STATE_TONE: Record<ListingVerificationState, string> = {
  in_progress: "bg-secondary text-foreground",
  more_info: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]",
  verified: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-800)]",
  issue: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
  paused: "bg-muted text-muted-foreground",
};

type ActionKind = "verify" | "info" | "pause" | "issue" | "resume" | null;

export function ListingVerificationQueue() {
  const [data, setData] = useState<{ items: ListingVerificationItem[]; metrics: ListingVerificationMetrics } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ListingVerificationState>("in_progress");
  const [term, setTerm] = useState("");
  const [active, setActive] = useState<ListingVerificationItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchListingVerification());
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const items = data?.items ?? [];
  const counts = useMemo(() => {
    const map = {} as Record<ListingVerificationState, number>;
    for (const t of TABS) map[t.key] = items.filter((i) => i.state === t.key).length;
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    return items
      .filter((i) => i.state === tab)
      .filter((i) => !q || i.title.toLowerCase().includes(q) || i.reference.toLowerCase().includes(q) || i.ownerName.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
  }, [items, tab, term]);

  const m = data?.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Live listings" value={nf.format(m?.live ?? 0)} tone="brand" icon={MapPin} />
        <StatCard label="Verified" value={nf.format(m?.verified ?? 0)} tone="success" icon={ShieldCheck} />
        <StatCard label="In progress" value={nf.format(m?.inProgress ?? 0)} tone="gold" icon={Clock} />
        <StatCard label="Info requested" value={nf.format(m?.moreInfo ?? 0)} tone="gold" icon={MessageSquare} />
        <StatCard label="Issues" value={nf.format(m?.issue ?? 0)} tone="danger" icon={AlertTriangle} />
        <StatCard
          label={`Average wait (${m?.slaDays ?? 7}-day target)`}
          value={m?.averageAgeDays == null ? "Not enough data yet" : `${m.averageAgeDays} days`}
          tone="brand"
          icon={Clock}
        />
      </div>

      {!!m?.overdue && (
        <p className="rounded-xl bg-[color:var(--color-warning-50)] p-3 text-sm text-[color:var(--color-warning-800)]">
          {m.overdue} {m.overdue === 1 ? "listing has" : "listings have"} been waiting longer than the {m.slaDays}-day verification target.
        </p>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition",
                tab === t.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="ml-1 opacity-70">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title, ID, owner or area" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading listings…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing here" description="No listings match this verification state right now." />
      ) : (
        <div className="grid gap-3">
          {visible.map((item) => (
            <ListingCard key={item.id} item={item} onOpen={() => setActive(item)} />
          ))}
        </div>
      )}

      <ListingDialog
        item={active}
        onClose={() => setActive(null)}
        onDone={() => { setActive(null); void load(); }}
      />
    </div>
  );
}

function ListingCard({ item, onOpen }: { item: ListingVerificationItem; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="ds-card ds-card-hover w-full min-w-0 p-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{item.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE_TONE[item.state])}>
              {LISTING_STATE_LABEL[item.state]}
            </span>
            {item.openReports > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-danger-50)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-danger-700)]">
                <Flag className="h-3 w-3" /> {item.openReports} open {item.openReports === 1 ? "report" : "reports"}
              </span>
            )}
            {item.overdue && (
              <span className="rounded-full bg-[color:var(--color-warning-50)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-warning-800)]">
                Taking longer than usual
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.reference} · {item.location} · {item.propertyType} · for {item.listingType} ·{" "}
            {item.currency} {nf.format(item.price)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Owner {item.ownerName}
            {item.agentName ? ` · Agent ${item.agentName}` : ""} · Submitted{" "}
            {new Date(item.submittedAt).toLocaleDateString()} ({item.ageDays}d)
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {nf.format(item.views)}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {nf.format(item.leads)}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {nf.format(item.viewings)}</span>
        </div>
      </div>
      {item.reason && <p className="mt-2 text-xs text-muted-foreground">Last note: {item.reason}</p>}
    </button>
  );
}

function ListingDialog({
  item, onClose, onDone,
}: { item: ListingVerificationItem | null; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState<ActionKind>(null);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string>(INFO_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ListingVerificationHistoryEntry[]>([]);

  useEffect(() => {
    setAction(null); setReason(""); setCategory(INFO_REASONS[0]); setHistory([]);
    if (!item) return;
    let alive = true;
    void fetchListingVerificationHistory(item.id).then((h) => { if (alive) setHistory(h); });
    return () => { alive = false; };
  }, [item]);

  if (!item) return null;

  const needsReason = action === "verify" || action === "pause" || action === "issue";
  const canConfirm = action === "info" ? true : reason.trim().length >= 5;

  const run = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action === "verify") await verifyListing(item, reason.trim());
      else if (action === "info") await requestListingInfo(item, category, reason);
      else if (action === "pause") await pauseListing(item, reason.trim());
      else if (action === "issue") await flagListingIssue(item, reason.trim());
      else if (action === "resume") await resumeListingVerification(item, reason.trim() || "Returned to the verification queue");
      toast.success("Listing updated. The owner has been notified.");
      onDone();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{item.title}</DialogTitle>
          <DialogDescription>
            {item.reference} · {LISTING_STATE_LABEL[item.state]} · submitted {new Date(item.submittedAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Owner" value={item.ownerName} />
          <Field label="Agent" value={item.agentName ?? "Not assigned"} />
          <Field label="Location" value={item.location} />
          <Field label="Type" value={`${item.propertyType} · ${item.listingType}`} />
          <Field label="Price" value={`${item.currency} ${nf.format(item.price)}`} />
          <Field label="Reports" value={`${item.reports} total · ${item.openReports} open`} />
          <Field label="Views" value={nf.format(item.views)} />
          <Field label="Inquiries" value={nf.format(item.leads)} />
          <Field label="Viewing requests" value={nf.format(item.viewings)} />
        </dl>

        {item.reason && (
          <p className="rounded-xl bg-secondary p-3 text-sm">Current note to the owner: {item.reason}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAction("verify")} disabled={item.state === "verified"}>Verify</Button>
          <Button size="sm" variant="outline" onClick={() => setAction("info")}>Request information</Button>
          <Button size="sm" variant="outline" onClick={() => setAction("pause")} disabled={item.state === "paused"}>Pause</Button>
          <Button size="sm" variant="outline" onClick={() => setAction("issue")}>Flag issue</Button>
          {(item.state === "paused" || item.state === "issue" || item.state === "more_info") && (
            <Button size="sm" variant="outline" onClick={() => setAction("resume")}>Resolve and resume</Button>
          )}
        </div>

        {action && (
          <div className="rounded-2xl border border-border p-3">
            <p className="text-sm font-semibold">
              {action === "verify" && "Confirm: mark this listing Verified by SPACES"}
              {action === "info" && "Request more information from the owner"}
              {action === "pause" && "Confirm: pause this listing (it stops showing publicly)"}
              {action === "issue" && "Confirm: record a verification issue"}
              {action === "resume" && "Return this listing to the verification queue"}
            </p>
            {action === "info" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {INFO_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setCategory(r)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      category === r ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              rows={3}
              className="mt-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={action === "info" ? "What exactly should the owner send? (shown to the owner)" : "Reason for the audit log"}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAction(null)}>Cancel</Button>
              <Button size="sm" disabled={busy || (needsReason && !canConfirm)} onClick={() => void run()}>
                Confirm
              </Button>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Verification history
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded decisions for this listing yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="rounded-xl bg-secondary/60 p-2.5">
                  <span className="font-medium">{h.action.replace(/_/g, " ")}</span>
                  {h.from && h.to && <span className="text-muted-foreground"> · {h.from} → {h.to}</span>}
                  <div className="text-xs text-muted-foreground">
                    {h.adminName} · {new Date(h.createdAt).toLocaleString()}
                  </div>
                  {h.reason && <div className="mt-0.5 text-xs">{h.reason}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
