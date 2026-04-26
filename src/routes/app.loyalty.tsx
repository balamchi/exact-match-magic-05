import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/loyalty")({
  component: LoyaltyPage,
});

function LoyaltyPage() {
  return (
    <PageStub
      title="Loyalty Program"
      description="Points-based rewards — earn on every visit, redeem for services and products."
      phase="Phase 2"
      icon={<Sparkles className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Configure earn rates per service",
        "Tiered rewards (Silver / Gold / Platinum)",
        "Redemption at POS",
        "Birthday & anniversary bonuses",
      ]}
    />
  );
}
