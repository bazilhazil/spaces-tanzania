import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in to SPACES" },
      { name: "description", content: "Access your SPACES dashboard to manage listings, favorites, and viewings." },
    ],
  }),
});

function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-page grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <Logo className="h-10 w-10" />
            <h1 className="mt-6 font-display text-4xl font-semibold text-foreground">
              Sign in to SPACES
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Authentication is coming online next. In the meantime, browse verified properties
              and save the ones you love — we'll wire your account, dashboard, and property
              uploads in the next slice.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/">
                <Button variant="outline">Back to home</Button>
              </Link>
              <Link to="/properties">
                <Button className="bg-primary text-primary-foreground">Browse properties</Button>
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
            <h2 className="font-display text-xl font-semibold text-foreground">What's next</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>· Email & Google sign-in with role selection (Owner, Agent, Tenant)</li>
              <li>· Owner dashboard with property upload, edit, and analytics</li>
              <li>· In-app messaging and viewing requests</li>
              <li>· Verification workflow and Premium listing upgrades</li>
              <li>· Admin console with approvals and reporting</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
