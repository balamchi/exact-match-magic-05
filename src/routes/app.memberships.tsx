import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/memberships")({
  component: MembershipsPage,
});

function MembershipsPage() {
  return (
    <PageStub
      title="Memberships"
      description="Recurring subscription plans — VIP, Glow Club, monthly facials with auto-billing."
      phase="Phase 2"
      icon={<BadgeCheck className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Recurring billing via Stripe",
        "Tiered membership levels",
        "Member-only pricing on services",
        "Renewal reminders & churn tracking",
      ]}
    />
  );
}
