import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { TrustScoreRing } from "@/components/trust/trust-score-ring";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  computeTrustScore, MOCK_TRUST_SIGNALS, MOCK_USER_VERIFICATIONS, TRUST_TIER_META,
  type VerificationKind,
} from "@/lib/trust-engine";
import { ArrowRight, TrendingUp, TrendingDown, ShieldCheck, Sparkles, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trust")({
  component: TrustPage,
});

function TrustPage() {
  const trust = computeTrustScore(MOCK_TRUST_SIGNALS);
  const tier = TRUST_TIER_META[trust.tier];
  const kinds: VerificationKind[] = ["identity", "property", "business", "agent"];
  const positives = trust.signals.filter((s) => s.weight > 0);
  const negatives = trust.signals.filter((s) => s.weight < 0);
  const potential = negatives.reduce((a, s) => a + Math.abs(s.weight), 0);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
        <header>
          <div className="ds-caption inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Trust &amp; Safety
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">My Trust Score</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Transparent, updated in real time. Higher scores rank higher in search and unlock premium features.
          </p>
        </header>

        {/* Hero score */}
        <section className="ds-card overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
            <div className="grid place-items-center pt-2">
              <TrustScoreRing score={trust.score} tier={trust.tier} size={180} />
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
                  <span className="font-semibold">{trust.score < 55 ? 55 : trust.score < 75 ? 75 : trust.score < 90 ? 90 : 100} pts</span>
                </div>
                <Progress value={trust.score} className="h-2" />
              </div>
              {potential > 0 && (
                <div className="rounded-2xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-warning-900)]">
                    <Sparkles className="h-4 w-4" /> +{potential} points available
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--color-warning-800)]">
                    Complete pending actions below to recover lost points.
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
              const rec = MOCK_USER_VERIFICATIONS[k];
              const verified = rec.status === "verified";
              return (
                <div key={k} className={cn(
                  "ds-card p-4 transition-colors",
                  verified && "ring-1 ring-[color:var(--color-success-200)] bg-[color:var(--color-success-50)]/30",
                )}>
                  <VerificationBadge kind={k} size="sm" />
                  <div className="mt-3 text-xs text-muted-foreground capitalize">{rec.status.replace("_", " ")}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Signals */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="ds-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="ds-h-sm">What's boosting your score</div>
            </div>
            <ul className="space-y-2.5">
              {positives.map((s) => (
                <li key={s.key} className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--color-success-50)]/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{s.label}</div>
                    {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                  </div>
                  <span className="shrink-0 rounded-full bg-[color:var(--color-success-100)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-success-800)]">
                    +{s.weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ds-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div className="ds-h-sm">What's hurting your score</div>
            </div>
            {negatives.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing right now. Keep it up.</p>
            ) : (
              <ul className="space-y-2.5">
                {negatives.map((s) => (
                  <li key={s.key} className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--color-danger-50)]/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{s.label}</div>
                      {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                    </div>
                    <span className="shrink-0 rounded-full bg-[color:var(--color-danger-100)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-danger-800)]">
                      {s.weight}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* How to improve */}
        <section className="ds-card p-6">
          <div className="ds-h-sm mb-3">How to reach {trust.tier === "elite" ? "and hold Elite" : "the next tier"}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Tip icon={ShieldCheck} title="Verify everything" body="Identity, property, business and agent badges together add up to ~55 points." />
            <Tip icon={Clock}       title="Reply within 15 minutes" body="Fast response time is the strongest signal for buyers and our ranking." />
            <Tip icon={Star}        title="Ask for a review" body="Every 5-star review from a completed transaction adds up to 3 points." />
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
