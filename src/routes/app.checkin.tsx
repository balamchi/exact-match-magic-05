import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/checkin")({
  component: CheckinPage,
});

function CheckinPage() {
  return (
    <PageStub
      title="Check-In / Kiosk"
      description="Self-service kiosk mode for arrivals — clients confirm appointments and sign consents on a tablet."
      phase="Phase 2"
      icon={<ClipboardCheck className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Tablet-friendly fullscreen mode",
        "Client looks up by phone or name",
        "Sign consent forms on screen",
        "Front-desk arrival queue",
      ]}
    />
  );
}
