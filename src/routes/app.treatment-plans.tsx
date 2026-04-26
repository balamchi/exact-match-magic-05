import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/treatment-plans")({ component: TreatmentPlansPage });

function TreatmentPlansPage() {
  return (
    <ResourceModule
      title="Treatment plans"
      eyebrow="Clinical"
      description="Multi-visit care plans with goals, status, and estimated total."
      table="treatment_plans"
      icon={<ListChecks className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "title", "status"]}
      columns={["client_name", "title", "estimated_total_cents", "status", "updated_at"]}
      defaults={{ status: "draft" }}
      metrics={[
        { label: "Active", value: (rows) => rows.filter((r) => r.status === "active").length.toString() },
        {
          label: "Estimated value",
          value: (rows) => {
            const sum = rows
              .filter((r) => ["active", "draft"].includes(String(r.status)))
              .reduce((s, r) => s + Number(r.estimated_total_cents ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "title", label: "Plan title", required: true, max: 200 },
        { key: "goals", label: "Goals", type: "textarea", max: 2000 },
        { key: "estimated_total_cents", label: "Estimated total", type: "money", min: 0 },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Completed", value: "completed" },
          { label: "Declined", value: "declined" },
        ]},
      ]}
    />
  );
}
