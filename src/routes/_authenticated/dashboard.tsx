import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { useAuth } from "@/hooks/use-auth";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import {
  Home, Upload, MessageSquare, Calendar, Heart, Users, ShieldCheck, DollarSign,
  BarChart3, Eye, Sparkles, ArrowUpRight, TrendingUp, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";
import { deletePropertyWithStorage } from "@/lib/property-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type OwnerStats = { active: number; views: number; inquiries: number; viewings: number };
type RecentProperty = {
  id: string; title: string; region: string | null; district: string | null;
  price: number; currency: string; status: string; view_count: number; cover?: string;
};

function DashboardPage() {
  const { profile, user } = useAuth();
  const { mode, ready } = useMode();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = (profile?.full_name || user?.email || t("common.welcome")).split(" ")[0];

  // This route is a layout parent for /dashboard/properties, /dashboard/properties/:id/manage, etc.
  // When a child route is active, render its <Outlet /> instead of the dashboard home content.
  if (pathname !== "/dashboard" && pathname !== "/dashboard/") {
    return <Outlet />;
  }

  if (ready && !mode) {
    if (typeof window !== "undefined") window.location.replace("/welcome");
    return null;
  }
  const activeMode: SpacesMode = mode ?? "buyer";

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
            {greeting()}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {greeting()}, {name} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here's what's happening with your SPACES today.
          </p>
        </header>

        <ProfileCompletionCard />

        {activeMode === "owner" ? <OwnerHome /> : <NonOwnerHome role={activeMode} />}
      </div>
    </DashboardShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function OwnerHome() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();
  const [recent, setRecent] = useState<RecentProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data: props } = await supabase
        .from("properties")
        .select("id,title,region,district,price,currency,status,view_count,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      const list = props ?? [];

      // Fetch cover for each
      const ids = list.map((p) => p.id);
      let coverByProp: Record<string, string> = {};
      if (ids.length) {
        const { data: media } = await supabase
          .from("property_media")
          .select("property_id,storage_path,is_cover,position")
          .in("property_id", ids)
          .order("position", { ascending: true });
        const chosen: Record<string, string> = {};
        for (const m of media ?? []) {
          if (chosen[m.property_id] && !m.is_cover) continue;
          if (!chosen[m.property_id] || m.is_cover) chosen[m.property_id] = m.storage_path;
        }
        for (const [pid, path] of Object.entries(chosen)) {
          const url = await signedUrl(path);
          if (url) coverByProp[pid] = url;
        }
      }

      if (!alive) return;
      setRecent(list.map((p) => ({ ...p, cover: coverByProp[p.id] })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  return (
    <>
      <StatsGrid
        loading={statsLoading}
        items={[
          { label: "Active Listings", value: stats.listings, icon: Home, delta: `${stats.totalListings} total`, tone: "primary", to: "/dashboard/properties" },
          { label: "Total Property Views", value: stats.propertyViews, icon: Eye, delta: "All listings", tone: "emerald", to: "/dashboard/properties" },
          { label: "New Inquiries", value: stats.activeInquiries, icon: MessageSquare, delta: `${stats.completedInquiries} completed`, tone: "amber", to: "/leads" },
          { label: "Scheduled Viewings", value: stats.viewings, icon: Calendar, delta: "Upcoming", tone: "violet", to: "/viewings" },
        ]}
      />


      <QuickActions />

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">My Properties</h2>
            <p className="text-sm text-muted-foreground">Your latest listings at a glance.</p>
          </div>
          <Link to="/dashboard/properties"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background/60 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Home className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No listings yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Publish your first property in under 3 minutes.
            </p>
            <Link to="/upload">
              <Button className="mt-5 rounded-xl gap-2"><Upload className="h-4 w-4" /> Upload Property</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => <PropertyMiniCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}

const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-600",   ring: "ring-amber-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-600",  ring: "ring-violet-500/20" },
};

type StatItem = {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  delta: string; tone: string; to?: string;
};

function StatsGrid({ items, loading }: { items: StatItem[]; loading?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => {
        const Icon = s.icon; const tone = toneMap[s.tone] ?? toneMap.primary;
        const card = (
          <div
            className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", tone.bg, tone.text, tone.ring)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
              {loading ? <span className="text-base font-normal text-muted-foreground">Loading…</span> : s.value}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> {s.delta}
            </div>
          </div>
        );
        return s.to
          ? <Link key={s.label} to={s.to} className="block h-full">{card}</Link>
          : <div key={s.label}>{card}</div>;
      })}
    </div>
  );
}


function QuickActions() {
  const actions: Array<{
    label: string; to: string; icon: React.ComponentType<{ className?: string }>;
    primary?: boolean; desc: string; params?: { section: string };
  }> = [
    { label: "Upload New Property", to: "/upload", icon: Upload, primary: true, desc: "List a new home in minutes" },
    { label: "View My Listings", to: "/dashboard/properties", icon: Home, desc: "Manage your portfolio" },
    { label: "Upgrade to Premium", to: "/dashboard/$section", params: { section: "subscription" }, icon: Crown, desc: "Boost visibility 5×" },
    { label: "Verify My Identity", to: "/dashboard/$section", params: { section: "profile" }, icon: ShieldCheck, desc: "Get the trusted badge" },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <div className={cn(
              "group relative flex h-full items-start gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5",
              a.primary
                ? "border-primary/30 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-[var(--shadow-elevated)]"
                : "border-border/60 bg-background text-foreground hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
            )}>
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                a.primary ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={cn("font-display text-sm font-semibold leading-tight", a.primary ? "text-primary-foreground" : "text-foreground")}>
                  {a.label}
                </p>
                <p className={cn("mt-0.5 text-xs", a.primary ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {a.desc}
                </p>
              </div>
            </div>
          );
          return a.params ? (
            <Link key={a.label} to={a.to} params={a.params}>{inner}</Link>
          ) : (
            <Link key={a.label} to={a.to}>{inner}</Link>
          );
        })}
      </div>
    </section>
  );
}

