import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Contact, Handshake, CheckCircle2, Home, Calendar, TrendingUp, DollarSign, Clock,
  Download, FileSpreadsheet, FileText, ChevronDown, Trophy, Star, Activity, MapPin,
  AlertTriangle, Bell,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatCard, EmptyState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/business-intelligence")({
  head: () => ({
    meta: [
      { title: "Business Intelligence — SPACES" },
      { name: "description", content: "Analytics, market insights and performance intelligence across the SPACES platform." },
    ],
  }),
  component: BIPage,
});

type Range = "1d" | "7d" | "30d" | "90d" | "1y";
const RANGE_DAYS: Record<Range, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
const RANGE_LABEL: Record<Range, string> = {
  "1d": "Today", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last year",
};

type Prop = { id: string; title: string; region: string | null; district: string | null; property_type?: string | null; price: number | null; currency: string | null; status: string | null; view_count: number | null; created_at: string; owner_id: string | null };
type Deal = { id: string; property_id: string | null; stage: string; health: string | null; value: number | null; currency: string | null; agent_id: string | null; owner_id: string | null; created_at: string; last_activity_at: string | null };
type Booking = { id: string; property_id: string | null; status: string; scheduled_at: string; created_at: string };
type Conv = { id: string; property_id: string | null; created_at: string; last_message_at: string | null };
type Msg = { id: string; conversation_id: string; sender_id: string; created_at: string };
type ViewRow = { id: string; property_id: string; created_at: string };
type Profile = { id: string; full_name: string | null; avatar_url: string | null };

