import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Home, Users, UserCheck, ShieldCheck, Calendar, MessageSquare,
  CreditCard, Receipt, Flag, LifeBuoy, Megaphone, Bell, BarChart3, FileClock,
  Settings, ShieldAlert, LogOut, Menu, X, Search, Command, Star, Briefcase, DollarSign,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminSearchDialog } from "@/components/admin/admin-search-dialog";

type Item = {
  label: string;
  section?: string; // maps to /admin/$section; if undefined → /admin
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Analytics", section: "analytics", icon: BarChart3 },
      { label: "Audit Logs", section: "audit", icon: FileClock },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Properties", section: "properties", icon: Home },
      { label: "Inquiries", section: "leads", icon: MessageSquare },
      { label: "Viewings", section: "viewings", icon: Calendar },
      { label: "Deals", section: "deals", icon: Briefcase },
      { label: "Verification", section: "verification", icon: ShieldCheck },
      { label: "Safety & Reports", section: "reports", icon: Flag },
      { label: "Reviews", section: "reviews", icon: Star },
      { label: "Support", section: "support", icon: LifeBuoy },
    ],
  },
  {
    group: "Community",
    items: [
      { label: "Users", section: "users", icon: Users },
      { label: "Agents", section: "agents", icon: UserCheck },
    ],
  },
  {
    group: "Revenue",
    items: [
      { label: "Revenue", section: "revenue", icon: DollarSign },
      { label: "Payments", section: "payments", icon: CreditCard },
      { label: "Subscriptions", section: "subscriptions", icon: Receipt },
    ],
  },
  {
    group: "Growth",
    items: [
      { label: "Marketing", section: "marketing", icon: Megaphone },
      { label: "Notifications", section: "notifications", icon: Bell },
    ],
  },
  {
    group: "System",
    items: [
      { label: "System Settings", section: "settings", icon: Settings },
      { label: "Data & Backup", section: "data", icon: Database },
      { label: "Super Admin", section: "superadmin", icon: ShieldAlert },
    ],
  },
];

function itemHref(item: Item) {
  return item.section ? `/admin/${item.section}` : "/admin";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut, primaryRole, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingVerifications, setPendingVerifications] = useState(0);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : primaryRole;

  const loadPendingVerifications = useCallback(async () => {
    if (!isAdmin) return;
    const { count, error } = await supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (!error) setPendingVerifications(count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    void loadPendingVerifications();
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-verification-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, loadPendingVerifications)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin, loadPendingVerifications]);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
    toast.success("Signed out", { duration: 1500 });
  }

  const initials = (profile?.full_name || user?.email || "SA")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();


  return (
    <div className="min-h-screen bg-[color:var(--color-gray-50)] text-foreground">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <Brand size="sm" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-gold-700)]">Admin</span>
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
          <Link to="/admin" className="hidden items-center gap-3 border-b border-border/60 px-6 py-5 lg:flex">
            <Brand size="md" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-gold-700)]">Control Center</span>
          </Link>

          <div className="border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-[color:var(--color-gold-300)]">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email || "Administrator"}</p>
                {user?.email && profile?.full_name && (
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                )}
                <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-gold-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-gold-800)]">
                  <ShieldAlert className="h-3 w-3" /> {roleLabel}
                </div>
              </div>
            </div>
          </div>


          <div className="border-b border-border/60 p-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); setSearchOpen(true); }}
              className="h-auto w-full justify-start gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-secondary hover:text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search users, spaces, inquiries…</span>
              <kbd className="hidden items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline-flex">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </Button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto p-3">
            {NAV.map((group) => (
              <div key={group.group}>
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = itemHref(item);
                    const active = item.section
                      ? pathname === href
                      : pathname === "/admin" || pathname === "/admin/";
                    const Icon = item.icon;
                    return (
                      <Link
                        key={href}
                        to={item.section ? "/admin/$section" : "/admin"}
                        params={item.section ? { section: item.section } : undefined}
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
                        {(item.badge || (item.section === "verification" && pendingVerifications > 0)) && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]",
                          )}>{item.section === "verification" ? pendingVerifications : item.badge}</span>
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
      <AdminSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </div>
  );
}
