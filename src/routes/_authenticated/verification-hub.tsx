import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { VerificationReviewQueue } from "@/components/verification/review-queue";
import { VerificationCenter } from "@/components/verification/verification-center";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verification-hub")({
  head: () => ({
    meta: [
      { title: "Verification Hub · SPACES" },
      { name: "description", content: "Review owner, agent and property verification submissions across SPACES." },
      { property: "og:title", content: "Verification Hub · SPACES" },
      { property: "og:description", content: "Review owner, agent and property verification submissions across SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationHubPage,
});

function VerificationHubPage() {
  const { roles } = useAuth();
  const { t } = useI18n();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  return (
    <DashboardShell>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <header>
          <div className="ds-caption inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("verify.kicker")}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-4xl">
            {isAdmin ? t("verify.admin.title") : t("verify.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
            {isAdmin ? t("verify.admin.subtitle") : t("verify.subtitle")}
          </p>
        </header>
        {isAdmin ? <VerificationReviewQueue /> : <VerificationCenter />}
      </div>
    </DashboardShell>
  );
}
