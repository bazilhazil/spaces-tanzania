import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { EcosystemCenter } from "@/components/verification/ecosystem-center";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verification-hub")({
  head: () => ({
    meta: [
      { title: "Verification Ecosystem · SPACES" },
      { name: "description", content: "Manage owner, agent, property and agency verifications across SPACES." },
    ],
  }),
  component: VerificationHubPage,
});

function VerificationHubPage() {
  const { profile } = useAuth();
  const role: "admin" | "owner" =
    (profile as { role?: string } | null)?.role === "super_admin" || (profile as { role?: string } | null)?.role === "admin"
      ? "admin" : "owner";

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="ds-caption inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Trust &amp; Verification Ecosystem
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">Verification Hub</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            One place to submit, review and monitor every verification across owners, agents, listings and agencies.
          </p>
        </header>
        <EcosystemCenter role={role} />
      </div>
    </DashboardShell>
  );
}
