import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Eye, MessageSquare, Calendar, Handshake, CheckCircle2, DollarSign, Layers,
  TrendingUp, Trophy, ShieldCheck, Star, Upload, Contact, Crown, BarChart3,
  Bell, AlertTriangle, ChevronRight, ChevronDown, Clock, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/performance")({
  component: PerformancePage,
});

type Range = "7d" | "30d" | "90d" | "1y";
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days", "1y": "Last Year",
};

type Prop = {
  id: string; title: string; region: string | null; district: string | null;
  price: number; currency: string; status: string; view_count: number;
  description: string | null; amenities: string[] | null; created_at: string;
  cover?: string;
};
type Deal = { id: string; property_id: string | null; stage: string; value: number | null; currency: string | null; created_at: string; last_activity_at: string | null };
type Booking = { id: string; property_id: string; status: string; scheduled_at: string; created_at: string };
type Conv = { id: string; property_id: string | null; created_at: string; last_message_at: string | null };
type Msg = { id: string; conversation_id: string; sender_id: string; read_at: string | null; created_at: string };
type View = { id: string; property_id: string; created_at: string };
type Notif = { id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null };

function PerformancePage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Prop[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: pRows } = await supabase
        .from("properties")
        .select("id,title,region,district,price,currency,status,view_count,description,amenities,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const propList = (pRows ?? []) as Prop[];
      const ids = propList.map((p) => p.id);

      const [dealsRes, bookingsRes, convsRes, notifsRes, mediaRes] = await Promise.all([
        supabase.from("deals").select("id,property_id,stage,value,currency,created_at,last_activity_at").eq("owner_id", user.id),
        supabase.from("bookings").select("id,property_id,status,scheduled_at,created_at").eq("owner_id", user.id),
        supabase.from("conversations").select("id,property_id,created_at,last_message_at").eq("owner_id", user.id),
        supabase.from("notifications").select("id,kind,title,body,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        ids.length
          ? supabase.from("property_media").select("property_id,storage_path,is_cover,position").in("property_id", ids).order("position", { ascending: true })
          : Promise.resolve({ data: [] as { property_id: string; storage_path: string; is_cover: boolean; position: number }[] }),
      ]);

      const convIds = (convsRes.data ?? []).map((c) => c.id);
      const [msgsRes, viewsRes] = await Promise.all([
        convIds.length
          ? supabase.from("messages").select("id,conversation_id,sender_id,read_at,created_at").in("conversation_id", convIds)
          : Promise.resolve({ data: [] as Msg[] }),
        ids.length
          ? supabase.from("property_views").select("id,property_id,created_at").in("property_id", ids)
          : Promise.resolve({ data: [] as View[] }),
      ]);

      // Cover images & media counts
      const chosen: Record<string, string> = {};
      const counts: Record<string, number> = {};
      for (const m of (mediaRes.data ?? []) as { property_id: string; storage_path: string; is_cover: boolean; position: number }[]) {
        counts[m.property_id] = (counts[m.property_id] ?? 0) + 1;
        if (!chosen[m.property_id] || m.is_cover) chosen[m.property_id] = m.storage_path;
      }
      for (const [pid, path] of Object.entries(chosen)) {
        const url = await signedUrl(path);
        if (url) propList.find((p) => p.id === pid)!.cover = url;
      }

      if (!alive) return;
      setProps(propList);
      setDeals((dealsRes.data ?? []) as Deal[]);
      setBookings((bookingsRes.data ?? []) as Booking[]);
      setConvs((convsRes.data ?? []) as Conv[]);
      setMsgs((msgsRes.data ?? []) as Msg[]);
      setViews((viewsRes.data ?? []) as View[]);
      setNotifs((notifsRes.data ?? []) as Notif[]);
      setMediaCounts(counts);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const days = RANGE_DAYS[range];
  const since = useMemo(() => Date.now() - days * 86400_000, [days]);

  const inRange = <T extends { created_at: string }>(rows: T[]) =>
    rows.filter((r) => new Date(r.created_at).getTime() >= since);

  const overview = useMemo(() => {
    const active = props.filter((p) => p.status === "live").length;
    const totalViews = views.length || props.reduce((s, p) => s + (p.view_count ?? 0), 0);
    const totalLeads = convs.length;
    const totalViewings = bookings.length;
    const activeDeals = deals.filter((d) => !["completed", "cancelled"].includes(d.stage)).length;
    const completedDeals = deals.filter((d) => d.stage === "completed").length;
    // Estimated monthly revenue: sum of completed deal values in the last 30 days
    const monthAgo = Date.now() - 30 * 86400_000;
    const revenue = deals
      .filter((d) => d.stage === "completed" && new Date(d.last_activity_at ?? d.created_at).getTime() >= monthAgo)
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
    return {
      totalSpaces: props.length,
      active, totalViews, totalLeads, totalViewings, activeDeals, completedDeals, revenue,
    };
  }, [props, views, convs, bookings, deals]);

  // Series
  const dailyBuckets = useMemo(() => buildSeries(days), [days]);
  const viewsSeries = useMemo(() => bucketize(inRange(views), dailyBuckets, days), [views, dailyBuckets, days, since]);
  const leadsSeries = useMemo(() => bucketize(inRange(convs), dailyBuckets, days), [convs, dailyBuckets, days, since]);
  const dealsSeries = useMemo(() => bucketize(inRange(deals.filter((d) => d.stage === "completed").map((d) => ({ created_at: d.last_activity_at ?? d.created_at }))), dailyBuckets, days), [deals, dailyBuckets, days, since]);
  const revenueSeries = useMemo(() => {
    const rows = deals
      .filter((d) => d.stage === "completed")
      .map((d) => ({ created_at: d.last_activity_at ?? d.created_at, value: Number(d.value ?? 0) }));
    return bucketizeSum(rows.filter((r) => new Date(r.created_at).getTime() >= since), dailyBuckets, days);
  }, [deals, dailyBuckets, days, since]);

  const topSpaces = useMemo(() => {
    return props.map((p) => {
      const pViews = views.filter((v) => v.property_id === p.id).length || (p.view_count ?? 0);
      const pLeads = convs.filter((c) => c.property_id === p.id).length;
      const pViewings = bookings.filter((b) => b.property_id === p.id).length;
      const pClosed = deals.filter((d) => d.property_id === p.id && d.stage === "completed").length;
      const pRevenue = deals
        .filter((d) => d.property_id === p.id && d.stage === "completed")
        .reduce((s, d) => s + Number(d.value ?? 0), 0);
      return { p, pViews, pLeads, pViewings, pClosed, pRevenue, score: pViews + pLeads * 3 + pClosed * 20 };
    }).sort((a, b) => b.score - a.score);
  }, [props, views, convs, bookings, deals]);

  const listingHealth = useMemo(() => {
    return props.map((p) => {
      const photos = Math.min(30, (mediaCounts[p.id] ?? 0));
      const photoScore = Math.min(25, photos * 2); // 25 max
      const descLen = (p.description ?? "").length;
      const descScore = descLen > 400 ? 20 : descLen > 200 ? 14 : descLen > 80 ? 8 : 3; // 20 max
      const amenities = (p.amenities ?? []).length;
      const amenScore = Math.min(15, amenities * 2); // 15 max
      const verified = p.status === "live" ? 15 : 5; // 15 max (proxy)
      const pConvs = convs.filter((c) => c.property_id === p.id);
      const pMsgIds = new Set(pConvs.map((c) => c.id));
      const ownerMsgs = msgs.filter((m) => pMsgIds.has(m.conversation_id) && m.sender_id === (user?.id ?? ""));
      const responseScore = pConvs.length === 0 ? 12 : Math.min(15, Math.round((ownerMsgs.length / Math.max(1, pConvs.length)) * 15));
      const reviewsScore = 10; // placeholder; reviews not modeled yet
      const total = photoScore + descScore + amenScore + verified + responseScore + reviewsScore;
      return {
        p, score: Math.min(100, total),
        parts: { photoScore, descScore, amenScore, verified, responseScore, reviewsScore },
      };
    });
  }, [props, mediaCounts, convs, msgs, user]);

  const ownerScore = useMemo(() => {
    const avgHealth = listingHealth.length
      ? listingHealth.reduce((s, x) => s + x.score, 0) / listingHealth.length
      : 0;
    const closedRate = deals.length ? (deals.filter((d) => d.stage === "completed").length / deals.length) * 100 : 0;
    const ownerMsgs = msgs.filter((m) => m.sender_id === (user?.id ?? ""));
    const responseRate = convs.length ? Math.min(100, (ownerMsgs.length / convs.length) * 100) : 60;
    const activity = Math.min(100, inRange(props).length * 20 + inRange(deals as unknown as { created_at: string }[]).length * 10 + inRange(convs).length * 5);
    const trust = 70; // proxy — hook to trust engine when available
    const reviews = 75; // proxy
    const composite = Math.round(
      responseRate * 0.20 + closedRate * 0.20 + trust * 0.15 + avgHealth * 0.20 + reviews * 0.10 + activity * 0.15,
    );
    return {
      total: Math.min(100, composite),
      breakdown: [
        { label: "Response Time", value: Math.round(responseRate) },
        { label: "Deals Closed", value: Math.round(closedRate) },
        { label: "Trust Score", value: trust },
        { label: "Listing Quality", value: Math.round(avgHealth) },
        { label: "Reviews", value: reviews },
        { label: "Activity Level", value: Math.round(activity) },
      ],
    };
  }, [listingHealth, deals, msgs, convs, user, props, since]);

  const tasks = useMemo(() => {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const tomorrow0 = new Date(today0); tomorrow0.setDate(tomorrow0.getDate() + 1);
    const followUpsToday = deals.filter((d) => {
      const t = d.last_activity_at ? new Date(d.last_activity_at).getTime() : 0;
      return t >= today0.getTime() && t < tomorrow0.getTime();
    }).length;
    const pendingViewings = bookings.filter((b) => b.status === "pending").length;
    const unread = msgs.filter((m) => !m.read_at && m.sender_id !== (user?.id ?? "")).length;
    const needsUpdates = listingHealth.filter((l) => l.score < 60).length;
    return { followUpsToday, pendingViewings, unread, needsUpdates };
  }, [deals, bookings, msgs, listingHealth, user]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">Owner Performance</p>
            <h1 className="mt-1.5 truncate font-display text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
              Performance Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live metrics from your listings, leads, deals and conversations.
            </p>
          </div>
          <RangePicker range={range} onChange={setRange} />
        </header>

        <OverviewGrid o={overview} />

        <QuickActions />

        <PerfCharts
          range={range}
          viewsSeries={viewsSeries}
          leadsSeries={leadsSeries}
          dealsSeries={dealsSeries}
          revenueSeries={revenueSeries}
        />

        <TopSpaces items={topSpaces.slice(0, 5)} loading={loading} />

        <div className="grid gap-4 md:grid-cols-2">
          <OwnerScoreCard s={ownerScore} />
          <TasksCard t={tasks} />
        </div>

        <ListingHealth items={listingHealth} loading={loading} />

        <NotificationsFeed items={notifs} />
      </div>
    </DashboardShell>
  );
}

/* --------------------------- helpers --------------------------- */

function buildSeries(days: number) {
  const buckets: { key: string; label: string; ts: number }[] = [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (days <= 90) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      buckets.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        ts: d.getTime(),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en", { month: "short" }),
        ts: d.getTime(),
      });
    }
  }
  return buckets;
}

