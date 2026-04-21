import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/inventory")({ component: () => (
  <PageStub
    title="Inventory"
    description="Track product stock, usage per treatment, and reorder thresholds."
    icon={<Boxes className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Per-product stock levels",
      "Usage deduction by service",
      "Low-stock alerts",
      "Lot & expiry tracking",
      "Supplier management",
      "Cost-of-goods reporting",
    ]}
  />
)});
