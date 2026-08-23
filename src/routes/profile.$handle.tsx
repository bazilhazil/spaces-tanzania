import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PublicProfile } from "@/components/trust/public-profile";
import type { PublicProfileData, VerificationKind } from "@/lib/trust-engine";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile/$handle")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Owner & agent profile · SPACES" },
      { name: "description", content: "Public SPACES profile with verification status, active listings and reviews." },
      { property: "og:title", content: "Owner & agent profile · SPACES" },
      { property: "og:description", content: "Verification status, active listings and reviews on SPACES." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "S";
}

/** Builds a public profile purely from real database records. */
async function loadProfile(userId: string): Promise<PublicProfileData | null> {
  const { data } = await supabase
    .from("public_profiles")
    .select("id,full_name,agency_name,business_name,location,bio,created_at,verified_identity,verified_owner,verified_agent,verified_business")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const p = data as any;

  const [{ count: listings }, ratingRes, { count: deals }] = await Promise.all([
    supabase.from("public_properties").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.rpc("user_rating", { _user_id: userId } as never),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("stage", "completed"),
  ]);
  const ratingRow = Array.isArray(ratingRes.data) ? (ratingRes.data[0] as any) : (ratingRes.data as any);

  const badges: VerificationKind[] = [];
  if (p.verified_identity) badges.push("identity");
  if (p.verified_agent) badges.push("agent");
  if (p.verified_business) badges.push("business");
  if (p.verified_owner) badges.push("property");

  const name = p.full_name || "SPACES member";
  return {
    handle: p.id,
    displayName: name,
    memberSince: p.created_at
      ? new Date(p.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : "—",
    role: p.verified_agent ? "Agent" : p.business_name ? "Business" : "Owner",
    location: p.location || "Tanzania",
    bio: p.bio || "",
    avatarInitials: initials(name),
    verifiedBadges: badges,
    stats: {
      responseRate: 0,
      responseTime: "—",
      listings: listings ?? 0,
      transactions: deals ?? 0,
      rating: Number(ratingRow?.average ?? 0),
      reviewCount: Number(ratingRow?.total ?? 0),
    },
  };
}

function ProfilePage() {
  const { handle } = Route.useParams();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadProfile(handle).then((p) => {
      if (!alive) return;
      setProfile(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [handle]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-gray-50)]">
      <SiteHeader />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-5xl px-4">
          <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> All agents
          </Link>
          {loading ? (
            <div className="ds-card h-64 animate-pulse" />
          ) : profile ? (
            <PublicProfile profile={profile} userId={handle} />
          ) : (
            <div className="ds-card max-w-md p-8 text-center">
              <h1 className="ds-h-md">Profile not found</h1>
              <p className="ds-body mt-2 text-muted-foreground">
                This person doesn't have a public SPACES profile.
              </p>
              <Link to="/agents" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-brand-700)] hover:underline">
                Browse agents
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
