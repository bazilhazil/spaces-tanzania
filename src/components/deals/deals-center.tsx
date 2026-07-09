import { useMemo, useState } from "react";
import {
  Search, Filter, Plus, MoreHorizontal, ArrowRight, ArrowLeft, ChevronRight,
  Phone, MessageSquare, FileText, Upload, Bell, CheckCircle2, XCircle, Clock,
  MapPin, Calendar, User, TrendingUp, DollarSign, Activity, Award, Building2,
  LayoutGrid, List as ListIcon, BarChart3, Download, Paperclip, StickyNote, X,
  ArrowUpRight, PieChart, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DEALS, STAGE_META, PIPELINE_STAGES, ALL_STAGES, PRIORITY_META, DOCUMENT_META,
  propertyOfDeal, agentOfDeal, timeAgo, formatValue, formatDate, computeDealKpis,
  type Deal, type DealStage, type DealPriority, type Offer,
} from "@/lib/deals-mock";
import { agents } from "@/lib/mock-data";

type ViewMode = "overview" | "kanban" | "list" | "reports";

export function DealsCenter() {
  const [deals, setDeals] = useState<Deal[]>(DEALS);
  const [view, setView] = useState<ViewMode>("overview");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      if (agentFilter !== "all" && d.assignedAgentId !== agentFilter) return false;
      if (priorityFilter !== "all" && d.priority !== priorityFilter) return false;
      if (!q) return true;
      const p = propertyOfDeal(d);
      return (
        d.buyerName.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        d.ownerName.toLowerCase().includes(q) ||
        (p?.title.toLowerCase().includes(q) ?? false) ||
        (p?.city.toLowerCase().includes(q) ?? false)
      );
    });
  }, [deals, query, stageFilter, agentFilter, priorityFilter]);

  const kpis = useMemo(() => computeDealKpis(deals), [deals]);

  function updateDeal(id: string, patch: Partial<Deal> | ((d: Deal) => Deal)) {
    setDeals((prev) => prev.map((d) => (d.id === id ? (typeof patch === "function" ? patch(d) : { ...d, ...patch }) : d)));
  }

  function moveStage(id: string, direction: 1 | -1) {
    setDeals((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const idx = PIPELINE_STAGES.indexOf(d.stage);
      if (idx < 0) return d;
      const nextIdx = Math.min(PIPELINE_STAGES.length - 1, Math.max(0, idx + direction));
      const nextStage = PIPELINE_STAGES[nextIdx];
      if (nextStage === d.stage) return d;
      const label = direction > 0 ? "Moved forward" : "Moved back";
      toast.success(`${label}: ${STAGE_META[nextStage].label}`);
      return {
        ...d,
        stage: nextStage,
        lastActivityAt: new Date().toISOString(),
        activity: [
          { id: `sc-${Date.now()}`, at: new Date().toISOString(), kind: "stage_changed", label: `Stage → ${STAGE_META[nextStage].label}` },
          ...d.activity,
        ],
      };
    }));
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card className="rounded-2xl border-border/60 p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-full lg:w-auto">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Pipeline</span></TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><ListIcon className="h-4 w-4" /><span className="hidden sm:inline">List</span></TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5"><PieChart className="h-4 w-4" /><span className="hidden sm:inline">Reports</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-1 items-center gap-2 lg:justify-end">
            <div className="relative flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals, buyers, refs…" className="h-9 pl-9" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filters</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>Stage</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as DealStage | "all")}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {ALL_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Assigned Agent</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All agents</SelectItem>
                      {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as DealPriority | "all")}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {(Object.keys(PRIORITY_META) as DealPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="gap-2" onClick={() => toast.info("Deals are auto-created from inquiries and viewings.")}>
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">New deal</span>
            </Button>
          </div>
        </div>
      </Card>

      {view === "overview" && <OverviewView kpis={kpis} deals={deals} onOpen={setSelectedId} />}
      {view === "kanban" && <KanbanView deals={filtered} onOpen={setSelectedId} onMove={moveStage} />}
      {view === "list" && <ListView deals={filtered} onOpen={setSelectedId} />}
      {view === "reports" && <ReportsView kpis={kpis} />}

      <DealDrawer
        deal={selected}
        onClose={() => setSelectedId(null)}
        onMove={moveStage}
        onUpdate={updateDeal}
      />
    </div>
  );
}

