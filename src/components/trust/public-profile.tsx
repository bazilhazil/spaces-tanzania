import { Star, MessageCircle, Timer, Building2, Award, Calendar, MapPin, Flag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "./verification-badge";
import { TrustScoreRing } from "./trust-score-ring";
import { ReportSheet } from "@/components/safety/report-sheet";
import { BlockUserDialog, useBlockState } from "@/components/safety/block-user-dialog";
import { Ban } from "lucide-react";
import { useState } from "react";
import { computeTrustScore, MOCK_TRUST_SIGNALS, type PublicProfileData } from "@/lib/trust-engine";
import { PersonReviews } from "@/components/reviews/person-reviews";
import { cn } from "@/lib/utils";

export function PublicProfile({ profile, userId, className }: { profile: PublicProfileData; userId?: string; className?: string }) {
  const trust = computeTrustScore(MOCK_TRUST_SIGNALS);
  const [blockOpen, setBlockOpen] = useState(false);
  const { blocked, setBlocked } = useBlockState(userId ?? null);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="ds-card overflow-hidden">
        <div className="h-28 bg-linear-to-br from-[color:var(--color-brand-600)] via-[color:var(--color-brand-500)] to-[color:var(--color-gold-500)]" />
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-[var(--shadow-md)]">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {profile.avatarInitials}
                </AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
                  {profile.verifiedBadges.map((b) => (
                    <VerificationBadge key={b} kind={b} size="sm" withLabel={false} />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {profile.role}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Member since {profile.memberSince}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button className="rounded-full">Contact</Button>
              <ReportSheet
                target={{ type: "user", label: profile.displayName, userId: userId ?? null }}
                trigger={
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
                    <Flag className="h-4 w-4" /> Report
                  </Button>
                }
              />
              {userId && (
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setBlockOpen(true)}>
                  <Ban className="h-4 w-4" /> {blocked ? "Unblock" : "Block"}
                </Button>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="ds-body mt-5 max-w-2xl text-foreground/80">{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="ds-card grid place-items-center p-6">
          <TrustScoreRing score={trust.score} tier={trust.tier} size={148} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat icon={Star}         label="Rating"           value={`${profile.stats.rating.toFixed(1)} ★`} sub={`${profile.stats.reviewCount} reviews`} />
          <Stat icon={MessageCircle} label="Response rate"    value={`${profile.stats.responseRate}%`} />
          <Stat icon={Timer}         label="Avg response"     value={profile.stats.responseTime} />
          <Stat icon={Building2}     label="Active listings"  value={profile.stats.listings.toString()} />
          <Stat icon={Award}         label="Transactions"     value={profile.stats.transactions.toString()} />
          <Stat icon={Calendar}      label="Member since"     value={profile.memberSince} />
        </div>
      </div>

      {userId && (
        <BlockUserDialog
          open={blockOpen}
          onOpenChange={setBlockOpen}
          userId={userId}
          name={profile.displayName}
          blocked={blocked}
          onChanged={setBlocked}
        />
      )}

      {userId && <PersonReviews userId={userId} responseTime={profile.stats.responseTime} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between">
        <div className="ds-caption">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-1.5 font-display text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
