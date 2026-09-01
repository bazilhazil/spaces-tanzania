import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon, CalendarClock, CheckCheck, AlertCircle, Ban, Clock,
  MapPin, User, MessageSquare, Home, CheckCircle2, XCircle, RotateCcw, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { NeedHelp } from "@/components/support/need-help";
import {
  fetchIncomingViewings, fetchMyViewings, fetchAllViewings, setViewingStatus,
  suggestNewTime, acceptSuggestedTime,
  type ViewingRequest, type ViewingStatusDb,
} from "@/lib/viewings-db";

type Role = "buyer" | "owner" | "admin";

const STATUS_TINT: Record<ViewingStatusDb, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-600",
  rescheduled: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  cancelled: "border-muted-foreground/30 bg-muted text-muted-foreground",
  completed: "border-primary/30 bg-primary/10 text-primary",
};

export function ViewingsCenter({ role = "buyer", propertyId = null }: { role?: Role; propertyId?: string | null }) {
  const { t } = useI18n();
  const [incoming, setIncoming] = useState<ViewingRequest[]>([]);
  const [mine, setMine] = useState<ViewingRequest[]>([]);
  const [all, setAll] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reschedule, setReschedule] = useState<ViewingRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isRecipientView = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, own, everything] = await Promise.all([
      isRecipientView ? fetchIncomingViewings() : Promise.resolve([]),
      fetchMyViewings(),
      role === "admin" ? fetchAllViewings() : Promise.resolve([]),
    ]);
    // When opened from a property page, show only that listing's requests.
    const only = (list: ViewingRequest[]) =>
      propertyId ? list.filter((v) => v.propertyId === propertyId) : list;
    setIncoming(only(inc));
    setMine(only(own));
    setAll(only(everything));
    setLoading(false);
  }, [isRecipientView, role, propertyId]);


  useEffect(() => { void load(); }, [load]);

  async function act(v: ViewingRequest, status: ViewingStatusDb) {
    setBusyId(v.id);
    const ok = await setViewingStatus(v.id, status);
    setBusyId(null);
    if (!ok) { toast.error(t("viewings.actionFailed")); return; }
    toast.success(t(`viewings.status.${status}`));
    void load();
  }

  async function accept(v: ViewingRequest) {
    setBusyId(v.id);
    const ok = await acceptSuggestedTime(v);
    setBusyId(null);
    if (!ok) { toast.error(t("viewings.actionFailed")); return; }
    toast.success(t("viewings.status.approved"));
    void load();
  }

  const kpiSource = isRecipientView ? incoming : mine;

  return (
    <div className="w-full min-w-0 space-y-6 animate-fade-in">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {t("viewings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {propertyId ? "Showing viewing requests for this property only." : t("viewings.subtitle")}
        </p>

      </header>

      <KpiRow items={kpiSource} />

      <Tabs defaultValue={isRecipientView ? "incoming" : "mine"} className="w-full min-w-0 space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto rounded-xl">
          {isRecipientView && <TabsTrigger value="incoming">{t("viewings.tabs.incoming")}</TabsTrigger>}
          <TabsTrigger value="mine">{t("viewings.tabs.mine")}</TabsTrigger>
          {role === "admin" && <TabsTrigger value="all">{t("viewings.tabs.all")}</TabsTrigger>}
        </TabsList>

        {isRecipientView && (
          <TabsContent value="incoming">
            <RequestList
              loading={loading}
              items={incoming}
              empty={t("viewings.emptyIncoming")}
              render={(v) => (
                <RecipientActions
                  v={v}
                  busy={busyId === v.id}
                  onApprove={() => act(v, "approved")}
                  onReject={() => act(v, "rejected")}
                  onSuggest={() => setReschedule(v)}
                  onComplete={() => act(v, "completed")}
                />
              )}
              perspective="recipient"
            />
          </TabsContent>
        )}

        <TabsContent value="mine">
          <RequestList
            loading={loading}
            items={mine}
            empty={t("viewings.emptyMine")}
            render={(v) => (
              <BuyerActions
                v={v}
                busy={busyId === v.id}
                onCancel={() => act(v, "cancelled")}
                onAccept={() => accept(v)}
              />
            )}
            perspective="buyer"
          />
        </TabsContent>

        {role === "admin" && (
          <TabsContent value="all">
            <RequestList loading={loading} items={all} empty={t("viewings.emptyAll")} perspective="recipient" />
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end">
        <NeedHelp topic="viewings" />
      </div>

      <RescheduleDialog
        viewing={reschedule}
        onOpenChange={(o) => !o && setReschedule(null)}
        onSubmit={async (v, iso) => {
          const ok = await suggestNewTime(v.id, iso);
          setReschedule(null);
          if (!ok) { toast.error(t("viewings.actionFailed")); return; }
          toast.success(t("viewings.status.rescheduled"));
          void load();
        }}
      />
    </div>
  );
}

/* =============================== KPIs =============================== */

function KpiRow({ items }: { items: ViewingRequest[] }) {
  const { t } = useI18n();
  const now = Date.now();
  const upcoming = items.filter((v) => +new Date(v.scheduledAt) > now && !["cancelled", "rejected"].includes(v.status)).length;
  const pending = items.filter((v) => v.status === "pending").length;
  const completed = items.filter((v) => v.status === "completed").length;
  const cancelled = items.filter((v) => v.status === "cancelled" || v.status === "rejected").length;
  const cards = [
    { icon: CalendarClock, label: t("viewings.kpi.upcoming"), value: upcoming, tint: "text-primary" },
    { icon: AlertCircle, label: t("viewings.kpi.pending"), value: pending, tint: "text-amber-600" },
    { icon: CheckCheck, label: t("viewings.kpi.completed"), value: completed, tint: "text-emerald-600" },
    { icon: Ban, label: t("viewings.kpi.cancelled"), value: cancelled, tint: "text-rose-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <c.icon className={cn("h-3.5 w-3.5", c.tint)} /> {c.label}
          </div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================== LIST =============================== */

function RequestList({
  items, loading, empty, render, perspective,
}: {
  items: ViewingRequest[];
  loading: boolean;
  empty: string;
  render?: (v: ViewingRequest) => React.ReactNode;
  perspective: "recipient" | "buyer";
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 p-10 text-center">
        <CalendarIcon className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((v) => (
        <li key={v.id}>
          <ViewingCard v={v} perspective={perspective}>{render?.(v)}</ViewingCard>
        </li>
      ))}
    </ul>
  );
}

function ViewingCard({
  v, perspective, children,
}: { v: ViewingRequest; perspective: "recipient" | "buyer"; children?: React.ReactNode }) {
  const { t, lang } = useI18n();
  const locale = lang === "sw" ? "sw-TZ" : "en-GB";
  const when = new Date(v.suggestedAt ?? v.scheduledAt);
  return (
    <article className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex flex-col gap-3 p-3 sm:flex-row">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-32">
          {v.propertyImage ? (
            <img src={v.propertyImage} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground"><Home className="h-6 w-6" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{v.propertyTitle}</p>
              {v.propertyLocation && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> <span className="truncate">{v.propertyLocation}</span>
                </p>
              )}
            </div>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_TINT[v.status])}>
              {t(`viewings.status.${v.status}`)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {when.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Dar_es_Salaam" })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dar_es_Salaam" })} · {v.durationMinutes}m
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {perspective === "recipient" ? v.buyerName : v.recipientName}
            </span>
          </div>

          {v.status === "rescheduled" && v.suggestedAt && (
            <Badge variant="outline" className="rounded-full text-[10px]">
              {t("viewings.newTimeSuggested")}
            </Badge>
          )}

          {v.message && (
            <p className="line-clamp-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {v.message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline" className="h-9 flex-1 rounded-xl sm:flex-none">
              <Link to="/properties/$slug" params={{ slug: v.propertyId }}>
                <Home className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.viewProperty")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 flex-1 rounded-xl sm:flex-none">
              <Link to="/messages">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                {perspective === "recipient" ? t("viewings.actions.messageBuyer") : t("viewings.actions.messageOwner")}
              </Link>
            </Button>
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================= ACTIONS ============================= */

function RecipientActions({
  v, busy, onApprove, onReject, onSuggest, onComplete,
}: {
  v: ViewingRequest; busy: boolean;
  onApprove: () => void; onReject: () => void; onSuggest: () => void; onComplete: () => void;
}) {
  const { t } = useI18n();
  const closed = ["cancelled", "rejected", "completed"].includes(v.status);
  if (closed) return null;
  return (
    <>
      {v.status !== "approved" && (
        <Button size="sm" disabled={busy} onClick={onApprove} className="h-9 flex-1 rounded-xl sm:flex-none">
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
          {t("viewings.actions.approve")}
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={busy} onClick={onSuggest} className="h-9 flex-1 rounded-xl sm:flex-none">
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.suggestTime")}
      </Button>
      {v.status === "approved" ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onComplete} className="h-9 flex-1 rounded-xl sm:flex-none">
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.complete")}
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={onReject}
          className="h-9 flex-1 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none">
          <XCircle className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.reject")}
        </Button>
      )}
    </>
  );
}

function BuyerActions({
  v, busy, onCancel, onAccept,
}: { v: ViewingRequest; busy: boolean; onCancel: () => void; onAccept: () => void }) {
  const { t } = useI18n();
  const closed = ["cancelled", "rejected", "completed"].includes(v.status);
  if (closed) return null;
  return (
    <>
      {v.status === "rescheduled" && (
        <Button size="sm" disabled={busy} onClick={onAccept} className="h-9 flex-1 rounded-xl sm:flex-none">
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.acceptTime")}
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={busy} onClick={onCancel}
        className="h-9 flex-1 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none">
        <XCircle className="mr-1.5 h-3.5 w-3.5" /> {t("viewings.actions.cancel")}
      </Button>
    </>
  );
}

/* =========================== RESCHEDULE =========================== */

function RescheduleDialog({
  viewing, onOpenChange, onSubmit,
}: {
  viewing: ViewingRequest | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (v: ViewingRequest, iso: string) => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");

  useEffect(() => {
    if (!viewing) return;
    const d = new Date(viewing.scheduledAt);
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
  }, [viewing?.id]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <Dialog open={!!viewing} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("viewings.reschedule.title")}</DialogTitle>
          <DialogDescription>{t("viewings.reschedule.body")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t("viewings.form.date")}
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {t("viewings.form.time")}
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("viewings.actions.close")}</Button>
          <Button
            onClick={() => {
              if (!viewing || !date || !time) return;
              onSubmit(viewing, new Date(`${date}T${time}`).toISOString());
            }}
          >
            {t("viewings.actions.suggestTime")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
