import { useMemo, useState } from "react";
import {
  Home, Users, ShieldCheck, Flag, Calendar, CreditCard, Receipt, Megaphone,
  Bell, BarChart3, FileClock, Settings, ShieldAlert, LifeBuoy, MessageSquare,
  UserCheck, TrendingUp, TrendingDown, Sparkles, CheckCircle2, XCircle,
  AlertTriangle, Search, Filter, MoreHorizontal, Star, Eye, Crown,
  RefreshCw, Download, Plus, Zap, Database, KeyRound, Power, Flame,
  Activity, DollarSign, Building2, MapPin, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/ds/stat-card";
import { StatusBadge } from "@/components/ds/status-badge";
import { EmptyState } from "@/components/ds/empty-state";
import { cn } from "@/lib/utils";
import {
  KPI, HIGHLIGHTS, ACTIVITY, MODERATION, USERS, VERIFICATION_QUEUE, REPORTS,
  CHART_MONTHS, CHART_REVENUE, CHART_TRAFFIC, CHART_LISTINGS, TOP_KEYWORDS,
  BOOKINGS, PAYMENTS, AUDIT_LOGS, SUPPORT_TICKETS, NOTIFICATIONS, CAMPAIGNS,
  ROLE_LABELS, ROLE_MATRIX, type AdminRole,
} from "@/lib/admin-mock";
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

// ---------- Dashboard ----------

const ACTIVITY_ICON = {
  property_new: Home, property_approved: CheckCircle2, viewing_booked: Calendar,
  user_new: Users, subscription_paid: CreditCard, verification_approved: ShieldCheck, report_filed: Flag,
} as const;
const ACTIVITY_TONE = {
  property_new: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  property_approved: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  viewing_booked: "bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]",
  user_new: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  subscription_paid: "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]",
  verification_approved: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  report_filed: "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
} as const;

function Sparkline({ data, color = "var(--color-brand-500)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / Math.max(1, max - min)) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BarChart({ data, labels, color = "var(--color-brand-500)" }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-lg transition-all hover:opacity-80"
              style={{ height: `${(v / max) * 100}%`, background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 50%, transparent))` }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPanel() {
  return (
    <>
      <PageHeader
        kicker="Control Center"
        title="Good morning, Administrator"
        subtitle="Here's what's happening across SPACES right now."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </>
        }
      />

      {/* KPI grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {KPI.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} tone={k.tone}
            icon={k.label.includes("Revenue") ? DollarSign : k.label.includes("Listing") ? Home : k.label.includes("Booking") ? Calendar : Activity} />
        ))}
      </div>

      {/* Highlights row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className="ds-card p-4">
            <div className="ds-caption">{h.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="font-display text-lg font-semibold">{h.value}</div>
              {h.label === "Platform Health" && <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-success-500)]" />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Panel title="Revenue" className="lg:col-span-2"
          right={<div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" /> TZS millions</div>}>
          <BarChart data={CHART_REVENUE} labels={CHART_MONTHS} />
        </Panel>

        {/* Live activity */}
        <Panel title="Live Activity"
          right={<span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-success-700)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-success-500)]" /> Live</span>}>
          <ul className="space-y-3">
            {ACTIVITY.map((a) => {
              const Icon = ACTIVITY_ICON[a.kind];
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-xl shrink-0", ACTIVITY_TONE[a.kind])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{a.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Traffic" right={<span className="text-xs text-muted-foreground">visits (k)</span>}>
          <Sparkline data={CHART_TRAFFIC} color="var(--color-brand-500)" />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last 12 months</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[color:var(--color-success-700)]"><TrendingUp className="h-3 w-3" /> +18.4%</span>
          </div>
        </Panel>

        <Panel title="New Listings" right={<span className="text-xs text-muted-foreground">per month</span>}>
          <Sparkline data={CHART_LISTINGS} color="var(--color-gold-600)" />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last 12 months</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[color:var(--color-success-700)]"><TrendingUp className="h-3 w-3" /> +12.1%</span>
          </div>
        </Panel>

        <Panel title="Conversion" right={<span className="text-xs text-muted-foreground">visits → bookings</span>}>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-4xl font-semibold">4.7%</div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-danger-700)]"><TrendingDown className="h-3 w-3" /> -0.3%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-linear-to-r from-[color:var(--color-brand-500)] to-[color:var(--color-gold-500)]" style={{ width: "47%" }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Target 10% by Q4 2026</p>
        </Panel>
      </div>
    </>
  );
}

// ---------- Property Moderation ----------

export function PropertiesPanel() {
  const [selected, setSelected] = useState<string | null>(MODERATION[0]?.id ?? null);
  const item = MODERATION.find((m) => m.id === selected);

  return (
    <>
      <PageHeader kicker="Moderation" title="Property Queue" subtitle="Review, approve, or escalate new listings."
        actions={<><Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /> Filters</Button><Button size="sm" className="gap-2"><Sparkles className="h-4 w-4" /> Auto-triage</Button></>} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {MODERATION.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={cn("ds-card w-full overflow-hidden text-left transition-all ds-press",
                selected === p.id ? "ring-2 ring-[color:var(--color-brand-500)]" : "hover:shadow-[var(--shadow-md)]")}>
              <div className="relative aspect-[16/10] w-full bg-secondary">
                <img src={p.cover} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  {p.verified && <StatusBadge kind="verified" />}
                  <StatusBadge kind="pending" />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {p.location}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{p.price}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                    p.quality >= 80 ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]"
                    : p.quality >= 60 ? "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]"
                    : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]")}>
                    <Zap className="h-3 w-3" /> Quality {p.quality}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3" /> Owner {p.ownerScore}</span>
                  <span className="ml-auto text-muted-foreground">{p.submitted}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {item ? (
          <div className="ds-card overflow-hidden">
            <div className="relative aspect-[21/9] w-full bg-secondary">
              <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-6 text-white">
                <div className="flex items-center gap-2">
                  {item.verified && <StatusBadge kind="verified" />}
                  <StatusBadge kind="pending" />
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold">{item.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm opacity-90"><MapPin className="h-3.5 w-3.5" /> {item.location} • {item.price}</p>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <div className="ds-card p-4">
                <div className="ds-caption">Listing Quality</div>
                <div className="mt-1 font-display text-2xl font-semibold text-[color:var(--color-success-700)]">{item.quality}/100</div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-success-500)]" style={{ width: `${item.quality}%` }} /></div>
              </div>
              <div className="ds-card p-4">
                <div className="ds-caption">Owner Trust Score</div>
                <div className="mt-1 font-display text-2xl font-semibold">{item.ownerScore}/100</div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-brand-500)]" style={{ width: `${item.ownerScore}%` }} /></div>
              </div>
              <div className="ds-card p-4">
                <div className="ds-caption">Verification</div>
                <div className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
                  {item.verified ? <><CheckCircle2 className="h-5 w-5 text-[color:var(--color-success-600)]" /> Verified</> : <><AlertTriangle className="h-5 w-5 text-[color:var(--color-warning-600)]" /> Unverified</>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Submitted {item.submitted}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 bg-secondary/30 p-4">
              <Button variant="success" size="sm" className="gap-2" onClick={() => toast.success("Listing approved")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Changes requested")}><RefreshCw className="h-4 w-4" /> Request Changes</Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => toast.error("Listing rejected")}><XCircle className="h-4 w-4" /> Reject</Button>
              <div className="mx-2 h-6 w-px bg-border" />
              <Button variant="gold" size="sm" className="gap-2" onClick={() => toast.success("Featured")}><Sparkles className="h-4 w-4" /> Feature</Button>
              <Button variant="premium" size="sm" className="gap-2" onClick={() => toast.success("Promoted to Premium")}><Crown className="h-4 w-4" /> Premium</Button>
              <Button variant="ghost" size="sm" className="gap-2 ml-auto" onClick={() => toast.warning("Suspended")}><Power className="h-4 w-4" /> Suspend</Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => toast("Archived")}><Database className="h-4 w-4" /> Archive</Button>
            </div>
          </div>
        ) : <EmptyState icon={Home} title="Nothing selected" description="Pick a listing from the queue to review." />}
      </div>
    </>
  );
}

// ---------- Users ----------

export function UsersPanel() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => USERS.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <>
      <PageHeader kicker="Community" title="User Management" subtitle="Search, filter, and act on any account across SPACES."
        actions={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Invite Admin</Button>} />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /> Role</Button>
          <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /> Status</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.warning("Bulk suspend applied")}>Bulk Suspend</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4 font-medium">User</th>
                <th className="py-3 pr-4 font-medium">Role</th>
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
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{u.name.split(" ").map(s=>s[0]).join("")}</AvatarFallback></Avatar>
                      <div><div className="font-semibold">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="py-3 pr-4"><Badge variant="muted" className="capitalize">{u.role}</Badge></td>
                  <td className="py-3 pr-4">
                    {u.status === "active" ? <Badge variant="success">Active</Badge>
                     : u.status === "pending" ? <Badge variant="warning">Pending</Badge>
                     : <Badge variant="destructive">Suspended</Badge>}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.joined}</td>
                  <td className="py-3 pr-4 font-medium">{u.listings}</td>
                  <td className="py-3 pr-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => toast("Opened user details")}><MoreHorizontal className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ---------- Agents ----------

export function AgentsPanel() {
  const agents = USERS.filter((u) => u.role === "agent").concat(
    [{ id: "u10", name: "Habari Homes", email: "hello@habari.co.tz", role: "agent", status: "active", joined: "Aug 2024", listings: 41 }],
  );
  return (
    <>
      <PageHeader kicker="Community" title="Agents" subtitle="Certified agents and agencies operating on SPACES." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="ds-card ds-card-hover p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarFallback className="bg-[color:var(--color-brand-600)] text-white font-semibold">{a.name.split(" ").map(s=>s[0]).join("")}</AvatarFallback></Avatar>
                <div><div className="font-semibold">{a.name}</div><div className="text-xs text-muted-foreground">{a.email}</div></div>
              </div>
              <StatusBadge kind="verified" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div><div className="font-display text-lg font-semibold">{a.listings}</div><div className="ds-caption">Listings</div></div>
              <div><div className="font-display text-lg font-semibold">4.9</div><div className="ds-caption">Rating</div></div>
              <div><div className="font-display text-lg font-semibold">12m</div><div className="ds-caption">Avg reply</div></div>
            </div>
            <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" className="flex-1">View</Button><Button size="sm" className="flex-1">Message</Button></div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Verification ----------

export function VerificationPanel() {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? VERIFICATION_QUEUE : VERIFICATION_QUEUE.filter(v => v.type.toLowerCase() === tab);
  return (
    <>
      <PageHeader kicker="Trust & Safety" title="Verification Center" subtitle="Review identities, businesses, and property documents." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["all","owner","agent","property"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
            tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
          )}>{t}</button>
        ))}
      </div>
      <Panel>
        <div className="space-y-3">
          {filtered.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-background p-4">
              <div className={cn("grid h-11 w-11 place-items-center rounded-2xl",
                v.risk === "high" ? "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]"
                : v.risk === "medium" ? "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)]"
                : "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]")}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.type} • {v.doc}</div>
              </div>
              <div className="text-xs text-muted-foreground">{v.submitted}</div>
              <Badge variant={v.risk === "high" ? "destructive" : v.risk === "medium" ? "warning" : "success"} className="capitalize">{v.risk} risk</Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => toast.success("Approved")}><CheckCircle2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => toast.error("Rejected")}><XCircle className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

// ---------- Reports ----------

export function ReportsPanel() {
  return (
    <>
      <PageHeader kicker="Trust & Safety" title="Reports" subtitle="User-submitted reports across listings, users, and messages." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending" value="14" tone="danger" icon={Flag} />
        <StatCard label="Resolved (7d)" value="42" tone="success" icon={CheckCircle2} />
        <StatCard label="High severity" value="3" tone="danger" icon={AlertTriangle} />
        <StatCard label="Avg resolution" value="4h 12m" tone="brand" icon={Clock} />
      </div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4 font-medium">Target</th>
                <th className="py-3 pr-4 font-medium">Reason</th>
                <th className="py-3 pr-4 font-medium">Reporter</th>
                <th className="py-3 pr-4 font-medium">Severity</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {REPORTS.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-medium">{r.target}</td>
                  <td className="py-3 pr-4">{r.reason}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.reporter}</td>
                  <td className="py-3 pr-4"><Badge variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "warning" : "muted"} className="capitalize">{r.severity}</Badge></td>
                  <td className="py-3 pr-4">{r.status === "resolved" ? <Badge variant="success">Resolved</Badge> : <Badge variant="warning">Pending</Badge>}</td>
                  <td className="py-3 pr-4 text-right"><Button size="sm" variant="outline">Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ---------- Bookings / Messages / Support ----------

export function BookingsPanel() {
  return (
    <>
      <PageHeader kicker="Operations" title="Bookings" subtitle="All scheduled viewings across SPACES." />
      <Panel>
        <div className="space-y-3">
          {BOOKINGS.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]"><Calendar className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.property}</div>
                <div className="text-xs text-muted-foreground">{b.user} • Agent: {b.agent}</div>
              </div>
              <div className="text-sm font-medium">{b.when}</div>
              {b.status === "confirmed" ? <Badge variant="success">Confirmed</Badge> : <Badge variant="warning">Pending</Badge>}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

export function MessagesPanel() {
  return (
    <>
      <PageHeader kicker="Operations" title="Messages" subtitle="Moderate flagged conversations and support threads." />
      <EmptyState icon={MessageSquare} title="Nothing flagged" description="All conversations are within community guidelines. Nice work." />
    </>
  );
}

export function SupportPanel() {
  return (
    <>
      <PageHeader kicker="Operations" title="Support" subtitle="Active user tickets." />
      <Panel>
        <div className="space-y-3">
          {SUPPORT_TICKETS.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"><LifeBuoy className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{t.user} • {t.when}</div>
              </div>
              <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "warning" : "muted"} className="capitalize">{t.priority}</Badge>
              {t.status === "resolved" ? <Badge variant="success">Resolved</Badge>
                : t.status === "pending" ? <Badge variant="warning">Pending</Badge>
                : <Badge variant="destructive">Open</Badge>}
              <Button size="sm" variant="outline">Open</Button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

// ---------- Payments & Subscriptions ----------

export function PaymentsPanel() {
  return (
    <>
      <PageHeader kicker="Revenue" title="Payments" subtitle="All transactions across SPACES." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value="TZS 8.4M" delta={6.2} tone="success" icon={DollarSign} />
        <StatCard label="This week" value="TZS 42.1M" delta={11.0} tone="brand" icon={DollarSign} />
        <StatCard label="Refunds (30d)" value="TZS 620K" delta={-2.0} tone="danger" icon={RefreshCw} />
        <StatCard label="Success rate" value="98.6%" tone="success" icon={CheckCircle2} />
      </div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4 font-medium">User</th>
                <th className="py-3 pr-4 font-medium">Product</th>
                <th className="py-3 pr-4 font-medium">Amount</th>
                <th className="py-3 pr-4 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENTS.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-medium">{p.user}</td>
                  <td className="py-3 pr-4">{p.plan}</td>
                  <td className="py-3 pr-4 font-semibold">{p.amount}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{p.when}</td>
                  <td className="py-3 pr-4">{p.status === "paid" ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Refunded</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function SubscriptionsPanel() {
  const plans = [
    { name: "Buyer Plus", price: "TZS 25,000 / mo", subs: 1240, tone: "brand" },
    { name: "Owner Pro", price: "TZS 60,000 / mo", subs: 348, tone: "gold" },
    { name: "Agent Premium", price: "TZS 120,000 / mo", subs: 92, tone: "success" },
  ];
  return (
    <>
      <PageHeader kicker="Revenue" title="Subscriptions" subtitle="Manage recurring revenue tiers." actions={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Plan</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className="ds-card ds-card-hover p-6">
            <div className="ds-caption">{p.name}</div>
            <div className="mt-2 font-display text-2xl font-semibold">{p.price}</div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className="font-display text-4xl font-semibold text-primary">{p.subs}</div>
              <div className="ds-caption">active subs</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Edit</Button>
              <Button size="sm" className="flex-1">View</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Analytics ----------

export function AnalyticsPanel() {
  return (
    <>
      <PageHeader kicker="Insights" title="Analytics" subtitle="Growth, traffic, and revenue across the platform." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Panel title="Revenue growth"><BarChart data={CHART_REVENUE} labels={CHART_MONTHS} color="var(--color-brand-500)" /></Panel>
        <Panel title="Traffic growth"><BarChart data={CHART_TRAFFIC} labels={CHART_MONTHS} color="var(--color-gold-500)" /></Panel>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Panel title="Top regions">
          <ul className="space-y-3">
            {[["Dar es Salaam", 46],["Arusha", 18],["Mwanza", 12],["Zanzibar", 11],["Dodoma", 8]].map(([name, pct]) => (
              <li key={name as string}>
                <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{name}</span><span className="text-muted-foreground">{pct}%</span></div>
                <div className="h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-brand-500)]" style={{ width: `${pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Property types">
          <ul className="space-y-3">
            {[["Apartments", 38],["Villas", 24],["Land", 16],["Commercial", 12],["Rooms", 10]].map(([name, pct]) => (
              <li key={name as string}>
                <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{name}</span><span className="text-muted-foreground">{pct}%</span></div>
                <div className="h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-[color:var(--color-gold-500)]" style={{ width: `${pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Top search keywords">
          <ul className="space-y-2">
            {TOP_KEYWORDS.map((k, i) => (
              <li key={k} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs font-semibold">{i+1}</span>
                <span className="flex-1 font-medium">{k}</span>
                <Flame className="h-3.5 w-3.5 text-[color:var(--color-gold-600)]" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

// ---------- Audit Logs ----------

export function AuditPanel() {
  return (
    <>
      <PageHeader kicker="System" title="Audit Logs" subtitle="Every administrative action, timestamped and immutable." />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4 font-medium">Actor</th>
                <th className="py-3 pr-4 font-medium">Action</th>
                <th className="py-3 pr-4 font-medium">IP</th>
                <th className="py-3 pr-4 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOGS.map((l) => (
                <tr key={l.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-mono text-xs">{l.actor}</td>
                  <td className="py-3 pr-4">{l.action}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{l.ip}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ---------- Marketing / Notifications ----------

export function MarketingPanel() {
  return (
    <>
      <PageHeader kicker="Growth" title="Marketing" subtitle="Campaigns and lifecycle broadcasts."
        actions={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Campaign</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {CAMPAIGNS.map((c) => (
          <div key={c.id} className="ds-card ds-card-hover p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.name}</div>
              {c.status === "live" ? <Badge variant="success">Live</Badge> : c.status === "scheduled" ? <Badge variant="warning">Scheduled</Badge> : <Badge variant="muted">Draft</Badge>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><div className="ds-caption">Reach</div><div className="font-display text-lg font-semibold">{c.reach}</div></div>
              <div><div className="ds-caption">CTR</div><div className="font-display text-lg font-semibold">{c.ctr}</div></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function NotificationsPanel() {
  return (
    <>
      <PageHeader kicker="Growth" title="Notifications" subtitle="Channels, quotas, and scheduled broadcasts." />
      <div className="grid gap-4 md:grid-cols-3">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="ds-card p-5">
            <div className="flex items-center justify-between">
              <Badge variant="muted" className="capitalize">{n.channel}</Badge>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 font-semibold">{n.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
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
          <SettingRow label="Lovable AI Gateway" description="AI moderation & suggestions"><Badge variant="success">Connected</Badge></SettingRow>
          <SettingRow label="SMS Provider" description="Africa's Talking"><Badge variant="warning">Configure</Badge></SettingRow>
          <SettingRow label="Email Provider" description="Postmark"><Badge variant="warning">Configure</Badge></SettingRow>
        </Panel>
      </div>
    </>
  );
}

// ---------- Super Admin ----------

export function SuperAdminPanel() {
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

      {/* Role matrix */}
      <Panel title="Role & Permissions Matrix" right={<Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> New role</Button>}>
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

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="ds-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"><Database className="h-4 w-4" /></div><div className="font-semibold">Backups</div></div>
          <p className="mt-2 text-xs text-muted-foreground">Last backup 12 min ago. Retention 30 days.</p>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1">Backup now</Button><Button size="sm" className="flex-1">Restore</Button></div>
        </div>
        <div className="ds-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--color-gold-100)] text-[color:var(--color-gold-800)]"><KeyRound className="h-4 w-4" /></div><div className="font-semibold">API Keys & Secrets</div></div>
          <p className="mt-2 text-xs text-muted-foreground">12 secrets configured across environments.</p>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1">Manage</Button><Button size="sm" className="flex-1">Rotate</Button></div>
        </div>
        <div className="ds-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]"><Zap className="h-4 w-4" /></div><div className="font-semibold">Feature Flags</div></div>
          <p className="mt-2 text-xs text-muted-foreground">7 flags live. 3 in staged rollout.</p>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1">Manage flags</Button></div>
        </div>
      </div>
    </>
  );
}
