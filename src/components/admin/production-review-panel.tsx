// Production Data Review — part of the existing Admin / Launch & Operations area.
import { useCallback, useEffect, useState } from "react";
import {
  Database, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Archive, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/ds/stat-card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader, ConfirmWithReasonDialog } from "@/components/admin/panels";
import { useAuth } from "@/hooks/use-auth";
import { displayNameOr } from "@/lib/display-name";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import {
  fetchProductionReview, confirmProductionBaseline, markRecordReviewed, archiveRecord,
  type ProductionReview, type FlaggedRecord,
} from "@/lib/production-review";

const nf = new Intl.NumberFormat("en-US");

const TABLE_LABEL: Record<FlaggedRecord["table"], string> = {
  profiles: "Account",
  properties: "Listing",
  leads: "Inquiry",
  bookings: "Viewing request",
  deals: "Deal",
  reviews: "Review",
  notifications: "Notification",
  payments: "Payment",
};

export function ProductionReviewPanel() {
  const { profile } = useAuth();
  const [data, setData] = useState<ProductionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<FlaggedRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchProductionReview());
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const c = data?.counts;
  const baseline = data?.baseline;
  const pending = (data?.flagged ?? []).filter((f) => !f.reviewed);

  async function confirmBaseline() {
    setConfirming(true);
    try {
      const adminName = displayNameOr({ full_name: profile?.full_name ?? null }, "Administrator");
      await confirmProductionBaseline(note, adminName);
      toast.success("Production data marked as reviewed.");
      setNote("");
      await load();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setConfirming(false);
    }
  }

  async function keep(record: FlaggedRecord) {
    try {
      await markRecordReviewed(record, "Confirmed as a genuine production record");
      toast.success("Recorded as reviewed.");
      await load();
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <>
      <PageHeader
        kicker="Data"
        title="Production Data Review"
        subtitle="Review the real records already in SPACES before the business goes into full operation. Nothing here is deleted or changed automatically."
        actions={
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </Button>
        }
      />

      <div
        className={
          baseline?.confirmedAt
            ? "mb-6 rounded-2xl bg-[color:var(--color-success-50)] p-4 text-[color:var(--color-success-800)]"
            : "mb-6 rounded-2xl bg-[color:var(--color-warning-50)] p-4 text-[color:var(--color-warning-800)]"
        }
      >
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          {baseline?.confirmedAt ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {baseline?.confirmedAt ? "Production data reviewed" : "Production data review required"}
        </p>
        {baseline?.confirmedAt ? (
          <p className="mt-1 text-sm">
            Business baseline set {new Date(baseline.confirmedAt).toLocaleString()} by {baseline.confirmedBy ?? "an administrator"}.
            {baseline.note ? ` ${baseline.note}` : ""} Activity before this moment counts as testing history; activity after it counts as production.
          </p>
        ) : (
          <p className="mt-1 text-sm">
            Confirm the review below to set the business baseline. This records the review only — it does not mark payments,
            backups, Selcom, the domain, SMS or email as ready.
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Users" value={nf.format(c?.users ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Owners" value={nf.format(c?.owners ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Agents" value={nf.format(c?.agents ?? 0)} tone="gold" icon={Database} />
        <StatCard label="Buyers / tenants" value={nf.format(c?.buyers ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Live listings" value={nf.format(c?.liveProperties ?? 0)} tone="success" icon={ShieldCheck} />
        <StatCard label="Verified listings" value={nf.format(c?.verifiedProperties ?? 0)} tone="success" icon={ShieldCheck} />
        <StatCard label="Verification in progress" value={nf.format(c?.verifyingProperties ?? 0)} tone="gold" icon={ShieldCheck} />
        <StatCard label="Inquiries" value={nf.format(c?.leads ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Viewing requests" value={nf.format(c?.viewings ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Deals" value={nf.format(c?.deals ?? 0)} tone="brand" icon={Database} />
        <StatCard label="Reviews" value={nf.format(c?.reviews ?? 0)} tone="brand" icon={Database} />
        <StatCard
          label="Payments (confirmed)"
          value={`${nf.format(c?.payments ?? 0)} (${nf.format(c?.confirmedPayments ?? 0)})`}
          tone="muted"
          icon={Database}
        />
      </div>

      {data?.sinceBaseline && (
        <div className="mb-6 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold">Production activity since the baseline</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {nf.format(data.sinceBaseline.properties)} listings · {nf.format(data.sinceBaseline.leads)} inquiries ·{" "}
            {nf.format(data.sinceBaseline.viewings)} viewing requests · {nf.format(data.sinceBaseline.deals)} deals ·{" "}
            {nf.format(data.sinceBaseline.payments)} payment records.
          </p>
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-border p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Flag className="h-4 w-4" /> Records requiring review
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{pending.length}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only records with genuine evidence of test or demo content are listed. Everything else is treated as real business data.
        </p>

        {loading && !data ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking records…</p>
        ) : (data?.flagged.length ?? 0) === 0 ? (
          <div className="mt-4">
            <EmptyState icon={CheckCircle2} title="No test or demo records found" description="Every record in the database looks like genuine business data." />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {data!.flagged.map((record) => (
              <li key={`${record.table}-${record.id}`} className="rounded-xl border border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">{TABLE_LABEL[record.table]}</span>
                      <span className="truncate">{record.label}</span>
                      {record.reviewed && (
                        <span className="rounded-full bg-[color:var(--color-success-50)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-success-800)]">Reviewed</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.evidence} · added {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void keep(record)}>Keep — it's real</Button>
                    {record.archiveAction && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setArchiveTarget(record)}>
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg font-semibold">Confirm the review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming records who reviewed the data and when, and sets the business baseline at that moment. Historical records are never changed.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for the audit log, e.g. what you checked"
        />
        <Button className="mt-3" disabled={confirming} onClick={() => void confirmBaseline()}>
          {baseline?.confirmedAt ? "Re-confirm production data reviewed" : "Confirm production data reviewed"}
        </Button>
      </section>

      <ConfirmWithReasonDialog
        open={!!archiveTarget}
        title={`Archive this ${archiveTarget ? TABLE_LABEL[archiveTarget.table].toLowerCase() : "record"}?`}
        description="The record is archived, suspended or hidden — never deleted — and the decision is written to the audit log."
        confirmLabel="Archive record"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={async (reason) => {
          const record = archiveTarget;
          if (!record) return;
          try {
            await archiveRecord(record, reason);
            toast.success("Record archived and logged.");
            setArchiveTarget(null);
            await load();
          } catch (error) {
            toast.error(friendlyError(error));
          }
        }}
      />
    </>
  );
}
