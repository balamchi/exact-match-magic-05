import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/before-after")({
  component: BeforeAfterPage,
});

function BeforeAfterPage() {
  return (
    <PageStub
      title="Before / After Gallery"
      description="Capture clinical photos with consent — side-by-side comparison and marketing-ready exports."
      phase="Phase 3"
      icon={<Images className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Standardized photo capture (angle/lighting prompts)",
        "HIPAA-grade storage with consent flag",
        "Side-by-side slider comparison",
        "One-tap social-ready export",
      ]}
    />
  );
}
