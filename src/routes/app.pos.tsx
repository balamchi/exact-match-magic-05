import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/pos")({
  component: PosPage,
});

function PosPage() {
  return (
    <PageStub
      title="POS & Payments"
      description="In-clinic point of sale — ring up services, products, packages, and gift cards with Stripe."
      phase="Phase 2"
      icon={<CreditCard className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Cart with services + retail products",
        "Stripe Terminal & online payments",
        "Apply coupons, gift cards, packages",
        "Tip handling and split payments",
      ]}
    />
  );
}
