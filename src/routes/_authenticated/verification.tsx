import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { VerificationCenter } from "@/components/verification/verification-center";
import { useI18n } from "@/hooks/use-i18n";
import { ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Verification Center · SPACES" },
      { name: "description", content: "Verify your identity, ownership, agency or listing on SPACES to earn trusted badges." },
      { property: "og:title", content: "Verification Center · SPACES" },
      { property: "og:description", content: "Verify your identity, ownership, agency or listing on SPACES to earn trusted badges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  const { t } = useI18n();
  return (
    <DashboardShell>
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 animate-fade-in">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="ds-caption inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("verify.kicker")}
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-4xl">
              {t("verify.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{t("verify.subtitle")}</p>
          </div>
          <Link to="/trust" className="ds-card ds-card-hover flex items-center gap-3 px-4 py-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{t("verify.trustLink")}</div>
              <div className="text-xs text-muted-foreground">{t("verify.trustLinkDesc")}</div>
            </div>
          </Link>
        </header>

        <VerificationCenter />
      </div>
    </DashboardShell>
  );
}
