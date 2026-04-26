import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  return (
    <PageStub
      title="Referrals"
      description="Give-and-get referral program — clients share a code, both get credit."
      phase="Phase 2"
      icon={<Share2 className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Auto-generated referral codes per client",
        "Configurable rewards (% off, $ credit, free service)",
        "Track referrer → referee conversion",
        "Leaderboard of top advocates",
      ]}
    />
  );
}
