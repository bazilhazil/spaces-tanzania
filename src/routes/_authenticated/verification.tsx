import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VerificationCard } from "@/components/trust/verification-card";
import { PropertyLifecycleStepper } from "@/components/trust/lifecycle-stepper";
import { VerificationBadge } from "@/components/trust/verification-badge";
import {
  MOCK_USER_VERIFICATIONS, IDENTITY_DOCS, PROPERTY_PROOFS, BUSINESS_DOCS, AGENT_DOCS,
  PROPERTY_LIFECYCLE, VERIFICATION_STATUS_META,
  type VerificationKind, type PropertyLifecycleStage,
} from "@/lib/trust-engine";
import { BadgeCheck, Building2, Home, UserCheck, ShieldCheck, Sparkles, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
});

const KIND_META: Record<VerificationKind, {
  title: string; description: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  identity: { title: "Identity Verification", description: "Confirm who you are to unlock trust badges and priority support.", icon: BadgeCheck },
  property: { title: "Property Verification", description: "Prove ownership or authorisation for each listing.", icon: Home },
  business: { title: "Business Verification", description: "Verify your company to publish under your brand.", icon: Building2 },
  agent:    { title: "Agent Verification",    description: "Get an official agent badge and appear in the agent directory.", icon: UserCheck },
};

function VerificationPage() {
  const kinds: VerificationKind[] = ["identity", "property", "business", "agent"];
  const verifiedCount = kinds.filter((k) => MOCK_USER_VERIFICATIONS[k].status === "verified").length;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="ds-caption inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Trust &amp; Safety
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">Verification Center</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Every verification builds trust with buyers, tenants and the wider SPACES community.
              Approved documents earn permanent badges and boost your Trust Score.
            </p>
          </div>
          <Link to="/trust" className="ds-card ds-card-hover flex items-center gap-3 px-4 py-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">View my Trust Score</div>
              <div className="text-xs text-muted-foreground">See exactly how your score is calculated.</div>
            </div>
          </Link>
        </header>

        {/* Verification summary */}
        <section className="ds-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="ds-caption">Your verified badges</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {verifiedCount === 0 ? (
                  <span className="text-sm text-muted-foreground">No badges yet. Verify identity to get started.</span>
                ) : (
                  kinds
                    .filter((k) => MOCK_USER_VERIFICATIONS[k].status === "verified")
                    .map((k) => <VerificationBadge key={k} kind={k} />)
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-semibold tracking-tight">{verifiedCount} / 4</div>
              <div className="ds-caption">Verifications complete</div>
            </div>
          </div>
        </section>

        {/* Property lifecycle education */}
        <section className="ds-card p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <div className="ds-h-sm">How your property gets verified</div>
              <p className="ds-body text-muted-foreground">
                Only <strong>Approved</strong> properties can go <strong>Live</strong> and appear in public search.
              </p>
            </div>
          </div>
          <PropertyLifecycleStepper current={"pending_verification" as PropertyLifecycleStage} />
          <details className="mt-5 group">
            <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-brand-700)] hover:underline">
              View all lifecycle stages
            </summary>
            <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {PROPERTY_LIFECYCLE.map((s) => (
                <div key={s.key} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider">{s.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* Verification tabs */}
        <Tabs defaultValue="identity" className="space-y-5">
          <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-muted p-1">
            {kinds.map((k) => {
              const meta = KIND_META[k];
              const status = MOCK_USER_VERIFICATIONS[k].status;
              const s = VERIFICATION_STATUS_META[status];
              return (
                <TabsTrigger key={k} value={k} className="gap-2 rounded-xl px-4 data-[state=active]:shadow-[var(--shadow-soft)]">
                  <meta.icon className="h-3.5 w-3.5" />
                  <span>{meta.title.replace(" Verification", "")}</span>
                  <span className={cn(
                    "hidden md:inline text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                    s.tone === "success" && "bg-[color:var(--color-success-100)] text-[color:var(--color-success-800)]",
                    s.tone === "warning" && "bg-[color:var(--color-warning-100)] text-[color:var(--color-warning-800)]",
                    s.tone === "danger"  && "bg-[color:var(--color-danger-100)] text-[color:var(--color-danger-800)]",
                    s.tone === "muted"   && "bg-background text-foreground/60",
                  )}>{s.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="identity">
            <VerificationCard
              {...KIND_META.identity}
              record={MOCK_USER_VERIFICATIONS.identity}
              requirements={IDENTITY_DOCS.map((d) => ({ key: d.key, label: d.label, hint: d.hint, required: d.required }))}
            />
          </TabsContent>
          <TabsContent value="property">
            <VerificationCard
              {...KIND_META.property}
              record={MOCK_USER_VERIFICATIONS.property}
              requirements={PROPERTY_PROOFS.map((d) => ({ key: d.key, label: d.label, hint: d.description }))}
            />
          </TabsContent>
          <TabsContent value="business">
            <VerificationCard
              {...KIND_META.business}
              record={MOCK_USER_VERIFICATIONS.business}
              requirements={BUSINESS_DOCS.map((d) => ({ key: d.key, label: d.label, hint: d.hint, required: d.required }))}
            />
          </TabsContent>
          <TabsContent value="agent">
            <VerificationCard
              {...KIND_META.agent}
              record={MOCK_USER_VERIFICATIONS.agent}
              requirements={AGENT_DOCS.map((d) => ({ key: d.key, label: d.label, hint: d.hint, required: d.required }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