/* ============================ OVERVIEW ============================ */

function OverviewView({ kpis, deals, onOpen }: { kpis: ReturnType<typeof computeDealKpis>; deals: Deal[]; onOpen: (id: string) => void }) {
  const upcomingReminders = deals.flatMap(d => d.reminders.map(r => ({ ...r, deal: d })))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 6);
  const recentActivity = deals.flatMap(d => d.activity.slice(0, 2).map(a => ({ ...a, deal: d })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Activity} label="Active deals" value={kpis.activeCount} tone="text-sky-600" />
        <KpiCard icon={Calendar} label="Closing this week" value={kpis.closingThisWeek} tone="text-violet-600" />
        <KpiCard icon={CheckCircle2} label="Completed" value={kpis.completedCount} tone="text-emerald-600" />
        <KpiCard icon={XCircle} label="Cancelled" value={kpis.cancelledCount} tone="text-rose-600" />
        <KpiCard icon={Clock} label="Avg closing time" value={`${kpis.avgClosingDays}d`} tone="text-amber-600" />
        <KpiCard icon={DollarSign} label="Total value" value={formatValue(kpis.totalValueTzs, "TZS")} tone="text-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Pipeline distribution</h3>
              <p className="text-xs text-muted-foreground">Deal count per stage across the pipeline.</p>
            </div>
            <Badge variant="secondary" className="rounded-full">Conversion {kpis.conversion}%</Badge>
          </div>
          <div className="space-y-2.5">
            {PIPELINE_STAGES.map((s) => {
              const count = deals.filter(d => d.stage === s).length;
              const max = Math.max(1, ...PIPELINE_STAGES.map(k => deals.filter(d => d.stage === k).length));
              const pct = Math.round((count / max) * 100);
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", STAGE_META[s].dot)} />
                    <span className="truncate">{STAGE_META[s].label}</span>
                  </div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("absolute inset-y-0 left-0 rounded-full", STAGE_META[s].dot)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground">Reminders</h3>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {upcomingReminders.length === 0 && <p className="text-sm text-muted-foreground">No upcoming reminders.</p>}
            {upcomingReminders.map(r => (
              <button
                key={r.id}
                onClick={() => onOpen(r.deal.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background p-3 text-left transition-colors hover:bg-accent"
              >
                <ReminderIcon kind={r.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.deal.reference} • {timeAgo(r.dueAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">Recent activity</h3>
          <Badge variant="outline" className="rounded-full text-xs">Live</Badge>
        </div>
        <ol className="relative space-y-3 border-l border-border/60 pl-5">
          {recentActivity.map((a) => (
            <li key={`${a.deal.id}-${a.id}`} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <button onClick={() => onOpen(a.deal.id)} className="group text-left">
                <p className="text-sm font-medium text-foreground group-hover:underline">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.deal.reference} • {a.deal.buyerName} • {timeAgo(a.at)}</p>
                {a.detail && <p className="mt-0.5 text-xs text-muted-foreground/80">{a.detail}</p>}
              </button>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div className={cn("rounded-xl bg-secondary/70 p-2", tone)}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  );
}

function ReminderIcon({ kind }: { kind: string }) {
  const meta: Record<string, { icon: any; tone: string }> = {
    deadline: { icon: AlertTriangle, tone: "text-rose-600 bg-rose-500/10" },
    agreement_pending: { icon: FileText, tone: "text-amber-600 bg-amber-500/10" },
    viewing_tomorrow: { icon: Calendar, tone: "text-violet-600 bg-violet-500/10" },
    follow_up: { icon: Bell, tone: "text-sky-600 bg-sky-500/10" },
  };
  const m = meta[kind] ?? meta.follow_up;
  const Icon = m.icon;
  return <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.tone)}><Icon className="h-4 w-4" /></span>;
}

/* ============================ KANBAN ============================ */

function KanbanView({ deals, onOpen, onMove }: { deals: Deal[]; onOpen: (id: string) => void; onMove: (id: string, dir: 1 | -1) => void }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const list = deals.filter((d) => d.stage === stage);
          const total = list.reduce((s, d) => s + (d.currency === "USD" ? d.value * 2600 : d.value), 0);
          return (
            <div key={stage} className="w-[300px] shrink-0">
              <div className="mb-2 flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STAGE_META[stage].dot)} />
                  <span className="text-sm font-semibold text-foreground">{STAGE_META[stage].short}</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">{list.length}</Badge>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{formatValue(total, "TZS")}</span>
              </div>
              <div className="space-y-2">
                {list.map((d) => (
                  <KanbanCard key={d.id} deal={d} onOpen={() => onOpen(d.id)} onMove={onMove} />
                ))}
                {list.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ deal, onOpen, onMove }: { deal: Deal; onOpen: () => void; onMove: (id: string, dir: 1 | -1) => void }) {
  const property = propertyOfDeal(deal);
  return (
    <div className="group rounded-xl border border-border/60 bg-background p-3 shadow-[var(--shadow-soft)] transition-all hover:border-primary/40 hover:shadow-md">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">{deal.reference}</span>
          <Badge className={cn("h-5 rounded-full border-0 px-2 text-[10px]", PRIORITY_META[deal.priority].color)}>{PRIORITY_META[deal.priority].label}</Badge>
        </div>
        <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{property?.title ?? "Property"}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{property?.ward}, {property?.city}</p>
        <div className="mt-2.5 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={deal.buyerAvatar} />
            <AvatarFallback className="text-[10px]">{deal.buyerName.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium text-foreground">{deal.buyerName}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2">
          <span className="font-display text-sm font-semibold text-foreground">{formatValue(deal.value, deal.currency)}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(deal.lastActivityAt)}</span>
        </div>
      </button>
      <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="ghost" className="h-7 flex-1 gap-1 text-[11px]" onClick={() => onMove(deal.id, -1)}>
          <ArrowLeft className="h-3 w-3" />Back
        </Button>
        <Button size="sm" variant="ghost" className="h-7 flex-1 gap-1 text-[11px] text-primary" onClick={() => onMove(deal.id, 1)}>
          Next<ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ============================ LIST ============================ */

function ListView({ deals, onOpen }: { deals: Deal[]; onOpen: (id: string) => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-[var(--shadow-soft)]">
      <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-secondary/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <div className="col-span-3">Buyer / Ref</div>
        <div className="col-span-3">Property</div>
        <div className="col-span-2">Stage</div>
        <div className="col-span-2">Value</div>
        <div className="col-span-1">Close</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>
      <div className="divide-y divide-border/60">
        {deals.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No deals match your filters.</div>
        )}
        {deals.map((d) => {
          const p = propertyOfDeal(d);
          const a = agentOfDeal(d);
          return (
            <div key={d.id} className="grid cursor-pointer grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-accent md:grid-cols-12 md:items-center" onClick={() => onOpen(d.id)}>
              <div className="col-span-3 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={d.buyerAvatar} />
                  <AvatarFallback>{d.buyerName.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{d.buyerName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{d.reference}</p>
                </div>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{p?.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p?.ward}, {p?.city}</p>
              </div>
              <div className="col-span-2">
                <Badge className={cn("border-0 font-medium", STAGE_META[d.stage].color)}>
                  <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STAGE_META[d.stage].dot)} />
                  {STAGE_META[d.stage].label}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="font-display text-sm font-semibold text-foreground">{formatValue(d.value, d.currency)}</p>
                <p className="text-xs text-muted-foreground">{a?.name}</p>
              </div>
              <div className="col-span-1 text-xs text-muted-foreground">{formatDate(d.expectedClose)}</div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ============================ REPORTS ============================ */

function ReportsView({ kpis }: { kpis: ReturnType<typeof computeDealKpis> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Deals by region</h3>
            <p className="text-xs text-muted-foreground">Geographic distribution across cities.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Region report exported")}><Download className="h-3.5 w-3.5" />CSV</Button>
        </div>
        <div className="space-y-2">
          {kpis.byRegion.map(([city, count]) => {
            const max = Math.max(1, ...kpis.byRegion.map(([, c]) => c));
            const pct = Math.round((count / max) * 100);
            return (
              <div key={city} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm text-foreground">{city}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Deals by property type</h3>
            <p className="text-xs text-muted-foreground">What's converting best.</p>
          </div>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          {kpis.byCategory.map(([cat, count]) => {
            const max = Math.max(1, ...kpis.byCategory.map(([, c]) => c));
            const pct = Math.round((count / max) * 100);
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm text-foreground">{cat}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Top agents</h3>
            <p className="text-xs text-muted-foreground">Ranked by closed deals and total value.</p>
          </div>
          <Award className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          {kpis.topAgents.map((row, i) => (
            <div key={row.agent?.id ?? i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
              <Avatar className="h-9 w-9"><AvatarImage src={row.agent?.avatar} /><AvatarFallback>{row.agent?.name.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{row.agent?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.agent?.agency}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{row.closed} closed</p>
                <p className="text-xs text-muted-foreground">{formatValue(row.value, "TZS")}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Highest value deals</h3>
            <p className="text-xs text-muted-foreground">Prioritise the ones that matter most.</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          {kpis.highestValue.map((d) => {
            const p = propertyOfDeal(d);
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{p?.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.buyerName} • {STAGE_META[d.stage].label}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-semibold text-foreground">{formatValue(d.value, d.currency)}</p>
                  <p className="text-[10px] text-muted-foreground">{d.reference}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================ DRAWER ============================ */

function DealDrawer({ deal, onClose, onMove, onUpdate }: {
  deal: Deal | null;
  onClose: () => void;
  onMove: (id: string, dir: 1 | -1) => void;
  onUpdate: (id: string, patch: Partial<Deal> | ((d: Deal) => Deal)) => void;
}) {
  const [noteBody, setNoteBody] = useState("");
  const [offerAmount, setOfferAmount] = useState("");

  if (!deal) return null;
  const property = propertyOfDeal(deal);
  const agent = agentOfDeal(deal);
  const stageIdx = PIPELINE_STAGES.indexOf(deal.stage);
  const stageProgress = stageIdx < 0 ? 0 : Math.round(((stageIdx + 1) / PIPELINE_STAGES.length) * 100);

  function addNote() {
    if (!noteBody.trim()) return;
    onUpdate(deal!.id, (d) => ({
      ...d,
      notes: [{ id: `n-${Date.now()}`, body: noteBody.trim(), authorName: "You", createdAt: new Date().toISOString() }, ...d.notes],
      activity: [{ id: `an-${Date.now()}`, at: new Date().toISOString(), kind: "note_added", label: "Note added" }, ...d.activity],
    }));
    setNoteBody("");
    toast.success("Note added");
  }

  function addOffer(by: "buyer" | "owner") {
    const amt = Number(offerAmount.replace(/[^\d]/g, ""));
    if (!amt) { toast.error("Enter a valid amount"); return; }
    onUpdate(deal!.id, (d) => ({
      ...d,
      offers: [{ id: `o-${Date.now()}`, at: new Date().toISOString(), by, amount: amt, currency: d.currency, status: "pending" }, ...d.offers],
      activity: [{ id: `ao-${Date.now()}`, at: new Date().toISOString(), kind: by === "buyer" ? "offer_submitted" : "counter_offer", label: by === "buyer" ? "Offer submitted" : "Counter offer", detail: `${d.currency} ${amt.toLocaleString()}` }, ...d.activity],
    }));
    setOfferAmount("");
    toast.success(by === "buyer" ? "Offer submitted" : "Counter offer recorded");
  }

  function uploadDoc(kind: keyof typeof DOCUMENT_META) {
    const label = DOCUMENT_META[kind].label;
    onUpdate(deal!.id, (d) => ({
      ...d,
      documents: [{ id: `d-${Date.now()}`, name: `${label.toLowerCase().replace(/\s+/g, "-")}.pdf`, kind, sizeKb: Math.round(100 + Math.random() * 900), uploadedAt: new Date().toISOString(), uploadedBy: "You", status: "pending_review" }, ...d.documents],
      activity: [{ id: `ad-${Date.now()}`, at: new Date().toISOString(), kind: kind === "sale_agreement" || kind === "lease_agreement" ? "agreement_uploaded" : "document_uploaded", label: `${label} uploaded` }, ...d.activity],
    }));
    toast.success(`${label} uploaded`);
  }

  function markCompleted() {
    onUpdate(deal!.id, (d) => ({
      ...d, stage: "completed", lastActivityAt: new Date().toISOString(),
      activity: [{ id: `ac-${Date.now()}`, at: new Date().toISOString(), kind: "deal_completed", label: "Deal completed" }, ...d.activity],
    }));
    toast.success("Marked completed");
  }

  function cancelDeal() {
    onUpdate(deal!.id, (d) => ({
      ...d, stage: "cancelled", lastActivityAt: new Date().toISOString(),
      activity: [{ id: `ax-${Date.now()}`, at: new Date().toISOString(), kind: "deal_cancelled", label: "Deal cancelled" }, ...d.activity],
    }));
    toast.success("Deal cancelled");
  }

  function assignAgent(id: string) {
    const a = agents.find(x => x.id === id);
    if (!a) return;
    onUpdate(deal!.id, (d) => ({
      ...d, assignedAgentId: id,
      activity: [{ id: `aa-${Date.now()}`, at: new Date().toISOString(), kind: "agent_assigned", label: `Reassigned to ${a.name}` }, ...d.activity],
    }));
    toast.success(`Assigned to ${a.name}`);
  }

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">{deal.reference}</p>
              <SheetTitle className="mt-0.5 truncate font-display text-xl">{property?.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3" />{property?.ward}, {property?.city}
              </SheetDescription>
            </div>
            <Badge className={cn("border-0 font-medium", STAGE_META[deal.stage].color)}>
              <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STAGE_META[deal.stage].dot)} />
              {STAGE_META[deal.stage].label}
            </Badge>
          </div>

          {/* Stage stepper */}
          <div className="mt-4 space-y-2">
            <Progress value={stageProgress} className="h-1.5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onMove(deal.id, -1)}>
                  <ArrowLeft className="h-3.5 w-3.5" />Back
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => onMove(deal.id, 1)}>
                  Next stage<ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={markCompleted}><CheckCircle2 className="mr-2 h-4 w-4" />Mark completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={cancelDeal} className="text-rose-600"><XCircle className="mr-2 h-4 w-4" />Cancel deal</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] font-semibold uppercase text-muted-foreground">Assign agent</DropdownMenuLabel>
                  {agents.slice(0, 6).map(a => (
                    <DropdownMenuItem key={a.id} onClick={() => assignAgent(a.id)}>
                      <Avatar className="mr-2 h-5 w-5"><AvatarImage src={a.avatar} /><AvatarFallback className="text-[9px]">{a.name[0]}</AvatarFallback></Avatar>
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 px-6 py-5">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryTile label="Deal value" value={formatValue(deal.value, deal.currency)} />
            <SummaryTile label="Priority" value={PRIORITY_META[deal.priority].label} tone={PRIORITY_META[deal.priority].color} />
            <SummaryTile label="Expected close" value={formatDate(deal.expectedClose)} />
            <SummaryTile label="Last activity" value={timeAgo(deal.lastActivityAt)} />
          </div>

          {/* Buyer + Agent */}
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-xl border-border/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Buyer</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarImage src={deal.buyerAvatar} /><AvatarFallback>{deal.buyerName.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{deal.buyerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{deal.buyerPhone}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5"><Phone className="h-3.5 w-3.5" />Call</Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Message</Button>
              </div>
            </Card>
            <Card className="rounded-xl border-border/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned agent</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarImage src={agent?.avatar} /><AvatarFallback>{agent?.name.split(" ").map(s => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{agent?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{agent?.agency}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5"><User className="h-3.5 w-3.5" />Profile</Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5"><ArrowUpRight className="h-3.5 w-3.5" />Handoff</Button>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="timeline">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="negotiation">Offers</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <ol className="relative space-y-3 border-l border-border/60 pl-5">
                {deal.activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    {a.detail && <p className="text-xs text-muted-foreground">{a.detail}</p>}
                    <p className="text-[10px] text-muted-foreground/80">{timeAgo(a.at)}</p>
                  </li>
                ))}
              </ol>
            </TabsContent>

            <TabsContent value="negotiation" className="mt-4 space-y-4">
              <Card className="rounded-xl border-border/60 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Record new offer</p>
                <div className="flex gap-2">
                  <Input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder={`Amount in ${deal.currency}`} className="h-9" />
                  <Button size="sm" className="h-9" onClick={() => addOffer("buyer")}>Buyer offer</Button>
                  <Button size="sm" variant="outline" className="h-9" onClick={() => addOffer("owner")}>Counter</Button>
                </div>
              </Card>
              <div className="space-y-2">
                {deal.offers.length === 0 && <p className="text-sm text-muted-foreground">No offers yet.</p>}
                {deal.offers.map((o) => <OfferRow key={o.id} offer={o} />)}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DOCUMENT_META) as (keyof typeof DOCUMENT_META)[]).map((k) => (
                  <Button key={k} size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => uploadDoc(k)}>
                    <Upload className="h-3.5 w-3.5" />{DOCUMENT_META[k].label}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {deal.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
                {deal.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{DOCUMENT_META[doc.kind].label} • {doc.sizeKb} KB • {timeAgo(doc.uploadedAt)}</p>
                    </div>
                    {doc.status && (
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        doc.status === "approved" && "border-emerald-200 text-emerald-700",
                        doc.status === "pending_review" && "border-amber-200 text-amber-700",
                        doc.status === "rejected" && "border-rose-200 text-rose-700",
                      )}>{doc.status.replace("_", " ")}</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-4">
              <Card className="rounded-xl border-border/60 p-3">
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-2 h-4 w-4 text-muted-foreground" />
                  <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a private note…" className="min-h-16 resize-none" />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={addNote}>Add note</Button>
                </div>
              </Card>
              <div className="space-y-2">
                {deal.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                {deal.notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-border/60 bg-background p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{n.authorName}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{n.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-sm font-semibold text-foreground", tone && "rounded px-1 py-0.5 text-xs", tone)}>{value}</p>
    </div>
  );
}

function OfferRow({ offer }: { offer: Offer }) {
  const tone = {
    pending: "bg-amber-500/10 text-amber-700",
    countered: "bg-sky-500/10 text-sky-700",
    accepted: "bg-emerald-500/10 text-emerald-700",
    rejected: "bg-rose-500/10 text-rose-700",
    withdrawn: "bg-slate-500/10 text-slate-700",
  }[offer.status];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}><DollarSign className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{formatValue(offer.amount, offer.currency)} <span className="text-xs font-normal text-muted-foreground">by {offer.by}</span></p>
        {offer.note && <p className="truncate text-xs text-muted-foreground">{offer.note}</p>}
      </div>
      <div className="text-right">
        <Badge className={cn("border-0 text-[10px] capitalize", tone)}>{offer.status}</Badge>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(offer.at)}</p>
      </div>
    </div>
  );
}
