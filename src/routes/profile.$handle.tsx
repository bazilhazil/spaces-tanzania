import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicProfile } from "@/components/trust/public-profile";
import { MOCK_PROFILES } from "@/lib/trust-engine";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/profile/$handle")({
  loader: ({ params }) => {
    const profile = MOCK_PROFILES[params.handle];
    if (!profile) throw notFound();
    return { profile };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    if (!p) return { meta: [{ title: "Profile · SPACES" }] };
    return {
      meta: [
        { title: `${p.displayName} · ${p.role} on SPACES` },
        { name: "description", content: `${p.displayName} — ${p.role} on SPACES. ${p.stats.listings} listings, ${p.stats.rating.toFixed(1)}★ from ${p.stats.reviewCount} reviews.` },
        { property: "og:title", content: `${p.displayName} on SPACES` },
        { property: "og:description", content: p.bio },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ProfilePage,
  errorComponent: () => <ProfileError />,
  notFoundComponent: () => <ProfileError />,
});

function ProfilePage() {
  const { profile } = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-gray-50)]">
      <SiteHeader />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-5xl px-4">
          <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> All agents
          </Link>
          <PublicProfile profile={profile} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProfileError() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-gray-50)]">
      <SiteHeader />
      <main className="grid flex-1 place-items-center px-4 py-16">
        <div className="ds-card max-w-md p-8 text-center">
          <h1 className="ds-h-md">Profile not found</h1>
          <p className="ds-body mt-2 text-muted-foreground">The person you're looking for doesn't exist on SPACES yet.</p>
          <Link to="/agents" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-brand-700)] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Browse all agents
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
