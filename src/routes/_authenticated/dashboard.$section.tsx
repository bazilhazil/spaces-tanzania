import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type Lang, AVAILABLE_LANGS } from "@/hooks/use-i18n";
import { Bell, Globe, Inbox, Info, LifeBuoy, Lock, Palette, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const { t } = useI18n();

  const TITLES: Record<string, { title: string; desc: string }> = {
    properties: { title: t("dashboard.side.properties"), desc: t("dashboard.sections.propertiesDesc") },
    upload: { title: t("nav.upload"), desc: t("dashboard.sections.uploadDesc") },
    messages: { title: t("dashboard.side.messages"), desc: t("dashboard.sections.messagesDesc") },
    viewings: { title: t("dashboard.side.viewings"), desc: t("dashboard.sections.viewingsDesc") },
    analytics: { title: t("dashboard.side.analytics"), desc: t("dashboard.sections.analyticsDesc") },
    subscription: { title: t("dashboard.side.subscription"), desc: t("dashboard.sections.subscriptionDesc") },
    settings: { title: t("nav.settings"), desc: t("dashboard.sections.settingsDesc") },
    language: { title: t("lang.title"), desc: t("lang.desc") },
    favorites: { title: t("dashboard.side.favorites"), desc: t("dashboard.sections.favoritesDesc") },
    searches: { title: t("dashboard.side.savedSearches"), desc: t("dashboard.sections.searchesDesc") },
    clients: { title: t("dashboard.side.clients"), desc: t("dashboard.sections.clientsDesc") },
    users: { title: t("dashboard.side.users"), desc: t("dashboard.sections.usersDesc") },
    verification: { title: t("dashboard.side.verification"), desc: t("dashboard.sections.verificationDesc") },
    reports: { title: t("dashboard.side.reports"), desc: t("dashboard.sections.reportsDesc") },
    payments: { title: t("dashboard.side.payments"), desc: t("dashboard.sections.paymentsDesc") },
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
  const { t } = useI18n();
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{t("dashboard.empty.sectionNoneTitle")}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {t("dashboard.empty.sectionNoneBody")}
      </p>
    </div>
  );
}

function SettingsIndex() {
  const { t, lang } = useI18n();
  const current = AVAILABLE_LANGS.find((l) => l.code === lang) ?? AVAILABLE_LANGS[0];
  const items: { icon: typeof Globe; label: string; section: string; value: string }[] = [
    { icon: Globe, label: t("settings.language"), section: "language", value: `${current.flag} ${current.label}` },
    { icon: Palette, label: t("settings.theme"), section: "settings", value: t("settings.themeDefault") },
    { icon: Bell, label: t("settings.notifications"), section: "settings", value: t("settings.notificationsOn") },
    { icon: Lock, label: t("settings.privacy"), section: "settings", value: "" },
    { icon: LifeBuoy, label: t("settings.support"), section: "settings", value: "" },
    { icon: Info, label: t("settings.about"), section: "settings", value: t("settings.aboutVersion") },
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
  const current = AVAILABLE_LANGS.find((l) => l.code === lang) ?? AVAILABLE_LANGS[0];

  function choose(l: Lang) {
    setLang(l);
    toast.success(t("lang.saved"));
  }

  const options = AVAILABLE_LANGS.map((l) => ({
    ...l,
    sub: l.code === "en" ? t("lang.defaultLabel") : t("lang.swSub"),
  }));

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
              {current.flag} {current.label}
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