const HEALTH: Record<string, { label: string; dot: string; badge: string }> = {
  healthy:  { label: "Healthy", dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  waiting:  { label: "Waiting", dot: "bg-amber-500",   badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  at_risk:  { label: "At Risk", dot: "bg-rose-500",    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  closed:   { label: "Closed",  dot: "bg-slate-500",   badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

const CHART_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#8b5cf6"];

function fmtMoney(n: number, ccy = "TZS") {
  if (!n) return `${ccy} 0`;
  if (n >= 1_000_000) return `${ccy} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${ccy} ${(n / 1_000).toFixed(0)}K`;
  return `${ccy} ${Math.round(n)}`;
}

function daysArray(days: number) {
  const arr: { key: string; label: string; at: number }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    arr.push({ key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), at: d.getTime() });
  }
  return arr;
}

function BIPage() {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Prop[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [notifs, setNotifs] = useState<{ id: string; kind: string; title: string; body: string | null; created_at: string }[]>([]);

  // Filters
  const [fRegion, setFRegion] = useState<string>("all");
  const [fType, setFType]     = useState<string>("all");
  const [fAgent, setFAgent]   = useState<string>("all");
  const [fOwner, setFOwner]   = useState<string>("all");
  const [fStage, setFStage]   = useState<string>("all");
  const [search, setSearch]   = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [pRes, dRes, bRes, cRes, vRes, prRes, nRes] = await Promise.all([
        supabase.from("properties").select("id,title,region,district,property_type,price,currency,status,view_count,created_at,owner_id").order("created_at", { ascending: false }).limit(500),
        supabase.from("deals").select("id,property_id,stage,health,value,currency,agent_id,owner_id,created_at,last_activity_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("bookings").select("id,property_id,status,scheduled_at,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("conversations").select("id,property_id,created_at,last_message_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("property_views").select("id,property_id,created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id,full_name,avatar_url").limit(500),
        supabase.from("notifications").select("id,kind,title,body,created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      if (!alive) return;
      const convIds = (cRes.data ?? []).map((c: any) => c.id);
      const mRes = convIds.length
        ? await supabase.from("messages").select("id,conversation_id,sender_id,created_at").in("conversation_id", convIds).limit(2000)
        : { data: [] as Msg[] };
      if (!alive) return;
      setProps((pRes.data ?? []) as Prop[]);
      setDeals((dRes.data ?? []) as Deal[]);
      setBookings((bRes.data ?? []) as Booking[]);
      setConvs((cRes.data ?? []) as Conv[]);
      setViews((vRes.data ?? []) as ViewRow[]);
      setMsgs((mRes.data ?? []) as Msg[]);
      setNotifs((nRes.data ?? []) as any);
      const map: Record<string, Profile> = {};
      (prRes.data ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const since = useMemo(() => Date.now() - RANGE_DAYS[range] * 86400_000, [range]);

  // Filtered universes
  const fProps = useMemo(() => props.filter((p) => {
    if (fRegion !== "all" && p.region !== fRegion) return false;
    if (fType !== "all" && p.property_type !== fType) return false;
    if (fOwner !== "all" && p.owner_id !== fOwner) return false;
    if (search && !((p.title ?? "").toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [props, fRegion, fType, fOwner, search]);
  const fPropIds = useMemo(() => new Set(fProps.map((p) => p.id)), [fProps]);

  const fDeals = useMemo(() => deals.filter((d) => {
    if (fPropIds.size && d.property_id && !fPropIds.has(d.property_id)) return false;
    if (fAgent !== "all" && d.agent_id !== fAgent) return false;
    if (fOwner !== "all" && d.owner_id !== fOwner) return false;
    if (fStage !== "all" && d.stage !== fStage) return false;
    return true;
  }), [deals, fPropIds, fAgent, fOwner, fStage]);

  const fBookings = useMemo(() => bookings.filter((b) => !fPropIds.size || (b.property_id && fPropIds.has(b.property_id))), [bookings, fPropIds]);
  const fViews    = useMemo(() => views.filter((v) => !fPropIds.size || fPropIds.has(v.property_id)), [views, fPropIds]);
  const fConvs    = useMemo(() => convs.filter((c) => !fPropIds.size || (c.property_id && fPropIds.has(c.property_id))), [convs, fPropIds]);

  // KPIs (within selected range)
  const rangedDeals    = fDeals.filter((d) => new Date(d.created_at).getTime() >= since);
  const rangedBookings = fBookings.filter((b) => new Date(b.created_at).getTime() >= since);
  const rangedConvs    = fConvs.filter((c) => new Date(c.created_at).getTime() >= since);
  const rangedProps    = fProps.filter((p) => new Date(p.created_at).getTime() >= since);

  const totalLeads      = rangedConvs.length;
  const activeDeals     = fDeals.filter((d) => !["completed", "cancelled"].includes(d.stage)).length;
  const completedDeals  = fDeals.filter((d) => d.stage === "completed").length;
  const totalProperties = fProps.length;
  const totalViewings   = rangedBookings.length;
  const conversionRate  = totalLeads === 0 ? 0 : Math.round((completedDeals / Math.max(1, fDeals.length)) * 100);
  const estRevenue      = fDeals.filter((d) => d.stage === "completed").reduce((s, d) => s + (Number(d.value) || 0), 0);

  // Avg response time (first inbound → first agent reply)
  const avgResponseMin = useMemo(() => {
    if (!msgs.length || !convs.length) return 0;
    const byConv = new Map<string, Msg[]>();
    msgs.forEach((m) => {
      const arr = byConv.get(m.conversation_id) ?? [];
      arr.push(m); byConv.set(m.conversation_id, arr);
    });
    let total = 0; let count = 0;
    byConv.forEach((arr) => {
      arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const first = arr[0];
      const reply = arr.find((m) => m.sender_id !== first.sender_id);
      if (first && reply) {
        total += (+new Date(reply.created_at) - +new Date(first.created_at)) / 60000;
        count += 1;
      }
    });
    return count ? Math.round(total / count) : 0;
  }, [msgs, convs]);

  // Chart series
  const daily = useMemo(() => {
    const days = daysArray(RANGE_DAYS[range] <= 90 ? RANGE_DAYS[range] : 90);
    return days.map((d) => {
      const dayEnd = d.at + 86400_000;
      const leads = fConvs.filter((c) => { const t = +new Date(c.created_at); return t >= d.at && t < dayEnd; }).length;
      const viewings = fBookings.filter((b) => { const t = +new Date(b.created_at); return t >= d.at && t < dayEnd; }).length;
      const dealsClosed = fDeals.filter((x) => x.stage === "completed" && x.last_activity_at && +new Date(x.last_activity_at) >= d.at && +new Date(x.last_activity_at) < dayEnd).length;
      const revenue = fDeals.filter((x) => x.stage === "completed" && x.last_activity_at && +new Date(x.last_activity_at) >= d.at && +new Date(x.last_activity_at) < dayEnd)
        .reduce((s, x) => s + (Number(x.value) || 0), 0);
      return { label: d.label, leads, viewings, dealsClosed, revenue };
    });
  }, [range, fConvs, fBookings, fDeals]);

  // Deal health breakdown
  const healthBreak = useMemo(() => {
    const acc: Record<string, number> = { healthy: 0, waiting: 0, at_risk: 0, closed: 0 };
    fDeals.forEach((d) => { const k = d.health ?? "healthy"; acc[k] = (acc[k] ?? 0) + 1; });
    return Object.entries(acc).map(([k, v]) => ({ name: HEALTH[k]?.label ?? k, value: v, key: k }));
  }, [fDeals]);

  // Market insights
  const topRegions = useMemo(() => {
    const m = new Map<string, number>();
    fProps.forEach((p) => { const k = p.region || p.district || "—"; m.set(k, (m.get(k) ?? 0) + (p.view_count ?? 0)); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [fProps]);

  const topProps = useMemo(() =>
    [...fProps].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 5), [fProps]);

  const topCategories = useMemo(() => {
    const m = new Map<string, number>();
    fProps.forEach((p) => { const k = p.property_type || "other"; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [fProps]);

  const highConverting = useMemo(() => {
    const byProp = new Map<string, { total: number; closed: number }>();
    fDeals.forEach((d) => {
      if (!d.property_id) return;
      const cur = byProp.get(d.property_id) ?? { total: 0, closed: 0 };
      cur.total += 1;
      if (d.stage === "completed") cur.closed += 1;
      byProp.set(d.property_id, cur);
    });
    return Array.from(byProp.entries())
      .map(([pid, s]) => ({ property: props.find((p) => p.id === pid), rate: s.total ? Math.round((s.closed / s.total) * 100) : 0, closed: s.closed, total: s.total }))
      .filter((x) => x.property && x.total >= 1)
      .sort((a, b) => b.rate - a.rate).slice(0, 5);
  }, [fDeals, props]);

  // Top agents
  const topAgents = useMemo(() => {
    const m = new Map<string, { closed: number; total: number; last: number }>();
    fDeals.forEach((d) => {
      if (!d.agent_id) return;
      const cur = m.get(d.agent_id) ?? { closed: 0, total: 0, last: 0 };
      cur.total += 1;
      if (d.stage === "completed") cur.closed += 1;
      cur.last = Math.max(cur.last, +new Date(d.last_activity_at ?? d.created_at));
      m.set(d.agent_id, cur);
    });
    return Array.from(m.entries())
      .map(([id, s]) => ({ id, profile: profiles[id], closed: s.closed, total: s.total, rate: s.total ? Math.round((s.closed / s.total) * 100) : 0 }))
      .sort((a, b) => b.closed - a.closed || b.rate - a.rate).slice(0, 5);
  }, [fDeals, profiles]);

  // Owner performance
  const topOwners = useMemo(() => {
    const m = new Map<string, { views: number; listings: number; revenue: number; closed: number }>();
    fProps.forEach((p) => {
      if (!p.owner_id) return;
      const cur = m.get(p.owner_id) ?? { views: 0, listings: 0, revenue: 0, closed: 0 };
      cur.listings += 1; cur.views += p.view_count ?? 0;
      m.set(p.owner_id, cur);
    });
    fDeals.forEach((d) => {
      if (!d.owner_id) return;
      const cur = m.get(d.owner_id) ?? { views: 0, listings: 0, revenue: 0, closed: 0 };
      if (d.stage === "completed") { cur.closed += 1; cur.revenue += Number(d.value) || 0; }
      m.set(d.owner_id, cur);
    });
    return Array.from(m.entries())
      .map(([id, s]) => ({ id, profile: profiles[id], ...s, health: s.listings === 0 ? 0 : Math.min(100, Math.round((s.views / Math.max(1, s.listings)) * 2 + s.closed * 10)) }))
      .sort((a, b) => b.revenue - a.revenue || b.views - a.views).slice(0, 5);
  }, [fProps, fDeals, profiles]);

  // Regions & agents & owners for filter dropdowns
  const regionOpts = useMemo(() => Array.from(new Set(props.map((p) => p.region).filter(Boolean))) as string[], [props]);
  const typeOpts   = useMemo(() => Array.from(new Set(props.map((p) => p.property_type).filter(Boolean))) as string[], [props]);
  const agentOpts  = useMemo(() => Array.from(new Set(deals.map((d) => d.agent_id).filter(Boolean))) as string[], [deals]);
  const ownerOpts  = useMemo(() => Array.from(new Set(props.map((p) => p.owner_id).filter(Boolean))) as string[], [props]);
  const stageOpts  = useMemo(() => Array.from(new Set(deals.map((d) => d.stage).filter(Boolean))) as string[], [deals]);

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Range", RANGE_LABEL[range]],
      ["Total Leads", totalLeads],
      ["Active Deals", activeDeals],
      ["Completed Deals", completedDeals],
      ["Total Properties", totalProperties],
      ["Total Viewings", totalViewings],
      ["Conversion Rate", `${conversionRate}%`],
      ["Estimated Revenue", estRevenue],
      ["Average Response Time (min)", avgResponseMin],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `spaces-bi-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const html = `<!doctype html><html><head><title>SPACES BI Report</title>
      <style>body{font-family:system-ui;padding:32px;color:#111}h1{margin:0 0 8px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #ddd;padding:8px 12px;text-align:left}</style>
      </head><body>
      <h1>SPACES Business Intelligence</h1>
      <p>${RANGE_LABEL[range]} · Generated ${new Date().toLocaleString()}</p>
      <table><tbody>
      <tr><th>Total Leads</th><td>${totalLeads}</td></tr>
      <tr><th>Active Deals</th><td>${activeDeals}</td></tr>
      <tr><th>Completed Deals</th><td>${completedDeals}</td></tr>
      <tr><th>Total Properties</th><td>${totalProperties}</td></tr>
      <tr><th>Total Viewings</th><td>${totalViewings}</td></tr>
      <tr><th>Conversion Rate</th><td>${conversionRate}%</td></tr>
      <tr><th>Estimated Revenue</th><td>${fmtMoney(estRevenue)}</td></tr>
      <tr><th>Avg Response Time</th><td>${avgResponseMin} min</td></tr>
      </tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(html); w.document.close();
  };

  const [openInsights, setOpenInsights] = useState(true);
  const [openAgents, setOpenAgents] = useState(true);
  const [openOwners, setOpenOwners] = useState(true);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Business Intelligence</h1>
            <p className="mt-1 text-muted-foreground">Track platform growth, revenue and market insights.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABEL) as Range[]).map((k) => (
                  <SelectItem key={k} value={k}>{RANGE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />PDF</Button>
          </div>
        </header>

        {/* Filters */}
        <section className="ds-card p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input placeholder="Search properties…" value={search} onChange={(e) => setSearch(e.target.value)} className="col-span-2 md:col-span-2" />
            <Select value={fRegion} onValueChange={setFRegion}>
              <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All regions</SelectItem>{regionOpts.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All types</SelectItem>{typeOpts.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={fAgent} onValueChange={setFAgent}>
              <SelectTrigger><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All agents</SelectItem>{agentOpts.map((r) => (<SelectItem key={r} value={r}>{profiles[r]?.full_name ?? r.slice(0,6)}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={fStage} onValueChange={setFStage}>
              <SelectTrigger><SelectValue placeholder="Deal stage" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All stages</SelectItem>{stageOpts.map((r) => (<SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </section>

        {/* Overview KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Leads"       value={totalLeads}      icon={Contact}       tone="brand" />
          <StatCard label="Active Deals"      value={activeDeals}     icon={Handshake}     tone="brand" />
          <StatCard label="Completed Deals"   value={completedDeals}  icon={CheckCircle2}  tone="success" />
          <StatCard label="Total Properties"  value={totalProperties} icon={Home}          tone="gold" />
          <StatCard label="Total Viewings"    value={totalViewings}   icon={Calendar}      tone="brand" />
          <StatCard label="Conversion Rate"   value={`${conversionRate}%`} icon={TrendingUp} tone="success" />
          <StatCard label="Est. Revenue"      value={fmtMoney(estRevenue)} icon={DollarSign} tone="gold" />
          <StatCard label="Avg Response"      value={`${avgResponseMin}m`} icon={Clock}    tone="muted" />
        </section>

        {/* Trends */}
        <section className="grid gap-3 lg:grid-cols-2">
          <div className="ds-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="ds-h-sm">Daily Inquiries & Viewings</div>
              <div className="text-xs text-muted-foreground">{RANGE_LABEL[range]}</div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gView" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="url(#gLead)" strokeWidth={2} />
                  <Area type="monotone" dataKey="viewings" stroke="#f59e0b" fill="url(#gView)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ds-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="ds-h-sm">Revenue & Deals Closed</div>
              <div className="text-xs text-muted-foreground">{RANGE_LABEL[range]}</div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line yAxisId="l" dataKey="dealsClosed" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Charts row 2 */}
        <section className="grid gap-3 lg:grid-cols-3">
          <div className="ds-card p-4 lg:col-span-2">
            <div className="mb-2 ds-h-sm">Listing Performance (top regions)</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={topRegions}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ds-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="ds-h-sm">Deal Health</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={healthBreak} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {healthBreak.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              {healthBreak.map((h) => (
                <div key={h.key} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", HEALTH[h.key]?.badge)}>
                  <span className={cn("h-2 w-2 rounded-full", HEALTH[h.key]?.dot)} />
                  {h.name}: <span className="font-semibold">{h.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Market insights */}
        <section className="ds-card p-4">
          <button className="flex w-full items-center justify-between" onClick={() => setOpenInsights((v) => !v)}>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span className="ds-h-sm">Market Insights</span></div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openInsights && "rotate-180")} />
          </button>
          {openInsights && (
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div>
                <div className="ds-caption mb-2">Most popular regions</div>
                <ul className="space-y-1.5 text-sm">
                  {topRegions.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
                  {topRegions.map((r) => (<li key={r.name} className="flex justify-between"><span>{r.name}</span><span className="font-semibold">{r.value}</span></li>))}
                </ul>
              </div>
              <div>
                <div className="ds-caption mb-2">Most viewed properties</div>
                <ul className="space-y-1.5 text-sm">
                  {topProps.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
                  {topProps.map((p) => (<li key={p.id} className="flex justify-between gap-3"><span className="truncate">{p.title}</span><span className="font-semibold">{p.view_count ?? 0}</span></li>))}
                </ul>
              </div>
              <div>
                <div className="ds-caption mb-2">Top categories</div>
                <ul className="space-y-1.5 text-sm">
                  {topCategories.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
                  {topCategories.map((c) => (<li key={c.name} className="flex justify-between"><span className="capitalize">{c.name.replace(/_/g," ")}</span><span className="font-semibold">{c.value}</span></li>))}
                </ul>
              </div>
              <div className="md:col-span-3">
                <div className="ds-caption mb-2">Highest-converting listings</div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {highConverting.length === 0 && <div className="text-sm text-muted-foreground">Not enough deal data yet.</div>}
                  {highConverting.map((h) => (
                    <div key={h.property?.id} className="rounded-xl border bg-card p-3">
                      <div className="truncate text-sm font-medium">{h.property?.title}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{h.property?.region ?? "—"}</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">{h.rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Agents */}
        <section className="ds-card p-4">
          <button className="flex w-full items-center justify-between" onClick={() => setOpenAgents((v) => !v)}>
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><span className="ds-h-sm">Top Agents</span></div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openAgents && "rotate-180")} />
          </button>
          {openAgents && (
            <div className="mt-3 overflow-x-auto">
              {topAgents.length === 0 ? (
                <EmptyState title="No agent activity yet." description="Assigned agents will appear here as deals progress." icon={Trophy} />
              ) : (
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr>
                    <th className="py-2">Agent</th><th>Deals</th><th>Closed</th><th>Conversion</th><th>Rating</th>
                  </tr></thead>
                  <tbody>
                    {topAgents.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="py-2">{a.profile?.full_name ?? a.id.slice(0, 8)}</td>
                        <td>{a.total}</td>
                        <td>{a.closed}</td>
                        <td>{a.rate}%</td>
                        <td className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{(4 + (a.rate / 100)).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* Owners */}
        <section className="ds-card p-4">
          <button className="flex w-full items-center justify-between" onClick={() => setOpenOwners((v) => !v)}>
            <div className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /><span className="ds-h-sm">Top Owners</span></div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openOwners && "rotate-180")} />
          </button>
          {openOwners && (
            <div className="mt-3 overflow-x-auto">
              {topOwners.length === 0 ? (
                <EmptyState title="No owner data yet." icon={Home} />
              ) : (
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr>
                    <th className="py-2">Owner</th><th>Listings</th><th>Views</th><th>Closed</th><th>Revenue</th><th>Health</th>
                  </tr></thead>
                  <tbody>
                    {topOwners.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="py-2">{o.profile?.full_name ?? o.id.slice(0, 8)}</td>
                        <td>{o.listings}</td>
                        <td>{o.views}</td>
                        <td>{o.closed}</td>
                        <td>{fmtMoney(o.revenue)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${o.health}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{o.health}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="ds-card p-4">
          <div className="mb-2 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><span className="ds-h-sm">Market Alerts</span></div>
          {notifs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No alerts yet. We'll notify you when leads spike, conversion drops, or new trends appear.</div>
          ) : (
            <ul className="divide-y">
              {notifs.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                  <div>
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {loading && <div className="text-center text-sm text-muted-foreground">Loading data…</div>}
      </div>
    </DashboardShell>
  );
}
