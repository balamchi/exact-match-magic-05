import { createFileRoute } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/coupons")({ component: () => (
  <PageStub
    title="Coupons & Promo Codes"
    description="Create, distribute, and track discount codes across services and channels."
    icon={<Ticket className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Percent or fixed-amount discounts",
      "Service & category targeting",
      "Single-use or unlimited",
      "Expiry & usage caps",
      "Trackable per-channel codes",
      "Redemption analytics",
    ]}
  />
)});
