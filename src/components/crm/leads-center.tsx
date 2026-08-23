import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  Search, Phone, MessageCircle, Mail, Calendar as CalendarIcon, Clock, MapPin,
  Home, User, Loader2, ArrowUpRight, Handshake, StickyNote, Activity as ActivityIcon,
  CheckCircle2, ChevronRight, Users, TrendingUp, Sparkles, MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { STAGE_LABEL } from "@/lib/deals-db";
import {
  LEAD_STATUSES, LEAD_STATUS_TONE, fetchCrmLeads, fetchLeadTimeline, updateLeadStatus,
  saveLeadNotes, createDealFromLead, timeAgo,
  type CrmLead, type LeadStatus, type TimelineEntry,
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
  const [tab, setTab] = useState<"active" | "won" | "lost">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await fetchCrmLeads({ all: isAdmin }));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  // Deep link from Messages: /leads?lead=<id> opens that inquiry.
  const search = useSearch({ strict: false }) as { lead?: string };
  useEffect(() => {
    if (search.lead) setSelectedId(search.lead);
  }, [search.lead]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (tab === "won" && l.status !== "won") return false;
      if (tab === "lost" && l.status !== "lost") return false;
      if (tab === "active" && (l.status === "won" || l.status === "lost")) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.phone ?? "", l.email ?? "", l.propertyTitle, l.ownerName]
        .some((s) => s.toLowerCase().includes(q));
    });
  }, [leads, query, statusFilter, tab]);

  const selected = selectedId ? leads.find((l) => l.id === selectedId) ?? null : null;

  const kpis = useMemo(() => {
    const active = leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
    const today = leads.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 864e5).length;
    const won = leads.filter((l) => l.status === "won").length;
    const withDeal = leads.filter((l) => l.dealId).length;
    return { active, today, won, withDeal };
  }, [leads]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Sparkles className="h-4 w-4" />} label={t("crm.kpi.today")} value={kpis.today} />
        <Kpi icon={<Users className="h-4 w-4" />} label={t("crm.kpi.active")} value={kpis.active} />
        <Kpi icon={<Handshake className="h-4 w-4" />} label={t("crm.kpi.deals")} value={kpis.withDeal} />
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
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="active">{t("crm.tabs.active")}</TabsTrigger>
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

function LeadCard({ lead, onOpen }: { lead: CrmLead; onOpen: () => void }) {
  const { t } = useI18n();
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
        <StatusPill status={lead.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {lead.phone && <span className="flex items-center gap-1 truncate"><Phone className="h-3 w-3" />{lead.phone}</span>}
        {lead.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{lead.email}</span>}
        {lead.propertyLocation && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{lead.propertyLocation}</span>}
        <span className="flex items-center gap-1 truncate"><Clock className="h-3 w-3" />{timeAgo(lead.lastActivityAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
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

  return (
    <Sheet open={!!lead} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{lead.name}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill status={lead.status} />
            <span className="text-xs text-muted-foreground">{t("crm.lastActivity")}: {timeAgo(lead.lastActivityAt)}</span>
          </div>
        </SheetHeader>

        {/* Profile */}
        <div className="mt-5 grid gap-2 rounded-2xl border border-border/60 p-4 text-sm">
          <Row icon={<Phone className="h-3.5 w-3.5" />} label={t("crm.field.phone")} value={lead.phone ?? "—"} />
          <Row icon={<Mail className="h-3.5 w-3.5" />} label={t("crm.field.email")} value={lead.email ?? "—"} />
          <Row icon={<Home className="h-3.5 w-3.5" />} label={t("crm.field.property")} value={lead.propertyTitle} />
          <Row icon={<User className="h-3.5 w-3.5" />} label={t("crm.field.owner")} value={lead.ownerName} />
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
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/viewings"><CalendarIcon className="mr-2 h-4 w-4" />{t("crm.viewings")}</Link>
          </Button>
        </div>

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
