import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/soap-notes")({
  component: SoapNotesPage,
});

function SoapNotesPage() {
  return (
    <PageStub
      title="SOAP Notes"
      description="Medical-grade clinical charting — Subjective, Objective, Assessment, Plan with templates."
      phase="Phase 3"
      icon={<Stethoscope className="h-6 w-6 text-primary-foreground" />}
      features={[
        "SOAP-structured note editor",
        "Template library by treatment type",
        "E-signature & lock after sign-off",
        "Audit trail for compliance",
      ]}
    />
  );
}