function statusChip(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    live:     { label: "Live",                 cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" },
    draft:    { label: "Draft",                cls: "bg-muted text-muted-foreground ring-border" },
    pending:  { label: "Pending Verification", cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20" },
    archived: { label: "Archived",             cls: "bg-slate-500/10 text-slate-600 ring-slate-500/20" },
    sold:     { label: "Sold",                 cls: "bg-primary/10 text-primary ring-primary/20" },
    rented:   { label: "Rented",               cls: "bg-violet-500/10 text-violet-600 ring-violet-500/20" },
  };
  const m = map[status] ?? map.draft;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", m.cls)}>{m.label}</span>;
}

export function PropertyMiniCard({ p }: { p: RecentProperty }) {
  const navigate = useNavigate();
  const location = [p.district, p.region].filter(Boolean).join(", ") || "Tanzania";
  return (
    <div className="group overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.cover ? (
          <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <Home className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-3 top-3">{statusChip(p.status)}</div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">{p.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{location}</p>
        <div className="flex items-center justify-between pt-1">
          <p className="font-display text-sm font-semibold text-primary">
            {p.currency} {p.price.toLocaleString()}
          </p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" /> {p.view_count}
          </p>
        </div>
        <div className="flex gap-2 border-t border-border/50 p-3">
          <button
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-white"
            onClick={() => navigate({ to: "/dashboard/properties/$id/manage", params: { id: p.id } })}
          >
            Edit
          </button>

          <button
            className="flex-1 rounded-lg border border-red-500 px-3 py-2 text-sm text-red-500"
            onClick={async () => {
              if (!confirm(`Delete "${p.title}"?`)) return;

              try {
                await deletePropertyWithStorage(p.id);
                window.location.reload();
              } catch (e: any) {
                alert(e.message ?? "Delete failed");
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


function NonOwnerHome({ role }: { role: SpacesMode }) {
  const items = role === "agent"
    ? [
        { label: "Active Inquiries", value: 0, icon: Users, delta: "+0", tone: "primary" },
        { label: "Listings", value: 0, icon: Home, delta: "+0", tone: "emerald" },
        { label: "Deals", value: 0, icon: DollarSign, delta: "+0", tone: "amber" },
        { label: "Rating", value: "—", icon: BarChart3, delta: "—", tone: "violet" },
      ]
    : [

        { label: "Favorites", value: 0, icon: Heart, delta: "+0", tone: "primary" },
        { label: "Saved Searches", value: 0, icon: BarChart3, delta: "+0", tone: "emerald" },
        { label: "Viewings", value: 0, icon: Calendar, delta: "0 upcoming", tone: "amber" },
        { label: "Messages", value: 0, icon: MessageSquare, delta: "0 unread", tone: "violet" },
      ];
  return (
    <>
      <StatsGrid items={items} />
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Discover your next SPACE</h3>
            <p className="text-primary-foreground/85">Browse verified listings across Tanzania.</p>
          </div>
          <Link to="/properties">
            <Button variant="secondary" className="gap-2 rounded-xl"><Sparkles className="h-4 w-4" /> Browse</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