function bucketKey(iso: string, monthly: boolean) {
  const d = new Date(iso);
  return monthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10);
}

function bucketize(rows: { created_at: string }[], buckets: { key: string; label: string }[], days: number) {
  const monthly = days > 90;
  const counts = new Map(buckets.map((b) => [b.key, 0]));
  for (const r of rows) {
    const k = bucketKey(r.created_at, monthly);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
}

function bucketizeSum(rows: { created_at: string; value: number }[], buckets: { key: string; label: string }[], days: number) {
  const monthly = days > 90;
  const counts = new Map(buckets.map((b) => [b.key, 0]));
  for (const r of rows) {
    const k = bucketKey(r.created_at, monthly);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + r.value);
  }
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
}

function money(n: number, currency = "TZS") {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(1)}K`;
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

/* --------------------------- UI blocks --------------------------- */

function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] hover:border-primary/40"
      >
        <Clock className="h-4 w-4 text-primary" />
        {RANGE_LABEL[range]}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background shadow-[var(--shadow-elevated)]">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button key={r} onClick={() => { onChange(r); setOpen(false); }}
              className={cn("flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent",
                r === range && "bg-accent font-medium text-primary")}>
              {RANGE_LABEL[r]}
              {r === range && <CheckCircle2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewGrid({ o }: { o: {
  totalSpaces: number; active: number; totalViews: number; totalLeads: number;
  totalViewings: number; activeDeals: number; completedDeals: number; revenue: number;
} }) {
  const items = [
    { label: "Total Spaces", value: o.totalSpaces, icon: Layers, tone: "primary" },
    { label: "Active Listings", value: o.active, icon: Home, tone: "emerald" },
    { label: "Total Views", value: o.totalViews.toLocaleString(), icon: Eye, tone: "sky" },
    { label: "Total Leads", value: o.totalLeads, icon: MessageSquare, tone: "amber" },
    { label: "Total Viewings", value: o.totalViewings, icon: Calendar, tone: "violet" },
    { label: "Active Deals", value: o.activeDeals, icon: Handshake, tone: "primary" },
    { label: "Completed Deals", value: o.completedDeals, icon: CheckCircle2, tone: "emerald" },
    { label: "Est. Monthly Revenue", value: money(o.revenue), icon: DollarSign, tone: "amber" },
  ];
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    sky:     "bg-sky-500/10 text-sky-600 ring-sky-500/20",
    amber:   "bg-amber-500/10 text-amber-600 ring-amber-500/20",
    violet:  "bg-violet-500/10 text-violet-600 ring-violet-500/20",
  };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", toneMap[s.tone])}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">{s.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "List New Space", to: "/upload", icon: Upload, primary: true },
    { label: "View Leads", to: "/leads", icon: Contact },
    { label: "Respond to Messages", to: "/messages", icon: MessageSquare },
    { label: "Upgrade Plan", to: "/billing", icon: Crown },
    { label: "View Analytics", to: "/dashboard/analytics", icon: BarChart3 },
  ] as const;
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.label} to={a.to as string}
            className={cn(
              "snap-start shrink-0 md:shrink flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5",
              a.primary
                ? "border-primary/30 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-[var(--shadow-elevated)]"
                : "border-border/60 bg-background text-foreground hover:border-primary/40 hover:shadow-[var(--shadow-soft)]",
            )}>
            <Icon className="h-4 w-4" />
            <span className="whitespace-nowrap">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ChartCard({
  title, subtitle, children, defaultOpen = true,
}: { title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)] md:p-5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between md:cursor-default">
        <div className="text-left">
          <h3 className="font-display text-sm font-semibold text-foreground md:text-base">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform md:hidden", open && "rotate-180")} />
      </button>
      <div className={cn("mt-3 h-[220px] md:!block", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}

function PerfCharts({
  range, viewsSeries, leadsSeries, dealsSeries, revenueSeries,
}: {
  range: Range;
  viewsSeries: { label: string; value: number }[];
  leadsSeries: { label: string; value: number }[];
  dealsSeries: { label: string; value: number }[];
  revenueSeries: { label: string; value: number }[];
}) {
  const grid = { stroke: "hsl(var(--border))", strokeDasharray: "3 3" as const };
  const axis = { fontSize: 11, tick: { fill: "hsl(var(--muted-foreground))" } };
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Performance · {RANGE_LABEL[range]}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Daily Views" subtitle="Property page views over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsSeries}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...grid} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#gV)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Leads" subtitle="New buyer inquiries">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadsSeries}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Deals Closed" subtitle="Completed transactions">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dealsSeries}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue Trend" subtitle="TZS from completed deals">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueSeries}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function TopSpaces({ items, loading }: {
  items: { p: Prop; pViews: number; pLeads: number; pViewings: number; pClosed: number; pRevenue: number }[];
  loading: boolean;
}) {
  if (loading) return <div className="h-40 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />;
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Publish a listing to start tracking performance.</p>
      </section>
    );
  }
  const best = items[0];
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Top Performing Spaces</h2>
        <Link to="/dashboard/properties" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((row, idx) => {
          const isBest = row === best;
          const loc = [row.p.district, row.p.region].filter(Boolean).join(", ") || "Tanzania";
          return (
            <Link key={row.p.id} to="/property/$id" params={{ id: row.p.id }}
              className={cn(
                "block overflow-hidden rounded-2xl border bg-background shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
                isBest ? "border-amber-400/60 ring-1 ring-amber-300/40" : "border-border/60",
              )}>
              <div className="flex flex-col sm:flex-row sm:items-stretch">
                <div className="relative h-32 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-40">
                  {row.p.cover
                    ? <img src={row.p.cover} alt={row.p.title} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-muted-foreground/50"><Home className="h-8 w-8" /></div>}
                  {isBest && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow">
                      <Trophy className="h-3 w-3" /> BEST
                    </div>
                  )}
                  {!isBest && (
                    <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                      #{idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold text-foreground">{row.p.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">{loc}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Metric icon={Eye} label="Views" value={row.pViews} />
                    <Metric icon={MessageSquare} label="Leads" value={row.pLeads} />
                    <Metric icon={Calendar} label="Viewings" value={row.pViewings} />
                    <Metric icon={CheckCircle2} label="Closed" value={row.pClosed} />
                    <Metric icon={DollarSign} label="Revenue" value={money(row.pRevenue, row.p.currency || "TZS")} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function healthBand(score: number) {
  if (score >= 80) return { label: "Excellent", dot: "🟢", cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" };
  if (score >= 60) return { label: "Good",      dot: "🟡", cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20" };
  return              { label: "Needs Improvement", dot: "🔴", cls: "bg-rose-500/10 text-rose-600 ring-rose-500/20" };
}

function ListingHealth({ items, loading }: {
  items: { p: Prop; score: number; parts: Record<string, number> }[];
  loading: boolean;
}) {
  if (loading || items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Listing Health</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((row) => {
          const band = healthBand(row.score);
          return (
            <Link key={row.p.id} to="/property/$id" params={{ id: row.p.id }}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {row.p.cover
                  ? <img src={row.p.cover} alt={row.p.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-muted-foreground/50"><Home className="h-5 w-5" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-foreground">{row.p.title}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn(
                    "h-full rounded-full transition-all",
                    row.score >= 80 ? "bg-emerald-500" : row.score >= 60 ? "bg-amber-500" : "bg-rose-500",
                  )} style={{ width: `${row.score}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Photos {row.parts.photoScore}/25 · Description {row.parts.descScore}/20 · Amenities {row.parts.amenScore}/15 · Verification {row.parts.verified}/15 · Response {row.parts.responseScore}/15 · Reviews {row.parts.reviewsScore}/10
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-foreground">{row.score}</p>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", band.cls)}>
                  <span>{band.dot}</span>{band.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function OwnerScoreCard({ s }: { s: { total: number; breakdown: { label: string; value: number }[] } }) {
  const band = healthBand(s.total);
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background to-primary/5 p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Owner Performance Score</p>
          <p className="mt-1 font-display text-4xl font-bold text-foreground">{s.total}<span className="text-xl text-muted-foreground">/100</span></p>
          <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", band.cls)}>
            {band.dot} {band.label}
          </span>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {s.breakdown.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-medium text-foreground">{b.value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${b.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksCard({ t }: { t: { followUpsToday: number; pendingViewings: number; unread: number; needsUpdates: number } }) {
  const items = [
    { label: "Follow-ups due today", value: t.followUpsToday, icon: Zap, to: "/deals" },
    { label: "Pending viewings", value: t.pendingViewings, icon: Calendar, to: "/viewings" },
    { label: "Messages waiting", value: t.unread, icon: MessageSquare, to: "/messages" },
    { label: "Listings needing updates", value: t.needsUpdates, icon: AlertTriangle, to: "/dashboard/properties" },
  ] as const;
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">Today's Tasks</h3>
        <Star className="h-4 w-4 text-amber-500" />
      </div>
      <div className="space-y-2">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link key={i.label} to={i.to}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2.5 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">{i.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ring-1",
                  i.value > 0 ? "bg-primary/10 text-primary ring-primary/20" : "bg-muted text-muted-foreground ring-border",
                )}>{i.value}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsFeed({ items }: { items: Notif[] }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">Recent Notifications</h3>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.filter((n) => !n.read_at).length} unread
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No notifications yet. You'll see updates about listing performance, deals and subscription here.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 py-3">
              <div className={cn(
                "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
              )}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{n.title}</p>
                {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
