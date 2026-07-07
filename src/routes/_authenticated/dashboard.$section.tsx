import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/$section")({
  component: SectionPage,
});

const TITLES: Record<string, { title: string; desc: string }> = {
  properties: { title: "Properties", desc: "Your listings will appear here." },
  upload: { title: "Upload Property", desc: "Full property upload flow coming next." },
  messages: { title: "Messages", desc: "Chats with buyers, tenants, and agents." },
  viewings: { title: "Viewing Requests", desc: "Scheduled tours and requests." },
  analytics: { title: "Analytics", desc: "Insights into your listings and performance." },
  subscription: { title: "Subscription", desc: "Manage your plan and billing." },
  settings: { title: "Settings", desc: "Update your profile, security, and preferences." },
  favorites: { title: "Favorites", desc: "Properties you've saved." },
  searches: { title: "Saved Searches", desc: "Get alerts when new matches go live." },
  clients: { title: "Clients", desc: "Manage your client pipeline." },
  users: { title: "Users", desc: "Everyone on SPACES." },
  verification: { title: "Verification", desc: "Approve listings and owner IDs." },
  reports: { title: "Reports", desc: "Flagged content and platform reports." },
  payments: { title: "Payments", desc: "Revenue and payouts." },
};

function SectionPage() {
  const { section } = Route.useParams();
  const meta = TITLES[section] ?? { title: section, desc: "" };
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-foreground">{meta.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta.desc}</p>
        </header>
        <div className="rounded-3xl border border-dashed border-border bg-background/60 p-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">Nothing here yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            This section is being wired up. Your data will populate automatically as you use SPACES.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
