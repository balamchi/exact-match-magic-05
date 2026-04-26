import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <PageStub
      title="Reviews & Reputation"
      description="Auto-request reviews after appointments and monitor Google, Yelp, and Facebook ratings."
      phase="Phase 2"
      icon={<Star className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Post-visit review requests via SMS/email",
        "Google Business Profile sync",
        "Reply to reviews from inbox",
        "Sentiment dashboard",
      ]}
    />
  );
}
