import { createFileRoute } from "@tanstack/react-router";
import { Syringe } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/injection-mapping")({
  component: InjectionMappingPage,
});

function InjectionMappingPage() {
  return (
    <PageStub
      title="Injection Mapping"
      description="Aesthetic-specific tool — record neurotoxin and filler injection sites on a face/body diagram."
      phase="Phase 3"
      icon={<Syringe className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Interactive face & body diagrams",
        "Track product, units, lot number per site",
        "Visit-by-visit comparison",
        "Auto-link to inventory deduction",
      ]}
    />
  );
}
