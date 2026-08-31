import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { useAuth } from "@/hooks/use-auth";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useDashboardHome, type AttentionItem, type SpaceCard } from "@/hooks/use-dashboard-home";

import {
  Home, Upload, MessageSquare, Calendar, Heart, ShieldCheck, Handshake,
  BarChart3, Eye, Sparkles, ArrowUpRight, Contact, FileEdit, Bell, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user } = useAuth();
  const { mode, ready } = useMode();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = (profile?.full_name || user?.email || t("common.welcome")).split(" ")[0];

  // This route is a layout parent for /dashboard/properties, /dashboard/properties/:id/manage, etc.
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
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <header className="animate-fade-in">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t(greetingKey())}, {name} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`dashboard.roleTagline.${activeMode}`)}
          </p>
        </header>

        <ProfileCompletionCard />

        {activeMode === "buyer"
          ? <BuyerHome />
          : <OwnerAgentHome mode={activeMode} />}
      </div>
    </DashboardShell>
  );
}

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "dashboard.greetingMorning";
  if (h < 18) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

/* ------------------------------ Owner / Agent ----------------------------- */

function OwnerAgentHome({ mode }: { mode: "owner" | "agent" }) {
  const { t } = useI18n();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { attention, spaces, activity, loading } = useDashboardHome(mode);

  const noSpaces = !loading && spaces.length === 0;

  return (
    <>
      <StatsGrid
        loading={statsLoading}
        items={[
          {
            label: mode === "agent" ? t("dashboard.home.assignedSpaces") : t("dashboard.home.activeSpaces"),
            value: stats.listings, icon: Home, tone: "primary", to: "/dashboard/properties",
          },
          { label: t("dashboard.home.newLeads"), value: stats.activeInquiries, icon: Contact, tone: "amber", to: "/leads" },
          { label: t("dashboard.home.viewingRequests"), value: stats.viewings, icon: Calendar, tone: "violet", to: "/viewings" },
          { label: t("dashboard.home.activeDeals"), value: stats.activeDeals, icon: Handshake, tone: "emerald", to: "/deals" },
        ]}
      />

      {noSpaces ? (
        <section className="rounded-3xl border border-dashed border-border bg-background/60 p-8 text-center md:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Home className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
            {t("dashboard.home.emptySpacesTitle")}
          </h3>
          <Link to="/upload">
            <Button className="mt-5 gap-2 rounded-xl"><Upload className="h-4 w-4" /> {t("dashboard.home.listSpace")}</Button>
          </Link>
        </section>
      ) : (
        <>
          <AttentionCenter items={attention} loading={loading} />
          <QuickActions />
          <MySpaces spaces={spaces} loading={loading} />
        </>
      )}

      <RecentActivity items={activity} loading={loading} />

      {mode === "agent" && (
        <Link
          to="/dashboard/agent-performance"
          className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> {t("dashboard.side.agentPerformance")}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
    </>
  );
}

/* --------------------------------- Stats ---------------------------------- */

const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-600",   ring: "ring-amber-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-600",  ring: "ring-violet-500/20" },
};

type StatItem = {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  tone: string; to?: string;
};

function StatsGrid({ items, loading }: { items: StatItem[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {items.map((s) => {
        const Icon = s.icon; const tone = toneMap[s.tone] ?? toneMap.primary;
        const card = (
          <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] md:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground md:text-sm">{s.label}</p>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", tone.bg, tone.text, tone.ring)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {loading ? <span className="text-base font-normal text-muted-foreground">…</span> : s.value}
            </p>
          </div>
        );
        return s.to
          ? <Link key={s.label} to={s.to} className="block h-full">{card}</Link>
          : <div key={s.label}>{card}</div>;
      })}
    </div>
  );
}

/* ----------------------------- Action center ------------------------------ */

const ATTENTION_ICON: Record<AttentionItem["kind"], React.ComponentType<{ className?: string }>> = {
  lead: Contact,
  viewing: Calendar,
  deal: Handshake,
  verification: ShieldCheck,
  draft: FileEdit,
};

