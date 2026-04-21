import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/giftcards")({ component: () => (
  <PageStub
    title="Gift Cards"
    description="Sell digital and physical gift cards with full balance tracking."
    icon={<Gift className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Custom denominations",
      "Branded digital delivery",
      "Physical card activation",
      "Balance tracking",
      "Bulk corporate orders",
      "Expiry rules & accounting",
    ]}
  />
)});
