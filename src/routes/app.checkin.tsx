import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/checkin")({ component: CheckinPage });

function CheckinPage() {
  return (
    <ResourceModule
      title="Check-in"
      eyebrow="Front desk"
      description="Track who has arrived, who's seated, and who's been seen. Real-time waitlist."
      table="checkins"
      icon={<ClipboardCheck className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "status", "notes"]}
      columns={["client_name", "status", "checked_in_at", "seated_at", "completed_at"]}
      defaults={{ status: "waiting" }}
      orderBy="checked_in_at"
      metrics={[
        { label: "Waiting", value: (rows) => rows.filter((r) => r.status === "waiting").length.toString() },
        { label: "Seated", value: (rows) => rows.filter((r) => r.status === "seated").length.toString() },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Waiting", value: "waiting" },
          { label: "Seated", value: "seated" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
        ]},
        { key: "seated_at", label: "Seated at", type: "datetime" },
        { key: "completed_at", label: "Completed at", type: "datetime" },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
