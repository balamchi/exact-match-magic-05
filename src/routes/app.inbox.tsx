import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  return (
    <PageStub
      title="Inbox"
      description="Unified inbox for SMS, email, and WhatsApp conversations with clients."
      phase="Phase 2"
      icon={<Inbox className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Split-pane conversation view",
        "SMS via Twilio, email via SendGrid",
        "Templates & quick replies",
        "Linked to client profile",
      ]}
    />
  );
}
