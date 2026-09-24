import { NotificationBell } from "@/components/notification-bell";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Home, Upload, MessageSquare, Calendar, BarChart3, CreditCard, Settings,
  Heart, Search, User as UserIcon, Users, Briefcase, GitCompare, Clock, Contact,
  Menu, X, LogOut, FileEdit, LifeBuoy, ShieldCheck, Sparkles, Handshake, Trophy, Star, ShieldAlert, Bell,
  MoreHorizontal, ChevronDown, Building2, KeyRound,

} from "lucide-react";
import { hasTenancy, hasManagementAssignment } from "@/lib/management-db";
import { hasActiveManagement } from "@/lib/property-managers";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useI18n } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { avatarInitials } from "@/lib/display-name";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };

function useRoleNav(): Record<SpacesMode, Item[]> {
  const { t } = useI18n();
  return {
    owner: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      { label: t("dashboard.side.myProperties"), to: "/dashboard/properties", icon: Home },
      { label: t("dashboard.side.upload"), to: "/upload", icon: Upload },
      { label: t("mgmt.nav"), to: "/management", icon: Building2 },
      { label: t("dashboard.side.inquiries"), to: "/leads", icon: Contact },
      { label: t("dashboard.side.deals"), to: "/deals", icon: Handshake },
      { label: t("modeUi.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.reviews"), to: "/reviews", icon: Star },
      { label: t("modeUi.messages"), to: "/messages", icon: MessageSquare },
      { label: t("dashboard.side.notifications"), to: "/notifications", icon: Bell },
      { label: t("dashboard.side.safety"), to: "/dashboard/safety", icon: ShieldCheck },
      { label: t("dashboard.side.drafts"), to: "/dashboard/drafts", icon: FileEdit },
      { label: t("dashboard.side.performance"), to: "/dashboard/performance", icon: BarChart3 },
      { label: t("dashboard.side.verification"), to: "/verification", icon: ShieldCheck },
      { label: t("dashboard.side.trust"), to: "/trust", icon: Sparkles },
      { label: t("dashboard.side.billing"), to: "/billing", icon: CreditCard },
      { label: t("dashboard.side.paymentHistory"), to: "/billing/history", icon: Clock },
      { label: t("dashboard.side.subscription"), to: "/dashboard/subscription", icon: CreditCard },
      { label: t("dashboard.side.profile"), to: "/dashboard/profile", icon: UserIcon },
      { label: t("nav.settings"), to: "/dashboard/settings", icon: Settings },
      { label: t("dashboard.side.support"), to: "/dashboard/support", icon: LifeBuoy },
    ],
    buyer: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      { label: t("dashboard.side.deals"), to: "/deals", icon: Handshake },
    { label: t("dashboard.side.favorites"), to: "/dashboard/favorites", icon: Heart },
      { label: t("dashboard.side.savedSearches"), to: "/dashboard/searches", icon: Search },
      { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
      { label: t("dashboard.side.reviews"), to: "/reviews", icon: Star },
      { label: t("dashboard.side.notifications"), to: "/notifications", icon: Bell },
      { label: t("dashboard.side.safety"), to: "/dashboard/safety", icon: ShieldCheck },
      { label: t("dashboard.side.compare"), to: "/compare", icon: GitCompare },
      { label: t("dashboard.side.recent"), to: "/dashboard/recent", icon: Clock },
      { label: t("nav.profile"), to: "/dashboard/profile", icon: UserIcon },
      { label: t("nav.settings"), to: "/dashboard/settings", icon: Settings },
    ],
    agent: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      
      { label: t("dashboard.side.inquiries"), to: "/leads", icon: Contact },
      { label: t("dashboard.side.deals"), to: "/deals", icon: Handshake },
      { label: t("dashboard.side.properties"), to: "/dashboard/properties", icon: Briefcase },
      { label: t("mgmt.nav"), to: "/management", icon: Building2 },
      { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
      { label: t("dashboard.side.reviews"), to: "/reviews", icon: Star },
      { label: t("dashboard.side.notifications"), to: "/notifications", icon: Bell },
      { label: t("dashboard.side.safety"), to: "/dashboard/safety", icon: ShieldCheck },
      { label: t("dashboard.side.performance"), to: "/dashboard/performance", icon: BarChart3 },
      { label: t("dashboard.side.agentPerformance"), to: "/dashboard/agent-performance", icon: Trophy },
      { label: t("dashboard.side.businessIntelligence"), to: "/business-intelligence", icon: BarChart3 },
      { label: t("dashboard.side.verification"), to: "/verification", icon: ShieldCheck },
      { label: t("dashboard.side.trust"), to: "/trust", icon: Sparkles },
      { label: t("dashboard.side.billing"), to: "/billing", icon: CreditCard },
      { label: t("agency.nav"), to: "/agency", icon: Users },
      { label: t("nav.settings"), to: "/dashboard/settings", icon: Settings },
    ],
    manager: [
      { label: t("pm.myManagement"), to: "/management", icon: Building2 },
      { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
      { label: t("dashboard.side.notifications"), to: "/notifications", icon: Bell },
      { label: t("dashboard.side.favorites"), to: "/dashboard/favorites", icon: Heart },
      { label: t("dashboard.side.savedSearches"), to: "/dashboard/searches", icon: Search },
      { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.profile"), to: "/dashboard/profile", icon: UserIcon },
      { label: t("nav.settings"), to: "/dashboard/settings", icon: Settings },
      { label: t("dashboard.side.support"), to: "/dashboard/support", icon: LifeBuoy },
    ],
  };
}

/** Buying/renting links stay reachable from every workspace (under "More"). */
function useMarketplaceExtras(): Item[] {
  const { t } = useI18n();
  return [
    { label: t("dashboard.side.favorites"), to: "/dashboard/favorites", icon: Heart },
    { label: t("dashboard.side.savedSearches"), to: "/dashboard/searches", icon: Search },
  ];
}

/**
 * Everyday links stay visible; everything else collapses under "More" so the
 * sidebar stays simple for ordinary owners.
 */
const PRIMARY_PATHS: Record<SpacesMode, string[]> = {
  owner: ["/dashboard", "/dashboard/properties", "/management", "/upload", "/leads", "/viewings", "/messages", "/notifications"],
  buyer: ["/dashboard", "/deals", "/dashboard/favorites", "/dashboard/searches", "/viewings", "/messages", "/notifications"],
  agent: ["/dashboard", "/leads", "/deals", "/dashboard/properties", "/management", "/viewings", "/messages", "/notifications"],
  manager: ["/management", "/messages", "/notifications"],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, roles } = useAuth();
  const { mode, setMode } = useMode();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const NAV = useRoleNav();
  const extras = useMarketplaceExtras();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const [tenancy, setTenancy] = useState(false);
  const [agentManages, setAgentManages] = useState(false);
  const [pmActive, setPmActive] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!user) { setTenancy(false); setAgentManages(false); setPmActive(false); return; }
    void hasTenancy(user.id).then((v) => { if (alive) setTenancy(v); }).catch(() => {});
    void hasManagementAssignment(user.id).then((v) => { if (alive) setAgentManages(v); }).catch(() => {});
    void hasActiveManagement(user.id).then((v) => { if (alive) setPmActive(v); }).catch(() => {});
    return () => { alive = false; };
  }, [user?.id]);

  // Workspaces that genuinely apply to this person. Property Manager is only
  // available with a real capability (accepted invitation or approved onboarding).
  const hasManager = roles.includes("property_manager" as never) || pmActive;
  const workspaces: SpacesMode[] = [];
  if (roles.includes("owner") || mode === "owner") workspaces.push("owner");
  if (roles.includes("agent")) workspaces.push("agent");
  if (hasManager) workspaces.push("manager");
  const fallback: SpacesMode = workspaces[0] ?? "buyer";
  const activeMode: SpacesMode =
    mode && (mode === "buyer" || workspaces.includes(mode)) ? mode : fallback;
  const showSwitcher = workspaces.length >= 2;

  // Agents only see Property Management for listings an owner explicitly assigned to them.
  const modeNav = NAV[activeMode].filter(
    (i) => i.to !== "/management" || activeMode !== "agent" || agentManages,
  );
  const withExtras = activeMode === "buyer" || activeMode === "manager"
    ? modeNav
    : [...modeNav, ...extras.filter((e) => !modeNav.some((m) => m.to === e.to))];
  const base: Item[] = tenancy
    ? [withExtras[0], { label: t("mgmt.myTenancy"), to: "/my-tenancy", icon: KeyRound }, ...withExtras.slice(1)]
    : withExtras;
  const items: Item[] = isAdmin
    ? [...base, { label: t("dashboard.side.admin"), to: "/admin", icon: ShieldAlert }]
    : base;
  const primaryPaths = [...PRIMARY_PATHS[activeMode], ...(tenancy ? ["/my-tenancy"] : [])];
  const primaryItems = items.filter((i) => primaryPaths.includes(i.to));
  const moreItems = items.filter((i) => !primaryPaths.includes(i.to));
  const moreActive = moreItems.some((i) => i.to === pathname);
  const wsLabel = (m: SpacesMode) =>
    t(m === "owner" ? "pm.wsOwner" : m === "agent" ? "pm.wsAgent" : m === "manager" ? "pm.wsManager" : "pm.wsBuyer");





  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
    toast.success(t("common.signedOut"), { duration: 1500 });
  }


  const initials = avatarInitials(profile);

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center">
          <Brand size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={t("nav.openMenu")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex w-full min-w-0 max-w-full">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border/60 bg-background transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="hidden items-center justify-between border-b border-border/60 px-6 py-5 lg:flex">
            <Link to="/" className="flex items-center"><Brand size="md" /></Link>
            <NotificationBell />
          </div>

          <div className="border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-primary/15">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {profile?.full_name || t("common.welcome")}
                </p>
                <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {wsLabel(activeMode)}
                </div>
              </div>
            </div>
            {showSwitcher && (
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("pm.workspace")}
                </span>
                <select
                  value={workspaces.includes(activeMode) ? activeMode : workspaces[0]}
                  onChange={(e) => {
                    const m = e.target.value as SpacesMode;
                    setMode(m);
                    toast.success(wsLabel(m));
                    navigate({ to: m === "manager" ? "/management" : "/dashboard" });
                  }}
                  className="h-10 w-full rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm font-medium text-foreground"
                >
                  {workspaces.map((m) => (
                    <option key={m} value={m}>{wsLabel(m)}</option>
                  ))}
                </select>
              </label>
            )}
          </div>


          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {primaryItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "text-foreground/75 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {moreItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    moreActive ? "text-primary" : "text-foreground/75 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  {t("modeUi.more")}
                  <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", (moreOpen || moreActive) && "rotate-180")} />
                </button>
                {(moreOpen || moreActive) && moreItems.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl py-2 pl-9 pr-3 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                          : "text-foreground/65 hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>


          <div className="space-y-2 border-t border-border/60 p-3">
            <div className="px-1"><LanguageSwitcher /></div>
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-3 text-foreground/75 hover:text-foreground">
              <LogOut className="h-4 w-4" /> {t("nav.logout")}
            </Button>
          </div>

        </aside>

        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-black/30 lg:hidden" />}

        {/* Main */}
        <main className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
