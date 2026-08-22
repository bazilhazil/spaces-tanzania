import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search, SlidersHorizontal, Plus, Grid3x3, Rows3, ChevronDown, X,
  Eye, Heart, MessageSquare, Calendar, Star, Sparkles, ShieldCheck,
  Edit3, Copy, Pause, Play, Trash2, BarChart3, Share2, Link2, Crown, MoreHorizontal,
  Home, CheckCircle2, CircleDot, Camera, FileText, Users, Briefcase, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, EmptyState, SkeletonCard } from "@/components/ds";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import {
  conversionRate, deletePropertyWithStorage, duplicateProperty, fetchPropertyMetricsBatch,
  type PropertyMetrics,
} from "@/lib/property-actions";
import {
  canEditListing, canManageLeads, canManageViewings, fetchMyAssignments, type AgentPermission,
} from "@/lib/property-agents";
import { AgentAccessDialog } from "./agent-access-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "./constants";
import { TZ_REGIONS } from "@/lib/tz-locations";

export type ManagedStatus =
  | "draft" | "live" | "archived" | "pending" | "paused" | "sold" | "rented" | "rejected";

export type ManagedProperty = {
  id: string;
  public_id: string;
  owner_id: string;
  title: string;
  region: string | null;
  district: string | null;
  ward: string | null;
  price: number;
  currency: string;
  status: ManagedStatus;
  listing_type: "rent" | "sale";
  property_type: string;
  view_count: number;
  created_at: string;
  cover?: string;
  favorites?: number;
  messages?: number;
  viewings?: number;
  leads?: number;
  deals?: number;
  activeDeal?: boolean;
  conversion?: number;
  quality?: number;
  verified?: boolean;
  featured?: boolean;
  premium?: boolean;
  /** Set when the listing is not owned by the signed-in user but assigned to them. */
  assignedPermission?: AgentPermission;
};

type SortKey = "newest" | "oldest" | "views_desc" | "views_asc" | "price_desc" | "price_asc";

const STATUS_TABS: { key: string; labelKey: string }[] = [
  { key: "all", labelKey: "spaces.status.all" },
  { key: "live", labelKey: "spaces.status.live" },
  { key: "pending", labelKey: "spaces.status.pending" },
  { key: "draft", labelKey: "spaces.status.draft" },
  { key: "paused", labelKey: "spaces.status.paused" },
  { key: "sold", labelKey: "spaces.status.sold" },
  { key: "rented", labelKey: "spaces.status.rented" },
  { key: "rejected", labelKey: "spaces.status.rejected" },
  { key: "archived", labelKey: "spaces.status.archived" },
];


