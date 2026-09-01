import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Users, UserPlus, Contact, Calendar, Handshake, CheckCircle2, TrendingUp,
  DollarSign, PlusSquare, FileSpreadsheet, FileText, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, MapPin, Eye, MessageSquare, Building2, Clock,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatCard, EmptyState, SkeletonCard } from "@/components/ds";
import { useI18n } from "@/hooks/use-i18n";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ANALYTICS_RANGES, conversionRate, fetchAnalytics, fetchResponseMinutes, growth,
  type AnalyticsRange, type AnalyticsReport,
} from "@/lib/analytics-db";

export const Route = createFileRoute("/_authenticated/business-intelligence")({
  head: () => ({
    meta: [
      { title: "Business Intelligence — SPACES" },
      { name: "description", content: "Live KPIs, market performance, lead funnel and revenue across the SPACES platform." },
    ],
  }),
  component: BIPage,
});

function money(n: number, ccy = "TZS") {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${ccy} ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${ccy} ${(v / 1_000).toFixed(0)}K`;
  return `${ccy} ${Math.round(v)}`;
}

const nf = new Intl.NumberFormat();

function BIPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [responseMin, setResponseMin] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchAnalytics(range), fetchResponseMinutes(range).catch(() => null)])
      .then(([r, m]) => { if (!alive) return; setReport(r); setResponseMin(m); })
      .catch((e) => { if (alive) setError(friendlyError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  const rangeLabel = t(`bi.range.${range}`);

  const kpis = useMemo(() => {
    if (!report) return [];
    const k = report.kpis;
    const p = report.previous;
    return [
      { label: t("bi.kpi.activeProperties"), value: nf.format(k.active_properties), icon: Home, tone: "brand" as const },
      { label: t("bi.kpi.newProperties"), value: nf.format(k.new_properties), icon: PlusSquare, tone: "brand" as const, delta: growth(k.new_properties, p.new_properties) },
      { label: t("bi.kpi.activeUsers"), value: nf.format(k.active_users), icon: Users, tone: "muted" as const },
      { label: t("bi.kpi.newUsers"), value: nf.format(k.new_users), icon: UserPlus, tone: "muted" as const, delta: growth(k.new_users, p.new_users) },
      { label: t("bi.kpi.newLeads"), value: nf.format(k.new_leads), icon: Contact, tone: "brand" as const, delta: growth(k.new_leads, p.new_leads) },
      { label: t("bi.kpi.viewingRequests"), value: nf.format(k.viewing_requests), icon: Calendar, tone: "gold" as const },
      { label: t("bi.kpi.activeDeals"), value: nf.format(k.active_deals), icon: Handshake, tone: "brand" as const },
      { label: t("bi.kpi.completedDeals"), value: nf.format(k.completed_deals), icon: CheckCircle2, tone: "success" as const, delta: growth(k.completed_deals, p.completed_deals) },
      { label: t("bi.kpi.conversion"), value: `${conversionRate(report)}%`, icon: TrendingUp, tone: "success" as const },
      { label: t("bi.kpi.revenue"), value: money(k.confirmed_revenue), icon: DollarSign, tone: "gold" as const, delta: growth(k.confirmed_revenue, p.revenue) },
    ];
  }, [report, t]);

  const funnel = useMemo(() => {
    if (!report) return [];
    const f = report.funnel;
    const steps = [
      { label: t("bi.funnel.views"), value: f.views },
      { label: t("bi.funnel.leads"), value: f.leads },
      { label: t("bi.funnel.viewings"), value: f.viewings },
      { label: t("bi.funnel.viewingsDone"), value: f.viewings_completed },
      { label: t("bi.funnel.deals"), value: f.deals },
      { label: t("bi.funnel.dealsDone"), value: f.deals_completed },
    ];
    const top = Math.max(1, steps[0].value);
    return steps.map((s, i) => ({
      ...s,
      width: Math.max(4, Math.round((s.value / top) * 100)),
      rate: i === 0 ? null : steps[i - 1].value ? Math.round((s.value / steps[i - 1].value) * 100) : null,
    }));
  }, [report, t]);

  const attentionItems = useMemo(() => {
    if (!report) return [];
    const a = report.attention;
    const list: { label: string; count: number; to: string }[] = [
      { label: t("bi.attention.leadsWaiting"), count: a.leads_waiting, to: "/admin/leads" },
      { label: t("bi.attention.silentProperties"), count: a.silent_properties, to: "/admin/properties" },
      { label: t("bi.attention.viewingsPending"), count: a.viewings_pending, to: "/admin/viewings" },
      { label: t("bi.attention.staleDeals"), count: a.stale_deals, to: "/admin/deals" },
      { label: t("bi.attention.failedPayments"), count: a.failed_payments, to: "/admin/revenue" },
      { label: t("bi.attention.pendingVerifications"), count: a.pending_verifications, to: "/admin/verification" },
      { label: t("bi.attention.openTickets"), count: a.open_tickets, to: "/admin/support" },
      { label: t("bi.attention.propertiesReview"), count: a.properties_review, to: "/admin/properties" },
    ];
    return list.filter((i) => i.count > 0);
  }, [report, t]);

  const csvRows = (r: AnalyticsReport): (string | number)[][] => [
    [t("bi.export.metric"), t("bi.export.value")],
    [t("bi.export.period"), rangeLabel],
    [t("bi.kpi.activeProperties"), r.kpis.active_properties],
    [t("bi.kpi.newProperties"), r.kpis.new_properties],
    [t("bi.kpi.activeUsers"), r.kpis.active_users],
    [t("bi.kpi.newUsers"), r.kpis.new_users],
    [t("bi.kpi.newLeads"), r.kpis.new_leads],
    [t("bi.kpi.viewingRequests"), r.kpis.viewing_requests],
    [t("bi.kpi.activeDeals"), r.kpis.active_deals],
    [t("bi.kpi.completedDeals"), r.kpis.completed_deals],
    [t("bi.kpi.conversion"), `${conversionRate(r)}%`],
    [t("bi.revenue.confirmed"), r.revenue.confirmed],
    [t("bi.revenue.pending"), r.revenue.pending],
    [],
    [t("bi.funnel.title")],
    [t("bi.funnel.views"), r.funnel.views],
    [t("bi.funnel.leads"), r.funnel.leads],
    [t("bi.funnel.viewings"), r.funnel.viewings],
    [t("bi.funnel.viewingsDone"), r.funnel.viewings_completed],
    [t("bi.funnel.deals"), r.funnel.deals],
    [t("bi.funnel.dealsDone"), r.funnel.deals_completed],
    [],
    [t("bi.top.title"), t("bi.metric.views"), t("bi.metric.favorites"), t("bi.metric.leads"), t("bi.metric.viewings"), t("bi.metric.deals")],
    ...r.top_properties.map((p) => [p.title, p.views, p.favorites, p.leads, p.viewings, p.completed_deals]),
  ];

  const exportCsv = () => {
    if (!report) return;
    const csv = csvRows(report)
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `spaces-analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!report) return;
    const rows = csvRows(report)
      .map((r) => (r.length === 0 ? "<tr><td colspan=6>&nbsp;</td></tr>" : `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`))
      .join("");
    const w = window.open("", "_blank");
    if (!w) { toast.error(t("bi.export.popupBlocked")); return; }
    w.document.write(`<!doctype html><html><head><title>SPACES Analytics</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{margin:0 0 4px;font-size:20px}
      table{border-collapse:collapse;width:100%;margin-top:16px;font-size:12px}
      td{border:1px solid #ddd;padding:6px 8px;text-align:left}</style></head><body>
      <h1>SPACES — ${t("bi.title")}</h1>
      <p>${rangeLabel} · ${new Date().toLocaleString()}</p>
      <table><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <DashboardShell>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t("bi.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("bi.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANALYTICS_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>{t(`bi.range.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setRange((r) => r)} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />{t("common.refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={!report}>
              <FileText className="mr-2 h-4 w-4" />PDF
            </Button>
          </div>
        </header>

        {error && (
          <div className="ds-card border-destructive/40 p-4 text-sm text-destructive">{error}</div>
        )}

        {loading && !report ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : report ? (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {kpis.map((k) => (
                <div key={k.label} className="space-y-1">
                  <StatCard label={k.label} value={k.value} icon={k.icon} tone={k.tone} />
                  {"delta" in k && (
                    <p className={cn(
                      "px-1 text-xs",
                      k.delta === null || k.delta === undefined ? "text-muted-foreground"
                        : k.delta >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}>
                      {k.delta === null || k.delta === undefined ? t("bi.growth.notEnough") : (
                        <span className="inline-flex items-center gap-1">
                          {k.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(k.delta)}% {t("bi.growth.vsPrevious")}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Funnel */}
              <section className="ds-card p-4 lg:col-span-2">
                <h2 className="ds-h-sm">{t("bi.funnel.title")}</h2>
                <div className="mt-3 space-y-2">
                  {funnel.map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-semibold">
                          {nf.format(s.value)}
                          {s.rate !== null && <span className="ml-2 text-xs font-normal text-muted-foreground">{s.rate}%</span>}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${s.width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Needs attention */}
              <section className="ds-card p-4">
                <h2 className="ds-h-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />{t("bi.attention.title")}
                </h2>
                {attentionItems.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t("bi.attention.allClear")}</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {attentionItems.map((i) => (
                      <li key={i.label}>
                        <Link
                          to={i.to as never}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-accent"
                        >
                          <span>{i.label}</span>
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            {i.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Revenue */}
            <section className="ds-card p-4">
              <h2 className="ds-h-sm">{t("bi.revenue.title")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <p className="ds-caption">{t("bi.revenue.confirmed")}</p>
                  <p className="font-display text-2xl font-semibold">{money(report.revenue.confirmed)}</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <p className="ds-caption">{t("bi.revenue.pending")}</p>
                  <p className="font-display text-2xl font-semibold">{money(report.revenue.pending)}</p>
                </div>
              </div>
              {report.revenue.rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t("bi.revenue.none")}</p>
              ) : (
                <ul className="mt-3 divide-y divide-border/60 text-sm">
                  {report.revenue.rows.map((r) => (
                    <li key={r.purpose} className="flex items-center justify-between gap-2 py-2">
                      <span className="capitalize text-muted-foreground">{t(`bi.revenue.purpose.${r.purpose}`, {}, r.purpose.replace(/_/g, " "))}</span>
                      <span className="text-right">
                        <span className="font-semibold text-emerald-600">{money(r.confirmed)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">+{money(r.pending)} {t("bi.revenue.pendingShort")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t("bi.revenue.note")}</p>
            </section>

            {/* Top properties */}
            <section className="ds-card p-4">
              <h2 className="ds-h-sm">{t("bi.top.title")}</h2>
              {report.top_properties.length === 0 ? (
                <EmptyState title={t("bi.empty.title")} description={t("bi.empty.body")} />
              ) : (
                <ul className="mt-3 space-y-2">
                  {report.top_properties.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[p.district, p.region].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link to="/property/$id" params={{ id: p.id }}>{t("bi.open")}</Link>
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
                        <Metric label={t("bi.metric.views")} value={p.views} />
                        <Metric label={t("bi.metric.favorites")} value={p.favorites} />
                        <Metric label={t("bi.metric.leads")} value={p.leads} />
                        <Metric label={t("bi.metric.viewings")} value={p.viewings} />
                        <Metric label={t("bi.metric.deals")} value={p.completed_deals} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Market performance */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <RankList
                title={t("bi.market.locations")} icon={MapPin}
                items={report.top_locations.map((l) => ({ key: l.name, label: l.name, value: `${nf.format(l.views)} ${t("bi.metric.views").toLowerCase()}` }))}
                empty={t("bi.empty.body")}
              />
              <RankList
                title={t("bi.market.mostViewed")} icon={Eye}
                items={report.most_viewed.map((p) => ({ key: p.id, label: p.title, value: nf.format(p.views), to: `/property/${p.id}` }))}
                empty={t("bi.empty.body")}
              />
              <RankList
                title={t("bi.market.mostContacted")} icon={MessageSquare}
                items={report.most_contacted.map((p) => ({ key: p.id, label: p.title, value: nf.format(p.leads), to: `/property/${p.id}` }))}
                empty={t("bi.empty.body")}
              />
              <RankList
                title={t("bi.market.types")} icon={Building2}
                items={report.top_types.map((x) => ({ key: x.name, label: t(`propertyType.${x.name}`, {}, x.name), value: `${nf.format(x.leads)} ${t("bi.metric.leads").toLowerCase()}` }))}
                empty={t("bi.empty.body")}
              />
              <RankList
                title={t("bi.market.areas")} icon={MapPin}
                items={report.top_areas.map((x) => ({ key: x.name, label: x.name, value: nf.format(x.activity) }))}
                empty={t("bi.empty.body")}
              />
              <div className="ds-card p-4">
                <h3 className="ds-h-sm flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{t("bi.market.response")}</h3>
                <p className="mt-3 font-display text-3xl font-semibold">
                  {responseMin === null ? "—" : `${responseMin}m`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {responseMin === null ? t("bi.growth.notEnough") : t("bi.market.responseNote")}
                </p>
              </div>
            </section>

            {/* People performance */}
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="ds-card p-4">
                <h2 className="ds-h-sm">{t("bi.agents.title")}</h2>
                {report.agents.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t("bi.empty.body")}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {report.agents.map((a) => (
                      <li key={a.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{a.name ?? t("bi.people.unnamed")}</p>
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/profile/$handle" params={{ handle: a.id }}>{t("bi.open")}</Link>
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <Metric label={t("bi.metric.leads")} value={a.leads_handled} />
                          <Metric label={t("bi.metric.viewings")} value={a.viewings_completed} />
                          <Metric label={t("bi.metric.deals")} value={a.deals_completed} />
                          <Metric label={t("bi.kpi.conversion")} value={`${a.conversion}%`} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ds-card p-4">
                <h2 className="ds-h-sm">{t("bi.owners.title")}</h2>
                {report.owners.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t("bi.empty.body")}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {report.owners.map((o) => (
                      <li key={o.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{o.name ?? t("bi.people.unnamed")}</p>
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/profile/$handle" params={{ handle: o.id }}>{t("bi.open")}</Link>
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
                          <Metric label={t("bi.metric.listings")} value={o.active_listings} />
                          <Metric label={t("bi.metric.views")} value={o.views} />
                          <Metric label={t("bi.metric.leads")} value={o.leads} />
                          <Metric label={t("bi.metric.viewings")} value={o.viewings} />
                          <Metric label={t("bi.metric.deals")} value={o.completed_deals} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{typeof value === "number" ? nf.format(value) : value}</p>
    </div>
  );
}

function RankList({
  title, icon: Icon, items, empty,
}: {
  title: string;
  icon: typeof MapPin;
  items: { key: string; label: string; value: string; to?: string }[];
  empty: string;
}) {
  return (
    <div className="ds-card p-4">
      <h3 className="ds-h-sm flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex items-center justify-between gap-3 py-2">
              {i.to ? (
                <Link to={i.to as never} className="min-w-0 flex-1 truncate hover:underline">{i.label}</Link>
              ) : (
                <span className="min-w-0 flex-1 truncate">{i.label}</span>
              )}
              <span className="shrink-0 font-semibold">{i.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
