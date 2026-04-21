import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/consent")({ component: () => (
  <PageStub
    title="Digital Consent Forms"
    description="Build, send, sign, and store legally-binding consent forms."
    icon={<Shield className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Form builder with custom fields",
      "Pre-filled client data",
      "E-signature with audit trail",
      "Auto-email signed PDF",
      "Template library by service",
      "Versioning & revisions",
    ]}
  />
)});
