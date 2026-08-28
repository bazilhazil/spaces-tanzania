import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { TrustScoreRing } from "@/components/trust/trust-score-ring";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TRUST_TIER_META, type TrustScore as EngineScore, type VerificationKind } from "@/lib/trust-engine";
import {
  computeTrustScore,
  fetchTrustSignals,
  fetchVerifiedFlags,
  NO_FLAGS,
  type VerifiedFlags,
} from "@/lib/verification-db";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, TrendingUp, ShieldCheck, Sparkles, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trust")({
  component: TrustPage,
});

// verification-db uses "building" where the visual tier meta uses "rising".
function ringTier(tier: "new" | "building" | "trusted" | "elite"): EngineScore["tier"] {
  return tier === "building" ? "rising" : tier;
}

const KIND_FLAG: Record<VerificationKind, keyof VerifiedFlags> = {
  identity: "identity",
  property: "owner",
  business: "business",
  agent: "agent",
};

function TrustPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["trust-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [signals, flags] = await Promise.all([
        fetchTrustSignals(userId!),
        fetchVerifiedFlags(userId!),
      ]);
      return { trust: computeTrustScore(signals), flags };
    },
  });

  const trust = data?.trust;
  const flags = data?.flags ?? NO_FLAGS;
  const tier = TRUST_TIER_META[ringTier(trust?.tier ?? "new")];
  const kinds: VerificationKind[] = ["identity", "property", "business", "agent"];
  const missing = trust ? trust.factors.filter((f) => f.earned < f.max) : [];
  const potential = missing.reduce((a, f) => a + (f.max - f.earned), 0);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
        <header>
          <div className="ds-caption inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Trust &amp; Safety
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">My Trust Score</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Calculated from your real activity on SPACES - verification, replies, viewings and completed deals.
          </p>
        </header>

        {/* Hero score */}
        <section className="ds-card overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
            <div className="grid place-items-center pt-2">
              {isLoading || !trust ? (
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              ) : (
                <TrustScoreRing score={trust.score} tier={ringTier(trust.tier)} size={180} />
              )}
            </div>
            <div className="space-y-4">
              <div>
                <div className="ds-caption">Current tier</div>
                <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{tier.label}</div>
                <p className="ds-body text-muted-foreground">{tier.description}</p>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress to next tier</span>
                  <span className="font-semibold">
                    {!trust ? "—" : `${trust.score < 35 ? 35 : trust.score < 65 ? 65 : trust.score < 85 ? 85 : 100} pts`}
                  </span>
                </div>
                <Progress value={trust?.score ?? 0} className="h-2" />
              </div>
              {potential > 0 && (
                <div className="rounded-2xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-warning-900)]">
                    <Sparkles className="h-4 w-4" /> +{potential} points available
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--color-warning-800)]">
                    Complete the actions below to raise your score.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Verification snapshot */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="ds-h-sm">Verification snapshot</div>
              <p className="text-xs text-muted-foreground">Each verified badge adds to your Trust Score.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/verification">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kinds.map((k) => {
              const verified = flags[KIND_FLAG[k]];
              return (
                <div key={k} className={cn(
                  "ds-card p-4 transition-colors",
                  verified && "ring-1 ring-[color:var(--color-success-200)] bg-[color:var(--color-success-50)]/30",
                )}>
                  <VerificationBadge kind={k} size="sm" />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {verified ? "Verified" : "Not verified"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Score breakdown */}
        <section className="ds-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="ds-h-sm">Score breakdown</div>
          </div>
          {isLoading || !trust ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {trust.factors.map((f) => (
                <li key={f.key} className="rounded-xl bg-muted/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{f.label}</div>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {f.earned} / {f.max}
                    </span>
                  </div>
                  <Progress value={(f.earned / f.max) * 100} className="mt-2 h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* How to improve */}
        <section className="ds-card p-6">
          <div className="ds-h-sm mb-3">How to raise your score</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Tip icon={ShieldCheck} title="Verify everything" body="Identity, property, business and agent badges together add up to 30 points." />
            <Tip icon={Clock}       title="Reply to every inquiry" body="Your response rate is worth up to 15 points." />
            <Tip icon={Star}        title="Complete deals and viewings" body="Completed viewings and deals add up to 25 points." />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function Tip({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}
