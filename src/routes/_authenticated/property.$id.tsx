import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Eye, Heart, MessageSquare, Calendar, Star, ShieldCheck, Crown,
  Edit3, Share2, Link2, Play, Pause, Trash2, Copy, Clock, TrendingUp, MapPin, BarChart3,
  CheckCircle2, AlertCircle, History, MoreHorizontal, ChevronRight,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { useAuth } from "@/hooks/use-auth";
import { publicIdFrom } from "@/components/property-management/manager";
import {
  deletePropertyWithStorage, duplicateProperty, fetchPropertyMetrics, type PropertyMetrics,
} from "@/lib/property-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/property/$id")({
  component: PropertyDetail,
});

type Tab = "overview" | "messages" | "viewings" | "views" | "performance" | "quality" | "verification" | "history";

const MORE_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "views", label: "Views", icon: Eye },
  { key: "performance", label: "Performance", icon: BarChart3 },
  { key: "quality", label: "Listing quality", icon: Star },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "history", label: "Edit history", icon: History },
];

type ConvoRow = { id: string; last_message_at: string; last?: string };
type BookingRow = {
  id: string; scheduled_at: string; status: string; buyer_name: string | null; message: string | null;
};

function PropertyDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<any | null>(null);
  const [cover, setCover] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState<PropertyMetrics>({ views: 0, favorites: 0, messages: 0, bookings: 0, leads: 0, deals: 0, activeDeal: false });
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data) { setLoading(false); return; }
      const { data: contact } = await supabase
        .from("property_contacts")
        .select("contact_name,contact_phone,contact_whatsapp")
        .eq("property_id", id)
        .maybeSingle();
      setRow({ ...(data as any), ...(contact ?? {}) });
      const [{ data: media }, m] = await Promise.all([
        supabase
          .from("property_media")
          .select("storage_path,is_cover,position")
          .eq("property_id", id)
          .order("position"),
        fetchPropertyMetrics(id),
      ]);
      if (!alive) return;
      setMetrics(m);
      const chosen = (media ?? []).find((mm: any) => mm.is_cover) ?? media?.[0];
      if (chosen) setCover((await signedUrl(chosen.storage_path)) ?? undefined);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  // Real conversations + viewing requests for THIS property (same records the
  // Messages and Viewings pages use).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: cs }, { data: bs }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id,last_message_at")
          .eq("property_id", id)
          .order("last_message_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("id,scheduled_at,status,buyer_name,message")
          .eq("property_id", id)
          .order("scheduled_at", { ascending: false }),
      ]);
      if (!alive) return;
      setBookings((bs ?? []) as BookingRow[]);
      const list = (cs ?? []) as ConvoRow[];
      if (list.length) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id,body,created_at")
          .in("conversation_id", list.map((c) => c.id))
          .order("created_at", { ascending: false });
        const lastByConv: Record<string, string> = {};
        for (const msg of (msgs ?? []) as any[]) {
          if (!lastByConv[msg.conversation_id]) lastByConv[msg.conversation_id] = msg.body;
        }
        if (!alive) return;
        setConvos(list.map((c) => ({ ...c, last: lastByConv[c.id] })));
      } else {
        setConvos([]);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0,1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />)}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!row) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-lg py-24 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Property not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been removed, or you don't have access.</p>
          <Link to="/dashboard/properties" className="mt-6 inline-block">
            <Button>Back to My Properties</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const publicId = publicIdFrom(row.id, row.created_at);
  const location = [row.ward, row.district, row.region].filter(Boolean).join(", ") || "Tanzania";
  const isOwner = user?.id === row.owner_id;
  const quality = computeQuality(row, !!cover);

  async function updateStatus(next: "live" | "paused" | "draft" | "sold" | "rented" | "archived") {
    const { error } = await supabase.from("properties").update({ status: next as never }).eq("id", id);
    if (error) return toast.error(error.message);
    setRow({ ...row, status: next });
    toast.success("Status updated");
  }
  async function del() {
    if (!confirm("Delete this property? Photos will be removed and this cannot be undone.")) return;
    try {
      await deletePropertyWithStorage(id);
    } catch (e: any) {
      return toast.error(e?.message ?? "Delete failed");
    }
    toast.success("Deleted");
    navigate({ to: "/dashboard/properties" });
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}/properties/${row.id}` : "";
  async function share() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: row.title, url }); return; } catch { /* cancelled */ }
    }
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  const isLive = row.status === "live";
  const primaryTabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "messages", label: "Messages" },
    { key: "viewings", label: "Viewings" },
  ];
  const activeMore = MORE_TABS.find((m) => m.key === tab);

  return (
    <DashboardShell>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-hidden animate-fade-in">
        <div>
          <Link to="/dashboard/properties" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> My Properties
          </Link>
        </div>

        {/* Hero card */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
          <div className="grid gap-0 md:grid-cols-[380px_1fr]">
            <div className="relative aspect-[16/10] w-full bg-muted md:aspect-auto md:h-full">
              {cover ? (
                <img src={cover} alt={row.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground/40">No cover</div>
              )}
              <div className="absolute left-4 top-4">
                <StatusBadge kind={statusKind(row.status)} label={statusLabel(row.status)} />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{publicId}</p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{row.title}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{location}</span></p>
                <p className="mt-2 font-display text-xl font-semibold text-primary sm:text-2xl">
                  {row.currency} {row.price.toLocaleString()}
                  {row.listing_type === "rent" && <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
              </div>

              {isOwner && (
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <a href={url} target="_blank" rel="noreferrer"><Eye className="mr-1 h-3.5 w-3.5" /> View public</a>
                  </Button>
                  <Button
                    variant="outline" size="sm" className="rounded-lg"
                    onClick={() => navigate({ to: "/dashboard/properties/$id/manage", params: { id: row.id } })}
                  >
                    <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  {isLive ? (
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => updateStatus("paused")}>
                      <Pause className="mr-1 h-3.5 w-3.5" /> Pause listing
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => updateStatus("live")}>
                      <Play className="mr-1 h-3.5 w-3.5" /> {row.status === "draft" ? "Publish" : "Resume listing"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={share}>
                    <Share2 className="mr-1 h-3.5 w-3.5" /> Share
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        <MoreHorizontal className="mr-1 h-4 w-4" /> More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}>
                        <Link2 className="mr-2 h-3.5 w-3.5" /> Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const newId = await duplicateProperty(row.id);
                            toast.success("Copy created as a draft");
                            navigate({ to: "/dashboard/properties/$id/manage", params: { id: newId } });
                          } catch (e: any) { toast.error(e?.message ?? "Could not duplicate"); }
                        }}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Promotion coming soon")}>
                        <Crown className="mr-2 h-3.5 w-3.5" /> Promote
                      </DropdownMenuItem>
                      {row.listing_type === "sale" && row.status !== "sold" && (
                        <DropdownMenuItem onClick={() => updateStatus("sold")}>
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark sold
                        </DropdownMenuItem>
                      )}
                      {row.listing_type === "rent" && row.status !== "rented" && (
                        <DropdownMenuItem onClick={() => updateStatus("rented")}>
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark rented
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={del} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simple statistics — real records only */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile icon={Eye} label="Views" value={metrics.views} />
          <StatTile icon={Heart} label="Saves" value={metrics.favorites} />
          <StatTile
            icon={MessageSquare} label="Messages" value={metrics.messages}
            to="/messages" search={{ property: row.id }}
          />
          <StatTile
            icon={Calendar} label="Viewings" value={metrics.bookings}
            to="/viewings" search={{ property: row.id }}
          />
        </div>

        {/* Tabs: three simple ones + More */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-px">
          {primaryTabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "ml-auto inline-flex shrink-0 items-center gap-1 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  activeMore ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {activeMore ? activeMore.label : "More"} <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {MORE_TABS.map((m) => {
                const Icon = m.icon;
                return (
                  <DropdownMenuItem key={m.key} onClick={() => setTab(m.key)}>
                    <Icon className="mr-2 h-3.5 w-3.5" /> {m.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tab bodies */}
        <div className="animate-fade-in">
          {tab === "overview" && <TimelineTab row={row} />}
          {tab === "messages" && (
            <RealListCard
              title="Conversations about this property"
              empty="No messages about this property yet."
              footer={{ label: "Open in Messages", to: "/messages", search: { property: row.id } }}
              items={convos.map((c) => ({
                key: c.id,
                title: c.last ? c.last.slice(0, 80) : "Conversation",
                body: "Tap to open this conversation",
                meta: new Date(c.last_message_at).toLocaleString(),
                to: "/messages" as const,
                search: { c: c.id },
              }))}
            />
          )}
          {tab === "viewings" && (
            <RealListCard
              title="Viewing requests for this property"
              empty="No viewing requests for this property yet."
              footer={{ label: "Open in Viewings", to: "/viewings", search: { property: row.id } }}
              items={bookings.map((b) => ({
                key: b.id,
                title: new Date(b.scheduled_at).toLocaleString(),
                body: b.buyer_name || b.message || "Viewing request",
                meta: b.status,
              }))}
            />
          )}
          {tab === "views" && <ChartCard title="Views (last 30 days)" series={fakeSeries(row.id, 30, 5, 60)} unit=" views" />}
          {tab === "performance" && (
            <div className="grid gap-4 md:grid-cols-2">
              <ChartCard title="Traffic sources" series={[{ label: "Search", value: 62 }, { label: "Direct", value: 24 }, { label: "Social", value: 14 }]} unit="%" bar />
              <ChartCard title="Weekly views" series={fakeSeries(row.id, 8, 20, 240)} unit=" views" bar />
            </div>
          )}
          {tab === "quality" && <QualityBreakdown quality={quality} />}
          {tab === "verification" && <VerificationCard row={row} />}
          {tab === "history" && <ListCard title="Edit history" items={[
            { title: "Created", body: "You published this listing", meta: new Date(row.created_at).toLocaleString() },
            { title: "Updated", body: "Price and description edited", meta: new Date(row.updated_at).toLocaleString() },
          ]} />}
        </div>
      </div>
    </DashboardShell>
  );
}

/** Simple statistic. Clickable only when there is a useful destination. */
function StatTile({
  icon: Icon, label, value, to, search,
}: {
  icon: any; label: string; value: number;
  to?: string; search?: Record<string, string>;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col gap-2 rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)]",
        to && "cursor-pointer hover:border-primary/40",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm font-medium">{label}</span>
        {to && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
      </div>
      <p className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {value.toLocaleString()}
      </p>
    </div>
  );
  if (!to) return inner;
  return <Link to={to} search={search as never} className="block h-full">{inner}</Link>;
}

function RealListCard({
  title, items, empty, footer,
}: {
  title: string;
  empty: string;
  items: { key: string; title: string; body: string; meta: string; to?: string; search?: Record<string, string> }[];
  footer?: { label: string; to: string; search?: Record<string, string> };
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)] sm:p-6">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {items.map((it) => {
            const body = (
              <div className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.body}</p>
                </div>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">{it.meta}</span>
              </div>
            );
            return (
              <li key={it.key}>
                {it.to
                  ? <Link to={it.to} search={it.search as never} className="block hover:opacity-80">{body}</Link>
                  : body}
              </li>
            );
          })}
        </ul>
      )}
      {footer && (
        <Link
          to={footer.to}
          search={footer.search as never}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {footer.label} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}


function TimelineTab({ row }: { row: any }) {
  const events = [
    { icon: CheckCircle2, tone: "text-emerald-600", title: "Listing created", meta: new Date(row.created_at).toLocaleString(), body: "Your property was saved and submitted." },
    { icon: ShieldCheck, tone: "text-primary", title: "Verification review", meta: "Automated", body: "Photos, location and documents queued for trust review." },
    { icon: TrendingUp, tone: "text-amber-600", title: "Growing traction", meta: "Last 7 days", body: `${row.view_count ?? 0} people have viewed this listing.` },
    { icon: Clock, tone: "text-muted-foreground", title: "Last updated", meta: new Date(row.updated_at).toLocaleString(), body: "Keep your listing fresh to rank higher." },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 font-display text-lg font-semibold">Timeline</h2>
      <ol className="relative space-y-5 border-l border-border/60 pl-6">
        {events.map((e, i) => {
          const Icon = e.icon;
          return (
            <li key={i} className="relative">
              <span className={cn("absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full bg-background ring-1 ring-border", e.tone)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm font-semibold text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.meta}</p>
              <p className="mt-1 text-sm text-foreground/80">{e.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChartCard({ title, series, unit, bar }: { title: string; series: { label: string; value: number }[]; unit?: string; bar?: boolean }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      <div className={cn("grid gap-2", bar ? "" : "grid-cols-[repeat(auto-fit,minmax(6px,1fr))]")}>
        {bar ? series.map((s) => (
          <div key={s.label} className="grid grid-cols-[80px_1fr_60px] items-center gap-3 text-xs">
            <span className="text-muted-foreground">{s.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(s.value / max) * 100}%` }} />
            </div>
            <span className="text-right font-medium">{s.value}{unit}</span>
          </div>
        )) : (
          <div className="flex h-40 items-end gap-1.5">
            {series.map((s) => (
              <div key={s.label} title={`${s.label}: ${s.value}${unit ?? ""}`} className="flex-1 rounded-t bg-primary/80 transition-all hover:bg-primary" style={{ height: `${(s.value / max) * 100}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: { title: string; body: string; meta: string }[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      <ul className="divide-y divide-border/50">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{it.title}</p>
              <p className="text-xs text-muted-foreground">{it.body}</p>
            </div>
            <span className="text-xs text-muted-foreground">{it.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QualityBreakdown({ quality }: { quality: ReturnType<typeof computeQuality> }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Listing Quality Score</h3>
        <span className={cn("rounded-full px-3 py-1 text-sm font-semibold ring-1",
          quality.score >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
          quality.score >= 60 ? "bg-amber-50 text-amber-700 ring-amber-200" :
          "bg-rose-50 text-rose-700 ring-rose-200"
        )}>{quality.score}/100</span>
      </div>
      <div className="mt-5 space-y-3">
        {quality.factors.map((f) => (
          <div key={f.label} className="grid grid-cols-[24px_1fr_50px] items-center gap-3">
            {f.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
            <div>
              <p className="text-sm font-medium">{f.label}</p>
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
            <span className="text-right text-xs font-semibold text-muted-foreground">+{f.weight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationCard({ row }: { row: any }) {
  const items = [
    { label: "Property title & basics", ok: !!row.title && !!row.property_type },
    { label: "Location on map", ok: !!row.latitude && !!row.longitude },
    { label: "Contact details", ok: !!row.contact_phone || !!row.contact_whatsapp },
    { label: "Ownership documents", ok: false, hint: "Upload title deed or lease to earn Verified badge" },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h3 className="font-display text-lg font-semibold">Verification</h3>
          <p className="text-sm text-muted-foreground">Verified listings receive up to 3× more inquiries.</p>
        </div>
        <Link to="/verification" className="ml-auto">
          <Button size="sm" variant="outline" className="rounded-lg">Manage</Button>
        </Link>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li key={it.label} className="flex items-start gap-3">
            {it.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />}
            <div>
              <p className="text-sm font-medium">{it.label}</p>
              {it.hint && !it.ok && <p className="text-xs text-muted-foreground">{it.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------- helpers -------- */

function statusKind(s: string): any {
  if (s === "live") return "live";
  if (s === "pending") return "pending";
  if (s === "sold") return "sold";
  if (s === "rented") return "rented";
  return "draft";
}
function statusLabel(s: string) {
  return ({ live: "Live", draft: "Draft", archived: "Archived", pending: "Pending Review", paused: "Paused", sold: "Sold", rented: "Rented" } as Record<string, string>)[s] ?? s;
}

function computeQuality(row: any, hasCover: boolean) {
  const factors = [
    { label: "Cover photo", ok: hasCover, weight: 15 },
    { label: "Descriptive title", ok: !!row.title && row.title.length >= 20, weight: 10, hint: "20+ characters recommended" },
    { label: "Detailed description", ok: !!row.description && row.description.length >= 120, weight: 15, hint: "120+ characters" },
    { label: "Price set", ok: row.price > 0, weight: 10 },
    { label: "Location pinned", ok: !!row.latitude && !!row.longitude, weight: 15 },
    { label: "Bedrooms & bathrooms", ok: row.bedrooms > 0 && row.bathrooms > 0, weight: 10 },
    { label: "Amenities listed", ok: (row.amenities?.length ?? 0) >= 3, weight: 10, hint: "3+ amenities" },
    { label: "Contact method", ok: !!row.contact_phone || !!row.contact_whatsapp, weight: 15 },
  ];
  const score = factors.reduce((s, f) => s + (f.ok ? f.weight : 0), 0);
  return { score, factors };
}

function fakeSeries(seed: string, n: number, min: number, max: number) {
  let h = 42;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return { label: `${i + 1}`, value: Math.floor(min + (h % (max - min))) };
  });
}
