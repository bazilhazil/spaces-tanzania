import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  PropertiesPanel, UsersPanel, AgentsPanel, VerificationPanel,
  BookingsPanel, MessagesPanel, SupportPanel, PaymentsPanel, SubscriptionsPanel,
  AnalyticsPanel, MarketingPanel, NotificationsPanel, SettingsPanel,
  SuperAdminPanel,
} from "@/components/admin/panels";
import {
  LeadOpsPanel, ViewingOpsPanel, DealOpsPanel, RevenueOpsPanel, ActivityLogPanel,
} from "@/components/admin/ops-panels";
import { ReviewsPanel } from "@/components/admin/reviews-panel";
import { SafetyPanel } from "@/components/admin/safety-panel";

const PANELS: Record<string, React.ComponentType> = {
  properties: PropertiesPanel,
  users: UsersPanel,
  agents: AgentsPanel,
  verification: VerificationPanel,
  reports: SafetyPanel,
  safety: SafetyPanel,
  reviews: ReviewsPanel,
  leads: LeadOpsPanel,
  viewings: ViewingOpsPanel,
  deals: DealOpsPanel,
  revenue: RevenueOpsPanel,
  bookings: BookingsPanel,
  messages: MessagesPanel,
  support: SupportPanel,
  payments: PaymentsPanel,
  subscriptions: SubscriptionsPanel,
  analytics: AnalyticsPanel,
  audit: ActivityLogPanel,
  marketing: MarketingPanel,
  notifications: NotificationsPanel,
  settings: SettingsPanel,
  superadmin: SuperAdminPanel,
};

export const Route = createFileRoute("/_authenticated/admin/$section")({
  loader: ({ params }) => {
    if (!PANELS[params.section]) throw notFound();
    return { section: params.section };
  },
  component: SectionPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-2xl font-semibold">Section not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">The admin section you requested doesn't exist.</p>
    </div>
  ),
  errorComponent: ({ error }) => {
    if (import.meta.env.DEV) console.error("[admin/section]", error);
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="font-display text-2xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
      </div>
    );
  },
});

function SectionPage() {
  const { section } = Route.useParams();
  const Panel = PANELS[section];
  return <Panel />;
}
