import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingBadge, ListingBadgeStrip } from "@/components/trust/listing-badge";
import { QualityScoreBar, QualityScorePill } from "@/components/trust/quality-score";
import { BuyerTrustPanel } from "@/components/trust/buyer-trust-panel";
import { VerificationBadge } from "@/components/trust/verification-badge";
import { TrustScoreRing } from "@/components/trust/trust-score-ring";
import { ReportDialog } from "@/components/trust/report-dialog";
import { LISTING_BADGE_META, MOCK_TRUST_SIGNALS, computeTrustScore, type ListingBadgeKind } from "@/lib/trust-engine";

export const Route = createFileRoute("/trust-system")({
  head: () => ({
    meta: [
      { title: "Trust System · SPACES" },
      { name: "description", content: "The complete verification, badge, quality and report system that keeps SPACES the most trusted property platform in Tanzania." },
    ],
  }),
  component: TrustSystemPage,
});

function TrustSystemPage() {
  const kinds = Object.keys(LISTING_BADGE_META) as ListingBadgeKind[];
  const trust = computeTrustScore(MOCK_TRUST_SIGNALS);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-gray-50)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
          <header>
            <div className="ds-caption">Trust &amp; Safety</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">SPACES Trust System</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A single visual language for verification, quality and reputation — used consistently across cards, detail pages, profiles, search and dashboard.
            </p>
          </header>

          <Section title="Verification levels" subtitle="Awarded after admin approval. Displayed anywhere the person or listing appears.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kinds.map((k) => (
                <div key={k} className="ds-card p-4">
                  <ListingBadge kind={k} size="md" />
                  <div className="mt-3 text-xs text-muted-foreground">{LISTING_BADGE_META[k].description}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Badge strip on cards" subtitle="Compact strip for property cards and search results (max 3 shown).">
            <div className="ds-card p-6">
              <ListingBadgeStrip kinds={["verified_property", "premium", "featured", "verified_owner", "new"]} max={3} />
            </div>
          </Section>

          <Section title="Identity verifications" subtitle="Personal badges shown on owner and agent profiles.">
            <div className="ds-card flex flex-wrap gap-2 p-4">
              <VerificationBadge kind="identity" />
              <VerificationBadge kind="property" />
              <VerificationBadge kind="business" />
              <VerificationBadge kind="agent" />
            </div>
          </Section>

          <Section title="Listing quality score" subtitle="Displayed out of 100 — higher scores rank higher in SPACES search.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="ds-card p-4"><QualityScoreBar score={94} /></div>
              <div className="ds-card p-4"><QualityScoreBar score={78} /></div>
              <div className="ds-card p-4"><QualityScoreBar score={52} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <QualityScorePill score={94} />
              <QualityScorePill score={78} />
              <QualityScorePill score={62} />
              <QualityScorePill score={41} />
            </div>
          </Section>

          <Section title="Buyer &amp; member trust" subtitle="Snapshot shown on every profile and property owner card.">
            <BuyerTrustPanel snapshot={{
              yearsOnSpaces: 2, responseRate: 96, responseTime: "12m", transactions: 18, rating: 4.9, reviewCount: 63,
            }} />
          </Section>

          <Section title="Trust score" subtitle="Overall member reputation, tiered new → elite.">
            <div className="ds-card flex items-center justify-center p-8">
              <TrustScoreRing score={trust.score} tier={trust.tier} size={148} />
            </div>
          </Section>

          <Section title="Report system" subtitle="Available on every listing and profile.">
            <div className="ds-card flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">Users can report fake, mispriced, sold, spam, fraud, duplicate or offensive content.</div>
              <ReportDialog target="this listing" />
            </div>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
