import { useMemo, useState } from "react";
import {
  ShieldCheck, User as UserIcon, Home as HomeIcon, Building2, UserCheck,
  Clock, CheckCircle2, XCircle, AlertCircle, PauseCircle, RotateCcw,
  FileText, Sparkles, MessageSquare, Filter, Eye, ClipboardList,
  Bell, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MOCK_VERIFICATION_CASES, ENTITY_META, ECO_STATUS_META, DOCS_BY_ENTITY,
  TIMELINE_ACTION_META, NOTIFICATION_META, TRUST_FACTOR_META, TRUST_BAND_CLS,
  computeEcoTrust, ecosystemKpis,
  type VerificationCase, type EntityType, type EcoStatus,
} from "@/lib/verification-ecosystem";

const ENTITY_ICON: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  owner: UserIcon, agent: UserCheck, property: HomeIcon, agency: Building2,
};

const STATUS_TONE_CLS: Record<EcoStatus, string> = {
  pending:      "bg-muted text-foreground/70 ring-border",
  under_review: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-[color:var(--color-warning-200)]",
  verified:     "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]",
  rejected:     "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-[color:var(--color-danger-200)]",
  expired:      "bg-muted text-foreground/60 ring-border",
  suspended:    "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-[color:var(--color-danger-200)]",
};

function StatusPill({ status }: { status: EcoStatus }) {
  const meta = ECO_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset", STATUS_TONE_CLS[status])}>
      {meta.label}
    </span>
  );
}

