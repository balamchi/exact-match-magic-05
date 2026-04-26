import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/treatment-plans")({
  component: TreatmentPlansPage,
});

function TreatmentPlansPage() {
  return (
    <PageStub
      title="Treatment Plans"
      description="Multi-session protocols with goals, milestones, and pricing — sell as a package."
      phase="Phase 3"
      icon={<ListChecks className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Templated protocols by concern",
        "Session-by-session schedule",
        "Progress tracking & adjustments",
        "Convert plan to package sale",
      ]}
    />
  );
}
