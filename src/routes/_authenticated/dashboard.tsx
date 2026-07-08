import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Home, Upload, MessageSquare, Calendar, Heart, Users, ShieldCheck, DollarSign, BarChart3 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user, primaryRole } = useAuth();
  const { t } = useI18n();
  const name = (profile?.full_name || user?.email || t("common.welcome")).split(" ")[0];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="animate-fade-in">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {greeting(t)}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground md:text-4xl">
            {t("dashboard.welcomeBack", { name })}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {t(`dashboard.roleTagline.${primaryRole}`)}
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

function greeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("dashboard.greetingMorning");
  if (h < 18) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}

function StatsGrid({ role }: { role: AppRole }) {
  const { t } = useI18n();
  const stats = role === "owner"
    ? [
        { label: t("dashboard.stats.activeListings"), value: 0, icon: Home },
        { label: t("dashboard.stats.totalViews"), value: 0, icon: BarChart3 },
        { label: t("dashboard.stats.enquiries"), value: 0, icon: MessageSquare },
        { label: t("dashboard.stats.viewings"), value: 0, icon: Calendar },
      ]
    : role === "agent"
    ? [
        { label: t("dashboard.stats.clients"), value: 0, icon: Users },
        { label: t("dashboard.stats.listings"), value: 0, icon: Home },
        { label: t("dashboard.stats.deals"), value: 0, icon: DollarSign },
        { label: t("dashboard.stats.rating"), value: "—", icon: BarChart3 },
      ]
    : role === "admin"
    ? [
        { label: t("dashboard.stats.totalUsers"), value: 0, icon: Users },
        { label: t("dashboard.stats.listings"), value: 0, icon: Home },
        { label: t("dashboard.stats.pendingVerifications"), value: 0, icon: ShieldCheck },
        { label: t("dashboard.stats.revenue"), value: 0, icon: DollarSign },
      ]
    : [
        { label: t("dashboard.stats.favorites"), value: 0, icon: Heart },
        { label: t("dashboard.stats.savedSearches"), value: 0, icon: BarChart3 },
        { label: t("dashboard.stats.viewings"), value: 0, icon: Calendar },
        { label: t("dashboard.stats.messages"), value: 0, icon: MessageSquare },
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
  const { t } = useI18n();
  if (role === "owner") {
    return (
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">{t("dashboard.quick.ownerTitle")}</h3>
            <p className="text-primary-foreground/85">{t("dashboard.quick.ownerBody")}</p>
          </div>
          <Link to="/dashboard/upload">
            <Button variant="secondary" className="gap-2 rounded-xl">
              <Upload className="h-4 w-4" /> {t("nav.upload")}
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
            <h3 className="font-display text-xl font-semibold">{t("dashboard.quick.buyerTitle")}</h3>
            <p className="text-primary-foreground/85">{t("dashboard.quick.buyerBody")}</p>
          </div>
          <Link to="/properties">
            <Button variant="secondary" className="rounded-xl">{t("dashboard.quick.browse")}</Button>
          </Link>
        </div>
      </div>
    );
  }
  return null;
}

function EmptyState({ role }: { role: AppRole }) {
  const { t } = useI18n();
  const key = role === "owner" ? "listings" : role === "agent" ? "clients" : role === "admin" ? "activity" : "favorites";
  const label = t(`dashboard.empty.${key}`);
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Home className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {t("dashboard.empty.titleNone", { label })}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {t("dashboard.empty.body", { label })}
      </p>
    </div>
  );
}
