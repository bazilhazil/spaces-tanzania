import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, User, Users,
  CheckCircle2, XCircle, CalendarClock, Bell, Mail, MessageSquare, Smartphone,
  Home, Navigation, Phone, Plus, TrendingUp, PieChart, BarChart3, ListChecks,
  CheckCheck, AlertCircle, Ban, RotateCcw, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  VIEWINGS, propertyOf, statusMeta, reminderLabel, startOfWeek,
  type Viewing, type ViewingStatus, type ReminderOffset, type ReminderChannel,
} from "@/lib/viewings-mock";
import { properties } from "@/lib/mock-data";

type Role = "buyer" | "owner" | "admin";

export function ViewingsCenter({ role = "buyer" }: { role?: Role }) {
  const [viewings, setViewings] = useState<Viewing[]>(VIEWINGS);
  const [selected, setSelected] = useState<Viewing | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState<Viewing | null>(null);

  function update(id: string, patch: Partial<Viewing>, entry?: string) {
    setViewings((xs) => xs.map((v) => v.id === id ? {
      ...v, ...patch,
      history: entry ? [...v.history, { at: new Date().toISOString(), label: entry }] : v.history,
    } : v));
    if (selected?.id === id) setSelected({ ...selected, ...patch });
  }
  function act(v: Viewing, status: ViewingStatus, label: string) {
    update(v.id, { status }, label);
    toast.success(label);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + KPIs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Viewings</h1>
          <p className="text-sm text-muted-foreground">Schedule, approve and track property viewings in one place.</p>
        </div>
        <Button onClick={() => setScheduleOpen(true)} className="rounded-xl gap-2 self-start">
          <Plus className="h-4 w-4" /> Schedule viewing
        </Button>
      </div>

      <KpiRow viewings={viewings} />

      {role === "admin" && <AdminAnalytics viewings={viewings} />}

      <Tabs defaultValue="upcoming" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="rounded-xl">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upcoming"><UpcomingList viewings={viewings} onOpen={setSelected} /></TabsContent>
        <TabsContent value="week"><WeekView viewings={viewings} onOpen={setSelected} /></TabsContent>
        <TabsContent value="month"><MonthView viewings={viewings} onOpen={setSelected} /></TabsContent>
        <TabsContent value="agenda"><AgendaView viewings={viewings} onOpen={setSelected} /></TabsContent>
        <TabsContent value="past"><FilteredList viewings={viewings.filter((v) => new Date(v.startsAt) < new Date() && v.status !== "cancelled")} onOpen={setSelected} empty="No past viewings yet." /></TabsContent>
        <TabsContent value="cancelled"><FilteredList viewings={viewings.filter((v) => v.status === "cancelled" || v.status === "no_show")} onOpen={setSelected} empty="Nothing cancelled." /></TabsContent>
        <TabsContent value="completed"><FilteredList viewings={viewings.filter((v) => v.status === "completed")} onOpen={setSelected} empty="No completed viewings." /></TabsContent>
      </Tabs>

      <ViewingDetailDialog
        viewing={selected}
        role={role}
        onOpenChange={(o) => !o && setSelected(null)}
        onAction={act}
        onReschedule={(v) => { setSelected(null); setRescheduleOpen(v); }}
      />
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onCreate={(v) => { setViewings((xs) => [v, ...xs]); setScheduleOpen(false); toast.success("Viewing requested"); }}
      />
      <RescheduleDialog
        viewing={rescheduleOpen}
        onOpenChange={(o) => !o && setRescheduleOpen(null)}
        onSubmit={(v, iso) => {
          update(v.id, { startsAt: iso, status: "rescheduled" }, "Suggested a new time");
          setRescheduleOpen(null);
        }}
      />
    </div>
  );
}

/* ================================ KPIs ================================ */

