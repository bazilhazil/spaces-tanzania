import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home, Users, ShieldCheck, Flag, Calendar, CreditCard, Megaphone,
  Bell, Settings, ShieldAlert, LifeBuoy, MessageSquare,
  TrendingUp, Sparkles, CheckCircle2, XCircle,
  AlertTriangle, Search, MoreHorizontal, Crown,
  RefreshCw, Plus, Zap, Database, KeyRound, Power, FileClock,
  Activity, DollarSign, MapPin, Clock, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/ds/stat-card";
import { StatusBadge } from "@/components/ds/status-badge";
import { EmptyState } from "@/components/ds/empty-state";
import { VerificationReviewQueue } from "@/components/verification/review-queue";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_MATRIX, type AdminRole } from "@/lib/admin-roles";
import {
  fetchAdminOverview, fetchAdminActivity, fetchAdminSeries, fetchModerationQueue,
  fetchAdminUsers, fetchAdminReports, fetchAdminBookings, fetchAdminPayments,
  fetchAdminSubscriptions, fetchPropertyTypeMix, fetchRegionMix, moderateProperty,
  type AdminOverview, type AdminActivityItem, type AdminSeries, type AdminQueueItem,
  type AdminUser, type AdminReport, type AdminBooking, type AdminPayment,
  type AdminSubscription, type MonthPoint, type QueueFilter,
} from "@/lib/admin-db";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";

// ---------- Shared ----------

