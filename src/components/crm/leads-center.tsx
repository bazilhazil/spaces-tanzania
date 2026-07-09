import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, Filter, Plus, Phone, MessageCircle, Mail, Calendar as CalendarIcon,
  CheckCircle2, Circle, Clock, MapPin, Home, User, TrendingUp, Users, DollarSign,
  Sparkles, MoreHorizontal, X, StickyNote, Paperclip, Send, ArrowUpRight,
  PhoneCall, ChevronRight, Star, FileText, Flame, Activity as ActivityIcon,
  ListChecks, Layers, BarChart3, LayoutDashboard, ArrowRight, CheckCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agents, properties, formatPrice } from "@/lib/mock-data";
import {
  LEADS, PIPELINE_STAGES, ALL_STAGES, STAGE_META, SOURCE_META, TASK_META, ACTIVITY_META,
  propertyOfLead, agentOfLead, timeAgo, formatBudget, scoreTone, computeKpis,
  type Lead, type LeadStage, type LeadSource, type Task, type TaskPriority, type TaskType, type Note,
} from "@/lib/leads-mock";

/* ============================ ROOT ============================ */

export function LeadsCenter() {
  const [leads, setLeads] = useState<Lead[]>(LEADS);
  const [tab, setTab] = useState<"overview" | "pipeline" | "list" | "analytics">("overview");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"any" | "24h" | "7d" | "30d">("any");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (agentFilter !== "all" && l.assignedAgentId !== agentFilter) return false;
      if (propertyFilter !== "all" && l.propertyId !== propertyFilter) return false;
      if (dateFilter !== "any") {
        const h = dateFilter === "24h" ? 24 : dateFilter === "7d" ? 168 : 720;
        if (now - new Date(l.createdAt).getTime() > h * 3600_000) return false;
      }
      if (!q) return true;
      const p = propertyOfLead(l);
      return [
        l.customerName, l.phone, l.email ?? "", l.preferredArea ?? "",
        p?.title ?? "", agentOfLead(l)?.name ?? "",
      ].some((s) => s.toLowerCase().includes(q));
    });
  }, [leads, query, stageFilter, agentFilter, propertyFilter, dateFilter]);

  const selected = selectedId ? leads.find((l) => l.id === selectedId) ?? null : null;
  const kpis = useMemo(() => computeKpis(leads), [leads]);

  function mutate(id: string, patch: (l: Lead) => Lead) {
    setLeads((ls) => ls.map((l) => (l.id === id ? patch(l) : l)));
  }

  function updateStage(id: string, next: LeadStage) {
    mutate(id, (l) => {
      if (l.stage === next) return l;
      return {
        ...l,
        stage: next,
        lastActivityAt: new Date().toISOString(),
        activity: [
          {
            id: `a-${Date.now()}`,
            at: new Date().toISOString(),
            kind: "stage_changed",
            label: "Stage changed",
            detail: `${STAGE_META[l.stage].label} → ${STAGE_META[next].label}`,
          },
          ...l.activity,
        ],
      };
    });
    toast.success(`Moved to ${STAGE_META[next].label}`);
  }

  function addTask(id: string, task: Omit<Task, "id" | "completed">) {
    const t: Task = { ...task, id: `t-${Date.now()}`, completed: false };
    mutate(id, (l) => ({
      ...l,
      lastActivityAt: new Date().toISOString(),
      tasks: [t, ...l.tasks],
      activity: [
        { id: `a-${Date.now()}`, at: new Date().toISOString(), kind: "task_created", label: `Task: ${t.title}` },
        ...l.activity,
      ],
    }));
    toast.success("Task added");
  }

  function toggleTask(id: string, taskId: string) {
    mutate(id, (l) => ({
      ...l,
      lastActivityAt: new Date().toISOString(),
      tasks: l.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t,
      ),
      activity: l.tasks.find((t) => t.id === taskId)?.completed
        ? l.activity
        : [
            { id: `a-${Date.now()}`, at: new Date().toISOString(), kind: "task_completed", label: "Task completed" },
            ...l.activity,
          ],
    }));
  }

  function addNote(id: string, body: string, visibility: "private" | "public") {
    if (!body.trim()) return;
    const note: Note = {
      id: `n-${Date.now()}`,
      body: body.trim(),
      visibility,
      authorName: "You",
      createdAt: new Date().toISOString(),
    };
    mutate(id, (l) => ({
      ...l,
      lastActivityAt: new Date().toISOString(),
      notes: [note, ...l.notes],
      activity: [
        { id: `a-${Date.now()}`, at: new Date().toISOString(), kind: "note_added", label: `${visibility === "private" ? "Private" : "Public"} note added` },
        ...l.activity,
      ],
    }));
    toast.success("Note saved");
  }

  function reassign(id: string, agentId: string) {
    const a = agents.find((x) => x.id === agentId);
    mutate(id, (l) => ({
      ...l,
      assignedAgentId: agentId,
      lastActivityAt: new Date().toISOString(),
      activity: [
        { id: `a-${Date.now()}`, at: new Date().toISOString(), kind: "assigned", label: `Assigned to ${a?.name ?? "agent"}` },
        ...l.activity,
      ],
    }));
    toast.success(`Reassigned to ${a?.name}`);
  }

  function logAction(id: string, kind: "call_made" | "whatsapp_sent" | "message_sent", detail?: string) {
    mutate(id, (l) => ({
      ...l,
      lastActivityAt: new Date().toISOString(),
      activity: [
        { id: `a-${Date.now()}`, at: new Date().toISOString(), kind, label: ACTIVITY_META[kind].label, detail },
        ...l.activity,
      ],
    }));
  }

  function createLead(input: Omit<Lead, "id" | "activity" | "tasks" | "notes" | "createdAt" | "lastActivityAt" | "score">) {
    const l: Lead = {
      ...input,
      id: `lead-${Date.now()}`,
      score: 50,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      activity: [
        { id: `a-${Date.now()}`, at: new Date().toISOString(), kind: "created", label: "Lead created manually" },
      ],
      tasks: [],
      notes: [],
    };
    setLeads((ls) => [l, ...ls]);
    setSelectedId(l.id);
    setCreating(false);
    toast.success("Lead created");
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-[var(--shadow-soft)] md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads, phone, property…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            icon={<Layers className="h-3.5 w-3.5" />}
            value={stageFilter}
            onChange={(v) => setStageFilter(v as LeadStage | "all")}
            options={[{ value: "all", label: "All stages" }, ...ALL_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label }))]}
          />
          <FilterSelect
            icon={<Home className="h-3.5 w-3.5" />}
            value={propertyFilter}
            onChange={setPropertyFilter}
            options={[{ value: "all", label: "All properties" }, ...properties.slice(0, 24).map((p) => ({ value: p.id, label: p.title }))]}
          />
          <FilterSelect
            icon={<User className="h-3.5 w-3.5" />}
            value={agentFilter}
            onChange={setAgentFilter}
            options={[{ value: "all", label: "All agents" }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
          />
          <FilterSelect
            icon={<Clock className="h-3.5 w-3.5" />}
            value={dateFilter}
            onChange={(v) => setDateFilter(v as typeof dateFilter)}
            options={[
              { value: "any", label: "Any date" },
              { value: "24h", label: "Last 24h" },
              { value: "7d", label: "Last 7d" },
              { value: "30d", label: "Last 30d" },
            ]}
          />
          <Button onClick={() => setCreating(true)} className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" /> New lead
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> List</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewPanel leads={filtered} kpis={kpis} onOpen={setSelectedId} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-5">
          <PipelineBoard leads={filtered} onOpen={setSelectedId} onStage={updateStage} />
        </TabsContent>

        <TabsContent value="list" className="mt-5">
          <LeadsTable leads={filtered} onOpen={setSelectedId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-5">
          <AnalyticsPanel leads={leads} kpis={kpis} />
        </TabsContent>
      </Tabs>

      <LeadDrawer
        lead={selected}
        onClose={() => setSelectedId(null)}
        onStage={updateStage}
        onAddTask={addTask}
        onToggleTask={toggleTask}
        onAddNote={addNote}
        onReassign={reassign}
        onLog={logAction}
      />

      <CreateLeadDialog open={creating} onOpenChange={setCreating} onCreate={createLead} />
    </div>
  );
}

/* ============================ TOOLBAR ============================ */

function FilterSelect({
  icon, value, onChange, options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1.5 text-xs">
        <span className="text-muted-foreground">{icon}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ============================ OVERVIEW ============================ */

function OverviewPanel({
  leads, kpis, onOpen,
}: {
  leads: Lead[];
  kpis: ReturnType<typeof computeKpis>;
  onOpen: (id: string) => void;
}) {
  const today = leads.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 24 * 3600_000);
  const followUps = leads
    .flatMap((l) => l.tasks.filter((t) => !t.completed).map((t) => ({ lead: l, task: t })))
    .sort((a, b) => new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime())
    .slice(0, 6);
  const negotiations = leads.filter((l) => l.stage === "negotiating" || l.stage === "offer_made").slice(0, 6);
  const closed = leads.filter((l) => l.stage === "deal_closed").slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Sparkles className="h-4 w-4" />} label="Today's leads" value={kpis.todaysLeads} tone="primary" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Pending follow-ups" value={kpis.pendingFollowUps} tone="amber" />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion rate" value={`${kpis.conversion}%`} tone="emerald" />
        <KpiCard icon={<CheckCheck className="h-4 w-4" />} label="Avg closing time" value={kpis.avgDays ? `${kpis.avgDays}d` : "—"} tone="indigo" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Today's leads" icon={<Sparkles className="h-4 w-4" />} count={today.length}>
          {today.length === 0 ? <EmptyRow label="No new inquiries today." /> :
            today.slice(0, 6).map((l) => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
        </SectionCard>

        <SectionCard title="Pending follow-ups" icon={<Clock className="h-4 w-4" />} count={followUps.length}>
          {followUps.length === 0 ? <EmptyRow label="You're all caught up." /> :
            followUps.map(({ lead, task }) => (
              <button key={task.id} onClick={() => onOpen(lead.id)} className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5">
                <div className={cn("grid h-8 w-8 place-items-center rounded-lg", priorityClass(task.priority))}>
                  <Circle className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.customerName} · due {timeAgo(task.dueAt)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </SectionCard>

        <SectionCard title="Negotiations" icon={<Flame className="h-4 w-4" />} count={negotiations.length}>
          {negotiations.length === 0 ? <EmptyRow label="Nothing in flight." /> :
            negotiations.map((l) => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
        </SectionCard>

        <SectionCard title="Closed deals" icon={<CheckCircle2 className="h-4 w-4" />} count={closed.length}>
          {closed.length === 0 ? <EmptyRow label="No closings yet." /> :
            closed.map((l) => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
        </SectionCard>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "primary" | "amber" | "emerald" | "indigo" }) {
  const toneClass = {
    primary:  "bg-primary/10 text-primary",
    amber:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald:  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    indigo:   "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("grid h-8 w-8 place-items-center rounded-xl", toneClass)}>{icon}</div>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </div>
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-xs text-muted-foreground">{label}</p>;
}

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: (id: string) => void }) {
  const p = propertyOfLead(lead);
  const tone = scoreTone(lead.score);
  return (
    <button onClick={() => onOpen(lead.id)} className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5">
      <Avatar className="h-9 w-9">
        {lead.customerAvatar && <AvatarImage src={lead.customerAvatar} />}
        <AvatarFallback>{initials(lead.customerName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{lead.customerName}</p>
          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", tone.color)}>{lead.score}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{p?.title ?? "Property"}</p>
      </div>
      <StagePill stage={lead.stage} />
    </button>
  );
}

/* ============================ PIPELINE ============================ */

function PipelineBoard({ leads, onOpen, onStage }: { leads: Lead[]; onOpen: (id: string) => void; onStage: (id: string, s: LeadStage) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const cards = leads.filter((l) => l.stage === stage);
          const meta = STAGE_META[stage];
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { onStage(dragId, stage); setDragId(null); } }}
              className="flex flex-col rounded-2xl border border-border/60 bg-muted/30 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  {meta.label}
                </div>
                <Badge variant="secondary" className="text-[10px]">{cards.length}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {cards.length === 0 && <EmptyRow label="Drop leads here" />}
                {cards.map((l) => (
                  <PipelineCard
                    key={l.id}
                    lead={l}
                    onOpen={() => onOpen(l.id)}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    onMove={(s) => onStage(l.id, s)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({
  lead, onOpen, onDragStart, onDragEnd, onMove,
}: {
  lead: Lead; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; onMove: (s: LeadStage) => void;
}) {
  const p = propertyOfLead(lead);
  const agent = agentOfLead(lead);
  const tone = scoreTone(lead.score);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group cursor-grab rounded-xl border border-border/60 bg-background p-3 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] active:cursor-grabbing"
    >
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8">
            {lead.customerAvatar && <AvatarImage src={lead.customerAvatar} />}
            <AvatarFallback className="text-[10px]">{initials(lead.customerName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{lead.customerName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{p?.title}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", tone.color)}>{lead.score}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {lead.preferredArea && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.preferredArea}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> {formatBudget(lead)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {agent && (
              <>
                <Avatar className="h-4 w-4"><AvatarImage src={agent.avatar} /><AvatarFallback className="text-[8px]">{initials(agent.name)}</AvatarFallback></Avatar>
                <span className="truncate">{agent.name.split(" ")[0]}</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.lastActivityAt)}</span>
        </div>
      </button>

      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 opacity-0 transition group-hover:opacity-100">
        <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Call">
          <Phone className="h-3.5 w-3.5" />
        </a>
        <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600" aria-label="WhatsApp">
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
            {ALL_STAGES.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
                <span className={cn("mr-2 h-2 w-2 rounded-full", STAGE_META[s].dot)} />
                {STAGE_META[s].label}
                {lead.stage === s && <span className="ml-auto text-[10px] text-primary">Current</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ============================ LIST ============================ */

function LeadsTable({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
              <th className="px-4 py-3 text-left font-semibold">Property</th>
              <th className="px-4 py-3 text-left font-semibold">Stage</th>
              <th className="px-4 py-3 text-left font-semibold">Score</th>
              <th className="px-4 py-3 text-left font-semibold">Agent</th>
              <th className="px-4 py-3 text-left font-semibold">Budget</th>
              <th className="px-4 py-3 text-left font-semibold">Last activity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads match your filters.</td></tr>
            )}
            {leads.map((l) => {
              const p = propertyOfLead(l);
              const a = agentOfLead(l);
              const tone = scoreTone(l.score);
              return (
                <tr key={l.id} className="border-t border-border/50 transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(l.id)} className="flex items-center gap-2 text-left">
                      <Avatar className="h-8 w-8">
                        {l.customerAvatar && <AvatarImage src={l.customerAvatar} />}
                        <AvatarFallback className="text-[10px]">{initials(l.customerName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{l.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">{l.phone}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">
                    <p className="line-clamp-1 max-w-[220px] text-sm">{p?.title}</p>
                    <p className="text-[11px] text-muted-foreground">{l.preferredArea}</p>
                  </td>
                  <td className="px-4 py-3"><StagePill stage={l.stage} /></td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone.color)}>{l.score} · {tone.label}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">
                    <div className="flex items-center gap-2">
                      {a && <Avatar className="h-6 w-6"><AvatarImage src={a.avatar} /><AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback></Avatar>}
                      <span className="text-sm">{a?.name ?? "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/80">{formatBudget(l)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(l.lastActivityAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onOpen(l.id)}>Open <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ ANALYTICS ============================ */

function AnalyticsPanel({ leads, kpis }: { leads: Lead[]; kpis: ReturnType<typeof computeKpis> }) {
  const stageCounts = ALL_STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));
  const sourceEntries = (Object.entries(kpis.bySource) as [LeadSource, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sourceEntries.map(([, n]) => n));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${kpis.conversion}%`} tone="emerald" />
        <KpiCard icon={<CheckCheck className="h-4 w-4" />} label="Closed deals" value={kpis.closed} tone="primary" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Avg closing" value={kpis.avgDays ? `${kpis.avgDays}d` : "—"} tone="indigo" />
        <KpiCard icon={<Flame className="h-4 w-4" />} label="In negotiation" value={kpis.negotiating} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
          <p className="mb-4 text-sm font-semibold text-foreground">Pipeline distribution</p>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => {
              const meta = STAGE_META[stage];
              return (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-foreground/80"><span className={cn("h-2 w-2 rounded-full", meta.dot)} />{meta.label}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all", meta.dot)} style={{ width: `${(count / maxStage) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
          <p className="mb-4 text-sm font-semibold text-foreground">Lead sources</p>
          <div className="space-y-3">
            {sourceEntries.map(([src, n]) => (
              <div key={src}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{SOURCE_META[src]}</span>
                  <span className="font-semibold text-foreground">{n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(n / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
          <p className="mb-3 text-sm font-semibold text-foreground">Most active agent</p>
          {kpis.topAgent?.agent ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12"><AvatarImage src={kpis.topAgent.agent.avatar} /><AvatarFallback>{initials(kpis.topAgent.agent.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold text-foreground">{kpis.topAgent.agent.name}</p>
                <p className="text-xs text-muted-foreground">{kpis.topAgent.agent.agency}</p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{kpis.topAgent.count} leads</span>
                  <span>·</span>
                  <span>{kpis.topAgent.closed} closed</span>
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {kpis.topAgent.agent.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ) : <EmptyRow label="No activity yet." />}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)]">
          <p className="mb-3 text-sm font-semibold text-foreground">Best performing property</p>
          {kpis.topProperty?.property ? (
            <Link to="/properties/$slug" params={{ slug: kpis.topProperty.property.slug }} className="flex items-center gap-3">
              <img src={kpis.topProperty.property.images[0]} alt={kpis.topProperty.property.title} className="h-14 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-display text-base font-semibold text-foreground">{kpis.topProperty.property.title}</p>
                <p className="text-xs text-muted-foreground">{kpis.topProperty.property.ward}, {kpis.topProperty.property.city}</p>
                <p className="mt-1 text-[11px] text-primary">{kpis.topProperty.count} inquiries</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : <EmptyRow label="No property leads yet." />}
        </div>
      </div>
    </div>
  );
}

/* ============================ DRAWER ============================ */

function LeadDrawer({
  lead, onClose, onStage, onAddTask, onToggleTask, onAddNote, onReassign, onLog,
}: {
  lead: Lead | null;
  onClose: () => void;
  onStage: (id: string, s: LeadStage) => void;
  onAddTask: (id: string, t: Omit<Task, "id" | "completed">) => void;
  onToggleTask: (id: string, taskId: string) => void;
  onAddNote: (id: string, body: string, visibility: "private" | "public") => void;
  onReassign: (id: string, agentId: string) => void;
  onLog: (id: string, kind: "call_made" | "whatsapp_sent" | "message_sent", detail?: string) => void;
}) {
  const [tab, setTab] = useState<"activity" | "tasks" | "notes">("activity");
  const [note, setNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "public">("private");
  const [taskDialog, setTaskDialog] = useState(false);

  if (!lead) return null;
  const p = propertyOfLead(lead);
  const agent = agentOfLead(lead);
  const tone = scoreTone(lead.score);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-5">
          <SheetTitle className="sr-only">{lead.customerName}</SheetTitle>
          <div className="flex items-start gap-4">
            <Avatar className={cn("h-14 w-14 ring-2 ring-offset-2 ring-offset-background", STAGE_META[lead.stage].ring)}>
              {lead.customerAvatar && <AvatarImage src={lead.customerAvatar} />}
              <AvatarFallback>{initials(lead.customerName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-semibold text-foreground">{lead.customerName}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.color)}>Score {lead.score} · {tone.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Source: {SOURCE_META[lead.source]} · Created {timeAgo(lead.createdAt)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StagePill stage={lead.stage} />
                {lead.tags?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <QuickAction icon={<Phone className="h-4 w-4" />} label="Call" href={`tel:${lead.phone}`} onClick={() => onLog(lead.id, "call_made")} />
            <QuickAction icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target external onClick={() => onLog(lead.id, "whatsapp_sent")} />
            {lead.email
              ? <QuickAction icon={<Mail className="h-4 w-4" />} label="Email" href={`mailto:${lead.email}`} onClick={() => onLog(lead.id, "message_sent", "Email")} />
              : <QuickAction icon={<Mail className="h-4 w-4" />} label="Email" disabled />
            }
            <QuickAction icon={<CalendarIcon className="h-4 w-4" />} label="Viewing" to="/viewings" />
          </div>

          {/* Stage stepper */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move stage</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STAGES.map((s) => {
                const active = lead.stage === s;
                const meta = STAGE_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => onStage(lead.id, s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      active ? cn(meta.color, "border-transparent") : "border-border/60 bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetHeader>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 p-5 pb-2 text-xs">
          <Detail icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone} />
          <Detail icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email ?? "—"} />
          <Detail icon={<DollarSign className="h-3.5 w-3.5" />} label="Budget" value={formatBudget(lead)} />
          <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Preferred area" value={lead.preferredArea ?? "—"} />
        </div>

        {/* Property + agent */}
        <div className="space-y-3 px-5 pb-4">
          {p && (
            <Link to="/properties/$slug" params={{ slug: p.slug }} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 transition hover:border-primary/40">
              <img src={p.images[0]} alt={p.title} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.ward}, {p.city}</p>
                <p className="mt-0.5 text-xs font-semibold text-primary">{formatPrice(p.price, p.currency, p.listingType)}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 text-left transition hover:border-primary/40">
                {agent && <Avatar className="h-9 w-9"><AvatarImage src={agent.avatar} /><AvatarFallback>{initials(agent.name)}</AvatarFallback></Avatar>}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned agent</p>
                  <p className="truncate text-sm font-semibold text-foreground">{agent?.name ?? "Unassigned"}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Reassign to</DropdownMenuLabel>
              {agents.map((a) => (
                <DropdownMenuItem key={a.id} onSelect={() => onReassign(lead.id, a.id)}>
                  <Avatar className="mr-2 h-5 w-5"><AvatarImage src={a.avatar} /><AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback></Avatar>
                  <span className="truncate">{a.name}</span>
                  {lead.assignedAgentId === a.id && <span className="ml-auto text-[10px] text-primary">Current</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-5 pb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity" className="gap-1.5"><ActivityIcon className="h-3.5 w-3.5" /> Activity</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Tasks
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{lead.tasks.filter((t) => !t.completed).length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notes
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{lead.notes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <ol className="relative space-y-4 border-l border-border/70 pl-4">
              {lead.activity.map((a) => {
                const meta = ACTIVITY_META[a.kind];
                return (
                  <li key={a.id} className="relative">
                    <span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background", meta.dot)} />
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    {a.detail && <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(a.at)}</p>
                  </li>
                );
              })}
            </ol>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            <Button size="sm" variant="outline" onClick={() => setTaskDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New task
            </Button>
            {lead.tasks.length === 0 && <EmptyRow label="No tasks yet." />}
            {lead.tasks.map((t) => (
              <div key={t.id} className={cn("flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3", t.completed && "opacity-60")}>
                <button onClick={() => onToggleTask(lead.id, t.id)} className="mt-0.5">
                  {t.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium text-foreground", t.completed && "line-through")}>{t.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{TASK_META[t.type].label} · due {timeAgo(t.dueAt)}</p>
                </div>
                <Badge className={cn("text-[10px]", priorityClass(t.priority))} variant="secondary">{t.priority}</Badge>
              </div>
            ))}

            <TaskDialog open={taskDialog} onOpenChange={setTaskDialog} onCreate={(t) => { onAddTask(lead.id, t); setTaskDialog(false); }} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <Textarea rows={3} placeholder="Write a note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setNoteVisibility("private")}
                    className={cn("rounded-full px-2 py-0.5 font-medium", noteVisibility === "private" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                  >Private</button>
                  <button
                    onClick={() => setNoteVisibility("public")}
                    className={cn("rounded-full px-2 py-0.5 font-medium", noteVisibility === "public" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                  >Public</button>
                  <button className="ml-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => toast.info("Attachments coming soon")}>
                    <Paperclip className="h-3.5 w-3.5" /> Attach
                  </button>
                </div>
                <Button size="sm" onClick={() => { onAddNote(lead.id, note, noteVisibility); setNote(""); }} disabled={!note.trim()}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>

            {lead.notes.length === 0 && <EmptyRow label="No notes yet." />}
            {lead.notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{n.authorName}</p>
                  <Badge variant={n.visibility === "private" ? "secondary" : "default"} className="text-[10px]">
                    {n.visibility === "private" ? "Private" : "Public"}
                  </Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
                {n.attachments?.map((a) => (
                  <div key={a.name} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-[11px] text-foreground/80">
                    <FileText className="h-3 w-3" /> {a.name} <span className="text-muted-foreground">· {a.size}</span>
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function QuickAction({
  icon, label, href, to, onClick, target, external, disabled,
}: {
  icon: React.ReactNode; label: string;
  href?: string; to?: string; onClick?: () => void; target?: boolean; external?: boolean; disabled?: boolean;
}) {
  const base = "flex flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-background p-2.5 text-[11px] font-medium text-foreground/80 shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:text-primary disabled:opacity-50";
  const content = <>{icon}<span>{label}</span></>;
  if (disabled) return <button disabled className={base}>{content}</button>;
  if (to) return <Link to={to} onClick={onClick} className={base}>{content}</Link>;
  if (href) return <a href={href} onClick={onClick} target={target ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={base}>{content}</a>;
  return <button onClick={onClick} className={base}>{content}</button>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>{label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

/* ============================ TASK DIALOG ============================ */

function TaskDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreate: (t: Omit<Task, "id" | "completed">) => void;
}) {
  const [type, setType] = useState<TaskType>("call");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [when, setWhen] = useState<"1h" | "tomorrow" | "3d" | "1w">("tomorrow");

  const presets: Record<TaskType, string> = {
    call: "Call customer",
    whatsapp: "Send WhatsApp",
    meeting: "Schedule meeting",
    follow_up: "Follow up tomorrow",
    custom: "",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) { setType("call"); setTitle(""); setPriority("medium"); setWhen("tomorrow"); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(presets) as TaskType[]).map((k) => (
              <button
                key={k}
                onClick={() => { setType(k); if (presets[k]) setTitle(presets[k]); }}
                className={cn("flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition",
                  type === k ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-foreground/70 hover:border-primary/40")}
              >
                {k === "call" && <Phone className="h-3.5 w-3.5" />}
                {k === "whatsapp" && <MessageCircle className="h-3.5 w-3.5" />}
                {k === "meeting" && <CalendarIcon className="h-3.5 w-3.5" />}
                {k === "follow_up" && <Clock className="h-3.5 w-3.5" />}
                {k === "custom" && <StickyNote className="h-3.5 w-3.5" />}
                <span>{TASK_META[k].label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call about counter-offer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Select value={when} onValueChange={(v) => setWhen(v as typeof when)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">In 1 hour</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="3d">In 3 days</SelectItem>
                  <SelectItem value="1w">In 1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!title.trim()) { toast.error("Please enter a title"); return; }
            const offsetH = when === "1h" ? 1 : when === "tomorrow" ? 24 : when === "3d" ? 72 : 168;
            onCreate({ type, title: title.trim(), priority, dueAt: new Date(Date.now() + offsetH * 3600_000).toISOString() });
          }}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ CREATE LEAD ============================ */

function CreateLeadDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (l: Omit<Lead, "id" | "activity" | "tasks" | "notes" | "createdAt" | "lastActivityAt" | "score">) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [source, setSource] = useState<LeadSource>("agent_added");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [area, setArea] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (o) { setName(""); setPhone(""); setEmail(""); setBudgetMin(""); setBudgetMax(""); setArea(""); setSource("agent_added"); }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 …" /></div>
          </div>
          <div className="space-y-1.5"><Label>Email (optional)</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" /></div>
          <div className="space-y-1.5">
            <Label>Interested property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {properties.slice(0, 30).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assigned agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(SOURCE_META) as [LeadSource, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Min budget</Label><Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Max budget</Label><Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Masaki" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!name.trim() || !phone.trim()) { toast.error("Name and phone are required"); return; }
            const property = properties.find((p) => p.id === propertyId);
            onCreate({
              customerName: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              propertyId,
              budgetMin: budgetMin ? Number(budgetMin) : undefined,
              budgetMax: budgetMax ? Number(budgetMax) : undefined,
              budgetCurrency: property?.currency ?? "TZS",
              preferredArea: area.trim() || (property ? `${property.ward}, ${property.city}` : undefined),
              stage: "new",
              source,
              assignedAgentId: agentId,
              tags: [],
            });
          }}>Create lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ SHARED ============================ */

function StagePill({ stage }: { stage: LeadStage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function priorityClass(p: TaskPriority) {
  return p === "high" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
       : p === "medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
       : "bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}