function KpiRow({ viewings }: { viewings: Viewing[] }) {
  const now = new Date();
  const upcoming = viewings.filter((v) => new Date(v.startsAt) > now && v.status !== "cancelled").length;
  const pending = viewings.filter((v) => v.status === "requested").length;
  const completed = viewings.filter((v) => v.status === "completed").length;
  const cancelRate = Math.round(
    (viewings.filter((v) => v.status === "cancelled" || v.status === "no_show").length / Math.max(viewings.length, 1)) * 100,
  );
  const items = [
    { icon: CalendarClock, label: "Upcoming", value: upcoming, tint: "text-[color:var(--color-brand-600)]" },
    { icon: AlertCircle,   label: "Pending approval", value: pending, tint: "text-amber-600" },
    { icon: CheckCheck,    label: "Completed", value: completed, tint: "text-emerald-600" },
    { icon: Ban,           label: "Cancel rate", value: `${cancelRate}%`, tint: "text-rose-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <it.icon className={cn("h-3.5 w-3.5", it.tint)} /> {it.label}
          </div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================== LIST VIEWS ============================== */

function UpcomingList({ viewings, onOpen }: { viewings: Viewing[]; onOpen: (v: Viewing) => void }) {
  const list = viewings
    .filter((v) => new Date(v.startsAt) > new Date() && v.status !== "cancelled")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  return <FilteredList viewings={list} onOpen={onOpen} empty="No upcoming viewings. Schedule one above." />;
}

function FilteredList({ viewings, onOpen, empty }: { viewings: Viewing[]; onOpen: (v: Viewing) => void; empty: string }) {
  if (!viewings.length) return <EmptyState message={empty} />;
  return (
    <ul className="space-y-3">
      {viewings.map((v) => <ViewingRow key={v.id} v={v} onOpen={onOpen} />)}
    </ul>
  );
}

function ViewingRow({ v, onOpen }: { v: Viewing; onOpen: (v: Viewing) => void }) {
  const prop = propertyOf(v);
  const meta = statusMeta(v.status);
  const d = new Date(v.startsAt);
  return (
    <li>
      <button
        onClick={() => onOpen(v)}
        className="group flex w-full items-stretch gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
      >
        {prop && (
          <img src={prop.images[0]} alt="" className="hidden h-24 w-32 shrink-0 rounded-xl object-cover sm:block" />
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-display text-base font-semibold">{prop?.title ?? "Property"}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {prop?.ward}, {prop?.city}
                </div>
              </div>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.tint)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {v.durationMin}m</span>
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {v.buyerName}</span>
            {v.guests?.length ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> +{v.guests.length}</span> : null}
          </div>
        </div>
      </button>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-10 text-center">
      <CalendarClock className="mb-2 h-8 w-8 text-muted-foreground opacity-60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ============================== WEEK VIEW ============================== */

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8am..7pm

function WeekView({ viewings, onOpen }: { viewings: Viewing[]; onOpen: (v: Viewing) => void }) {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(d.getDate() + i); return d;
  });
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <CalendarNav
        label={`${days[0].toLocaleDateString([], { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`}
        onPrev={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}
        onNext={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}
        onToday={() => setAnchor(startOfWeek(new Date()))}
      />
      <div className="grid grid-cols-[54px_repeat(7,1fr)] overflow-x-auto">
        <div />
        {days.map((d) => {
          const today = d.toDateString() === new Date().toDateString();
          return (
            <div key={d.toISOString()} className={cn("border-l border-border/60 px-2 py-2 text-center text-xs", today && "bg-[color:var(--color-brand-50)]/40")}>
              <div className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                {d.toLocaleDateString([], { weekday: "short" })}
              </div>
              <div className={cn("font-display text-lg font-semibold", today && "text-[color:var(--color-brand-700)]")}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
        {HOURS.map((h) => (
          <div key={`row-${h}`} className="contents">
            <div className="border-t border-border/50 px-2 py-3 text-right text-[10px] text-muted-foreground">
              {h % 12 || 12}{h < 12 ? "am" : "pm"}
            </div>
            {days.map((d) => {
              const slotStart = new Date(d); slotStart.setHours(h, 0, 0, 0);
              const slotEnd = new Date(slotStart); slotEnd.setHours(h + 1);
              const items = viewings.filter((v) => {
                const t = new Date(v.startsAt);
                return t >= slotStart && t < slotEnd;
              });
              return (
                <div key={`${d.toISOString()}-${h}`} className="min-h-[54px] border-l border-t border-border/50 p-1">
                  {items.map((v) => {
                    const meta = statusMeta(v.status);
                    return (
                      <button
                        key={v.id}
                        onClick={() => onOpen(v)}
                        className={cn("mb-1 block w-full truncate rounded-lg border px-1.5 py-1 text-left text-[10px] font-medium", meta.tint)}
                      >
                        <div className="truncate">{new Date(v.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {propertyOf(v)?.ward ?? "—"}</div>
                        <div className="truncate opacity-80">{v.buyerName}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== MONTH VIEW ============================== */

function MonthView({ viewings, onOpen }: { viewings: Viewing[]; onOpen: (v: Viewing) => void }) {
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const first = new Date(anchor); first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <CalendarNav
        label={anchor.toLocaleDateString([], { month: "long", year: "numeric" })}
        onPrev={() => { const d = new Date(anchor); d.setMonth(d.getMonth() - 1); setAnchor(d); }}
        onNext={() => { const d = new Date(anchor); d.setMonth(d.getMonth() + 1); setAnchor(d); }}
        onToday={() => { const d = new Date(); d.setDate(1); setAnchor(d); }}
      />
      <div className="grid grid-cols-7 border-t border-border/60">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="border-l border-border/60 p-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:border-l-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-border/60">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const today = d.toDateString() === new Date().toDateString();
          const dayItems = viewings.filter((v) => new Date(v.startsAt).toDateString() === d.toDateString());
          return (
            <div key={i} className={cn(
              "min-h-[100px] border-l border-t border-border/50 p-1.5",
              !inMonth && "bg-muted/30 text-muted-foreground/60",
              today && "bg-[color:var(--color-brand-50)]/50",
            )}>
              <div className="mb-1 text-right text-[11px] font-semibold">{d.getDate()}</div>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((v) => {
                  const meta = statusMeta(v.status);
                  return (
                    <button key={v.id} onClick={() => onOpen(v)} className={cn("block w-full truncate rounded-md border px-1 py-0.5 text-left text-[9px] font-medium", meta.tint)}>
                      {new Date(v.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {v.buyerName.split(" ")[0]}
                    </button>
                  );
                })}
                {dayItems.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayItems.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== AGENDA ============================== */

function AgendaView({ viewings, onOpen }: { viewings: Viewing[]; onOpen: (v: Viewing) => void }) {
  const sorted = [...viewings].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const groups = sorted.reduce<Record<string, Viewing[]>>((acc, v) => {
    const k = new Date(v.startsAt).toDateString();
    (acc[k] ||= []).push(v); return acc;
  }, {});
  const keys = Object.keys(groups);
  if (!keys.length) return <EmptyState message="No viewings on the calendar yet." />;
  return (
    <div className="space-y-5">
      {keys.map((k) => (
        <div key={k}>
          <div className="mb-2 flex items-center gap-2">
            <div className="font-display text-sm font-semibold">{new Date(k).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{groups[k].length} viewing{groups[k].length > 1 ? "s" : ""}</span>
          </div>
          <ul className="space-y-2">
            {groups[k].map((v) => <ViewingRow key={v.id} v={v} onOpen={onOpen} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ============================== NAV ============================== */

function CalendarNav({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={onToday}>Today</Button>
      </div>
      <div className="font-display text-sm font-semibold">{label}</div>
      <div className="w-24" />
    </div>
  );
}

/* ============================== DETAIL ============================== */

function ViewingDetailDialog({
  viewing, role, onOpenChange, onAction, onReschedule,
}: {
  viewing: Viewing | null; role: Role;
  onOpenChange: (b: boolean) => void;
  onAction: (v: Viewing, status: ViewingStatus, label: string) => void;
  onReschedule: (v: Viewing) => void;
}) {
  if (!viewing) return null;
  const prop = propertyOf(viewing);
  const meta = statusMeta(viewing.status);
  const d = new Date(viewing.startsAt);
  const mapUrl = prop
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${viewing.meetingLocation ?? prop.street}, ${prop.ward}, ${prop.city}`)}`
    : "#";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {prop && (
          <div className="relative h-40 w-full">
            <img src={prop.images[0]} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">Viewing</div>
                <div className="font-display text-lg font-semibold">{prop.title}</div>
                <div className="flex items-center gap-1 text-xs opacity-90"><MapPin className="h-3 w-3" /> {prop.ward}, {prop.city}</div>
              </div>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold", meta.tint)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}
              </span>
            </div>
          </div>
        )}
        <div className="space-y-4 p-6">
          <DialogHeader className="space-y-0 p-0 text-left">
            <DialogTitle className="sr-only">Viewing details</DialogTitle>
            <DialogDescription className="sr-only">Manage this viewing appointment.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={CalendarIcon} label="Date" value={d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} />
            <InfoRow icon={Clock} label="Time" value={`${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${viewing.durationMin} minutes`} />
            <InfoRow icon={User} label="Buyer" value={viewing.buyerName} avatar={viewing.buyerAvatar} />
            <InfoRow icon={Home} label="Owner" value={viewing.ownerName} />
            {viewing.meetingLocation && <InfoRow icon={MapPin} label="Meeting point" value={viewing.meetingLocation} />}
            {viewing.guests?.length ? (
              <InfoRow icon={Users} label="Guests" value={viewing.guests.map((g) => `${g.name} (${g.relation})`).join(", ")} />
            ) : null}
          </div>

          {viewing.notes && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</div>
              {viewing.notes}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Bell className="h-3 w-3" /> Reminders
            </div>
            <div className="flex flex-wrap gap-2">
              {viewing.reminders.map((r) => (
                <Badge key={r} variant="secondary" className="rounded-full">{reminderLabel(r)}</Badge>
              ))}
              {viewing.channels.map((c) => {
                const Icon = c === "email" ? Mail : c === "sms" ? Smartphone : MessageSquare;
                return (
                  <Badge key={c} variant="outline" className="rounded-full gap-1">
                    <Icon className="h-3 w-3" /> {c === "in_app" ? "In-app" : c === "sms" ? "SMS" : "Email"}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">History</div>
            <ol className="space-y-1.5 border-l border-border/60 pl-3 text-xs">
              {viewing.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-500)]" />
                  <div>{h.label}</div>
                  <div className="text-muted-foreground">{new Date(h.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              <Navigation className="h-3.5 w-3.5" /> Directions
            </a>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              <Phone className="h-3.5 w-3.5" /> Contact owner
            </button>
            {prop && (
              <Link to="/properties/$slug" params={{ slug: prop.slug }} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                <Home className="h-3.5 w-3.5" /> Open listing
              </Link>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {role === "owner" && viewing.status === "requested" && (
                <>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onAction(viewing, "cancelled", "Viewing rejected")}>
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReschedule(viewing)}>
                    <CalendarClock className="mr-1 h-4 w-4" /> Suggest time
                  </Button>
                  <Button size="sm" onClick={() => onAction(viewing, "approved", "Viewing approved")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                  </Button>
                </>
              )}
              {viewing.status === "approved" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onReschedule(viewing)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Reschedule
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onAction(viewing, "cancelled", "Viewing cancelled")}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  {role === "owner" && new Date(viewing.startsAt) < new Date() && (
                    <Button size="sm" onClick={() => onAction(viewing, "completed", "Marked as completed")}>
                      <CheckCheck className="mr-1 h-4 w-4" /> Complete
                    </Button>
                  )}
                </>
              )}
              {role === "owner" && viewing.status === "rescheduled" && (
                <Button size="sm" onClick={() => onAction(viewing, "approved", "Viewing approved")}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">More</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAction(viewing, "no_show", "Marked as no-show")}>Mark no-show</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(viewing, "completed", "Marked as completed")}>Mark completed</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAction(viewing, "cancelled", "Viewing cancelled")} className="text-destructive focus:text-destructive">
                    Cancel viewing
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value, avatar }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; avatar?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
      {avatar ? (
        <Avatar className="h-9 w-9"><AvatarImage src={avatar} /><AvatarFallback>{value[0]}</AvatarFallback></Avatar>
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

/* ============================== SCHEDULE ============================== */

const REMINDER_OPTIONS: { key: ReminderOffset; label: string }[] = [
  { key: "24h", label: "24 hours before" },
  { key: "2h", label: "2 hours before" },
  { key: "30m", label: "30 minutes before" },
];
const CHANNEL_OPTIONS: { key: ReminderChannel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "in_app", label: "In-app", icon: MessageSquare },
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "email", label: "Email", icon: Mail },
];
const TIME_SLOTS = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00"];

function ScheduleDialog({
  open, onOpenChange, onCreate,
}: { open: boolean; onOpenChange: (b: boolean) => void; onCreate: (v: Viewing) => void }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [guest, setGuest] = useState("");
  const [reminders, setReminders] = useState<ReminderOffset[]>(["24h", "2h"]);
  const [channels, setChannels] = useState<ReminderChannel[]>(["in_app", "email"]);

  function toggle<T>(arr: T[], v: T, setter: (x: T[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }
  function submit() {
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const v: Viewing = {
      id: `v${Date.now()}`, propertyId, buyerName: "You", buyerAvatar: "https://i.pravatar.cc/240?img=68",
      ownerName: "Owner", startsAt, durationMin: duration, status: "requested",
      notes: notes.trim() || undefined,
      guests: guest.trim() ? [{ name: guest.trim(), relation: "Family" }] : undefined,
      reminders, channels, createdAt: new Date().toISOString(),
      history: [{ at: new Date().toISOString(), label: "Request submitted" }],
    };
    onCreate(v);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a viewing</DialogTitle>
          <DialogDescription>Choose a date and time. The owner will confirm within 24 hours.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Property">
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {properties.slice(0, 10).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" /></Field>
            <Field label="Duration">
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </Field>
          </div>
          <Field label="Time slot">
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t} onClick={() => setTime(t)}
                  className={cn(
                    "rounded-xl border px-2 py-1.5 text-xs font-medium transition",
                    time === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
                  )}
                >{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Notes for the owner (optional)">
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Cash buyer, ready to close this month." className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Invite family member (optional)">
            <Input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="e.g. Neema Mushi" className="rounded-xl" />
          </Field>
          <Field label="Reminders">
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((r) => {
                const on = reminders.includes(r.key);
                return (
                  <button key={r.key} onClick={() => toggle(reminders, r.key, setReminders)}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notify via">
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((c) => {
                const on = channels.includes(c.key);
                return (
                  <button key={c.key} onClick={() => toggle(channels, c.key, setChannels)}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    <c.icon className="h-3 w-3" /> {c.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Request viewing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/* ============================== RESCHEDULE ============================== */

function RescheduleDialog({ viewing, onOpenChange, onSubmit }: {
  viewing: Viewing | null; onOpenChange: (b: boolean) => void; onSubmit: (v: Viewing, iso: string) => void;
}) {
  const [date, setDate] = useState(() => (viewing ? new Date(viewing.startsAt).toISOString().slice(0, 10) : ""));
  const [time, setTime] = useState("10:00");
  if (!viewing) return null;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a new time</DialogTitle>
          <DialogDescription>The other party will be notified to accept or decline.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" /></Field>
          <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(viewing, new Date(`${date}T${time}:00`).toISOString())}>Send suggestion</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== ADMIN ANALYTICS ============================== */

function AdminAnalytics({ viewings }: { viewings: Viewing[] }) {
  const total = viewings.length;
  const completed = viewings.filter((v) => v.status === "completed").length;
  const cancelled = viewings.filter((v) => v.status === "cancelled" || v.status === "no_show").length;
  const completionRate = Math.round((completed / Math.max(total, 1)) * 100);
  const cancelRate = Math.round((cancelled / Math.max(total, 1)) * 100);

  const perProperty = viewings.reduce<Record<string, number>>((acc, v) => {
    acc[v.propertyId] = (acc[v.propertyId] ?? 0) + 1; return acc;
  }, {});
  const top = Object.entries(perProperty).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Completion rate</div>
        <div className="font-display text-3xl font-semibold">{completionRate}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} /></div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><PieChart className="h-3.5 w-3.5" /> Cancellation rate</div>
        <div className="font-display text-3xl font-semibold">{cancelRate}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-rose-500" style={{ width: `${cancelRate}%` }} /></div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Most viewed properties</div>
        <ul className="space-y-1.5">
          {top.map(([pid, n]) => {
            const p = properties.find((x) => x.id === pid);
            return (
              <li key={pid} className="flex items-center gap-2 text-xs">
                <ListChecks className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1 truncate">{p?.title ?? pid}</span>
                <span className="font-semibold">{n}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
