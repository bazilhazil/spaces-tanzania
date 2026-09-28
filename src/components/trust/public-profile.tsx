import { Star, Building2, Award, Calendar, MapPin, Flag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "./verification-badge";
import { ReportSheet } from "@/components/safety/report-sheet";
import { BlockUserDialog, useBlockState } from "@/components/safety/block-user-dialog";
import { Ban } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";
import { type PublicProfileData } from "@/lib/trust-engine";
import { PersonReviews } from "@/components/reviews/person-reviews";
import { cn } from "@/lib/utils";

export function PublicProfile({ profile, userId, className }: { profile: PublicProfileData; userId?: string; className?: string }) {
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
                  {/* Wording is driven only by real verification flags. */}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                      profile.verifiedBadges.length
                        ? "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]"
                        : "bg-muted text-muted-foreground ring-border",
                    )}
                  >
                    {profile.verifiedBadges.length ? "Verified by SPACES" : "Not yet verified"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {profile.role}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Member since {profile.memberSince}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
          {userId && <DalaliExtras userId={userId} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {profile.stats.reviewCount > 0 && (
          <Stat icon={Star} label="Rating" value={`${profile.stats.rating.toFixed(1)} \u2605`} sub={`${profile.stats.reviewCount} reviews`} />
        )}
        <Stat icon={Building2} label="Active listings" value={profile.stats.listings.toString()} />
        {profile.stats.transactions > 0 && (
          <Stat icon={Award} label="Completed deals" value={profile.stats.transactions.toString()} />
        )}
        <Stat icon={Calendar} label="Member since" value={profile.memberSince} />
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

      {userId && <PersonReviews userId={userId} responseTime={profile.stats.responseTime === "—" ? undefined : profile.stats.responseTime} />}
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

function DalaliExtras({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [x, setX] = useState<{ areas_served: string[] | null; services: string[] | null; experience_years: number | null } | null>(null);
  useEffect(() => {
    supabase.rpc("public_dalali_extras", { _id: userId }).then(({ data }) => setX((data as any)?.[0] ?? null));
  }, [userId]);
  if (!x || (!x.areas_served?.length && !x.services?.length && !x.experience_years)) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      {!!x.areas_served?.length && <span><MapPin className="mr-1 inline h-3.5 w-3.5" />{t("s3.areas")}: <span className="text-foreground">{x.areas_served.join(", ")}</span></span>}
      {!!x.services?.length && <span>{x.services.map((s) => t(`s3.services.${s}`)).join(" · ")}</span>}
      {!!x.experience_years && <span><Award className="mr-1 inline h-3.5 w-3.5" />{t("s3.experience")}: <span className="text-foreground">{x.experience_years}</span></span>}
    </div>
  );
}
