import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  PropertiesPanel, UsersPanel, AgentsPanel, VerificationPanel, ReportsPanel,
  BookingsPanel, MessagesPanel, SupportPanel, PaymentsPanel, SubscriptionsPanel,
  AnalyticsPanel, AuditPanel, MarketingPanel, NotificationsPanel, SettingsPanel,
  SuperAdminPanel,
} from "@/components/admin/panels";

const PANELS: Record<string, React.ComponentType> = {
  properties: PropertiesPanel,
  users: UsersPanel,
  agents: AgentsPanel,
  verification: VerificationPanel,
  reports: ReportsPanel,
  bookings: BookingsPanel,
  messages: MessagesPanel,
  support: SupportPanel,
  payments: PaymentsPanel,
  subscriptions: SubscriptionsPanel,
  analytics: AnalyticsPanel,
  audit: AuditPanel,
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
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function SectionPage() {
  const { section } = Route.useParams();
  const Panel = PANELS[section];
  return <Panel />;
}
