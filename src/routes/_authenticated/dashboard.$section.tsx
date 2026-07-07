import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type Lang } from "@/hooks/use-i18n";
import { Bell, Globe, Inbox, Info, LifeBuoy, Lock, Palette, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const { t } = useI18n();

  const TITLES: Record<string, { title: string; desc: string }> = {
    properties: { title: t("side.properties"), desc: "Your listings will appear here." },
    upload: { title: t("nav.upload"), desc: "Full property upload flow coming next." },
    messages: { title: t("side.messages"), desc: "Chats with buyers, tenants, and agents." },
    viewings: { title: t("side.viewings"), desc: "Scheduled tours and requests." },
    analytics: { title: t("side.analytics"), desc: "Insights into your listings and performance." },
    subscription: { title: t("side.subscription"), desc: "Manage your plan and billing." },
    settings: { title: t("nav.settings"), desc: "Update your profile, security, and preferences." },
    language: { title: t("lang.title"), desc: t("lang.desc") },
    favorites: { title: t("side.favorites"), desc: "Properties you've saved." },
    searches: { title: t("side.savedSearches"), desc: "Get alerts when new matches go live." },
    clients: { title: t("side.clients"), desc: "Manage your client pipeline." },
    users: { title: t("side.users"), desc: "Everyone on SPACES." },
    verification: { title: t("side.verification"), desc: "Approve listings and owner IDs." },
    reports: { title: t("side.reports"), desc: "Flagged content and platform reports." },
    payments: { title: t("side.payments"), desc: "Revenue and payouts." },
  };

  const meta = TITLES[section] ?? { title: section, desc: "" };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-foreground">{meta.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta.desc}</p>
        </header>

        {section === "settings" ? (
          <SettingsIndex />
        ) : section === "language" ? (
          <LanguagePanel />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </DashboardShell>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">Nothing here yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        This section is being wired up. Your data will populate automatically as you use SPACES.
      </p>
    </div>
  );
}

function SettingsIndex() {
  const { t, lang } = useI18n();
  const items: { icon: typeof Globe; label: string; section: string; value: string }[] = [
    { icon: Globe, label: t("settings.language"), section: "language", value: lang === "sw" ? "🇹🇿 Kiswahili" : "🇬🇧 English" },
    { icon: Palette, label: t("settings.theme"), section: "settings", value: "Default" },
    { icon: Bell, label: t("settings.notifications"), section: "settings", value: "On" },
    { icon: Lock, label: t("settings.privacy"), section: "settings", value: "" },
    { icon: LifeBuoy, label: t("settings.support"), section: "settings", value: "" },
    { icon: Info, label: t("settings.about"), section: "settings", value: "v1.0" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            to="/dashboard/$section"
            params={{ section: it.section }}
            className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{it.label}</p>
                {it.value && <p className="text-xs text-muted-foreground">{it.value}</p>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}


function LanguagePanel() {
  const { t, lang, setLang } = useI18n();

  function choose(l: Lang) {
    setLang(l);
    toast.success(t("lang.saved"));
  }

  const options: { code: Lang; flag: string; label: string; sub: string }[] = [
    { code: "en", flag: "🇬🇧", label: "English", sub: "Default language" },
    { code: "sw", flag: "🇹🇿", label: "Kiswahili", sub: "Lugha ya Tanzania" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("lang.title")}</p>
            <p className="font-display text-base font-semibold text-foreground">
              {lang === "sw" ? "🇹🇿 Kiswahili" : "🇬🇧 English"}
            </p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = lang === o.code;
          return (
            <button
              key={o.code}
              onClick={() => choose(o.code)}
              className={
                "group flex items-center justify-between rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 " +
                (active
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                  : "border-border/60 bg-background hover:border-primary/40")
              }
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl leading-none">{o.flag}</span>
                <div>
                  <p className="font-display text-base font-semibold text-foreground">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.sub}</p>
                </div>
              </div>
              {active && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
