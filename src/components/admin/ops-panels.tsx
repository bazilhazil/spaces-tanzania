import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Home, MessageSquare, Calendar, Briefcase, ShieldCheck, Flag, DollarSign,
  RefreshCw, ArrowRight, FileClock, AlertTriangle, CheckCircle2, Search, LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/ds/stat-card";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader, DashboardPanel } from "@/components/admin/panels";
import { useI18n } from "@/hooks/use-i18n";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchAdminToday, fetchNeedsAttention, fetchAdminLeads, fetchAdminViewings, fetchAdminDeals,
  fetchRevenueBreakdown, fetchAdminActionLog, fetchAgentOptions, reassignLeadAgent,
  GROUP_ORDER,
  type AdminToday, type AttentionItem, type AttentionGroup, type AdminLead, type AdminViewing, type AdminDeal,
  type RevenueBreakdown, type AdminActionLog, type AgentOption,
  type LeadOpsFilter, type ViewingOpsFilter, type DealOpsFilter,
} from "@/lib/admin-ops";
import { fetchSupportStats, type SupportStats } from "@/lib/support-db";

// ------------------------------------------------------------- helpers

const nf = new Intl.NumberFormat("en-US");
function money(amount: number, currency = "TZS") {
  return `${currency} ${nf.format(Math.round(amount))}`;
}
function relative(iso: string) {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
function titleCase(v: string) {
  return (v ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useLive<T>(loader: () => Promise<T>, initial: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loader()
      .then((d) => { if (alive) setData(d); })
      .catch(() => { /* empty states handle this */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);
  return { data, loading, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ds-card mb-6 p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

function FilterBar<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <Button key={o.id} size="sm" variant={value === o.id ? "default" : "outline"} className="shrink-0" onClick={() => onChange(o.id)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------- admin home

const ATTENTION_META: Record<AttentionItem["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  property_pending: { icon: Home, tone: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]" },
  property_suspended: { icon: AlertTriangle, tone: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]" },
  verification_pending: { icon: ShieldCheck, tone: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]" },
  report_open: { icon: Flag, tone: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]" },
  payment_issue: { icon: DollarSign, tone: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]" },
  user_suspended: { icon: Users, tone: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]" },
  user_new: { icon: Users, tone: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]" },
  viewing_pending: { icon: Calendar, tone: "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]" },
  lead_waiting: { icon: MessageSquare, tone: "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]" },
};

const GROUP_LABEL: Record<AttentionGroup, string> = {
  spaces: "admin.ops.group.spaces",
  users: "admin.ops.group.users",
  leads: "admin.ops.group.leads",
  viewings: "admin.ops.group.viewings",
  verification: "admin.ops.group.verification",
  reports: "admin.ops.group.reports",
  payments: "admin.ops.group.payments",
};


export function AdminHomePanel() {
  const { t } = useI18n();
  const { data: today, loading, reload } = useLive<AdminToday | null>(fetchAdminToday, null);
  const { data: attention, loading: loadingAttention, reload: reloadAttention } = useLive<AttentionItem[]>(fetchNeedsAttention, []);
  const { data: support, reload: reloadSupport } = useLive<SupportStats | null>(fetchSupportStats, null);

  const cards = today
    ? [
        { label: t("admin.ops.newUsers"), value: nf.format(today.newUsers), icon: Users, tone: "brand" as const },
        { label: t("admin.ops.newSpaces"), value: nf.format(today.newSpaces), icon: Home, tone: "brand" as const },
        { label: t("admin.ops.newLeads"), value: nf.format(today.newLeads), icon: MessageSquare, tone: "gold" as const },
        { label: t("admin.ops.newViewings"), value: nf.format(today.newViewings), icon: Calendar, tone: "gold" as const },
        { label: t("admin.ops.activeDeals"), value: nf.format(today.activeDeals), icon: Briefcase, tone: "brand" as const },
        { label: t("admin.ops.pendingVerifications"), value: nf.format(today.pendingVerifications), icon: ShieldCheck, tone: "gold" as const },
        { label: t("admin.ops.openReports"), value: nf.format(today.openReports), icon: Flag, tone: "danger" as const },
        { label: t("admin.ops.revenueToday"), value: money(today.revenueToday, today.currency), icon: DollarSign, tone: "success" as const },
        ...(support
          ? [
              { label: t("support.stats.open"), value: nf.format(support.open), icon: LifeBuoy, tone: "brand" as const },
              { label: t("support.stats.high"), value: nf.format(support.highPriority), icon: LifeBuoy, tone: "danger" as const },
              { label: t("support.stats.waiting"), value: nf.format(support.waitingUser), icon: LifeBuoy, tone: "gold" as const },
              { label: t("support.stats.resolvedToday"), value: nf.format(support.resolvedToday), icon: LifeBuoy, tone: "success" as const },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <PageHeader
        kicker={t("admin.kicker.control")}
        title={t("admin.ops.title")}
        subtitle={t("admin.ops.sub")}
        actions={
          <Button size="sm" className="gap-2" onClick={() => { reload(); reloadAttention(); reloadSupport(); }}>
            <RefreshCw className="h-4 w-4" /> {t("admin.action.refresh")}
          </Button>
        }
      />

      {loading && !today ? (
        <p className="mb-6 text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} icon={c.icon} />)}
        </div>
      )}

      <Section
        title={t("admin.ops.todayTasks")}
        right={attention.length > 0 ? <Badge variant="warning">{attention.length}</Badge> : undefined}
      >
        {loadingAttention ? (
          <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
        ) : attention.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={t("admin.ops.allClearTitle")} description={t("admin.ops.allClearBody")} />
        ) : (
          <div className="space-y-5">
            {GROUP_ORDER.filter((g) => attention.some((i) => i.group === g)).map((g) => {
              const items = attention.filter((i) => i.group === g).slice(0, 6);
              const total = attention.filter((i) => i.group === g).length;
              return (
                <div key={g}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{t(GROUP_LABEL[g])}</h3>
                    <Badge variant="muted" className="rounded-full">{total}</Badge>
                  </div>
                  <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
                    {items.map((item) => {
                      const meta = ATTENTION_META[item.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={item.id} className="flex items-center gap-3 p-3">
                          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", meta.tone)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                              {item.urgency <= 1 && <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-danger-500)]" />}
                              <span className="truncate">{item.title}</span>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{item.detail} · {relative(item.at)}</p>
                          </div>
                          <Button size="sm" variant="outline" className="shrink-0 gap-1" asChild>
                            <Link to="/admin/$section" params={{ section: item.section }}>
                              {t("admin.ops.open")} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Section>


      <DashboardPanel />
    </>
  );
}

// -------------------------------------------------------- lead ops

export function LeadOpsPanel() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<LeadOpsFilter>("new");
  const { data: leads, loading, reload } = useLive<AdminLead[]>(() => fetchAdminLeads(filter), [], [filter]);
  const { data: agents } = useLive<AgentOption[]>(fetchAgentOptions, []);
  const [target, setTarget] = useState<AdminLead | null>(null);
  const [agentId, setAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  const assign = async () => {
    if (!target || !agentId) return;
    setSaving(true);
    try {
      const agent = agents.find((a) => a.id === agentId);
      await reassignLeadAgent(target, agentId, agent?.name ?? "Agent");
      toast.success(t("admin.ops.leadAssigned"));
      setTarget(null);
      setAgentId("");
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader kicker={t("admin.kicker.operations")} title={t("admin.ops.leads")} subtitle={t("admin.ops.leadsSub")} />
      <FilterBar
        value={filter}
        onChange={setFilter}
        options={[
          { id: "new", label: t("admin.ops.filter.new") },
          { id: "waiting", label: t("admin.ops.filter.waiting") },
          { id: "stale", label: t("admin.ops.filter.stale") },
          { id: "unassigned", label: t("admin.ops.filter.unassigned") },
          { id: "all", label: t("admin.filter.all") },
        ]}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : leads.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t("admin.ops.noLeadsTitle")} description={t("admin.ops.noLeadsBody")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((l) => (
            <div key={l.id} className="ds-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.visitor}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.contact ?? "—"}</p>
                </div>
                <Badge variant="muted" className="shrink-0 capitalize">{titleCase(l.status)}</Badge>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.property")}</dt><dd className="truncate font-medium text-foreground">{l.propertyTitle}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.owner")}</dt><dd className="truncate">{l.ownerName}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.agent")}</dt><dd className="truncate">{l.agentName ?? t("admin.ops.unassigned")}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.lastActivity")}</dt><dd>{relative(l.lastActivityAt)}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setTarget(l); setAgentId(""); }}>
                  {l.agentName ? t("admin.ops.reassign") : t("admin.ops.assignAgent")}
                </Button>
                {l.propertyId && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/property/${l.propertyId}`} target="_blank" rel="noreferrer">{t("admin.ops.viewProperty")}</a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.ops.assignAgent")}</DialogTitle>
            <DialogDescription>{t("admin.ops.assignBody")}</DialogDescription>
          </DialogHeader>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.ops.noAgents")}</p>
          ) : (
            <div className="space-y-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    agentId === a.id ? "border-primary bg-primary/5 font-semibold" : "border-border/60 hover:bg-secondary/50",
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{t("common.cancel")}</Button>
            <Button disabled={!agentId || saving} onClick={assign}>{t("admin.ops.confirmAssign")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------ viewing ops

export function ViewingOpsPanel() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<ViewingOpsFilter>("pending");
  const { data: rows, loading } = useLive<AdminViewing[]>(() => fetchAdminViewings(filter), [], [filter]);

  return (
    <>
      <PageHeader kicker={t("admin.kicker.operations")} title={t("admin.ops.viewings")} subtitle={t("admin.ops.viewingsSub")} />
      <FilterBar
        value={filter}
        onChange={setFilter}
        options={[
          { id: "pending", label: t("admin.ops.filter.pending") },
          { id: "upcoming", label: t("admin.ops.filter.upcoming") },
          { id: "completed", label: t("admin.ops.filter.completed") },
          { id: "cancelled", label: t("admin.ops.filter.cancelled") },
          { id: "all", label: t("admin.filter.all") },
        ]}
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Calendar} title={t("admin.ops.noViewingsTitle")} description={t("admin.ops.noViewingsBody")} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {rows.map((v) => (
              <div key={v.id} className="ds-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{v.propertyTitle}</p>
                  <Badge variant="muted" className="shrink-0 capitalize">{titleCase(v.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{v.buyerName} · {v.contact ?? "—"}</p>
                <p className="mt-2 text-xs">{new Date(v.scheduledAt).toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.ops.requested")} {relative(v.createdAt)}</p>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="ds-card hidden overflow-x-auto p-5 md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-3 pr-4 font-medium">{t("admin.ops.property")}</th>
                  <th className="py-3 pr-4 font-medium">{t("admin.ops.buyer")}</th>
                  <th className="py-3 pr-4 font-medium">{t("admin.ops.scheduled")}</th>
                  <th className="py-3 pr-4 font-medium">{t("admin.th.status")}</th>
                  <th className="py-3 pr-4 font-medium">{t("admin.ops.requested")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pr-4 font-medium">{v.propertyTitle}</td>
                    <td className="py-3 pr-4">{v.buyerName}<div className="text-xs text-muted-foreground">{v.contact ?? "—"}</div></td>
                    <td className="py-3 pr-4">{new Date(v.scheduledAt).toLocaleString()}</td>
                    <td className="py-3 pr-4"><Badge variant="muted" className="capitalize">{titleCase(v.status)}</Badge></td>
                    <td className="py-3 pr-4 text-muted-foreground">{relative(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// --------------------------------------------------------- deal ops

export function DealOpsPanel() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<DealOpsFilter>("active");
  const { data: rows, loading } = useLive<AdminDeal[]>(() => fetchAdminDeals(filter), [], [filter]);

  return (
    <>
      <PageHeader kicker={t("admin.kicker.operations")} title={t("admin.ops.deals")} subtitle={t("admin.ops.dealsSub")} />
      <FilterBar
        value={filter}
        onChange={setFilter}
        options={[
          { id: "active", label: t("admin.ops.filter.active") },
          { id: "attention", label: t("admin.ops.filter.attention") },
          { id: "completed", label: t("admin.ops.filter.completed") },
          { id: "cancelled", label: t("admin.ops.filter.cancelled") },
          { id: "all", label: t("admin.filter.all") },
        ]}
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("admin.ops.noDealsTitle")} description={t("admin.ops.noDealsBody")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => (
            <div key={d.id} className="ds-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-muted-foreground">{d.reference}</p>
                  <p className="truncate font-semibold">{d.propertyTitle}</p>
                </div>
                <Badge variant={d.health === "at_risk" ? "destructive" : d.health === "waiting" ? "warning" : "muted"} className="shrink-0 capitalize">
                  {titleCase(d.health)}
                </Badge>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.stage")}</dt><dd className="font-medium text-foreground">{titleCase(d.stage)}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.buyer")}</dt><dd className="truncate">{d.buyerName}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.owner")}</dt><dd className="truncate">{d.ownerName}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.agent")}</dt><dd className="truncate">{d.agentName ?? t("admin.ops.unassigned")}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.value")}</dt><dd>{d.value ? money(d.value, d.currency) : "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt>{t("admin.ops.lastActivity")}</dt><dd>{relative(d.lastActivityAt)}</dd></div>
              </dl>
              {d.propertyId && (
                <Button size="sm" variant="ghost" className="mt-3" asChild>
                  <a href={`/property/${d.propertyId}`} target="_blank" rel="noreferrer">{t("admin.ops.viewProperty")}</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------- revenue

export function RevenueOpsPanel() {
  const { t } = useI18n();
  const { data, loading } = useLive<RevenueBreakdown | null>(fetchRevenueBreakdown, null);
  return (
    <>
      <PageHeader kicker={t("admin.kicker.revenue")} title={t("admin.ops.revenue")} subtitle={t("admin.ops.revenueSub")} />
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : !data ? null : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label={t("admin.ops.revenueToday")} value={money(data.today, data.currency)} tone="success" icon={DollarSign} />
            <StatCard label={t("admin.ops.revenueMonth")} value={money(data.month, data.currency)} tone="brand" icon={DollarSign} />
            <StatCard label={t("admin.ops.revenueTotal")} value={money(data.total, data.currency)} tone="gold" icon={DollarSign} />
          </div>
          <Section title={t("admin.ops.revenueByPurpose")}>
            {data.byPurpose.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.ops.noRevenue")}</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.byPurpose.map((p) => (
                  <li key={p.purpose} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-medium">{titleCase(p.purpose)}</span>
                    <span className="text-muted-foreground">{p.count} · <span className="font-semibold text-foreground">{money(p.amount, data.currency)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <p className="text-xs text-muted-foreground">{t("admin.ops.confirmedOnly")}</p>
        </>
      )}
    </>
  );
}

// ----------------------------------------------------- activity log

export function ActivityLogPanel() {
  const { t } = useI18n();
  const { data: rows, loading } = useLive<AdminActionLog[]>(fetchAdminActionLog, []);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => rows.filter((r) => (r.action + r.adminName + (r.targetLabel ?? "")).toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  return (
    <>
      <PageHeader kicker={t("admin.kicker.system")} title={t("admin.ops.log")} subtitle={t("admin.ops.logSub")} />
      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.ops.searchLog")} className="pl-9" />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading.live")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileClock} title={t("admin.ops.noLogTitle")} description={t("admin.ops.noLogBody")} />
      ) : (
        <div className="ds-card p-5">
          <ul className="divide-y divide-border/50">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{titleCase(r.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.adminName} · {titleCase(r.targetType)}{r.targetLabel ? ` · ${r.targetLabel}` : ""}
                  </p>
                  {r.reason && <p className="mt-1 text-xs text-muted-foreground">“{r.reason}”</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relative(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** Small reusable reason prompt used by moderation actions. */
export function ReasonDialog({
  open, title, description, confirmLabel, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder={t("admin.ops.reasonPlaceholder")} />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button disabled={reason.trim().length < 5} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