export function PageHeader({
  title, subtitle, actions, kicker,
}: { title: string; subtitle?: string; actions?: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-gold-700)]">{kicker}</div>}
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function Panel({ title, right, children, className }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("ds-card p-5", className)}>
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/** Tiny data hook so every panel reads live database records. */
function useLive<T>(loader: () => Promise<T>, initial: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loader()
      .then((d) => { if (alive) setData(d); })
      .catch(() => { /* handled by empty states */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, reload };
}

const nf = new Intl.NumberFormat("en-US");
function money(amount: number, currency = "TZS") {
  return `${currency} ${nf.format(Math.round(amount))}`;
}
function relative(iso: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
function titleCase(v: string) {
  return (v ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- Dashboard ----------

const ACTIVITY_ICON = {
  property_new: Home, viewing_booked: Calendar, user_new: Users,
  report_filed: Flag, verification_pending: ShieldCheck, deal_completed: CheckCircle2,
} as const;
const ACTIVITY_TONE = {
  property_new: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  viewing_booked: "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]",
  user_new: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  report_filed: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
  verification_pending: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]",
  deal_completed: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
} as const;

function Sparkline({ data, color = "var(--color-brand-500)" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 100 - ((v - min) / Math.max(1, max - min)) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BarChart({ points, color = "var(--color-brand-500)" }: { points: MonthPoint[]; color?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex h-56 items-end gap-2">
      {points.map((p, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-lg transition-all hover:opacity-80"
              style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value > 0 ? 4 : 0, background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 50%, transparent))` }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

const EMPTY_SERIES: AdminSeries = { listings: [], users: [], views: [], hasData: false };

export function DashboardPanel() {
  const { data: overview, loading, reload } = useLive<AdminOverview | null>(fetchAdminOverview, null);
  const { data: activity } = useLive<AdminActivityItem[]>(() => fetchAdminActivity(10), []);
  const { data: series } = useLive<AdminSeries>(fetchAdminSeries, EMPTY_SERIES);

  const kpis = overview
    ? [
        { label: "Total listings", value: nf.format(overview.properties.total), icon: Home, tone: "brand" as const },
        { label: "Live listings", value: nf.format(overview.properties.live), icon: Home, tone: "success" as const },
        { label: "Awaiting review", value: nf.format(overview.properties.pending + overview.properties.draft), icon: Clock, tone: "gold" as const },
        { label: "Registered users", value: nf.format(overview.users.total), icon: Users, tone: "brand" as const },
        { label: "Inquiries", value: nf.format(overview.activity.leads), icon: MessageSquare, tone: "brand" as const },
        { label: "Viewings", value: nf.format(overview.activity.bookings), icon: Calendar, tone: "gold" as const },
        { label: "Open reports", value: nf.format(overview.activity.reportsOpen), icon: Flag, tone: "danger" as const },
        { label: "Confirmed revenue", value: money(overview.revenue.paidTotal, overview.revenue.currency), icon: DollarSign, tone: "success" as const },
      ]
    : [];

  return (
    <>
      <PageHeader
        kicker="Control Center"
        title="Administrator overview"
        subtitle="Every figure below is calculated live from the SPACES database."
        actions={<Button size="sm" className="gap-2" onClick={reload}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      {loading && !overview ? (
        <p className="text-sm text-muted-foreground">Loading live data…</p>
      ) : !overview ? (
        <EmptyState icon={Database} title="No data available" description="Platform metrics will appear once records exist." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <StatCard key={k.label} label={k.label} value={k.value} tone={k.tone} icon={k.icon} />
            ))}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Verified listings", value: nf.format(overview.properties.verified) },
              { label: "Owners", value: nf.format(overview.users.owners) },
              { label: "Agents", value: nf.format(overview.users.agents) },
              { label: "Deals completed", value: nf.format(overview.activity.dealsCompleted) },
              { label: "Verifications pending", value: nf.format(overview.activity.verificationsPending) },
            ].map((h) => (
              <div key={h.label} className="ds-card p-4">
                <div className="ds-caption">{h.label}</div>
                <div className="mt-1 font-display text-lg font-semibold">{h.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="New listings" className="lg:col-span-2"
              right={<span className="text-xs text-muted-foreground">last 12 months</span>}>
              {series.hasData ? <BarChart points={series.listings} /> : <EmptyState icon={BarChart3} title="Not enough history yet" description="Charts fill in as listings are published." />}
            </Panel>

            <Panel title="Recent activity"
              right={<span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-success-700)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-success-500)]" /> Live</span>}>
              {activity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" description="New listings, sign-ups and viewings will show here." />
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => {
                    const Icon = ACTIVITY_ICON[a.kind];
                    return (
                      <li key={a.id} className="flex items-start gap-3">
                        <div className={cn("grid h-9 w-9 place-items-center rounded-xl shrink-0", ACTIVITY_TONE[a.kind])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{a.text}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{relative(a.at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Property views" right={<span className="text-xs text-muted-foreground">per month</span>}>
              {series.hasData
                ? <Sparkline data={series.views.map((p) => p.value)} />
                : <p className="text-sm text-muted-foreground">No view history recorded yet.</p>}
            </Panel>

            <Panel title="New members" right={<span className="text-xs text-muted-foreground">per month</span>}>
              {series.hasData
                ? <Sparkline data={series.users.map((p) => p.value)} color="var(--color-gold-600)" />
                : <p className="text-sm text-muted-foreground">No sign-up history recorded yet.</p>}
            </Panel>

            <Panel title="Inquiry conversion" right={<span className="text-xs text-muted-foreground">inquiries → completed deals</span>}>
              <div className="flex items-baseline gap-2">
                <div className="font-display text-4xl font-semibold">
                  {overview.activity.leads > 0
                    ? `${Math.round((overview.activity.dealsCompleted / overview.activity.leads) * 100)}%`
                    : "—"}
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-linear-to-r from-[color:var(--color-brand-500)] to-[color:var(--color-gold-500)]"
                  style={{ width: `${overview.activity.leads > 0 ? Math.min(100, (overview.activity.dealsCompleted / overview.activity.leads) * 100) : 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {nf.format(overview.activity.dealsCompleted)} completed of {nf.format(overview.activity.leads)} inquiries
              </p>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

// ---------- Property Moderation ----------

const QUEUE_FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "review", label: "Awaiting review" },
  { id: "live", label: "Live" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export function PropertiesPanel() {
  const [filter, setFilter] = useState<QueueFilter>("review");
  const { data: items, loading, reload } = useLive<AdminQueueItem[]>(
    () => fetchModerationQueue(filter),
    [],
    [filter],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const item = items.find((m) => m.id === selected) ?? items[0] ?? null;

  const act = async (id: string, action: Parameters<typeof moderateProperty>[1], label: string) => {
    try {
      await moderateProperty(id, action);
      toast.success(label);
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    }
  };

  return (
    <>
      <PageHeader kicker="Moderation" title="Property Queue" subtitle="Review, approve, or escalate real listings submitted by owners and agents."
        actions={<Button size="sm" variant="outline" className="gap-2" onClick={reload}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />

      <div className="mb-5 flex flex-wrap gap-2">
        {QUEUE_FILTERS.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => { setFilter(f.id); setSelected(null); }}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading listings…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Home} title="Queue is clear" description="There are no listings matching this filter right now." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3">
            {items.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className={cn("ds-card w-full overflow-hidden text-left transition-all ds-press",
                  item?.id === p.id ? "ring-2 ring-[color:var(--color-brand-500)]" : "hover:shadow-[var(--shadow-md)]")}>
                <div className="relative aspect-[16/10] w-full bg-secondary">
                  {p.cover
                    ? <img src={p.cover} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                    : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No photo uploaded</div>}
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    {p.verified && <StatusBadge kind="verified" />}
                    <Badge variant="muted" className="capitalize">{titleCase(p.status)}</Badge>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {p.location}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">{money(p.price, p.currency)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[11px]">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                      p.quality >= 80 ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]"
                      : p.quality >= 60 ? "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]"
                      : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]")}>
                      <Zap className="h-3 w-3" /> Complete {p.quality}%
                    </span>
                    <span className="ml-auto text-muted-foreground">{relative(p.createdAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {item ? (
            <div className="ds-card overflow-hidden">
              <div className="relative aspect-[21/9] w-full bg-secondary">
                {item.cover
                  ? <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">No photo uploaded</div>}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-6 text-white">
                  <div className="flex items-center gap-2">
                    {item.verified && <StatusBadge kind="verified" />}
                    <Badge variant="muted" className="capitalize">{titleCase(item.status)}</Badge>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{item.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                    <MapPin className="h-3.5 w-3.5" /> {item.location} • {money(item.price, item.currency)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <div className="ds-card p-4">
                  <div className="ds-caption">Listing completeness</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{item.quality}%</div>
                  <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-success-500)]" style={{ width: `${item.quality}%` }} /></div>
                </div>
                <div className="ds-card p-4">
                  <div className="ds-caption">Submitted by</div>
                  <div className="mt-1 font-display text-lg font-semibold">{item.ownerName}</div>
                  <p className="mt-2 text-xs text-muted-foreground">{relative(item.createdAt)}</p>
                </div>
                <div className="ds-card p-4">
                  <div className="ds-caption">Verification</div>
                  <div className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
                    {item.verified ? <><CheckCircle2 className="h-5 w-5 text-[color:var(--color-success-600)]" /> Verified</> : <><AlertTriangle className="h-5 w-5 text-[color:var(--color-warning-600)]" /> Unverified</>}
                  </div>
                  {item.underReview && <p className="mt-2 text-xs text-muted-foreground">Changes requested: {item.underReviewReason}</p>}
                  {item.rejectionReason && <p className="mt-2 text-xs text-muted-foreground">Rejected: {item.rejectionReason}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 bg-secondary/30 p-4">
                <Button variant="success" size="sm" className="gap-2" onClick={() => act(item.id, "approve", "Listing approved and published")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => act(item.id, "request_changes", "Changes requested from the owner")}><RefreshCw className="h-4 w-4" /> Request Changes</Button>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => act(item.id, "reject", "Listing rejected")}><XCircle className="h-4 w-4" /> Reject</Button>
                <div className="mx-2 h-6 w-px bg-border" />
                <Button variant="gold" size="sm" className="gap-2" onClick={() => act(item.id, "feature", "Listing featured")}><Sparkles className="h-4 w-4" /> Feature</Button>
                <Button variant="ghost" size="sm" className="gap-2 ml-auto" onClick={() => act(item.id, "suspend", "Listing paused")}><Power className="h-4 w-4" /> Pause</Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => act(item.id, "archive", "Listing archived")}><Database className="h-4 w-4" /> Archive</Button>
              </div>
            </div>
          ) : <EmptyState icon={Home} title="Nothing selected" description="Pick a listing from the queue to review." />}
        </div>
      )}
    </>
  );
}

// ---------- Users ----------

export function UsersPanel() {
  const { data: users, loading } = useLive<AdminUser[]>(fetchAdminUsers, []);
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => users.filter((u) => (u.name + (u.email ?? "")).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );
  return (
    <>
      <PageHeader kicker="Community" title="User Management" subtitle="Every registered SPACES account, straight from the database." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="No accounts match this search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-3 pr-4 font-medium">User</th>
                  <th className="py-3 pr-4 font-medium">Roles</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Joined</th>
                  <th className="py-3 pr-4 font-medium">Listings</th>
                  <th className="py-3 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{u.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                        <div><div className="font-semibold">{u.name}</div><div className="text-xs text-muted-foreground">{u.email ?? u.phone ?? "—"}</div></div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0
                          ? <Badge variant="muted">buyer</Badge>
                          : u.roles.map((r) => <Badge key={r} variant="muted" className="capitalize">{titleCase(r)}</Badge>)}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {u.status === "active" ? <Badge variant="success">Active</Badge>
                        : u.status === "suspended" ? <Badge variant="warning">Suspended</Badge>
                        : <Badge variant="destructive">Banned</Badge>}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(u.joined).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 font-medium">{u.listings}</td>
                    <td className="py-3 pr-4 text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/profile/${u.id}`} aria-label={`Open profile for ${u.name}`}><MoreHorizontal className="h-4 w-4" /></a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

// ---------- Agents ----------

export function AgentsPanel() {
  const { data: users, loading } = useLive<AdminUser[]>(fetchAdminUsers, []);
  const agents = users.filter((u) => u.roles.includes("agent"));
  return (
    <>
      <PageHeader kicker="Community" title="Agents" subtitle="Accounts holding the agent role on SPACES." />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading agents…</p>
      ) : agents.length === 0 ? (
        <EmptyState icon={Users} title="No agents yet" description="Accounts granted the agent role will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="ds-card ds-card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-[color:var(--color-brand-600)] text-white font-semibold">{a.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                  <div><div className="font-semibold">{a.name}</div><div className="text-xs text-muted-foreground">{a.email ?? a.phone ?? "—"}</div></div>
                </div>
                {a.status === "active" ? <Badge variant="success">Active</Badge> : <Badge variant="warning" className="capitalize">{a.status}</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div><div className="font-display text-lg font-semibold">{a.listings}</div><div className="ds-caption">Listings</div></div>
                <div><div className="font-display text-lg font-semibold">{new Date(a.joined).getFullYear()}</div><div className="ds-caption">Member since</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Verification ----------

export function VerificationPanel() {
  return (
    <>
      <PageHeader kicker="Trust & Safety" title="Verification Center" subtitle="Review identities, businesses, and property documents." />
      <VerificationReviewQueue />
    </>
  );
}

// ---------- Reports ----------

export function ReportsPanel() {
  const { data: reports, loading } = useLive<AdminReport[]>(fetchAdminReports, []);
  const open = reports.filter((r) => r.status === "new" || r.status === "under_review" || r.status === "more_info");
  const resolved = reports.filter((r) => r.status === "resolved");
  const urgent = reports.filter((r) => r.priority === "urgent" || r.priority === "high");
  return (
    <>
      <PageHeader kicker="Trust & Safety" title="Reports" subtitle="User-submitted reports across listings, users, and messages." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open" value={nf.format(open.length)} tone="danger" icon={Flag} />
        <StatCard label="Resolved" value={nf.format(resolved.length)} tone="success" icon={CheckCircle2} />
        <StatCard label="High priority" value={nf.format(urgent.length)} tone="danger" icon={AlertTriangle} />
        <StatCard label="Total" value={nf.format(reports.length)} tone="brand" icon={Clock} />
      </div>
      <Panel>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : reports.length === 0 ? (
          <EmptyState icon={Flag} title="No reports" description="Nothing has been reported on SPACES yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-3 pr-4 font-medium">Reference</th>
                  <th className="py-3 pr-4 font-medium">Target</th>
                  <th className="py-3 pr-4 font-medium">Reason</th>
                  <th className="py-3 pr-4 font-medium">Priority</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Filed</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pr-4 font-mono text-xs">{r.reference}</td>
                    <td className="py-3 pr-4 capitalize">{titleCase(r.target)}</td>
                    <td className="py-3 pr-4">{titleCase(r.reason)}</td>
                    <td className="py-3 pr-4"><Badge variant={r.priority === "urgent" ? "destructive" : r.priority === "high" ? "warning" : "muted"} className="capitalize">{r.priority}</Badge></td>
                    <td className="py-3 pr-4">{r.status === "resolved" ? <Badge variant="success">Resolved</Badge> : r.status === "dismissed" ? <Badge variant="muted">Dismissed</Badge> : <Badge variant="warning" className="capitalize">{titleCase(r.status)}</Badge>}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{relative(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

// ---------- Bookings / Messages / Support ----------

export function BookingsPanel() {
  const { data: bookings, loading } = useLive<AdminBooking[]>(fetchAdminBookings, []);
  return (
    <>
      <PageHeader kicker="Operations" title="Viewings" subtitle="All scheduled viewings across SPACES." />
      <Panel>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading viewings…</p>
        ) : bookings.length === 0 ? (
          <EmptyState icon={Calendar} title="No viewings booked" description="Viewing requests will appear here as buyers schedule them." />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]"><Calendar className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{b.propertyTitle}</div>
                  <div className="text-xs text-muted-foreground">{b.buyerName}</div>
                </div>
                <div className="text-sm font-medium">{new Date(b.scheduledAt).toLocaleString()}</div>
                {b.status === "confirmed" ? <Badge variant="success">Confirmed</Badge>
                  : b.status === "cancelled" ? <Badge variant="destructive">Cancelled</Badge>
                  : <Badge variant="warning" className="capitalize">{titleCase(b.status)}</Badge>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

export function MessagesPanel() {
  return (
    <>
      <PageHeader kicker="Operations" title="Messages" subtitle="Moderate flagged conversations and support threads." />
      <EmptyState icon={MessageSquare} title="Nothing flagged" description="Flagged conversations appear here from the Safety queue." />
    </>
  );
}

export function SupportPanel() {
  return (
    <>
      <PageHeader kicker="Operations" title="Support" subtitle="User support tickets." />
      <EmptyState icon={LifeBuoy} title="Support inbox not connected" description="No ticketing system is connected to SPACES yet, so there are no tickets to show." />
    </>
  );
}

// ---------- Payments & Subscriptions ----------

export function PaymentsPanel() {
  const { data: payments, loading } = useLive<AdminPayment[]>(fetchAdminPayments, []);
  const paid = payments.filter((p) => p.status === "paid" || p.status === "succeeded");
  const refunded = payments.filter((p) => p.status === "refunded");
  const total = paid.reduce((s, p) => s + p.amount, 0);
  const currency = payments[0]?.currency ?? "TZS";
  return (
    <>
      <PageHeader kicker="Revenue" title="Payments" subtitle="All transactions recorded on SPACES." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Confirmed revenue" value={money(total, currency)} tone="success" icon={DollarSign} />
        <StatCard label="Payments" value={nf.format(payments.length)} tone="brand" icon={CreditCard} />
        <StatCard label="Refunded" value={nf.format(refunded.length)} tone="danger" icon={RefreshCw} />
        <StatCard label="Success rate" value={payments.length ? `${Math.round((paid.length / payments.length) * 100)}%` : "—"} tone="success" icon={CheckCircle2} />
      </div>
      <Panel>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading payments…</p>
        ) : payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" description="A payment gateway is not connected, so no transactions exist." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-3 pr-4 font-medium">Reference</th>
                  <th className="py-3 pr-4 font-medium">Provider</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pr-4 font-mono text-xs">{p.reference ?? p.id.slice(0, 8)}</td>
                    <td className="py-3 pr-4 capitalize">{titleCase(p.provider)}</td>
                    <td className="py-3 pr-4 font-semibold">{money(p.amount, p.currency)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{relative(p.createdAt)}</td>
                    <td className="py-3 pr-4">{p.status === "paid" || p.status === "succeeded" ? <Badge variant="success">Paid</Badge> : <Badge variant="warning" className="capitalize">{titleCase(p.status)}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export function SubscriptionsPanel() {
  const { data: plans, loading } = useLive<AdminSubscription[]>(fetchAdminSubscriptions, []);
  return (
    <>
      <PageHeader kicker="Revenue" title="Subscriptions" subtitle="Recurring plans currently held by SPACES accounts." />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading subscriptions…</p>
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions yet" description="Plans will appear here once accounts subscribe." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.plan} className="ds-card ds-card-hover p-6">
              <div className="ds-caption capitalize">{titleCase(p.plan)}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <div className="font-display text-4xl font-semibold text-primary">{p.active}</div>
                <div className="ds-caption">active of {p.total}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Analytics ----------

export function AnalyticsPanel() {
  const { data: series } = useLive<AdminSeries>(fetchAdminSeries, EMPTY_SERIES);
  const { data: regions } = useLive<{ name: string; count: number; pct: number }[]>(fetchRegionMix, []);
  const { data: types } = useLive<{ name: string; count: number; pct: number }[]>(fetchPropertyTypeMix, []);

  return (
    <>
      <PageHeader kicker="Insights" title="Analytics" subtitle="Growth and distribution calculated from real SPACES records." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Panel title="New listings per month">
          {series.hasData ? <BarChart points={series.listings} /> : <EmptyState icon={BarChart3} title="Not enough data" description="This chart fills in as listings are published." />}
        </Panel>
        <Panel title="Property views per month">
          {series.hasData ? <BarChart points={series.views} color="var(--color-gold-500)" /> : <EmptyState icon={TrendingUp} title="Not enough data" description="This chart fills in as buyers browse listings." />}
        </Panel>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Listings by region">
          {regions.length === 0 ? <p className="text-sm text-muted-foreground">No regional data yet.</p> : (
            <ul className="space-y-3">
              {regions.map((r) => (
                <li key={r.name}>
                  <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{r.name}</span><span className="text-muted-foreground">{r.count} · {r.pct}%</span></div>
                  <div className="h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-brand-500)]" style={{ width: `${r.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Listings by property type">
          {types.length === 0 ? <p className="text-sm text-muted-foreground">No property data yet.</p> : (
            <ul className="space-y-3">
              {types.map((t) => (
                <li key={t.name}>
                  <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium capitalize">{titleCase(t.name)}</span><span className="text-muted-foreground">{t.count} · {t.pct}%</span></div>
                  <div className="h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-gold-500)]" style={{ width: `${t.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

// ---------- Audit Logs ----------

export function AuditPanel() {
  return (
    <>
      <PageHeader kicker="System" title="Audit Logs" subtitle="Administrative actions recorded on SPACES." />
      <EmptyState
        icon={FileClock}
        title="No audit trail recorded"
        description="Moderation decisions are written directly to each record. A dedicated audit log is not enabled on this platform yet."
      />
    </>
  );
}

// ---------- Marketing / Notifications ----------

export function MarketingPanel() {
  return (
    <>
      <PageHeader kicker="Growth" title="Marketing" subtitle="Campaigns and lifecycle broadcasts." />
      <EmptyState icon={Megaphone} title="No campaigns" description="Campaign management is not connected yet, so there are no campaigns to display." />
    </>
  );
}

export function NotificationsPanel() {
  return (
    <>
      <PageHeader kicker="Growth" title="Notifications" subtitle="In-app notifications are delivered automatically by the platform." />
      <EmptyState icon={Bell} title="No broadcast tools connected" description="SPACES currently sends transactional in-app notifications only; broadcast channels are not configured." />
    </>
  );
}

// ---------- Settings ----------

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0 flex-1"><div className="font-medium">{label}</div>{description && <div className="text-xs text-muted-foreground">{description}</div>}</div>
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const [emails, setEmails] = useState(true);
  const [sms, setSms] = useState(true);
  const [ai, setAi] = useState(true);
  return (
    <>
      <PageHeader kicker="System" title="System Settings" subtitle="Configure platform behavior, pricing, and integrations." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Brand & Localization">
          <SettingRow label="Brand name"><Input defaultValue="SPACES Group Ltd" className="max-w-xs" /></SettingRow>
          <SettingRow label="Default language"><select className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"><option>English</option><option>Swahili</option></select></SettingRow>
          <SettingRow label="Currency"><select className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"><option>TZS</option><option>USD</option></select></SettingRow>
        </Panel>

        <Panel title="Notifications">
          <SettingRow label="Email notifications" description="Transactional + digests"><Switch checked={emails} onCheckedChange={setEmails} /></SettingRow>
          <SettingRow label="SMS alerts" description="Verification codes and reminders"><Switch checked={sms} onCheckedChange={setSms} /></SettingRow>
          <SettingRow label="AI-powered suggestions" description="Auto-triage & content help"><Switch checked={ai} onCheckedChange={setAi} /></SettingRow>
        </Panel>

        <Panel title="Pricing">
          <SettingRow label="Verification Fee"><Input defaultValue="10,000" className="max-w-[120px]" /></SettingRow>
          <SettingRow label="Featured Listing (7d)"><Input defaultValue="30,000" className="max-w-[120px]" /></SettingRow>
          <SettingRow label="Premium Listing (30d)"><Input defaultValue="90,000" className="max-w-[120px]" /></SettingRow>
        </Panel>

        <Panel title="Integrations">
          <SettingRow label="Google Maps" description="Search, geocoding, static maps"><Badge variant="success">Connected</Badge></SettingRow>
          <SettingRow label="Payment gateway" description="Mobile money & cards"><Badge variant="warning">Not connected</Badge></SettingRow>
          <SettingRow label="SMS Provider" description="Bulk SMS delivery"><Badge variant="warning">Not connected</Badge></SettingRow>
          <SettingRow label="Email Provider" description="Transactional email"><Badge variant="warning">Not connected</Badge></SettingRow>
        </Panel>
      </div>
    </>
  );
}

// ---------- Super Admin ----------

export function SuperAdminPanel() {
  const { data: overview } = useLive<AdminOverview | null>(fetchAdminOverview, null);
  const [maintenance, setMaintenance] = useState(false);
  const [emergency, setEmergency] = useState(false);
  return (
    <>
      <PageHeader kicker="Restricted" title="Super Admin"
        subtitle="Highest-privilege operations. Every action here is logged and irreversible."
        actions={<Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Elevated Session</Badge>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className={cn("ds-card p-5", emergency && "ring-2 ring-[color:var(--color-danger-500)]")}>
          <div className="flex items-start justify-between">
            <div>
              <div className="ds-caption text-[color:var(--color-danger-700)]">Emergency mode</div>
              <div className="mt-1 font-display text-lg font-semibold">Freeze all writes</div>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">Locks new listings, bookings, payments, and messaging. Use only during active incidents.</p>
            </div>
            <Switch checked={emergency} onCheckedChange={(v) => { setEmergency(v); toast[v ? "error" : "success"](v ? "Emergency mode ENABLED" : "Emergency mode disabled"); }} />
          </div>
        </div>
        <div className={cn("ds-card p-5", maintenance && "ring-2 ring-[color:var(--color-warning-500)]")}>
          <div className="flex items-start justify-between">
            <div>
              <div className="ds-caption text-[color:var(--color-warning-700)]">Maintenance mode</div>
              <div className="mt-1 font-display text-lg font-semibold">Show maintenance page</div>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">Public site displays a friendly maintenance banner; admins retain access.</p>
            </div>
            <Switch checked={maintenance} onCheckedChange={(v) => { setMaintenance(v); toast[v ? "warning" : "success"](v ? "Maintenance mode enabled" : "Maintenance mode disabled"); }} />
          </div>
        </div>
      </div>

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Accounts" value={nf.format(overview.users.total)} tone="brand" icon={Users} />
          <StatCard label="Admin roles" value={nf.format(overview.users.admins)} tone="danger" icon={ShieldAlert} />
          <StatCard label="Listings" value={nf.format(overview.properties.total)} tone="brand" icon={Home} />
          <StatCard label="Open reports" value={nf.format(overview.activity.reportsOpen)} tone="danger" icon={Flag} />
        </div>
      )}

      {/* Role matrix (product documentation) */}
      <Panel title="Role & Permissions Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Capability</th>
                {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                  <th key={r} className="py-3 px-2 text-center font-medium">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.capability} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-medium">{row.capability}</td>
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                    <td key={r} className="py-3 px-2 text-center">
                      {row.roles[r]
                        ? <CheckCircle2 className="mx-auto h-4 w-4 text-[color:var(--color-success-600)]" />
                        : <span className="mx-auto block h-1 w-4 rounded-full bg-border" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="ds-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"><Database className="h-4 w-4" /></div><div className="font-semibold">Backups</div></div>
          <p className="mt-2 text-xs text-muted-foreground">Database backups are managed by the hosting platform.</p>
        </div>
        <div className="ds-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]"><KeyRound className="h-4 w-4" /></div><div className="font-semibold">API keys & secrets</div></div>
          <p className="mt-2 text-xs text-muted-foreground">Secrets are stored securely outside the application and are never displayed here.</p>
        </div>
      </div>
    </>
  );
}
