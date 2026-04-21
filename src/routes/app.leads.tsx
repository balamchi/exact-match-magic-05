import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/leads")({ component: () => (
  <PageStub
    title="Lead Management"
    description="Sales pipeline from first inquiry to booked consult."
    icon={<Target className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Drag-and-drop kanban pipeline",
      "Source attribution",
      "Auto-assign & SLA timers",
      "Pipeline velocity metrics",
      "Web form capture",
      "Conversion reports",
    ]}
  />
)});
