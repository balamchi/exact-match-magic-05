import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/clients")({ component: () => (
  <PageStub
    title="Clients"
    description="Unified CRM with treatment history, photos, notes, and lifetime value."
    icon={<Users className="h-6 w-6 text-primary-foreground" />}
    features={[
      "360° client profile",
      "Treatment history timeline",
      "Before/after photos",
      "SOAP & clinical notes",
      "Tags & smart segments",
      "Loyalty points & LTV",
    ]}
  />
)});
