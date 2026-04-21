import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/calendar")({ component: () => (
  <PageStub
    title="Calendar"
    description="Day, week, and month views across all staff and resources, with drag-to-reschedule."
    icon={<Calendar className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Day / week / month views",
      "Drag to reschedule",
      "Color-coded by staff",
      "Density heat map",
      "Filter by service or provider",
      "Block time & lunch breaks",
    ]}
  />
)});
