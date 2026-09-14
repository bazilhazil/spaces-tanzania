import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  Search, Phone, MessageCircle, Mail, Calendar as CalendarIcon, Clock, MapPin,
  Home, User, Loader2, ArrowUpRight, Handshake, StickyNote, Activity as ActivityIcon,
  CheckCircle2, ChevronRight, Users, TrendingUp, Sparkles, MessagesSquare,
  AlertTriangle, MessageSquare, Flame, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STAGE_LABEL } from "@/lib/deals-db";
import {
  LEAD_STATUSES, LEAD_STATUS_TONE, LOST_REASONS, fetchCrmLeads, fetchLeadTimeline, updateLeadStatus,
  saveLeadNotes, createDealFromLead, markLeadLost, timeAgo, leadPriority, nextAction, needsFollowUp,
  isTerminalLead,
  type CrmLead, type LeadStatus, type LeadPriority, type LostReason, type TimelineEntry,
} from "@/lib/crm-workflow";


/* ================================ ROOT ================================ */

export function LeadsCenter() {
  const { t } = useI18n();
  const { primaryRole } = useAuth();
  const isAdmin = primaryRole === "admin" || primaryRole === "super_admin";

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [tab, setTab] = useState<"active" | "followup" | "won" | "lost">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLeads(await fetchCrmLeads({ all: isAdmin }));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await fetchCrmLeads({ all: isAdmin }));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  // Keep inquiries in sync when a reply changes the status elsewhere.
  useEffect(() => {
    const channel = supabase
      .channel("leads-center-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  // Deep link from Messages: /leads?lead=<id> opens that inquiry.
  const search = useSearch({ strict: false }) as { lead?: string };
  useEffect(() => {
    if (search.lead) setSelectedId(search.lead);
  }, [search.lead]);

  const PRIORITY_ORDER: Record<LeadPriority, number> = { high: 0, normal: 1, low: 2 };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (tab === "won" && l.status !== "won") return false;
        if (tab === "lost" && l.status !== "lost" && l.status !== "closed") return false;
        if (tab === "followup" && !needsFollowUp(l)) return false;
        if (tab === "active" && isTerminalLead(l.status)) return false;
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (!q) return true;
        return [l.name, l.phone ?? "", l.email ?? "", l.propertyTitle, l.ownerName]
          .some((s) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const p = PRIORITY_ORDER[leadPriority(a)] - PRIORITY_ORDER[leadPriority(b)];
        if (p !== 0) return p;
        return +new Date(b.lastActivityAt) - +new Date(a.lastActivityAt);
      });
  }, [leads, query, statusFilter, tab]);

  const selected = selectedId ? leads.find((l) => l.id === selectedId) ?? null : null;

  const kpis = useMemo(() => {
    const active = leads.filter((l) => !isTerminalLead(l.status)).length;
    const fresh = leads.filter((l) => l.status === "new").length;
    const follow = leads.filter((l) => needsFollowUp(l)).length;
    const won = leads.filter((l) => l.status === "won").length;
    return { active, fresh, follow, won };
  }, [leads]);


  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label={t("crm.kpi.new")} value={kpis.fresh} />
        <Kpi icon={<Users className="h-4 w-4" />} label={t("crm.kpi.active")} value={kpis.active} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label={t("crm.kpi.followUp")} value={kpis.follow} />

        <Kpi icon={<TrendingUp className="h-4 w-4" />} label={t("crm.kpi.won")} value={kpis.won} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("crm.searchPlaceholder")}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("crm.allStatuses")}</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`crm.status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex sm:grid-cols-4">
          <TabsTrigger value="active">{t("crm.tabs.active")}</TabsTrigger>
          <TabsTrigger value="followup" className="gap-1">
            {t("crm.tabs.followUp")}
            {kpis.follow > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-600">{kpis.follow}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="won">{t("crm.tabs.won")}</TabsTrigger>
          <TabsTrigger value="lost">{t("crm.tabs.lost")}</TabsTrigger>
        </TabsList>


        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 p-10 text-center">
              <Users className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("crm.empty")}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((l) => (
                <li key={l.id}>
                  <LeadCard lead={l} onOpen={() => setSelectedId(l.id)} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <LeadDrawer lead={selected} onClose={() => setSelectedId(null)} onChanged={load} />
    </div>
  );
}

/* ================================ PIECES ================================ */

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", LEAD_STATUS_TONE[status])}>
      {t(`crm.status.${status}`)}
    </span>
  );
}

function PriorityPill({ priority }: { priority: LeadPriority }) {
  const { t } = useI18n();
  const tone =
    priority === "high"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
      : priority === "normal"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-600"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>
      {priority === "high" && <Flame className="h-3 w-3" />}
      {t(`crm.priority.${priority}`)}
    </span>
  );
}

function NextActionLine({ lead }: { lead: CrmLead }) {
  const { t } = useI18n();
  const action = nextAction(lead);
  if (action === "none") return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-primary">
      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="min-w-0 break-words">{t(`crm.next.${action}`)}</span>
    </p>
  );
}

function LeadCard({ lead, onOpen }: { lead: CrmLead; onOpen: () => void }) {
  const { t } = useI18n();
  const follow = needsFollowUp(lead);
  return (
    <button
      onClick={onOpen}
      className="w-full min-w-0 max-w-full rounded-2xl border border-border/60 bg-background p-4 text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{lead.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Home className="h-3 w-3 shrink-0" /> {lead.propertyTitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={lead.status} />
          {!isTerminalLead(lead.status) && <PriorityPill priority={leadPriority(lead)} />}
        </div>
      </div>

      <NextActionLine lead={lead} />

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        {lead.phone && <span className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0" />{lead.phone}</span>}
        {lead.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{lead.email}</span>}
        {lead.propertyLocation && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{lead.propertyLocation}</span>}
        <span className="flex items-center gap-1 truncate"><Clock className="h-3 w-3 shrink-0" />{timeAgo(lead.lastActivityAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {follow && (
          <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-600">
            <AlertTriangle className="h-3 w-3" /> {t("crm.needsFollowUp")}
          </Badge>
        )}
        {lead.firstRespondedAt && (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" /> {t("crm.responded")}
          </Badge>
        )}
        {lead.viewingStatus && (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <CalendarIcon className="h-3 w-3" /> {t(`viewings.status.${lead.viewingStatus}`)}
          </Badge>
        )}
        {lead.dealReference && (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Handshake className="h-3 w-3" /> {lead.dealReference}
          </Badge>
        )}
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}


/* ================================ DRAWER ================================ */

function LeadDrawer({
  lead, onClose, onChanged,
}: { lead: CrmLead | null; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState<LostReason>("no_response");
  const [lostNote, setLostNote] = useState("");


  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? "");
    void fetchLeadTimeline(lead).then(setTimeline).catch(() => setTimeline([]));
  }, [lead]);

  if (!lead) return null;

  async function changeStatus(s: LeadStatus) {
    try {
      await updateLeadStatus(lead!.id, s);
      toast.success(t("crm.statusUpdated"));
      onChanged();
    } catch { toast.error(t("crm.actionFailed")); }
  }

  async function persistNotes() {
    try {
      await saveLeadNotes(lead!.id, notes);
      toast.success(t("crm.noteSaved"));
      onChanged();
    } catch { toast.error(t("crm.actionFailed")); }
  }

  async function makeDeal() {
    setBusy(true);
    try {
      const res = await createDealFromLead(lead!);
      toast.success(res.existing ? t("crm.dealExists") : t("crm.dealCreated"));
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? t("crm.actionFailed"));
    } finally { setBusy(false); }
  }

  async function confirmLost() {
    setBusy(true);
    try {
      await markLeadLost(lead!.id, lostReason, lostNote);
      toast.success(t("crm.statusUpdated"));
      setLostOpen(false);
      setLostNote("");
      onChanged();
    } catch { toast.error(t("crm.actionFailed")); }
    finally { setBusy(false); }
  }



  return (
    <Sheet open={!!lead} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{lead.name}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill status={lead.status} />
            {!isTerminalLead(lead.status) && <PriorityPill priority={leadPriority(lead)} />}
            {needsFollowUp(lead) && (
              <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {t("crm.needsFollowUp")}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{t("crm.lastActivity")}: {timeAgo(lead.lastActivityAt)}</span>
          </div>
          <NextActionLine lead={lead} />
        </SheetHeader>

        {/* Profile */}
        <div className="mt-5 grid gap-2 rounded-2xl border border-border/60 p-4 text-sm">
          <Row icon={<Phone className="h-3.5 w-3.5" />} label={t("crm.field.phone")} value={lead.phone ?? "—"} />
          <Row icon={<Mail className="h-3.5 w-3.5" />} label={t("crm.field.email")} value={lead.email ?? "—"} />
          <Row icon={<Home className="h-3.5 w-3.5" />} label={t("crm.field.property")} value={lead.propertyTitle} />
          <Row icon={<User className="h-3.5 w-3.5" />} label={t("crm.field.owner")} value={lead.ownerName} />
          <Row
            icon={<Clock className="h-3.5 w-3.5" />}
            label={t("crm.field.created")}
            value={new Date(lead.createdAt).toLocaleString()}
          />
          <Row
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label={t("crm.responded")}
            value={lead.firstRespondedAt ? new Date(lead.firstRespondedAt).toLocaleString() : t("crm.none")}
          />
          <Row
            icon={<CalendarIcon className="h-3.5 w-3.5" />}
            label={t("crm.field.viewing")}
            value={lead.viewingStatus ? t(`viewings.status.${lead.viewingStatus}`) : t("crm.none")}
          />
          <Row
            icon={<Handshake className="h-3.5 w-3.5" />}
            label={t("crm.field.deal")}
            value={lead.dealStage ? STAGE_LABEL[lead.dealStage] : t("crm.none")}
          />
          {lead.lostReason && (
            <Row icon={<AlertTriangle className="h-3.5 w-3.5" />} label={t("crm.lostReasonTitle")} value={lead.lostReason} />
          )}
        </div>


        {/* Actions */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatus)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`crm.status.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>

          {lead.dealId ? (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/deals">
                <Handshake className="mr-2 h-4 w-4" /> {t("crm.relatedDeal")} {lead.dealReference ?? ""}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button onClick={makeDeal} disabled={busy} className="h-11 rounded-xl">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Handshake className="mr-2 h-4 w-4" />}
              {t("crm.createDeal")}
            </Button>
          )}
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {lead.conversationId && (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/messages" search={{ c: lead.conversationId }}>
                <MessagesSquare className="mr-2 h-4 w-4" />{t("crm.viewConversation")}
              </Link>
            </Button>
          )}
          {lead.phone && (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <a href={`tel:${lead.phone}`}><Phone className="mr-2 h-4 w-4" />{t("crm.call")}</a>
            </Button>
          )}
          {lead.phone && (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
              </a>
            </Button>
          )}
          {lead.phone && (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <a href={`sms:${lead.phone}`}><MessageSquare className="mr-2 h-4 w-4" />SMS</a>
            </Button>
          )}
          {lead.email && (
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <a href={`mailto:${lead.email}`}><Mail className="mr-2 h-4 w-4" />{t("crm.field.email")}</a>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/viewings"><CalendarIcon className="mr-2 h-4 w-4" />{t("crm.viewings")}</Link>
          </Button>
          {!isTerminalLead(lead.status) && (
            <Button variant="outline" onClick={() => setLostOpen(true)} className="h-11 rounded-xl text-rose-600 hover:text-rose-600">
              {t("crm.markLost")}
            </Button>
          )}
        </div>

        <Dialog open={lostOpen} onOpenChange={setLostOpen}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("crm.lostReasonTitle")}</DialogTitle>
              <DialogDescription>{t("crm.lostReasonDesc")}</DialogDescription>
            </DialogHeader>
            <Select value={lostReason} onValueChange={(v) => setLostReason(v as LostReason)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{t(`crm.lostReason.${r}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea
              value={lostNote}
              onChange={(e) => setLostNote(e.target.value)}
              placeholder={t("crm.lostReasonNotes")}
              className="min-h-20 rounded-xl"
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setLostOpen(false)}>{t("common.cancel")}</Button>
              <Button className="rounded-xl" disabled={busy} onClick={confirmLost}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("crm.confirmLost")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Notes */}
        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <StickyNote className="h-4 w-4" /> {t("crm.notes")}
          </h3>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t("crm.notesPlaceholder")} />
          <Button size="sm" className="mt-2" onClick={persistNotes}>{t("crm.saveNote")}</Button>
        </section>

        {/* Timeline */}
        <section className="mt-6 pb-8">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <ActivityIcon className="h-4 w-4" /> {t("crm.timeline")}
          </h3>
          <ol className="space-y-3 border-l border-border/60 pl-4">
            {timeline.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-primary/20">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </span>
                <p className="text-sm font-medium">{eventLabel(t, e)}</p>
                {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                <p className="text-[11px] text-muted-foreground">{new Date(e.at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </section>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</span>
      <span className="min-w-0 truncate text-right text-sm">{value}</span>
    </div>
  );
}

/** Translated timeline label, falling back to the stored label. */
function eventLabel(t: (k: string) => string, e: TimelineEntry) {
  const key = `crm.event.${e.kind}`;
  const translated = t(key);
  return translated === key ? e.label : translated;
}
