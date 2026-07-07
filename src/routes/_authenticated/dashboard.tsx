import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Home, Upload, MessageSquare, Calendar, Heart, Users, ShieldCheck, DollarSign, BarChart3 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user, primaryRole } = useAuth();
  const name = (profile?.full_name || user?.email || "there").split(" ")[0];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="animate-fade-in">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {greeting()}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground md:text-4xl">
            Welcome back, {name} 👋
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {roleTagline(primaryRole)}
          </p>
        </header>

        <ProfileCompletionCard />

        <StatsGrid role={primaryRole} />

        <QuickActions role={primaryRole} />

        <EmptyState role={primaryRole} />
      </div>
    </DashboardShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function roleTagline(role: AppRole) {
  switch (role) {
    case "owner": return "Manage your listings and grow your reach across Tanzania.";
    case "agent": return "Track clients, listings, and performance in one place.";
    case "admin": return "Oversee users, verify listings, and monitor platform health.";
    default: return "Discover verified homes and save the ones you love.";
  }
}

function StatsGrid({ role }: { role: AppRole }) {
  const stats = role === "owner"
    ? [
        { label: "Active Listings", value: 0, icon: Home },
        { label: "Total Views", value: 0, icon: BarChart3 },
        { label: "Enquiries", value: 0, icon: MessageSquare },
        { label: "Viewings", value: 0, icon: Calendar },
      ]
    : role === "agent"
    ? [
        { label: "Clients", value: 0, icon: Users },
        { label: "Listings", value: 0, icon: Home },
        { label: "Deals This Month", value: 0, icon: DollarSign },
        { label: "Rating", value: "—", icon: BarChart3 },
      ]
    : role === "admin"
    ? [
        { label: "Total Users", value: 0, icon: Users },
        { label: "Listings", value: 0, icon: Home },
        { label: "Pending Verifications", value: 0, icon: ShieldCheck },
        { label: "Revenue (TZS)", value: 0, icon: DollarSign },
      ]
    : [
        { label: "Favorites", value: 0, icon: Heart },
        { label: "Saved Searches", value: 0, icon: BarChart3 },
        { label: "Viewings", value: 0, icon: Calendar },
        { label: "Messages", value: 0, icon: MessageSquare },
      ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="group rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-foreground">{s.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function QuickActions({ role }: { role: AppRole }) {
  if (role === "owner") {
    return (
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">List your first property</h3>
            <p className="text-primary-foreground/85">Reach thousands of verified buyers and tenants.</p>
          </div>
          <Link to="/dashboard/upload">
            <Button variant="secondary" className="gap-2 rounded-xl">
              <Upload className="h-4 w-4" /> Upload Property
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  if (role === "buyer") {
    return (
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Discover your next home</h3>
            <p className="text-primary-foreground/85">Browse verified listings across Tanzania.</p>
          </div>
          <Link to="/properties">
            <Button variant="secondary" className="rounded-xl">Browse properties</Button>
          </Link>
        </div>
      </div>
    );
  }
  return null;
}

function EmptyState({ role }: { role: AppRole }) {
  const label = role === "owner" ? "listings" : role === "agent" ? "clients" : role === "admin" ? "activity" : "favorites";
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Home className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No {label} yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        As you use SPACES, your recent {label} will appear here.
      </p>
    </div>
  );
}
