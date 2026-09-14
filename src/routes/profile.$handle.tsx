import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2 } from "lucide-react";
import { PublicProfile } from "@/components/trust/public-profile";
import { PropertyShareDialog } from "@/components/property-share-dialog";
import { PropertyCard } from "@/components/property-card";
import { SkeletonCard } from "@/components/ds";
import { Button } from "@/components/ui/button";
import type { PublicProfileData, VerificationKind } from "@/lib/trust-engine";
import type { Property } from "@/lib/mock-data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { fetchPropertiesByOwner } from "@/lib/properties-db";
import { getProfileSeo } from "@/lib/public-listings.functions";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/profile/$handle")({
  loader: async ({ params }) => {
    const seo = await getProfileSeo({ data: { id: params.handle } });
    return { seo };
  },
  component: ProfilePage,
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/profile/${params.handle}`;
    const seo = loaderData?.seo;
    if (!seo) {
      return {
        meta: [
          { title: "Profile unavailable · SPACES" },
          { name: "description", content: "This SPACES profile is not available." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    // Only genuinely public professional profiles are offered to search engines.
    const indexable = (seo.isAgent || seo.isBusiness) && seo.listings > 0;
    const who = seo.agency ? `${seo.name} · ${seo.agency}` : seo.name;
    const title = seo.isAgent
      ? `${who} — Verified Real Estate Agent${seo.location ? ` in ${seo.location}` : ""} | SPACES`
      : `${who} on SPACES`;
    const description =
      (seo.bio || "").replace(/\s+/g, " ").trim().slice(0, 150) ||
      `${seo.name} has ${seo.listings} active space${seo.listings === 1 ? "" : "s"} on SPACES${
        seo.location ? ` in ${seo.location}` : ""
      }. See listings, verification status and reviews.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        ...(indexable ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
  const [listings, setListings] = useState<Property[] | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setListings(null);
    loadProfile(handle).then((p) => {
      if (!alive) return;
      setProfile(p);
      setLoading(false);
      if (p) void fetchPropertiesByOwner(handle).then((rows) => { if (alive) setListings(rows); });
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Link to="/agents" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> All agents
            </Link>
            {profile && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            )}
          </div>
          {loading ? (
            <div className="ds-card h-64 animate-pulse" />
          ) : profile ? (
            <>
              <PublicProfile profile={profile} userId={handle} />

              <section className="mt-8">
                <h2 className="ds-h-md mb-4">
                  Active listings{listings ? ` (${listings.length})` : ""}
                </h2>
                {listings === null ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : listings.length === 0 ? (
                  <p className="ds-body text-muted-foreground">
                    No spaces are publicly listed right now.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((p) => <PropertyCard key={p.id} property={p} />)}
                  </div>
                )}
              </section>
            </>
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
      {profile && (
        <PropertyShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          title={profile.displayName}
          location={profile.location}
          url={`${SITE_URL}/profile/${handle}`}
        />
      )}
    </div>
  );
}
