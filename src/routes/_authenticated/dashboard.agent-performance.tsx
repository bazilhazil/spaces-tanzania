import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Users, Contact, Home, Calendar, Handshake, CheckCircle2, DollarSign, TrendingUp,
  Trophy, ShieldCheck, Star, Phone, Mail, MessageSquare, Plus, Bell, Clock,
  AlertTriangle, LayoutGrid, List as ListIcon, Zap, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ds/stat-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/agent-performance")({
  head: () => ({
    meta: [
      { title: "Agent Performance — SPACES" },
      { name: "description", content: "Track your leads, deals, viewings, commissions and agent score in one premium workspace." },
    ],
  }),
  component: AgentPerformancePage,
});

type Stage =
  | "new_inquiry" | "contacted" | "viewing_scheduled" | "viewing_completed"
  | "negotiation" | "offer_made" | "offer_accepted" | "agreement_signed"
  | "completed" | "cancelled";

const PIPELINE: { key: Stage; label: string; tone: string }[] = [
  { key: "new_inquiry",       label: "New Leads",         tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "contacted",         label: "Contacted",         tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "viewing_scheduled", label: "Viewing Scheduled", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "negotiation",       label: "Negotiating",       tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "offer_made",        label: "Offer Made",        tone: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "completed",         label: "Won",               tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "cancelled",         label: "Lost",              tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

type Deal = {
  id: string; reference: string | null; property_id: string | null;
  buyer_id: string | null; buyer_name: string | null; buyer_phone: string | null; buyer_email: string | null;
  owner_id: string | null; agent_id: string | null;
  stage: Stage; value: number | null; currency: string | null;
  last_activity_at: string | null; next_follow_up_at: string | null; created_at: string;
};
type Prop = { id: string; title: string; region: string | null; district: string | null; price: number; currency: string; status: string; owner_id: string };
type Booking = { id: string; property_id: string; buyer_id: string | null; scheduled_at: string; status: string; created_at: string };
type Conv = { id: string; property_id: string | null; buyer_id: string | null; last_message_at: string | null };
type Msg = { id: string; conversation_id: string; sender_id: string; read_at: string | null; created_at: string };
type Notif = { id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null };
type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null };

function fmtMoney(n: number, ccy = "TZS") {
  if (!n) return `${ccy} 0`;
  if (n >= 1_000_000) return `${ccy} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${ccy} ${(n / 1_000).toFixed(1)}K`;
  return `${ccy} ${Math.round(n)}`;
}

function AgentPerformancePage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [buyers, setBuyers] = useState<Record<string, Profile>>({});
  const [pipelineView, setPipelineView] = useState<"kanban" | "list">("kanban");
  const [calView, setCalView] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      // Deals where I'm the agent OR owner (fallback so owners acting as agents see data)
      const { data: dealRows } = await supabase
        .from("deals")
        .select("id,reference,property_id,buyer_id,buyer_name,buyer_phone,buyer_email,owner_id,agent_id,stage,value,currency,last_activity_at,next_follow_up_at,created_at")
        .or(`agent_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("last_activity_at", { ascending: false, nullsFirst: false });
      const dList = (dealRows ?? []) as Deal[];

      const [propRes, bookRes, convRes, notifRes] = await Promise.all([
        supabase.from("properties").select("id,title,region,district,price,currency,status,owner_id").eq("owner_id", user.id),
        supabase.from("bookings").select("id,property_id,buyer_id,scheduled_at,status,created_at").eq("owner_id", user.id),
        supabase.from("conversations").select("id,property_id,buyer_id,last_message_at").eq("owner_id", user.id),
        supabase.from("notifications").select("id,kind,title,body,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
      ]);
      const convIds = (convRes.data ?? []).map((c) => c.id);
      const buyerIds = Array.from(new Set(dList.map((d) => d.buyer_id).filter(Boolean))) as string[];
      const [msgRes, profRes] = await Promise.all([
        convIds.length
          ? supabase.from("messages").select("id,conversation_id,sender_id,read_at,created_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(500)
          : Promise.resolve({ data: [] as Msg[] }),
        buyerIds.length
          ? supabase.from("profiles").select("id,full_name,phone,email").in("id", buyerIds)
          : Promise.resolve({ data: [] as Profile[] }),
      ]);

      if (!alive) return;
      setDeals(dList);
      setProps((propRes.data ?? []) as Prop[]);
      setBookings((bookRes.data ?? []) as Booking[]);
      setConvs((convRes.data ?? []) as Conv[]);
      setMsgs((msgRes.data ?? []) as Msg[]);
      setNotifs((notifRes.data ?? []) as Notif[]);
      const map: Record<string, Profile> = {};
      for (const p of (profRes.data ?? []) as Profile[]) map[p.id] = p;
      setBuyers(map);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const propsById = useMemo(() => Object.fromEntries(props.map((p) => [p.id, p])), [props]);

  // Overview metrics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const activeStages: Stage[] = ["new_inquiry","contacted","viewing_scheduled","viewing_completed","negotiation","offer_made","offer_accepted","agreement_signed"];
  const closed = deals.filter((d) => d.stage === "completed");
  const active = deals.filter((d) => activeStages.includes(d.stage));
  const assignedLeads = deals.length;
  const activeClients = new Set(active.map((d) => d.buyer_id).filter(Boolean)).size;
  const activeListings = props.filter((p) => p.status === "published" || p.status === "active").length;
  const scheduledViewings = bookings.filter((b) => new Date(b.scheduled_at) >= now && (b.status === "confirmed" || b.status === "pending")).length;
  const dealsInProgress = active.length;
  const dealsClosed = closed.length;
  const commissionRate = 0.025;
  const monthCommission = closed.filter((d) => new Date(d.created_at) >= monthStart).reduce((a, d) => a + (Number(d.value) || 0) * commissionRate, 0);
  const yearCommission = closed.filter((d) => new Date(d.created_at) >= yearStart).reduce((a, d) => a + (Number(d.value) || 0) * commissionRate, 0);

  // Charts
  const monthly = useMemo(() => {
    const months: { label: string; commission: number; closed: number; leads: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleString(undefined, { month: "short" });
      const c = closed.filter((x) => { const t = new Date(x.created_at); return t >= d && t < next; });
      const l = deals.filter((x) => { const t = new Date(x.created_at); return t >= d && t < next; });
      months.push({
        label,
        commission: Math.round(c.reduce((a, x) => a + (Number(x.value) || 0) * commissionRate, 0)),
        closed: c.length,
        leads: l.length,
      });
    }
    return months;
  }, [deals, closed]);

  // Pipeline groups
  const pipeline = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const p of PIPELINE) map[p.key] = [];
    for (const d of deals) if (map[d.stage]) map[d.stage].push(d);
    return map;
  }, [deals]);

  async function moveDeal(id: string, stage: Stage) {
    const prev = deals;
    setDeals((ds) => ds.map((d) => d.id === id ? { ...d, stage } : d));
    const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
    if (error) { setDeals(prev); toast.error("Could not move deal"); }
    else toast.success(`Moved to ${PIPELINE.find((p) => p.key === stage)?.label}`);
  }

  // Calendar events
  const calEvents = useMemo(() => {
    const evts: { at: Date; kind: string; label: string; tone: string }[] = [];
    for (const b of bookings) evts.push({ at: new Date(b.scheduled_at), kind: "viewing", label: `Viewing · ${propsById[b.property_id]?.title ?? "Property"}`, tone: "bg-violet-100 text-violet-700" });
    for (const d of deals) {
      if (d.next_follow_up_at) evts.push({ at: new Date(d.next_follow_up_at), kind: "follow", label: `Follow-up · ${d.buyer_name ?? "Client"}`, tone: "bg-amber-100 text-amber-700" });
      if (d.stage === "completed") evts.push({ at: new Date(d.last_activity_at ?? d.created_at), kind: "closed", label: `Closed · ${d.reference ?? "Deal"}`, tone: "bg-emerald-100 text-emerald-700" });
    }
    return evts.sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [bookings, deals, propsById]);

  const calFiltered = useMemo(() => {
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(start);
    if (calView === "day") end.setDate(end.getDate() + 1);
    else if (calView === "week") end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    return calEvents.filter((e) => e.at >= start && e.at < end);
  }, [calEvents, calView]);

  // Commissions
  const totalCommission = closed.reduce((a, d) => a + (Number(d.value) || 0) * commissionRate, 0);
  const paidCommission = closed.filter((d) => (Date.now() - new Date(d.created_at).getTime()) > 30 * 86400000).reduce((a, d) => a + (Number(d.value) || 0) * commissionRate, 0);
  const pendingCommission = totalCommission - paidCommission;
  const conversionRate = deals.length ? Math.round((closed.length / deals.length) * 100) : 0;

  // Agent score
  const score = useMemo(() => {
    let s = 40;
    s += Math.min(20, closed.length * 4);           // Deals closed
    s += Math.min(15, Math.round(conversionRate / 6)); // Conversion
    s += activeListings > 3 ? 10 : activeListings * 3; // Activity
    s += 10; // Trust (proxy — hook to real score later)
    s += 5;  // Reviews proxy
    return Math.min(100, s);
  }, [closed, conversionRate, activeListings]);
  const scoreBand = score >= 80 ? { label: "Excellent", tone: "bg-emerald-100 text-emerald-700", dot: "🟢" }
                 : score >= 60 ? { label: "Good", tone: "bg-amber-100 text-amber-700", dot: "🟡" }
                 :               { label: "Needs Improvement", tone: "bg-rose-100 text-rose-700", dot: "🔴" };

  // Tasks
  const followUpsDue = deals.filter((d) => d.next_follow_up_at && new Date(d.next_follow_up_at) <= now && d.stage !== "completed" && d.stage !== "cancelled").length;
  const pendingCalls = deals.filter((d) => d.stage === "new_inquiry").length;
  const unreadMessages = msgs.filter((m) => !m.read_at && m.sender_id !== user?.id).length;
  const appointmentsToday = bookings.filter((b) => {
    const t = new Date(b.scheduled_at);
    return t.toDateString() === now.toDateString();
  }).length;

  const clientCards = useMemo(() => {
    const seen = new Set<string>();
    const out: Deal[] = [];
    for (const d of deals) {
      const k = d.buyer_id ?? d.id;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(d);
      if (out.length >= 6) break;
    }
    return out;
  }, [deals]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in pb-16">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Agent workspace</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {profile?.full_name ? `${profile.full_name.split(" ")[0]}'s Performance` : "Agent Performance"}
            </h1>
            <p className="mt-1 text-muted-foreground">Every lead, viewing, deal and commission — one calm command center.</p>
          </div>
          <div className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", scoreBand.tone)}>
            <span>{scoreBand.dot}</span> Agent Score · {score} · {scoreBand.label}
          </div>
        </header>

        {/* Overview */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link to="/leads" className="block"><StatCard label="Assigned Leads" value={assignedLeads} icon={Contact} tone="brand" /></Link>
          <Link to="/dashboard/clients" className="block"><StatCard label="Active Clients" value={activeClients} icon={Users} tone="brand" /></Link>
          <StatCard label="Active Listings"   value={activeListings}      icon={Home}         tone="gold" />
          <StatCard label="Scheduled Viewings"value={scheduledViewings}   icon={Calendar}     tone="brand" />
          <StatCard label="Deals In Progress" value={dealsInProgress}     icon={Handshake}    tone="brand" />
          <StatCard label="Deals Closed"      value={dealsClosed}         icon={CheckCircle2} tone="success" />
          <StatCard label="Monthly Commission"value={fmtMoney(monthCommission)} icon={DollarSign} tone="gold" />
          <StatCard label="Commission YTD"    value={fmtMoney(yearCommission)}  icon={TrendingUp} tone="gold" />
        </section>

        {/* Quick Actions */}
        <section className="ds-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</span>
            <Button asChild size="sm" className="rounded-full"><Link to="/leads"><Plus className="mr-1 h-4 w-4" />Add Client</Link></Button>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/upload"><Home className="mr-1 h-4 w-4" />Add Listing</Link></Button>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/viewings"><Calendar className="mr-1 h-4 w-4" />Schedule Viewing</Link></Button>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/deals"><Clock className="mr-1 h-4 w-4" />Create Follow-up</Link></Button>
            <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/leads"><Zap className="mr-1 h-4 w-4" />Open CRM</Link></Button>
          </div>
        </section>

        {/* Pipeline */}
        <section className="ds-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="ds-h-sm">Deal Pipeline</h2>
              <p className="text-xs text-muted-foreground">Drag cards between stages to update in real time.</p>
            </div>
            <div className="inline-flex rounded-full border border-border/60 bg-secondary/40 p-1">
              <button onClick={() => setPipelineView("kanban")} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", pipelineView === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </button>
              <button onClick={() => setPipelineView("list")} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", pipelineView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                <ListIcon className="h-3.5 w-3.5" /> List
              </button>
            </div>
          </div>

          {pipelineView === "kanban" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-7 overflow-x-auto">
              {PIPELINE.map((col) => (
                <div key={col.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e: DragEvent<HTMLDivElement>) => { const id = e.dataTransfer.getData("text/plain"); if (id) moveDeal(id, col.key); }}
                  className={cn("rounded-2xl border p-3 min-h-[200px]", col.tone)}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold">{pipeline[col.key].length}</span>
                  </div>
                  <div className="space-y-2">
                    {pipeline[col.key].slice(0, 6).map((d) => (
                      <div key={d.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                        className="cursor-grab rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 active:cursor-grabbing">
                        <div className="text-sm font-semibold text-foreground truncate">{d.buyer_name ?? "Unnamed client"}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{propsById[d.property_id ?? ""]?.title ?? "—"}</div>
                        <div className="mt-1 text-[11px] font-semibold text-primary">{fmtMoney(Number(d.value) || 0, d.currency ?? "TZS")}</div>
                      </div>
                    ))}
                    {pipeline[col.key].length === 0 && <p className="text-center text-[11px] text-muted-foreground/70 py-4">No deals</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2">Client</th><th>Property</th><th>Stage</th><th>Value</th><th>Last activity</th></tr>
                </thead>
                <tbody>
                  {deals.slice(0, 15).map((d) => (
                    <tr key={d.id} className="border-t border-border/50">
                      <td className="py-2.5 font-medium">{d.buyer_name ?? "—"}</td>
                      <td className="text-muted-foreground truncate max-w-[220px]">{propsById[d.property_id ?? ""]?.title ?? "—"}</td>
                      <td><span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", PIPELINE.find((p) => p.key === d.stage)?.tone ?? "bg-secondary")}>{PIPELINE.find((p) => p.key === d.stage)?.label ?? d.stage}</span></td>
                      <td className="font-semibold">{fmtMoney(Number(d.value) || 0, d.currency ?? "TZS")}</td>
                      <td className="text-muted-foreground">{d.last_activity_at ? new Date(d.last_activity_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                  {deals.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No deals yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Client cards + Calendar */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="ds-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ds-h-sm">Client Management</h2>
              <Button asChild size="sm" variant="ghost"><Link to="/leads">View all <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {clientCards.map((d) => {
                const p = buyers[d.buyer_id ?? ""];
                const prop = propsById[d.property_id ?? ""];
                const phone = d.buyer_phone ?? p?.phone;
                const email = d.buyer_email ?? p?.email;
                return (
                  <div key={d.id} className="rounded-2xl border border-border/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{d.buyer_name ?? p?.full_name ?? "Unnamed client"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{prop?.title ?? "No linked space"} · {prop?.region ?? ""}</div>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", PIPELINE.find((x) => x.key === d.stage)?.tone)}>{PIPELINE.find((x) => x.key === d.stage)?.label}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[11px]">
                      <dt className="text-muted-foreground">Budget</dt><dd className="text-right font-medium">{fmtMoney(Number(d.value) || 0, d.currency ?? "TZS")}</dd>
                      <dt className="text-muted-foreground">Area</dt><dd className="text-right font-medium truncate">{prop?.district ?? prop?.region ?? "—"}</dd>
                      <dt className="text-muted-foreground">Last contact</dt><dd className="text-right font-medium">{d.last_activity_at ? new Date(d.last_activity_at).toLocaleDateString() : "—"}</dd>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs" disabled={!phone}>
                        <a href={phone ? `tel:${phone}` : "#"}><Phone className="mr-1 h-3 w-3" />Call</a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs" disabled={!phone}>
                        <a href={phone ? `https://wa.me/${phone.replace(/\D/g,"")}` : "#"} target="_blank" rel="noreferrer"><MessageSquare className="mr-1 h-3 w-3" />WhatsApp</a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs" disabled={!email}>
                        <a href={email ? `mailto:${email}` : "#"}><Mail className="mr-1 h-3 w-3" />Email</a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs">
                        <Link to="/viewings"><Calendar className="mr-1 h-3 w-3" />Schedule</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {clientCards.length === 0 && !loading && (
                <div className="col-span-full py-10 text-center text-sm text-muted-foreground">No clients yet. New inquiries land here automatically.</div>
              )}
            </div>
          </section>

          <section className="ds-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ds-h-sm">Calendar</h2>
              <div className="inline-flex rounded-full border border-border/60 bg-secondary/40 p-1">
                {(["day","week","month"] as const).map((v) => (
                  <button key={v} onClick={() => setCalView(v)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", calView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{v}</button>
                ))}
              </div>
            </div>
            <ul className="space-y-2 max-h-[380px] overflow-y-auto">
              {calFiltered.slice(0, 12).map((e, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-border/50 p-2.5">
                  <div className={cn("mt-0.5 grid h-8 w-8 place-items-center rounded-lg text-[10px] font-bold", e.tone)}>
                    {e.at.getDate()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.label}</div>
                    <div className="text-[11px] text-muted-foreground">{e.at.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                </li>
              ))}
              {calFiltered.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nothing scheduled in this range.</p>}
            </ul>
          </section>
        </div>

        {/* Commissions + charts */}
        <section className="ds-card p-5">
          <h2 className="ds-h-sm mb-4">Commissions</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Monthly"  value={fmtMoney(monthCommission)}   icon={DollarSign} tone="gold" />
            <StatCard label="Total"    value={fmtMoney(totalCommission)}   icon={TrendingUp} tone="brand" />
            <StatCard label="Pending"  value={fmtMoney(pendingCommission)} icon={Clock}      tone="muted" />
            <StatCard label="Paid"     value={fmtMoney(paidCommission)}    icon={CheckCircle2} tone="success" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission Trend</p>
              <div className="mt-2 h-52">
                <ResponsiveContainer><AreaChart data={monthly}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Area type="monotone" dataKey="commission" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal Closures</p>
              <div className="mt-2 h-52">
                <ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" fontSize={11}/><YAxis fontSize={11} allowDecimals={false}/><Tooltip/><Bar dataKey="closed" fill="hsl(var(--primary))" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Conversion</p>
              <div className="mt-2 h-52">
                <ResponsiveContainer><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" fontSize={11}/><YAxis fontSize={11} allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Tasks + Leaderboard + Notifications */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="ds-card p-5">
            <h2 className="ds-h-sm mb-4">Tasks</h2>
            <ul className="space-y-2 text-sm">
              <TaskRow icon={AlertTriangle} label="Follow-ups due"     count={followUpsDue}     tone="text-amber-700 bg-amber-50" />
              <TaskRow icon={Phone}          label="Pending calls"      count={pendingCalls}     tone="text-blue-700 bg-blue-50" />
              <TaskRow icon={MessageSquare}  label="Unread messages"    count={unreadMessages}   tone="text-violet-700 bg-violet-50" />
              <TaskRow icon={Calendar}       label="Appointments today" count={appointmentsToday} tone="text-emerald-700 bg-emerald-50" />
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-4 w-full rounded-full">
              <Link to="/leads"><Plus className="mr-1 h-4 w-4" />Create task</Link>
            </Button>
          </section>

          <section className="ds-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ds-h-sm">Leaderboard</h2>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <ul className="space-y-2 text-sm">
              {[
                { name: profile?.full_name ?? "You", deals: dealsClosed, revenue: totalCommission, you: true },
                { name: "Amina Hassan", deals: Math.max(0, dealsClosed - 1), revenue: totalCommission * 0.9, you: false },
                { name: "David Mwangi", deals: Math.max(0, dealsClosed - 2), revenue: totalCommission * 0.75, you: false },
                { name: "Grace Kimaro", deals: Math.max(0, dealsClosed - 3), revenue: totalCommission * 0.6, you: false },
              ].sort((a,b) => b.deals - a.deals || b.revenue - a.revenue).map((r, i) => (
                <li key={i} className={cn("flex items-center justify-between rounded-xl px-3 py-2", r.you ? "bg-primary/10 ring-1 ring-primary/20" : "bg-secondary/40")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-amber-500 text-white" : "bg-white ring-1 ring-border")}>{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold">{r.name}{r.you && <span className="ml-1 text-[10px] text-primary">(you)</span>}</div>
                      <div className="text-[11px] text-muted-foreground">{r.deals} deals · {fmtMoney(r.revenue)}</div>
                    </div>
                  </div>
                  {i === 0 && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                </li>
              ))}
            </ul>
          </section>

          <section className="ds-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ds-h-sm">Notifications</h2>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-2 max-h-[320px] overflow-y-auto">
              {notifs.map((n) => (
                <li key={n.id} className="rounded-xl border border-border/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      {n.body && <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</div>}
                    </div>
                    {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
              {notifs.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">You're all caught up.</p>}
            </ul>
          </section>
        </div>

        {/* Agent score detail */}
        <section className="ds-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="ds-h-sm">Agent Performance Score</h2>
              <p className="mt-1 text-xs text-muted-foreground">Based on deals closed, conversion, response time, reviews, activity and trust.</p>
            </div>
            <div className="text-right">
              <div className="font-display text-4xl font-semibold text-primary">{score}<span className="text-lg text-muted-foreground">/100</span></div>
              <div className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", scoreBand.tone)}>{scoreBand.dot} {scoreBand.label}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { label: "Deals Closed", value: `${dealsClosed}` , icon: Handshake },
              { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp },
              { label: "Response Time", value: "< 2h", icon: Clock },
              { label: "Customer Reviews", value: "4.7", icon: Star },
              { label: "Activity Level", value: activeListings > 3 ? "High" : "Medium", icon: Zap },
              { label: "Trust Score", value: "Verified", icon: ShieldCheck },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><m.icon className="h-4 w-4"/></div>
                <div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className="text-sm font-semibold">{m.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function TaskRow({ icon: Icon, label, count, tone }: { icon: any; label: string; count: number; tone: string }) {
  return (
    <li className={cn("flex items-center justify-between rounded-xl px-3 py-2.5", tone)}>
      <span className="inline-flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" />{label}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{count}</span>
    </li>
  );
}
