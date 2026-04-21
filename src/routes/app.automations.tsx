import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/automations")({ component: () => (
  <PageStub
    title="Automations"
    description="Triggered follow-ups, recall reminders, review requests, and more."
    icon={<Zap className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Visual workflow builder",
      "Booking, no-show & post-visit triggers",
      "Multi-step sequences",
      "Conditional branching",
      "Performance analytics",
      "Pre-built template library",
    ]}
  />
)});