export function PropertiesManager() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ManagedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [agentDialog, setAgentDialog] = useState<ManagedProperty | null>(null);
  const [filters, setFilters] = useState<{
    region?: string; district?: string; type?: string; listing?: string;
    verified?: boolean; featured?: boolean; premium?: boolean; unverified?: boolean;
    performance?: "top" | "low" | "no_leads" | "";
    minPrice?: string; maxPrice?: string; from?: string; to?: string;
  }>({});

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      // Owners see their own spaces; agents also see every space assigned to them.
      const assignments = await fetchMyAssignments(user.id);
      const assignedIds = Object.keys(assignments);
      const cols =
        "id,owner_id,title,region,district,ward,price,currency,status,view_count,created_at,listing_type,property_type,verified,featured";
      const [ownedRes, assignedRes] = await Promise.all([
        supabase.from("properties").select(cols).eq("owner_id", user.id).order("created_at", { ascending: false }),
        assignedIds.length
          ? supabase.from("properties").select(cols).in("id", assignedIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const byId = new Map<string, any>();
      for (const p of ((ownedRes as any).data ?? []) as any[]) byId.set(p.id, p);
      for (const p of ((assignedRes as any).data ?? []) as any[]) if (!byId.has(p.id)) byId.set(p.id, p);
      const list = [...byId.values()];
      const ids = list.map((p) => p.id);
      const covers: Record<string, string> = {};
      let metrics: Record<string, PropertyMetrics> = {};
      if (ids.length) {
        const [mediaRes, metricsRes] = await Promise.all([
          supabase
            .from("property_media")
            .select("property_id,storage_path,is_cover,position")
            .in("property_id", ids)
            .order("position"),
          fetchPropertyMetricsBatch(ids),
        ]);
        metrics = metricsRes;
        const chosen: Record<string, string> = {};
        for (const m of mediaRes.data ?? []) {
          if (!chosen[m.property_id] || m.is_cover) chosen[m.property_id] = m.storage_path;
        }
        for (const [pid, path] of Object.entries(chosen)) {
          const url = await signedUrl(path);
          if (url) covers[pid] = url;
        }
      }
      if (!alive) return;
      setRows(list.map((p) => {
        const m = metrics[p.id];
        return {
          ...p,
          public_id: publicIdFrom(p.id, p.created_at),
          cover: covers[p.id],
          view_count: m?.views ?? p.view_count ?? 0,
          favorites: m?.favorites ?? 0,
          messages: m?.messages ?? 0,
          viewings: m?.bookings ?? 0,
          leads: m?.leads ?? 0,
          deals: m?.deals ?? 0,
          activeDeal: m?.activeDeal ?? false,
          conversion: m ? conversionRate(m) : 0,
          quality: 55 + (mulberry(p.id, 11) % 45),
          verified: !!p.verified,
          featured: !!p.featured,
          premium: false,
          assignedPermission: p.owner_id === user.id ? undefined : assignments[p.id],
        } as ManagedProperty;
      }));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (tab !== "all") out = out.filter((r) => r.status === tab);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.public_id.toLowerCase().includes(q) ||
        (r.region ?? "").toLowerCase().includes(q) ||
        (r.district ?? "").toLowerCase().includes(q) ||
        (r.ward ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    }
    if (filters.region) out = out.filter((r) => r.region === filters.region);
    if (filters.district) out = out.filter((r) => r.district === filters.district);
    if (filters.type) out = out.filter((r) => r.property_type === filters.type);
    if (filters.listing) out = out.filter((r) => r.listing_type === filters.listing);
    if (filters.verified) out = out.filter((r) => r.verified);
    if (filters.unverified) out = out.filter((r) => !r.verified);
    if (filters.featured) out = out.filter((r) => r.featured);
    if (filters.premium) out = out.filter((r) => r.premium);
    if (filters.performance === "top") out = out.filter((r) => (r.conversion ?? 0) >= 5);
    if (filters.performance === "low") out = out.filter((r) => (r.view_count ?? 0) < 10);
    if (filters.performance === "no_leads") out = out.filter((r) => (r.leads ?? 0) === 0);
    if (filters.minPrice) out = out.filter((r) => r.price >= Number(filters.minPrice));
    if (filters.maxPrice) out = out.filter((r) => r.price <= Number(filters.maxPrice));
    if (filters.from) out = out.filter((r) => new Date(r.created_at) >= new Date(filters.from!));
    if (filters.to) out = out.filter((r) => new Date(r.created_at) <= new Date(filters.to!));

    switch (sort) {
      case "oldest": out.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); break;
      case "views_desc": out.sort((a, b) => b.view_count - a.view_count); break;
      case "views_asc": out.sort((a, b) => a.view_count - b.view_count); break;
      case "price_desc": out.sort((a, b) => b.price - a.price); break;
      case "price_asc": out.sort((a, b) => a.price - b.price); break;
      default: out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return out;
  }, [rows, tab, query, sort, filters]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  function toggleAll(check: boolean) {
    if (check) setSelected(new Set(filtered.map((r) => r.id)));
    else setSelected(new Set());
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function performDelete(ids: string[]) {
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => deletePropertyWithStorage(id)));
    } catch (e: any) {
      return toast.error(e?.message ?? "Delete failed");
    }
    const set = new Set(ids);
    setRows((r) => r.filter((x) => !set.has(x.id)));
    setSelected((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
    toast.success(`Deleted ${ids.length} propert${ids.length === 1 ? "y" : "ies"}`);
  }

  async function bulk(action: "delete" | "pause" | "resume" | "archive" | "promote") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete") {
      setConfirmDelete({ ids, label: `${ids.length} propert${ids.length === 1 ? "y" : "ies"}` });
      return;
    }
    if (action === "archive") {
      const { error } = await supabase.from("properties").update({ status: "archived" as const }).in("id", ids);
      if (error) return toast.error(error.message);
      setRows((r) => r.map((x) => (selected.has(x.id) ? { ...x, status: "archived" } : x)));
      setSelected(new Set());
      toast.success(`Archived ${ids.length}`);
      return;
    }
    if (action === "pause" || action === "resume") {
      const next = action === "pause" ? "paused" : "live";
      const { error } = await supabase.from("properties").update({ status: next as never }).in("id", ids);
      if (error) return toast.error(error.message);
      setRows((r) => r.map((x) => (selected.has(x.id) ? { ...x, status: next as never } : x)));
      setSelected(new Set());
      toast.success(`${action === "pause" ? "Paused" : "Resumed"} ${ids.length}`);
      return;
    }
    if (action === "promote") {
      toast.info("Promotion checkout coming soon");
    }
  }

  async function onCardAction(a: CardAction, p: ManagedProperty) {
    if (a === "edit" || a === "photos" || a === "details") {
      const tab = a === "photos" ? "photos" : a === "details" ? "details" : undefined;
      console.log("Edit source:", `manager card (${a})`);
      console.log("Navigating to:", `/dashboard/properties/${p.id}/manage`, tab ?? "");
      navigate({
        to: "/dashboard/properties/$id/manage",
        params: { id: p.id },
        search: tab ? { tab } : {},
      });
      return;
    }
    if (a === "view") {
      navigate({ to: "/properties/$slug", params: { slug: p.id } });
      return;
    }
    if (a === "leads") {
      navigate({ to: "/leads", search: { property: p.id } as never });
      return;
    }
    if (a === "viewings") {
      navigate({ to: "/viewings", search: { property: p.id } as never });
      return;
    }
    if (a === "agents") {
      setAgentDialog(p);
      return;
    }
    if (a === "delete") {
      setConfirmDelete({ ids: [p.id], label: `"${p.title}"` });
      return;
    }
    if (a === "duplicate") {
      const tid = toast.loading(t("spaces.toast.duplicating"));
      try {
        const newId = await duplicateProperty(p.id);
        toast.dismiss(tid);
        toast.success(t("spaces.toast.duplicated"));
        navigate({ to: "/dashboard/properties/$id/manage", params: { id: newId }, search: {} });
      } catch (e: any) {
        toast.dismiss(tid);
        toast.error(e?.message ?? t("spaces.toast.duplicateFailed"));
      }
      return;
    }
    if (a.startsWith("status:")) {
      const next = a.split(":")[1] as ManagedProperty["status"];
      const { error } = await supabase.from("properties").update({ status: next as never }).eq("id", p.id);
      if (error) return toast.error(error.message);
      setRows((r) => r.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      toast.success(t("spaces.toast.statusChanged", { status: statusLabel(next) }));
      return;
    }
    await handleCardAction(a, p, rows, setRows, setSelected);
  }

  const hasFilters =
    !!filters.region || !!filters.district || !!filters.type || !!filters.listing ||
    !!filters.verified || !!filters.unverified || !!filters.featured || !!filters.premium ||
    !!filters.performance || !!filters.minPrice || !!filters.maxPrice || !!filters.from || !!filters.to;

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      {/* Quick actions */}
      <div className="-mx-1 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to="/upload" className="shrink-0">
          <Button className="h-10 gap-2 rounded-xl"><Plus className="h-4 w-4" /> {t("spaces.quick.addSpace")}</Button>
        </Link>
        <Link to="/leads" className="shrink-0">
          <Button variant="outline" className="h-10 gap-2 rounded-xl"><Users className="h-4 w-4" /> {t("spaces.quick.leads")}</Button>
        </Link>
        <Link to="/viewings" className="shrink-0">
          <Button variant="outline" className="h-10 gap-2 rounded-xl"><Calendar className="h-4 w-4" /> {t("spaces.quick.viewings")}</Button>
        </Link>
        <Link to="/messages" className="shrink-0">
          <Button variant="outline" className="h-10 gap-2 rounded-xl"><MessageSquare className="h-4 w-4" /> {t("spaces.quick.messages")}</Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">

            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("spaces.searchPlaceholder")}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button
            variant="outline"
            className={cn("h-11 gap-2 rounded-xl", hasFilters && "border-primary/60 text-primary")}
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="h-4 w-4" /> {t("spaces.filters")}
            {hasFilters && <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{Object.values(filters).filter(Boolean).length}</span>}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 rounded-xl">
                {t("spaces.sort.label")} <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(["newest", "oldest", "views_desc", "views_asc", "price_desc", "price_asc"] as SortKey[]).map((k) => (
                <DropdownMenuItem key={k} onClick={() => setSort(k)}>
                  {sort === k && <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-primary" />}
                  <span className={cn(sort !== k && "pl-6")}>{t(`spaces.sort.${k}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden sm:flex rounded-xl border border-border bg-background p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={cn("grid h-10 w-10 place-items-center rounded-lg transition", view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={cn("grid h-10 w-10 place-items-center rounded-lg transition", view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="-mx-1 flex w-full max-w-full gap-1.5 overflow-x-auto whitespace-nowrap px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {STATUS_TABS.map((s) => {
            const active = tab === s.key;
            const n = counts[s.key] ?? 0;
            return (
              <button
                key={s.key}
                onClick={() => setTab(s.key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium ring-1 transition-colors max-md:px-3 max-md:py-1",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background text-foreground/70 ring-border hover:bg-accent"
                )}
              >
                {t(s.labelKey)} <span className={cn("ml-1 rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-primary-foreground/20" : "bg-secondary text-muted-foreground")}>{n}</span>
              </button>
            );
          })}
        </div>


        {showFilters && (
          <FiltersPanel
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters({})}
          />
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
          <Checkbox checked={selected.size === filtered.length} onCheckedChange={(v) => toggleAll(!!v)} />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => bulk("resume")}><Play className="mr-1 h-3.5 w-3.5" /> Resume</Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => bulk("pause")}><Pause className="mr-1 h-3.5 w-3.5" /> Pause</Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => bulk("archive")}><Home className="mr-1 h-3.5 w-3.5" /> Archive</Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => bulk("promote")}><Crown className="mr-1 h-3.5 w-3.5" /> Promote</Button>
            <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => bulk("delete")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className={cn("grid gap-4", view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyPropertiesIllustration />
        ) : (
          <EmptyState
            icon={Search}
            title={t("spaces.empty.noMatchesTitle")}
            description={t("spaces.empty.noMatchesDesc")}
          />
        )
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyManageCard
              key={p.id}
              p={p}
              selected={selected.has(p.id)}
              onSelect={() => toggleOne(p.id)}
              onAction={(a) => onCardAction(a, p)}
            />
          ))}
        </div>
      ) : (
        <PropertyManageTable
          rows={filtered}
          selected={selected}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onAction={(a, p) => onCardAction(a, p)}
        />
      )}

      {agentDialog && user && (
        <AgentAccessDialog
          open={!!agentDialog}
          onOpenChange={(v) => !v && setAgentDialog(null)}
          propertyId={agentDialog.id}
          propertyTitle={agentDialog.title}
          ownerId={user.id}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle className="sr-only">{t("spaces.deleteTitle", { label: confirmDelete?.label ?? "" })}</AlertDialogTitle>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("spaces.deleteTitle", { label: confirmDelete?.label ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("spaces.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const ids = confirmDelete?.ids ?? [];
                setConfirmDelete(null);
                await performDelete(ids);
              }}
            >
              {t("spaces.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------ card ------------------------------ */

export type CardAction =
  | "view" | "edit" | "photos" | "details" | "duplicate" | "pause" | "resume" | "delete"
  | "share" | "copy" | "promote" | "analytics" | "leads" | "viewings" | "agents"
  | `status:${ManagedProperty["status"]}`;

const STATUS_CHOICES: ManagedStatus[] = [
  "draft", "pending", "live", "paused", "sold", "rented", "rejected", "archived",
];


function PropertyManageCard({
  p, selected, onSelect, onAction,
}: {
  p: ManagedProperty;
  selected: boolean;
  onSelect: () => void;
  onAction: (a: CardAction) => void;
}) {
  const { t } = useI18n();
  const canEdit = !p.assignedPermission || canEditListing(p.assignedPermission);
  const location = [p.ward, p.district, p.region].filter(Boolean).join(", ") || "Tanzania";
  const dateStr = new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const qualityTone =
    (p.quality ?? 0) >= 80 ? "text-emerald-600 bg-emerald-500/10 ring-emerald-500/20"
      : (p.quality ?? 0) >= 60 ? "text-amber-600 bg-amber-500/10 ring-amber-500/20"
      : "text-rose-600 bg-rose-500/10 ring-rose-500/20";

  return (
    <div className={cn(
      "property-card-mobile group relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-background shadow-[var(--shadow-soft)] transition-all box-border",
      selected ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
    )}>

      {/* Media */}
      <div className="property-card-media relative block w-full max-w-full overflow-hidden bg-muted md:aspect-[16/10]">
        <Link to="/properties/$slug" params={{ slug: p.id }} aria-label={`Open ${p.title}`} className="absolute inset-0 z-0 block">
          {p.cover ? (
            <img src={p.cover} alt={p.title} loading="lazy" className="property-card-image h-full w-full object-cover object-center transition-transform duration-500 md:group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40"><Home className="h-10 w-10 max-md:h-8 max-md:w-8" /></div>
          )}
        </Link>


        {/* selection */}
        <label className={cn(
          "absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-md bg-background/90 shadow ring-1 ring-border backdrop-blur transition",
          "max-md:left-2 max-md:top-2 max-md:h-6 max-md:w-6",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}>
          <Checkbox checked={selected} onCheckedChange={() => onSelect()} />
        </label>

        {/* badges */}
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5 max-md:right-2 max-md:top-2 max-md:gap-1">
          {p.premium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow max-md:px-1.5 max-md:py-0 max-md:text-[9px]">
              <Crown className="h-3 w-3 max-md:h-2.5 max-md:w-2.5" /> Premium
            </span>
          )}
          {p.featured && !p.premium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground max-md:px-1.5 max-md:py-0 max-md:text-[9px]">
              <Sparkles className="h-3 w-3 max-md:h-2.5 max-md:w-2.5" /> Featured
            </span>
          )}
          {p.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white max-md:px-1.5 max-md:py-0 max-md:text-[9px]">
              <ShieldCheck className="h-3 w-3 max-md:h-2.5 max-md:w-2.5" /> Verified
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 max-md:bottom-2 max-md:left-2">
          <StatusBadge kind={statusToKind(p.status)} label={statusLabel(p.status)} className="max-md:px-1.5 max-md:py-0 max-md:text-[10px]" />
        </div>
        <div className="absolute bottom-3 right-3 max-md:bottom-2 max-md:right-3 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur max-md:text-[10px]">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.view_count.toLocaleString()}</span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4 max-md:space-y-2 max-md:p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground max-md:text-[9px]">{p.public_id}</p>
            <Link to="/properties/$slug" params={{ slug: p.id }} className="mt-0.5 block line-clamp-1 font-display text-base font-semibold text-foreground hover:text-primary transition-colors max-md:text-sm">
              {p.title}
            </Link>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground max-md:text-[11px]">{location}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="More actions" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground max-md:h-7 max-md:w-7">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <CardMenu p={p} onAction={onAction} />
          </DropdownMenu>
        </div>

        <div className="flex items-end justify-between">
          <p className="font-display text-lg font-semibold text-primary max-md:text-base">
            {p.currency} {p.price.toLocaleString()}
            {p.listing_type === "rent" && <span className="ml-1 text-xs font-normal text-muted-foreground max-md:text-[10px]">/mo</span>}
          </p>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 max-md:px-1.5 max-md:py-0 max-md:text-[10px]", qualityTone)}>
            <Star className="h-3 w-3" /> {p.quality}
          </span>
        </div>

        {/* Performance — 2×2 on mobile, 3 columns on desktop */}
        <div className="grid grid-cols-2 gap-1 border-t border-border/50 pt-3 sm:grid-cols-3 sm:border-t-0 sm:pt-0">
          <Metric icon={Eye} value={p.view_count} label={t("spaces.metric.views")} />
          <Metric icon={Heart} value={p.favorites ?? 0} label={t("spaces.metric.saves")} />
          <Metric icon={Users} value={p.leads ?? 0} label={t("spaces.metric.leads")} />
          <Metric icon={Calendar} value={p.viewings ?? 0} label={t("spaces.metric.viewings")} />
          <Metric icon={MessageSquare} value={p.messages ?? 0} label={t("spaces.metric.messages")} />
          <Metric icon={BarChart3} value={p.conversion ?? 0} label={t("spaces.metric.conversion")} suffix="%" />
        </div>

        {(p.activeDeal || p.assignedPermission) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {p.activeDeal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Briefcase className="h-3 w-3" /> {t("spaces.activeDeal")}
              </span>
            )}
            {p.assignedPermission && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserCog className="h-3 w-3" /> {t(`spaces.agents.permission.${p.assignedPermission}`)}
              </span>
            )}
          </div>
        )}

        {/* Mobile quick actions — equal width View / Edit + full action sheet */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <Button variant="outline" className="h-10 w-full rounded-lg text-xs" onClick={() => onAction("view")}>
            <Eye className="mr-1.5 h-4 w-4" /> {t("spaces.actions.view")}
          </Button>
          {canEdit ? (
            <Button className="h-10 w-full rounded-lg text-xs" onClick={() => onAction("edit")}>
              <Edit3 className="mr-1.5 h-4 w-4" /> {t("spaces.actions.edit")}
            </Button>
          ) : (
            <Button variant="outline" className="h-10 w-full rounded-lg text-xs" onClick={() => onAction("share")}>
              <Share2 className="mr-1.5 h-4 w-4" /> {t("spaces.actions.share")}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground max-md:text-[10px]">
          <span>{t("spaces.listedOn", { date: dateStr })}</span>
          <Link
            to="/property/$id"
            params={{ id: p.id }}
            className="hidden md:inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {t("spaces.actions.performance")} <BarChart3 className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}


function Metric({ icon: Icon, value, label, suffix }: { icon: any; value: number; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-secondary/40 py-1.5 max-md:py-1">
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground max-md:text-xs">
        <Icon className="h-3 w-3 text-muted-foreground" /> {value}{suffix ?? ""}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground max-md:text-[9px]">{label}</span>
    </div>
  );
}


function CardMenu({ p, onAction }: { p: ManagedProperty; onAction: (a: CardAction) => void }) {
  const { t } = useI18n();
  const isLive = p.status === "live";
  const assigned = p.assignedPermission;
  const isOwner = !assigned;
  const mayEdit = isOwner || canEditListing(assigned);
  const mayLeads = isOwner || canManageLeads(assigned);
  const mayViewings = isOwner || canManageViewings(assigned);
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onClick={() => onAction("view")}><Eye className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.view")}</DropdownMenuItem>
      {mayEdit && <DropdownMenuItem onClick={() => onAction("edit")}><Edit3 className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.edit")}</DropdownMenuItem>}
      {mayEdit && <DropdownMenuItem onClick={() => onAction("photos")}><Camera className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.photos")}</DropdownMenuItem>}
      {mayEdit && <DropdownMenuItem onClick={() => onAction("details")}><FileText className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.details")}</DropdownMenuItem>}
      <DropdownMenuSeparator />
      {mayLeads && <DropdownMenuItem onClick={() => onAction("leads")}><Users className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.leads")}</DropdownMenuItem>}
      {mayViewings && <DropdownMenuItem onClick={() => onAction("viewings")}><Calendar className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.viewings")}</DropdownMenuItem>}
      <DropdownMenuItem onClick={() => onAction("analytics")}><BarChart3 className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.performance")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction("share")}><Share2 className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.share")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("copy")}><Link2 className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.copyLink")}</DropdownMenuItem>
      {isOwner && (
        <>
          <DropdownMenuItem onClick={() => onAction("duplicate")}><Copy className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.duplicate")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("agents")}><UserCog className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.agentAccess")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("promote")}><Crown className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.promote")}</DropdownMenuItem>
        </>
      )}
      {mayEdit && (
        <>
          <DropdownMenuSeparator />
          {isLive ? (
            <DropdownMenuItem onClick={() => onAction("pause")}><Pause className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.pause")}</DropdownMenuItem>
          ) : p.status === "paused" || p.status === "draft" ? (
            <DropdownMenuItem onClick={() => onAction("resume")}><Play className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.resume")}</DropdownMenuItem>
          ) : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><CircleDot className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.changeStatus")}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              {STATUS_CHOICES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={p.status === s}
                  onClick={() => onAction(`status:${s}` as CardAction)}
                >
                  {p.status === s && <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-primary" />}
                  <span className={cn(p.status !== s && "pl-6")}>{t(`spaces.status.${s}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </>
      )}
      {isOwner && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onAction("delete")}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> {t("spaces.actions.delete")}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
}


/* ------------------------------ list view ------------------------------ */

function PropertyManageTable({
  rows, selected, onToggle, onToggleAll, onAction,
}: {
  rows: ManagedProperty[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (v: boolean) => void;
  onAction: (a: CardAction, p: ManagedProperty) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="grid grid-cols-[36px_1fr_120px_120px_100px_100px_40px] items-center gap-3 border-b border-border/60 bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={(v) => onToggleAll(!!v)} />
        <span>Property</span>
        <span>Status</span>
        <span>Price</span>
        <span className="text-right">Views</span>
        <span className="text-right">Quality</span>
        <span></span>
      </div>
      {rows.map((p) => (
        <div key={p.id} className={cn(
          "grid grid-cols-[36px_1fr_120px_120px_100px_100px_40px] items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0 transition-colors hover:bg-secondary/30",
          selected.has(p.id) && "bg-primary/5",
        )}>
          <Checkbox checked={selected.has(p.id)} onCheckedChange={() => onToggle(p.id)} />
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {p.cover ? <img src={p.cover} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground/40"><Home className="h-4 w-4" /></div>}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.public_id} • {[p.district, p.region].filter(Boolean).join(", ") || "TZ"}</p>
            </div>
          </div>
          <StatusBadge kind={statusToKind(p.status)} label={statusLabel(p.status)} />
          <span className="text-sm font-medium">{p.currency} {p.price.toLocaleString()}</span>
          <span className="text-right text-sm">{p.view_count}</span>
          <span className="text-right text-sm">{p.quality}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <CardMenu p={p} onAction={(a) => onAction(a, p)} />
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ filters ------------------------------ */

function FiltersPanel({
  filters, onChange, onClear,
}: {
  filters: any;
  onChange: (f: any) => void;
  onClear: () => void;
}) {
  const set = (k: string, v: any) => onChange({ ...filters, [k]: v });
  const districts = useMemo(() => {
    if (!filters.region) return [];
    return TZ_REGIONS.find((r) => r.name === filters.region)?.districts.map((d) => d.name) ?? [];
  }, [filters.region]);
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)] animate-fade-in">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <FilterSelect label="Region" value={filters.region ?? ""} onChange={(v) => onChange({ ...filters, region: v || undefined, district: undefined })}
          options={[{ v: "", l: "All regions" }, ...TZ_REGIONS.map((r) => ({ v: r.name, l: r.name }))]} />
        <FilterSelect label="District" value={filters.district ?? ""} onChange={(v) => set("district", v || undefined)}
          options={[{ v: "", l: "All districts" }, ...districts.map((d) => ({ v: d, l: d }))]} disabled={!filters.region} />
        <FilterSelect label="Property Type" value={filters.type ?? ""} onChange={(v) => set("type", v || undefined)}
          options={[{ v: "", l: "Any type" }, ...PROPERTY_TYPES.map((t) => ({ v: t, l: cap(t) }))]} />
        <FilterSelect label="Listing" value={filters.listing ?? ""} onChange={(v) => set("listing", v || undefined)}
          options={[{ v: "", l: "Rent & Sale" }, { v: "rent", l: "For Rent" }, { v: "sale", l: "For Sale" }]} />

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Price (TZS)</label>
          <div className="flex gap-2">
            <Input type="number" placeholder="Min" value={filters.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} className="rounded-lg" />
            <Input type="number" placeholder="Max" value={filters.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} className="rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date range</label>
          <div className="flex gap-2">
            <Input type="date" value={filters.from ?? ""} onChange={(e) => set("from", e.target.value)} className="rounded-lg" />
            <Input type="date" value={filters.to ?? ""} onChange={(e) => set("to", e.target.value)} className="rounded-lg" />
          </div>
        </div>

        <div className="col-span-full flex flex-wrap items-center gap-2 pt-1">
          <FilterChip label="Verified" active={!!filters.verified} onClick={() => set("verified", !filters.verified)} icon={ShieldCheck} />
          <FilterChip label="Featured" active={!!filters.featured} onClick={() => set("featured", !filters.featured)} icon={Sparkles} />
          <FilterChip label="Premium" active={!!filters.premium} onClick={() => set("premium", !filters.premium)} icon={Crown} />
          <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> Clear all
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function FilterChip({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: any }) {
  return (
    <button onClick={onClick} className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
      active ? "bg-primary text-primary-foreground ring-primary" : "bg-background text-foreground/70 ring-border hover:bg-accent",
    )}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/* ------------------------------ empty ------------------------------ */

function EmptyPropertiesIllustration() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-gradient-to-br from-secondary/40 to-background p-10 text-center animate-fade-in">
      <div className="mx-auto flex h-40 w-40 items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="hsl(var(--primary))" />
              <stop offset="1" stopColor="hsl(var(--primary) / 0.6)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="110" r="80" fill="hsl(var(--primary) / 0.06)" />
          <path d="M40 110 L100 55 L160 110 L160 165 L40 165 Z" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="2" />
          <path d="M40 110 L100 55 L160 110 Z" fill="url(#roof)" />
          <rect x="85" y="120" width="30" height="45" rx="3" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          <rect x="55" y="125" width="20" height="20" rx="2" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" />
          <rect x="125" y="125" width="20" height="20" rx="2" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" />
          <circle cx="145" cy="65" r="10" fill="hsl(var(--gold, 45 90% 55%))" opacity="0.85" />
          <path d="M145 55 L145 45 M155 65 L165 65 M138 58 L131 51 M152 58 L159 51" stroke="hsl(var(--gold, 45 90% 55%))" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">{t("spaces.empty.title")}</h3>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("spaces.empty.desc")}</p>
      <Link to="/upload" className="mt-6 inline-block">
        <Button size="lg" className="h-12 gap-2 rounded-xl px-6 text-base shadow-[var(--shadow-elevated)]">
          <Plus className="h-4 w-4" /> {t("spaces.empty.cta")}
        </Button>
      </Link>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function statusToKind(s: string): any {
  switch (s) {
    case "live": return "live";
    case "pending": return "pending";
    case "sold": return "sold";
    case "rented": return "rented";
    case "rejected": return "pending";
    case "paused": return "draft";
    case "archived": return "draft";
    case "draft":
    default: return "draft";
  }
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    live: "Published", draft: "Draft", archived: "Unavailable",
    pending: "Pending Review", paused: "Paused", sold: "Sold",
    rented: "Rented", rejected: "Rejected",
  };
  return map[s] ?? s;
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function publicIdFrom(uuid: string, createdAt: string): string {
  const y = new Date(createdAt).getFullYear().toString().slice(-2);
  const hex = uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `SP-${y}-${hex}`;
}

function mulberry(seed: string, salt: number) {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function handleCardAction(
  a: CardAction,
  p: ManagedProperty,
  rows: ManagedProperty[],
  setRows: (fn: (r: ManagedProperty[]) => ManagedProperty[]) => void,
  setSelected: (fn: (s: Set<string>) => Set<string>) => void,
) {
  const url = `${window.location.origin}/properties/${p.id}`;
  switch (a) {
    case "view":
      window.open(url, "_blank");
      break;
   case "edit": {
     const destination = `/dashboard/properties/${p.id}/manage`;
     console.log("Edit source:", "properties manager card");
     console.log("Navigating to:", destination);
     window.location.assign(destination);
   break;
   }
    case "duplicate":
      toast.info("Duplicating listing…");
      break;
    case "pause":
    case "resume": {
      const next = a === "pause" ? "paused" : "live";
      const { error } = await supabase.from("properties").update({ status: next as never }).eq("id", p.id);
      if (error) return toast.error(error.message);
      setRows((r) => r.map((x) => (x.id === p.id ? { ...x, status: next as never } : x)));
      toast.success(a === "pause" ? "Paused" : "Resumed");
      break;
    }
    case "delete":
      if (!confirm(`Delete "${p.title}"? Photos will be removed and this cannot be undone.`)) return;
      try {
        await deletePropertyWithStorage(p.id);
      } catch (e: any) {
        return toast.error(e?.message ?? "Delete failed");
      }
      setRows((r) => r.filter((x) => x.id !== p.id));
      setSelected((s) => { const n = new Set(s); n.delete(p.id); return n; });
      toast.success("Property deleted");
      break;
    case "share":
      if (navigator.share) {
        try { await navigator.share({ title: p.title, url }); } catch {}
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      break;
    case "copy":
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      break;
    case "promote":
      toast.info("Promotion checkout coming soon");
      break;
    case "analytics":
      window.location.href = `/property/${p.id}`;
      break;
  }
}
