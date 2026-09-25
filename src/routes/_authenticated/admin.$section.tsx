import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  PropertiesPanel, UsersPanel, AgentsPanel, VerificationPanel,
  BookingsPanel, MessagesPanel, SubscriptionsPanel,
  AnalyticsPanel, MarketingPanel, NotificationsPanel, SettingsPanel,
  SuperAdminPanel,
} from "@/components/admin/panels";
import {
  LeadOpsPanel, ViewingOpsPanel, DealOpsPanel, ActivityLogPanel,
} from "@/components/admin/ops-panels";
import { ReviewsPanel } from "@/components/admin/reviews-panel";
import { SafetyPanel } from "@/components/admin/safety-panel";
import { SupportPanel } from "@/components/admin/support-panel";
import { DataBackupPanel } from "@/components/admin/data-backup-panel";
import { SmsPanel } from "@/components/admin/sms-panel";
import { LaunchPanel } from "@/components/admin/launch-panel";
import { ProductionReviewPanel } from "@/components/admin/production-review-panel";
import { MonetizationPanel } from "@/components/admin/monetization-panel";
import { AdminRevenuePanel, AdminPaymentsPanel } from "@/components/finance/admin-finance";

const PANELS: Record<string, React.ComponentType> = {
  launch: LaunchPanel,
  monetization: MonetizationPanel,
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
  revenue: AdminRevenuePanel,
  bookings: BookingsPanel,
  messages: MessagesPanel,
  support: SupportPanel,
  payments: AdminPaymentsPanel,
  subscriptions: SubscriptionsPanel,
  analytics: AnalyticsPanel,
  audit: ActivityLogPanel,
  marketing: MarketingPanel,
  notifications: NotificationsPanel,
  settings: SettingsPanel,
  data: DataBackupPanel,
  production: ProductionReviewPanel,
  sms: SmsPanel,
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