export function EcosystemCenter({ role = "admin" }: { role?: "admin" | "owner" }) {
  const [cases, setCases] = useState<VerificationCase[]>(MOCK_VERIFICATION_CASES);
  const [filterEntity, setFilterEntity] = useState<EntityType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EcoStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VerificationCase | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "request" | "suspend" | "revoke">("approve");
  const [reviewNote, setReviewNote] = useState("");

  const kpis = useMemo(() => ecosystemKpis(cases), [cases]);

  const filtered = useMemo(() => cases.filter((c) => {
    if (filterEntity !== "all" && c.entityType !== filterEntity) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (query && !`${c.subjectName} ${c.subjectHandle ?? ""} ${c.submittedBy}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [cases, filterEntity, filterStatus, query]);

  function openReview(c: VerificationCase, action: typeof reviewAction) {
    setSelected(c); setReviewAction(action); setReviewNote(""); setReviewOpen(true);
  }

  function submitReview() {
    if (!selected) return;
    const map: Record<typeof reviewAction, { status: EcoStatus; label: string }> = {
      approve: { status: "verified",  label: "Approved" },
      reject:  { status: "rejected",  label: "Rejected" },
      request: { status: "under_review", label: "Requested more docs" },
      suspend: { status: "suspended", label: "Suspended" },
      revoke:  { status: "rejected",  label: "Revoked" },
    };
    const { status: newStatus, label } = map[reviewAction];
    setCases((prev) => prev.map((c) => c.id === selected.id ? {
      ...c,
      status: newStatus,
      reviewer: "You (Super Admin)",
      reviewerNotes: reviewNote || c.reviewerNotes,
      timeline: [
        ...c.timeline,
        {
          id: `t-${Date.now()}`,
          action: reviewAction === "approve" ? "approved" :
                  reviewAction === "reject"  ? "rejected" :
                  reviewAction === "request" ? "requested_more" :
                  reviewAction === "suspend" ? "suspended" : "revoked",
          reviewer: "You (Super Admin)",
          when: "just now",
          previousStatus: c.status,
          newStatus,
          reason: reviewNote,
        },
      ],
    } : c));
    setReviewOpen(false);
    toast.success(`${label}. User notified.`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI widgets */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Clock}         label="Pending"           value={kpis.pending}         tone="warning" />
        <KpiCard icon={CheckCircle2}  label="Approved today"    value={kpis.approvedToday}   tone="success" />
        <KpiCard icon={XCircle}       label="Rejected today"    value={kpis.rejectedToday}   tone="danger"  />
        <KpiCard icon={AlertCircle}   label="Expiring"          value={kpis.expiring}        tone="brand"   />
      </div>

      <Tabs defaultValue="queue" className="space-y-5">
        <TabsList className="rounded-2xl bg-muted p-1">
          <TabsTrigger value="queue"     className="rounded-xl px-4"><ClipboardList className="mr-1.5 h-3.5 w-3.5" />Review Queue</TabsTrigger>
          <TabsTrigger value="trust"     className="rounded-xl px-4"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Trust Score</TabsTrigger>
          <TabsTrigger value="notify"    className="rounded-xl px-4"><Bell className="mr-1.5 h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security"  className="rounded-xl px-4"><Lock className="mr-1.5 h-3.5 w-3.5" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {/* Filters */}
          <div className="ds-card flex flex-wrap items-center gap-2 p-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subject, handle…" className="h-9 max-w-xs" />
            <Select label="Type" value={filterEntity} onChange={setFilterEntity} options={[
              { value: "all", label: "All types" },
              ...(Object.keys(ENTITY_META) as EntityType[]).map((k) => ({ value: k, label: ENTITY_META[k].label })),
            ]} />
            <Select label="Status" value={filterStatus} onChange={setFilterStatus} options={[
              { value: "all", label: "All statuses" },
              ...(Object.keys(ECO_STATUS_META) as EcoStatus[]).map((k) => ({ value: k, label: ECO_STATUS_META[k].label })),
            ]} />
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} case{filtered.length === 1 ? "" : "s"}</div>
          </div>

          {/* Queue */}
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((c) => {
              const Icon = ENTITY_ICON[c.entityType];
              const uploadedCount = c.documents.filter((d) => d.uploaded).length;
              const verifiedCount = c.documents.filter((d) => d.verified).length;
              return (
                <div key={c.id} className="ds-card ds-card-hover p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="ds-h-sm truncate">{c.subjectName}</div>
                          <StatusPill status={c.status} />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {ENTITY_META[c.entityType].label} · {c.subjectHandle ?? c.submittedBy} · Submitted {c.submittedAt}
                        </div>
                      </div>
                    </div>
                    {typeof c.aiRiskScore === "number" && (
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        c.aiRiskScore < 25 ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]"
                        : c.aiRiskScore < 60 ? "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-[color:var(--color-warning-200)]"
                        : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-[color:var(--color-danger-200)]")}>
                        AI risk {c.aiRiskScore}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Docs</span> <strong>{uploadedCount}/{DOCS_BY_ENTITY[c.entityType].length}</strong>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Verified</span> <strong>{verifiedCount}/{uploadedCount}</strong>
                    </div>
                  </div>

                  {c.aiFlags && c.aiFlags.length > 0 && (
                    <div className="mt-3 rounded-xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-3 py-2 text-xs text-[color:var(--color-warning-900)]">
                      <div className="mb-0.5 font-semibold">AI review flags</div>
                      <ul className="list-disc pl-4">{c.aiFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(c); }}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                    {role === "admin" && (
                      <>
                        <Button size="sm" variant="success" onClick={() => openReview(c, "approve")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => openReview(c, "reject")}>Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => openReview(c, "request")}>Request docs</Button>
                        <Button size="sm" variant="outline" onClick={() => openReview(c, "suspend")}>
                          <PauseCircle className="mr-1 h-3.5 w-3.5" />Suspend
                        </Button>
                        {c.status === "verified" && (
                          <Button size="sm" variant="outline" onClick={() => openReview(c, "revoke")}>
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />Revoke
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="trust">
          <TrustScorePanel />
        </TabsContent>

        <TabsContent value="notify">
          <div className="ds-card p-5">
            <div className="ds-h-sm mb-3">Notification events</div>
            <p className="ds-body text-muted-foreground mb-4">Users are notified in-app, by email, and SMS on each of these events.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {(Object.entries(NOTIFICATION_META)).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-3.5 w-3.5 text-[color:var(--color-brand-600)]" />{v.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{v.body}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="ds-card p-5 space-y-3">
            <div className="ds-h-sm">Document security</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 text-[color:var(--color-brand-600)]" /> Documents stored in encrypted private storage — never publicly accessible.</li>
              <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 text-[color:var(--color-brand-600)]" /> Only verified admins can view submitted files, gated by role-based access.</li>
              <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 text-[color:var(--color-brand-600)]" /> Every access is written to the audit trail with reviewer + timestamp.</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-[color:var(--color-brand-600)]" /> Ready for AI-assisted review and fraud detection — schema uses <code>aiRiskScore</code> + <code>aiFlags</code> today.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      <Dialog open={!!selected && !reviewOpen} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          {selected && <CaseDetail c={selected} onAction={(a) => openReview(selected, a)} role={role} />}
        </DialogContent>
      </Dialog>

      {/* Review action dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewAction} verification</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            {selected && <>You are about to <strong className="capitalize text-foreground">{reviewAction}</strong> the verification for <strong className="text-foreground">{selected.subjectName}</strong>. The user will be notified.</>}
          </div>
          <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a reviewer note (visible to the user)…" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview}>Confirm &amp; notify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number;
  tone: "warning" | "success" | "danger" | "brand";
}) {
  const cls = {
    warning: "text-[color:var(--color-warning-700)] bg-[color:var(--color-warning-50)]",
    success: "text-[color:var(--color-success-700)] bg-[color:var(--color-success-50)]",
    danger:  "text-[color:var(--color-danger-700)] bg-[color:var(--color-danger-50)]",
    brand:   "text-[color:var(--color-brand-700)] bg-[color:var(--color-brand-50)]",
  }[tone];
  return (
    <div className="ds-card p-4 flex items-center gap-3">
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", cls)}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="ds-caption">{label}</div>
      </div>
    </div>
  );
}

function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function CaseDetail({ c, onAction, role }: {
  c: VerificationCase;
  onAction: (a: "approve" | "reject" | "request" | "suspend" | "revoke") => void;
  role: "admin" | "owner";
}) {
  const Icon = ENTITY_ICON[c.entityType];
  const reqs = DOCS_BY_ENTITY[c.entityType];
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[color:var(--color-brand-600)]" />
          {c.subjectName}
          <StatusPill status={c.status} />
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 md:grid-cols-2 text-xs">
        <Meta label="Entity type" value={ENTITY_META[c.entityType].label} />
        <Meta label="Submitted by" value={c.submittedBy} />
        <Meta label="Submitted at" value={c.submittedAt} />
        <Meta label="Reviewer" value={c.reviewer ?? "—"} />
        {c.expiresAt && <Meta label="Expires" value={c.expiresAt} />}
        {typeof c.aiRiskScore === "number" && <Meta label="AI risk score" value={`${c.aiRiskScore} / 100`} />}
      </div>

      {c.reviewerNotes && (
        <div className="rounded-2xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-3 py-2 text-xs text-[color:var(--color-warning-900)]">
          <div className="flex items-center gap-1.5 font-semibold"><MessageSquare className="h-3.5 w-3.5" />Reviewer notes</div>
          <div className="mt-0.5">{c.reviewerNotes}</div>
        </div>
      )}

      <section>
        <div className="ds-caption mb-1.5">Required documents</div>
        <ul className="space-y-1.5">
          {reqs.map((r) => {
            const doc = c.documents.find((d) => d.key === r.key);
            const state = !doc ? "missing" : doc.verified ? "verified" : doc.uploaded ? "pending" : "missing";
            const StateIcon = state === "verified" ? CheckCircle2 : state === "pending" ? Clock : AlertCircle;
            const stateCls = state === "verified"
              ? "text-[color:var(--color-success-700)]"
              : state === "pending" ? "text-[color:var(--color-warning-700)]" : "text-[color:var(--color-danger-700)]";
            return (
              <li key={r.key} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{r.label}{r.required && <span className="ml-1 text-[10px] font-semibold uppercase text-[color:var(--color-danger-700)]">Req</span>}</span>
                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", stateCls)}>
                  <StateIcon className="h-3.5 w-3.5" />{state}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="ds-caption mb-1.5">Verification timeline &amp; audit trail</div>
        <ol className="space-y-2">
          {c.timeline.map((t) => {
            const meta = TIMELINE_ACTION_META[t.action];
            return (
              <li key={t.id} className="flex gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-[color:var(--color-brand-500)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                    {meta.label}
                    {t.previousStatus && t.newStatus && <span className="text-[10px] font-normal text-muted-foreground">{t.previousStatus} → {t.newStatus}</span>}
                  </div>
                  <div className="text-muted-foreground">{t.reviewer} · {t.when}{t.reason ? ` — "${t.reason}"` : ""}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {role === "admin" && (
        <DialogFooter className="flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={() => onAction("approve")}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => onAction("reject")}>Reject</Button>
          <Button size="sm" variant="outline" onClick={() => onAction("request")}>Request more docs</Button>
          <Button size="sm" variant="outline" onClick={() => onAction("suspend")}>Suspend</Button>
          {c.status === "verified" && <Button size="sm" variant="outline" onClick={() => onAction("revoke")}>Revoke</Button>}
        </DialogFooter>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function TrustScorePanel() {
  const [factors, setFactors] = useState<Record<keyof typeof TRUST_FACTOR_META, number>>({
    verification: 22, response_speed: 12, listing_quality: 13,
    transactions: 10, profile_completeness: 8, ratings: 12, reports: 2,
  });
  const t = computeEcoTrust(factors);
  return (
    <div className="ds-card p-5 grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="text-center">
        <div className={cn("mx-auto grid h-40 w-40 place-items-center rounded-full ring-4", TRUST_BAND_CLS[t.band])}>
          <div>
            <div className="text-4xl font-semibold">{t.total}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider">/ 100 · {t.band}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Colour-coded band: <strong className="text-[color:var(--color-success-700)]">green ≥75</strong>, <strong className="text-[color:var(--color-warning-800)]">yellow ≥50</strong>, <strong className="text-[color:var(--color-danger-700)]">red &lt;50</strong>.</p>
      </div>
      <div className="space-y-3">
        {(Object.keys(TRUST_FACTOR_META) as (keyof typeof TRUST_FACTOR_META)[]).map((k) => {
          const meta = TRUST_FACTOR_META[k];
          const v = factors[k];
          return (
            <div key={k}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold">{meta.label}</span>
                <span className="text-muted-foreground">{v} / {meta.max}</span>
              </div>
              <input type="range" min={0} max={meta.max} value={v}
                onChange={(e) => setFactors((p) => ({ ...p, [k]: Number(e.target.value) }))}
                className="w-full accent-[color:var(--color-brand-600)]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small owner-side widget for embedding on the Owner dashboard.
export function OwnerVerificationWidget() {
  const mine = MOCK_VERIFICATION_CASES.filter((c) => c.submittedBy === "@amina.juma");
  const total = mine.reduce((a, c) => a + c.documents.length, 0);
  const done = mine.reduce((a, c) => a + c.documents.filter((d) => d.verified).length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="ds-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-[color:var(--color-brand-600)]" />
        <div className="ds-h-sm">My verification</div>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-[color:var(--color-brand-600)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 space-y-1.5">
        {mine.map((c) => {
          const Icon = ENTITY_ICON[c.entityType];
          return (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{c.subjectName}</span>
              <StatusPill status={c.status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
