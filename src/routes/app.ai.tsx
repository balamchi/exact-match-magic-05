import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/ai")({
  component: AiAssistantPage,
});

function AiAssistantPage() {
  return (
    <PageStub
      title="AI Assistant"
      description="Ask questions about your clinic in plain English — bookings, revenue, client trends, recommendations."
      phase="Phase 3"
      icon={<Bot className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Chat-based queries on your data",
        "Smart suggestions across the app",
        "Daily briefing & anomaly alerts",
        "Powered by Lovable AI",
      ]}
    />
  );
}
