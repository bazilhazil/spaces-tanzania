import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
} from "@dnd-kit/core";
import {
  Search, Plus, MoreHorizontal, FileText, Upload, CheckCircle2, XCircle, Clock,
  MapPin, Calendar, User as UserIcon, DollarSign, Activity, Building2, Download,
  StickyNote, X, AlertTriangle, TrendingUp, Filter, ArrowRight, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DEAL_STAGES, STAGE_LABEL, STAGE_TONE, HEALTH_DOT, HEALTH_LABEL, DOC_LABEL,
  fetchDeals, fetchActivities, fetchDocuments, moveDealStage, updateDeal,
  addNote, uploadDocument, documentSignedUrl, deleteDocument, cancelDeal,
  completeDeal, assignAgent, scheduleFollowUp, computeStats, computeHealth,
  type Deal, type DealStage, type DealPriority, type DealActivity, type DealDocument,
  type DealDocumentKind,
} from "@/lib/deals-db";

const PRIORITY_TONE: Record<DealPriority, string> = {
  low: "bg-neutral-500/10 text-neutral-700 ring-neutral-500/20",
  medium: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  high: "bg-orange-500/10 text-orange-700 ring-orange-500/20",
  urgent: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

function fmtMoney(n: number | null | undefined, cur = "TZS") {
  if (!n) return "—";
  return `${cur} ${Number(n).toLocaleString()}`;
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function DealsCenter() {
  const { user, primaryRole } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | "all">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<Deal | null>(null);
  const [tab, setTab] = useState<"kanban" | "overview">("kanban");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDeals();
      setDeals(rows.map((d) => ({ ...d, health: computeHealth(d) })));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) void load(); }, [user, load]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("deals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      if (priorityFilter !== "all" && d.priority !== priorityFilter) return false;
      if (regionFilter !== "all" && d.property_region !== regionFilter) return false;
      if (dateFrom && new Date(d.created_at) < new Date(dateFrom)) return false;
      if (!q) return true;
      return (
        d.reference.toLowerCase().includes(q) ||
        (d.buyer_name ?? "").toLowerCase().includes(q) ||
        (d.property_title ?? "").toLowerCase().includes(q) ||
        (d.owner_name ?? "").toLowerCase().includes(q) ||
        (d.agent_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [deals, query, stageFilter, priorityFilter, regionFilter, dateFrom]);

  const stats = useMemo(() => computeStats(deals), [deals]);
  const regions = useMemo(
    () => Array.from(new Set(deals.map((d) => d.property_region).filter((x): x is string => !!x))).sort(),
    [deals],
  );

  const columns = useMemo(() => {
    const map: Record<DealStage, Deal[]> = Object.fromEntries(DEAL_STAGES.map((s) => [s, []])) as any;
    for (const d of filtered) map[d.stage].push(d);
    return map;
  }, [filtered]);

  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    if (!e.over) return;
    const dealId = String(e.active.id);
    const nextStage = String(e.over.id) as DealStage;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === nextStage) return;
    // optimistic
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: nextStage } : d)));
    try {
      await moveDealStage(dealId, nextStage);
      toast.success(`Moved to ${STAGE_LABEL[nextStage]}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Move failed");
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: deal.stage } : d)));
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDrag(deals.find((d) => d.id === e.active.id) ?? null);
  }

  const canManage = primaryRole === "owner" || primaryRole === "agent" ||
                    primaryRole === "admin" || primaryRole === "super_admin";

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={Activity} label="Active" value={stats.active} tone="text-sky-600" />
        <Kpi icon={Calendar} label="Closing this week" value={stats.closingWeek} tone="text-violet-600" />
        <Kpi icon={CheckCircle2} label="Completed" value={stats.completed} tone="text-emerald-600" />
        <Kpi icon={XCircle} label="Cancelled" value={stats.cancelled} tone="text-rose-600" />
        <Kpi icon={Clock} label="Avg. close time" value={`${stats.avgDays}d`} tone="text-amber-600" />
        <Kpi icon={DollarSign} label="Pipeline value" value={fmtMoney(stats.totalValue, deals[0]?.currency ?? "TZS")} tone="text-primary" small />
      </div>


      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deal ID, buyer, property, agent…"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as DealStage | "all")}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[170px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as DealPriority | "all")}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[150px]"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-11 w-full rounded-xl sm:w-[160px]"
        />

        {(stageFilter !== "all" || priorityFilter !== "all" || regionFilter !== "all" || dateFrom) && (
          <Button variant="ghost" className="h-11 rounded-xl" onClick={() => {
            setStageFilter("all"); setPriorityFilter("all"); setRegionFilter("all"); setDateFrom("");
          }}><X className="h-4 w-4" /> Clear</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "kanban" | "overview")}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {loading ? (
            <div className="grid gap-3 lg:grid-cols-5"><SkeletonCol/><SkeletonCol/><SkeletonCol/><SkeletonCol/><SkeletonCol/></div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter}
                        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="flex flex-col gap-3 overflow-hidden pb-4 md:flex-row md:overflow-x-auto">
                {DEAL_STAGES.map((s) => (
                  <StageColumn
                    key={s}
                    stage={s}
                    deals={columns[s]}
                    onOpen={(id) => setSelectedId(id)}
                    canManage={canManage}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDrag && (
                  <div className="w-72 rotate-2 opacity-90"><DealCard deal={activeDrag} onOpen={() => {}} /></div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <OverviewList deals={filtered} onOpen={setSelectedId} loading={loading} />
        </TabsContent>
      </Tabs>

      <DealDetailSheet
        deal={selected}
        canManage={canManage}
        currentUserId={user?.id ?? null}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}

/* ------------------------------ Column ------------------------------ */

function StageColumn({
  stage, deals, onOpen, canManage,
}: { stage: DealStage; deals: Deal[]; onOpen: (id: string) => void; canManage: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !canManage });
  const sum = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-secondary/30 p-2 transition",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", STAGE_TONE[stage].split(" ")[0])} />
          <h3 className="text-sm font-semibold text-foreground">{STAGE_LABEL[stage]}</h3>
          <span className="text-xs text-muted-foreground">{deals.length}</span>
        </div>
        {sum > 0 && <span className="text-[10px] font-medium text-muted-foreground">{fmtMoney(sum)}</span>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-1 pb-1" style={{ maxHeight: "70vh" }}>
        {deals.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Drop a deal here
          </div>
        ) : (
          deals.map((d) => <DraggableCard key={d.id} deal={d} onOpen={onOpen} canManage={canManage} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ deal, onOpen, canManage }: { deal: Deal; onOpen: (id: string) => void; canManage: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, disabled: !canManage });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <DealCard deal={deal} onOpen={onOpen} dragHandle={canManage ? listeners : undefined} />
    </div>
  );
}

function DealCard({
  deal, onOpen, dragHandle,
}: { deal: Deal; onOpen: (id: string) => void; dragHandle?: any }) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-xl border-border/60 bg-background p-3 shadow-sm transition hover:shadow-md"
      onClick={() => onOpen(deal.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", HEALTH_DOT[deal.health])} title={HEALTH_LABEL[deal.health]} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{deal.reference}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
            {deal.property_title ?? "Untitled property"}
          </p>
        </div>
        {dragHandle && (
          <button
            {...dragHandle}
            aria-label="Drag"
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <UserIcon className="h-3 w-3" />
        <span className="line-clamp-1">{deal.buyer_name ?? "Unknown buyer"}</span>
      </div>
      {(deal.property_district || deal.property_region) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">{[deal.property_district, deal.property_region].filter(Boolean).join(", ")}</span>
        </div>
      )}
      <div className="mt-3 flex items-end justify-between">
        <p className="text-sm font-semibold text-primary">{fmtMoney(deal.value, deal.currency)}</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1", PRIORITY_TONE[deal.priority])}>
          {deal.priority}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Last: {timeAgo(deal.last_activity_at)}</span>
        {deal.expected_close_at && <span>Close: {fmtDate(deal.expected_close_at)}</span>}
      </div>
    </Card>
  );
}

/* ------------------------------ Overview list ------------------------------ */

function OverviewList({ deals, onOpen, loading }: { deals: Deal[]; onOpen: (id: string) => void; loading: boolean }) {
  if (loading) {
    return <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!deals.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="font-display text-lg font-semibold">No deals yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Deals appear here as soon as buyers inquire on your listings.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_140px_120px_100px_40px] gap-3 border-b border-border/60 bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Deal</span><span>Buyer</span><span>Owner / Agent</span>
        <span>Stage</span><span>Value</span><span>Health</span><span></span>
      </div>
      {deals.map((d) => (
        <button
          key={d.id}
          onClick={() => onOpen(d.id)}
          className="grid w-full grid-cols-1 gap-2 border-b border-border/40 px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-secondary/30 md:grid-cols-[1.4fr_1fr_1fr_140px_120px_100px_40px]"
        >
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold">{d.property_title ?? "Untitled"}</p>
            <p className="text-[11px] font-mono uppercase text-muted-foreground">{d.reference}</p>
          </div>
          <div className="min-w-0 text-sm">{d.buyer_name ?? "—"}</div>
          <div className="min-w-0 text-xs text-muted-foreground">{d.agent_name ?? d.owner_name ?? "—"}</div>
          <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", STAGE_TONE[d.stage])}>
            {STAGE_LABEL[d.stage]}
          </span>
          <span className="text-sm font-medium">{fmtMoney(d.value, d.currency)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className={cn("h-2 w-2 rounded-full", HEALTH_DOT[d.health])} /> {HEALTH_LABEL[d.health]}
          </span>
          <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Detail sheet ------------------------------ */

function DealDetailSheet({
  deal, canManage, currentUserId, onClose, onChanged,
}: {
  deal: Deal | null;
  canManage: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [docs, setDocs] = useState<DealDocument[]>([]);
  const [noteText, setNoteText] = useState("");
  const [docKind, setDocKind] = useState<DealDocumentKind>("offer_letter");
  const [followUp, setFollowUp] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deal) return;
    void fetchActivities(deal.id).then(setActivities).catch(() => {});
    void fetchDocuments(deal.id).then(setDocs).catch(() => {});
  }, [deal]);

  if (!deal) return null;

  async function refresh() {
    if (!deal) return;
    const [a, d] = await Promise.all([fetchActivities(deal.id), fetchDocuments(deal.id)]);
    setActivities(a); setDocs(d);
  }

  async function onStageChange(s: DealStage) {
    try { await moveDealStage(deal!.id, s); toast.success(`Moved to ${STAGE_LABEL[s]}`); onChanged(); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }
  async function onPriority(p: DealPriority) {
    try { await updateDeal(deal!.id, { priority: p }); toast.success("Priority updated"); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }
  async function onValue(v: string) {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    try { await updateDeal(deal!.id, { value: n }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }
  async function onExpected(v: string) {
    try { await updateDeal(deal!.id, { expected_close_at: v || null }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }
  async function submitNote() {
    if (!noteText.trim()) return;
    try {
      await addNote(deal!.id, noteText.trim(), currentUserId);
      setNoteText(""); toast.success("Note added"); await refresh(); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function submitFollowUp() {
    if (!followUp) return;
    try {
      await scheduleFollowUp(deal!.id, new Date(followUp).toISOString(), currentUserId);
      setFollowUp(""); toast.success("Follow-up scheduled"); await refresh(); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try {
      await uploadDocument(deal!.id, f, docKind, currentUserId);
      toast.success("Document uploaded"); await refresh(); onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function openDoc(d: DealDocument) {
    const url = await documentSignedUrl(d.storage_path);
    if (url) window.open(url, "_blank");
  }
  async function removeDoc(d: DealDocument) {
    if (!confirm(`Delete ${d.name}?`)) return;
    try { await deleteDocument(d.id, d.storage_path); toast.success("Deleted"); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function onComplete() {
    try { await completeDeal(deal!.id); toast.success("Deal completed"); onChanged(); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function doCancel() {
    try {
      await cancelDeal(deal!.id, cancelReason.trim() || "No reason provided");
      toast.success("Deal cancelled"); setCancelOpen(false); setCancelReason(""); onChanged(); await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <>
    <Sheet open={!!deal} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{deal.reference}</p>
              <SheetTitle className="mt-1 line-clamp-2">{deal.property_title ?? "Untitled property"}</SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[deal.property_district, deal.property_region].filter(Boolean).join(", ") || "—"}</span>
                <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", HEALTH_DOT[deal.health])} />{HEALTH_LABEL[deal.health]}</span>
              </div>
            </div>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onComplete}><CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4" /> Cancel deal</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => assignAgent(deal.id, currentUserId).then(onChanged)}><UserIcon className="mr-2 h-4 w-4" /> Assign me as agent</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SheetHeader>

        {/* Summary editable */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field label="Stage">
            <Select value={deal.stage} onValueChange={(v) => onStageChange(v as DealStage)} disabled={!canManage}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={deal.priority} onValueChange={(v) => onPriority(v as DealPriority)} disabled={!canManage}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Value (${deal.currency})`}>
            <Input type="number" defaultValue={deal.value ?? ""} onBlur={(e) => onValue(e.target.value)} disabled={!canManage} />
          </Field>
          <Field label="Expected close">
            <Input type="date" defaultValue={deal.expected_close_at ?? ""} onBlur={(e) => onExpected(e.target.value)} disabled={!canManage} />
          </Field>
          <Field label="Buyer"><div className="text-sm">{deal.buyer_name ?? "—"} <span className="text-muted-foreground">{deal.buyer_email ?? ""}</span></div></Field>
          <Field label="Owner / Agent"><div className="text-sm">{deal.owner_name ?? "—"}{deal.agent_name ? ` · ${deal.agent_name}` : ""}</div></Field>
        </div>

        <Tabs defaultValue="timeline" className="mt-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="timeline"><Activity className="mr-1.5 h-3.5 w-3.5" />Timeline</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="mr-1.5 h-3.5 w-3.5" />Notes</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="mr-1.5 h-3.5 w-3.5" />Documents ({docs.length})</TabsTrigger>
            <TabsTrigger value="followup"><Calendar className="mr-1.5 h-3.5 w-3.5" />Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative border-l border-border/60 pl-5">
                {activities.map((a) => (
                  <li key={a.id} className="mb-4 last:mb-0">
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <p className="text-sm font-medium">{a.label}</p>
                    {a.detail && <p className="text-xs text-muted-foreground">{a.detail}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            {canManage && (
              <>
                <Textarea placeholder="Add an internal note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
                <Button onClick={submitNote} disabled={!noteText.trim()}><Plus className="mr-1 h-4 w-4" /> Add note</Button>
              </>
            )}
            <div className="space-y-2 pt-2">
              {activities.filter((a) => a.kind === "note_added").map((a) => (
                <div key={a.id} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                  <p className="text-sm">{a.detail}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              ))}
              {activities.filter((a) => a.kind === "note_added").length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4 space-y-3">
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={docKind} onValueChange={(v) => setDocKind(v as DealDocumentKind)}>
                  <SelectTrigger className="h-10 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOC_LABEL) as DealDocumentKind[]).map((k) =>
                      <SelectItem key={k} value={k}>{DOC_LABEL[k]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
            )}
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <Badge variant="secondary" className="mr-1">{DOC_LABEL[d.kind]}</Badge>
                        {d.size ? `${Math.round(d.size / 1024)} KB · ` : ""}{new Date(d.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openDoc(d)} aria-label="Open"><Download className="h-4 w-4" /></Button>
                      {canManage && <Button size="icon" variant="ghost" onClick={() => removeDoc(d)} aria-label="Delete"><X className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followup" className="mt-4 space-y-3">
            {deal.next_follow_up_at && (
              <p className="text-sm">Currently scheduled for <strong>{new Date(deal.next_follow_up_at).toLocaleString()}</strong></p>
            )}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="w-64" />
                <Button onClick={submitFollowUp} disabled={!followUp}><Calendar className="mr-1 h-4 w-4" /> Schedule</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>

    <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this deal?</AlertDialogTitle>
          <AlertDialogDescription>
            This moves <strong>{deal.reference}</strong> to Cancelled and notifies participants.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea placeholder="Optional reason…" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep deal</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={doCancel}>
            Cancel deal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

/* ------------------------------ helpers ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone, small }: { icon: any; label: string; value: React.ReactNode; tone: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("h-4 w-4", tone)} /> {label}
      </div>
      <p className={cn("mt-2 font-display font-semibold text-foreground", small ? "text-lg" : "text-2xl")}>{value}</p>
    </div>
  );
}

function SkeletonCol() {
  return (
    <div className="w-72 shrink-0 space-y-2 rounded-2xl border border-border/60 bg-secondary/30 p-3">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
