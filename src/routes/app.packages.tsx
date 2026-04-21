import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/packages")({ component: () => (
  <PageStub
    title="Packages & Bundles"
    description="Sell prepaid sessions, treatment bundles, and combo packages."
    icon={<Package className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Multi-session packages",
      "Combo bundles across services",
      "Per-package expiry rules",
      "Auto-deduct on visit",
      "Transferable packages",
      "Revenue recognition",
    ]}
  />
)});
