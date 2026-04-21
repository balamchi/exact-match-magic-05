import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/marketing")({ component: () => (
  <PageStub
    title="Marketing & Campaigns"
    description="SMS and email campaigns with two-way messaging and segmentation."
    icon={<Send className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Drag-and-drop email builder",
      "SMS broadcasts & two-way chat",
      "Smart segments by behavior",
      "A/B testing",
      "Campaign performance reports",
      "Unsubscribe & compliance",
    ]}
  />
)});
