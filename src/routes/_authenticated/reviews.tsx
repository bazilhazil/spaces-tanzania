import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReviewsCenter } from "@/components/reviews/reviews-center";

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
  head: () => ({
    meta: [
      { title: "Reviews & Ratings · SPACES" },
      { name: "description", content: "Rate the properties, owners and agents you dealt with on SPACES, and reply to reviews about you." },
      { property: "og:title", content: "Reviews & Ratings on SPACES" },
      { property: "og:description", content: "Genuine reviews from completed viewings and deals on SPACES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReviewsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl">
        <ReviewsCenter />
      </div>
    </DashboardShell>
  );
}
