import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Home, Upload, MessageSquare, Calendar, BarChart3, CreditCard, Settings,
  Heart, Search, User as UserIcon, Users, Briefcase, GitCompare, Clock, Contact,
  Menu, X, LogOut, FileEdit, LifeBuoy, ShieldCheck, Sparkles, Handshake, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useMode, type SpacesMode } from "@/hooks/use-mode";
import { useI18n } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };

function useRoleNav(): Record<SpacesMode, Item[]> {
  const { t } = useI18n();
  return {
    owner: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      { label: "My Properties", to: "/dashboard/properties", icon: Home },
      { label: "Upload Property", to: "/upload", icon: Upload },
      { label: "Leads", to: "/leads", icon: Contact },
      { label: "Deals", to: "/deals", icon: Handshake },
      { label: "Viewings", to: "/viewings", icon: Calendar },
      { label: "Messages", to: "/messages", icon: MessageSquare },
      { label: "Saved Drafts", to: "/dashboard/drafts", icon: FileEdit },
      { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
      { label: "Performance", to: "/dashboard/performance", icon: BarChart3 },
      { label: "Verification", to: "/verification", icon: ShieldCheck },
      { label: "Verification Hub", to: "/verification-hub", icon: ShieldCheck },
      { label: "Trust Score", to: "/trust", icon: Sparkles },
      { label: "Billing & Plans", to: "/billing", icon: CreditCard },
      { label: "Subscription", to: "/dashboard/subscription", icon: CreditCard },
      { label: "Profile", to: "/dashboard/profile", icon: UserIcon },
      { label: "Settings", to: "/dashboard/settings", icon: Settings },
      { label: "Support", to: "/dashboard/support", icon: LifeBuoy },
    ],
    buyer: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      { label: t("dashboard.side.favorites"), to: "/dashboard/favorites", icon: Heart },
      { label: t("dashboard.side.savedSearches"), to: "/dashboard/searches", icon: Search },
      { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
      { label: "Compare", to: "/compare", icon: GitCompare },
      { label: "Recently Viewed", to: "/dashboard/recent", icon: Clock },
      { label: t("nav.profile"), to: "/dashboard/settings", icon: UserIcon },
    ],
    agent: [
      { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      { label: t("dashboard.side.clients"), to: "/dashboard/clients", icon: Users },
      { label: "Leads", to: "/leads", icon: Contact },
      { label: "Deals", to: "/deals", icon: Handshake },
      { label: t("dashboard.side.properties"), to: "/dashboard/properties", icon: Briefcase },
      { label: t("dashboard.side.viewings"), to: "/viewings", icon: Calendar },
      { label: t("dashboard.side.messages"), to: "/messages", icon: MessageSquare },
      { label: t("dashboard.side.performance"), to: "/dashboard/analytics", icon: BarChart3 },
      { label: "Agent Performance", to: "/dashboard/agent-performance", icon: Trophy },
      { label: "Verification", to: "/verification", icon: ShieldCheck },
      { label: "Verification Hub", to: "/verification-hub", icon: ShieldCheck },
      { label: "Trust Score", to: "/trust", icon: Sparkles },
      { label: "Trust Score", to: "/trust", icon: Sparkles },
      { label: "Billing & Plans", to: "/billing", icon: CreditCard },
      { label: t("nav.settings"), to: "/dashboard/settings", icon: Settings },
    ],
  };
}



export function DashboardShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const { mode, setMode } = useMode();
  const activeMode: SpacesMode = mode ?? "buyer";
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const NAV = useRoleNav();
  const items = NAV[activeMode];




  async function handleSignOut() {
    await signOut();
    toast.success(t("common.signedOut"));
    navigate({ to: "/" });
  }

  const initials = (profile?.full_name || user?.email || "S")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display font-semibold text-primary">SPACES</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={t("nav.openMenu")}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border/60 bg-background transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Link to="/" className="hidden items-center gap-2 border-b border-border/60 px-6 py-5 lg:flex">
            <Logo className="h-9 w-9" />
            <span className="font-display text-xl font-semibold text-primary">SPACES</span>
          </Link>

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
                  {activeMode} mode
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-secondary/50 p-1">
              {(["buyer", "owner", "agent"] as SpacesMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    toast.success(`Switched to ${m.charAt(0).toUpperCase() + m.slice(1)} mode`);
                    navigate({ to: "/dashboard" });
                  }}
                  className={cn(
                    "rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-all",
                    activeMode === m
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>


          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {items.map((item) => {
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
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
