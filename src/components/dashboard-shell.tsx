import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Home, Upload, MessageSquare, Calendar, BarChart3, CreditCard, Settings,
  Heart, Search, User as UserIcon, Users, Briefcase, ShieldCheck, FileText, DollarSign,
  Menu, X, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<AppRole, Item[]> = {
  owner: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My Properties", to: "/dashboard/properties", icon: Home },
    { label: "Upload Property", to: "/dashboard/upload", icon: Upload },
    { label: "Messages", to: "/dashboard/messages", icon: MessageSquare },
    { label: "Viewing Requests", to: "/dashboard/viewings", icon: Calendar },
    { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
    { label: "Subscription", to: "/dashboard/subscription", icon: CreditCard },
    { label: "Settings", to: "/dashboard/settings", icon: Settings },
  ],
  buyer: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Favorites", to: "/dashboard/favorites", icon: Heart },
    { label: "Saved Searches", to: "/dashboard/searches", icon: Search },
    { label: "Viewing Requests", to: "/dashboard/viewings", icon: Calendar },
    { label: "Messages", to: "/dashboard/messages", icon: MessageSquare },
    { label: "Profile", to: "/dashboard/settings", icon: UserIcon },
  ],
  agent: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Clients", to: "/dashboard/clients", icon: Users },
    { label: "Properties", to: "/dashboard/properties", icon: Briefcase },
    { label: "Viewing Requests", to: "/dashboard/viewings", icon: Calendar },
    { label: "Messages", to: "/dashboard/messages", icon: MessageSquare },
    { label: "Performance", to: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", to: "/dashboard/settings", icon: Settings },
  ],
  admin: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Users", to: "/dashboard/users", icon: Users },
    { label: "Properties", to: "/dashboard/properties", icon: Home },
    { label: "Verification", to: "/dashboard/verification", icon: ShieldCheck },
    { label: "Reports", to: "/dashboard/reports", icon: FileText },
    { label: "Payments", to: "/dashboard/payments", icon: DollarSign },
    { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", to: "/dashboard/settings", icon: Settings },
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { profile, user, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const items = NAV[primaryRole];

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
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
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu">
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
                  {profile?.full_name || "Welcome"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)}
                </p>
              </div>
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

          <div className="border-t border-border/60 p-3">
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-3 text-foreground/75 hover:text-foreground">
              <LogOut className="h-4 w-4" /> Sign out
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
