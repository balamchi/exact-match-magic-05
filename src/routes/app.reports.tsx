import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/reports")({ component: () => (
  <PageStub
    title="Reports & Analytics"
    description="Revenue, retention, no-show rates, staff performance, and 30+ pre-built reports."
    icon={<BarChart3 className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Revenue by service / staff / day",
      "Booking density heat map",
      "No-show & rebook rate",
      "Client lifetime value",
      "Cohort retention",
      "Custom report builder",
    ]}
  />
)});
