import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Home, Users, UserCheck, ShieldCheck, Calendar, MessageSquare,
  CreditCard, Receipt, Flag, LifeBuoy, Megaphone, Bell, BarChart3, FileClock,
  Settings, ShieldAlert, LogOut, Menu, X, Search, Command,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }>; badge?: string };

const NAV: { section: string; items: Item[] }[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
      { label: "Audit Logs", to: "/admin/audit", icon: FileClock },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Properties", to: "/admin/properties", icon: Home, badge: "27" },
      { label: "Verification", to: "/admin/verification", icon: ShieldCheck, badge: "4" },
      { label: "Reports", to: "/admin/reports", icon: Flag, badge: "14" },
      { label: "Bookings", to: "/admin/bookings", icon: Calendar },
      { label: "Messages", to: "/admin/messages", icon: MessageSquare },
      { label: "Support", to: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    section: "Community",
    items: [
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Agents", to: "/admin/agents", icon: UserCheck },
    ],
  },
  {
    section: "Revenue",
    items: [
      { label: "Payments", to: "/admin/payments", icon: CreditCard },
      { label: "Subscriptions", to: "/admin/subscriptions", icon: Receipt },
    ],
  },
  {
    section: "Growth",
    items: [
      { label: "Marketing", to: "/admin/marketing", icon: Megaphone },
      { label: "Notifications", to: "/admin/notifications", icon: Bell },
    ],
  },
  {
    section: "System",
    items: [
      { label: "System Settings", to: "/admin/settings", icon: Settings },
      { label: "Super Admin", to: "/admin/superadmin", icon: ShieldAlert },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const initials = (profile?.full_name || user?.email || "SA")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[color:var(--color-gray-50)] text-foreground">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display font-semibold text-primary">SPACES <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold-700)]">Admin</span></span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border/60 bg-background transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <Link to="/admin" className="hidden items-center gap-2 border-b border-border/60 px-6 py-5 lg:flex">
            <Logo className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold text-primary">SPACES</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-gold-700)]">Control Center</div>
            </div>
          </Link>

          <div className="border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-[color:var(--color-gold-300)]">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile?.full_name || "Administrator"}</p>
                <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-gold-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-gold-800)]">
                  <ShieldAlert className="h-3 w-3" /> Super Admin
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-border/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="flex-1">Search anything…</span>
              <kbd className="hidden items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline-flex">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </div>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto p-3">
            {NAV.map((group) => (
              <div key={group.section}>
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.section}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                            : "text-foreground/75 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
                          )}>{item.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border/60 p-3">
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-3 text-foreground/75 hover:text-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </aside>

        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-black/40 lg:hidden" />}

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