function AttentionCenter({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  const { t } = useI18n();
  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />;
  }
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
        {t("dashboard.home.attention")}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
          {t("dashboard.home.attentionNone")}
        </p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background">
          {items.slice(0, 6).map((a) => {
            const Icon = ATTENTION_ICON[a.kind];
            return (
              <div key={a.id} className="flex items-center gap-3 p-3 md:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t(`dashboard.home.need.${a.kind}`)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[a.title, a.detail].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Link to={a.to}>
                  <Button size="sm" variant="outline" className="rounded-lg">{t("dashboard.home.open")}</Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Quick actions ------------------------------ */

function QuickActions() {
  const { t } = useI18n();
  const actions: Array<{ label: string; to: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean }> = [
    { label: t("dashboard.home.listSpace"), to: "/upload", icon: Upload, primary: true },
    { label: t("dashboard.home.viewLeads"), to: "/leads", icon: Contact },
    { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
    { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.label} to={a.to}>
            <div className={cn(
              "flex h-full items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5",
              a.primary
                ? "border-primary/30 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-[var(--shadow-elevated)]"
                : "border-border/60 bg-background text-foreground hover:border-primary/40 hover:shadow-[var(--shadow-soft)]",
            )}>
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                a.primary ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary",
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-display text-sm font-semibold leading-tight">{a.label}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

/* -------------------------------- My Spaces -------------------------------- */

function statusChip(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    live:     { label: "Live",     cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" },
    draft:    { label: "Draft",    cls: "bg-muted text-muted-foreground ring-border" },
    pending:  { label: "Pending",  cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20" },
    paused:   { label: "Paused",   cls: "bg-slate-500/10 text-slate-600 ring-slate-500/20" },
    archived: { label: "Archived", cls: "bg-slate-500/10 text-slate-600 ring-slate-500/20" },
    sold:     { label: "Sold",     cls: "bg-primary/10 text-primary ring-primary/20" },
    rented:   { label: "Rented",   cls: "bg-violet-500/10 text-violet-600 ring-violet-500/20" },
  };
  const m = map[status] ?? map.draft;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", m.cls)}>{m.label}</span>;
}

function MySpaces({ spaces, loading }: { spaces: SpaceCard[]; loading: boolean }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
          {t("dashboard.side.myProperties")}
        </h2>
        <Link to="/dashboard/properties" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t("dashboard.home.viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.slice(0, 3).map((p) => <SpaceMiniCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}

function SpaceMiniCard({ p }: { p: SpaceCard }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="group overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {p.cover ? (
          <img src={p.cover} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50"><Home className="h-8 w-8" /></div>
        )}
        <div className="absolute left-3 top-3">{statusChip(p.status)}</div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">{p.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{p.location}</p>
        <p className="font-display text-sm font-semibold text-primary">
          {p.currency} {p.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {p.leads}</span>
        </div>
        <Button
          variant="outline"
          className="mt-1 w-full rounded-xl"
          onClick={() => navigate({ to: "/dashboard/properties/$id/manage", params: { id: p.id } })}
        >
          {t("dashboard.home.manage")}
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- Recent activity ----------------------------- */

function RecentActivity({ items, loading }: { items: { id: string; title: string; body: string; at: string; link: string | null }[]; loading: boolean }) {
  const { t } = useI18n();
  if (loading) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
          {t("dashboard.home.recentActivity")}
        </h2>
        <Link to="/notifications" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t("dashboard.home.viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
          {t("dashboard.home.activityNone")}
        </p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 md:p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(n.at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------- Buyer ---------------------------------- */

function BuyerHome() {
  const { t } = useI18n();
  const { stats, loading } = useDashboardStats();
  const items: StatItem[] = [
    { label: t("dashboard.stats.favorites"), value: stats.favorites, icon: Heart, tone: "primary", to: "/dashboard/favorites" },
    { label: t("dashboard.stats.enquiries"), value: stats.activeInquiries, icon: Contact, tone: "emerald", to: "/leads" },
    { label: t("dashboard.side.viewings"), value: stats.viewings, icon: Calendar, tone: "amber", to: "/viewings" },
    { label: t("dashboard.stats.messages"), value: stats.unreadMessages, icon: MessageSquare, tone: "violet", to: "/messages" },
  ];
  return (
    <>
      <StatsGrid items={items} loading={loading} />
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">{t("dashboard.quick.buyerTitle")}</h3>
            <p className="text-primary-foreground/85">{t("dashboard.quick.buyerBody")}</p>
          </div>
          <Link to="/properties">
            <Button variant="secondary" className="gap-2 rounded-xl"><Sparkles className="h-4 w-4" /> {t("dashboard.quick.browse")}</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
