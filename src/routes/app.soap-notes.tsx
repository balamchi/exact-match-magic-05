import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/soap-notes")({ component: SoapNotesPage });

function SoapNotesPage() {
  return (
    <ResourceModule
      title="SOAP notes"
      eyebrow="Clinical"
      description="Subjective, Objective, Assessment, and Plan notes for each visit."
      table="soap_notes"
      icon={<FileText className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "subjective", "assessment"]}
      columns={["client_name", "visit_date", "signed", "updated_at"]}
      defaults={{ signed: false }}
      orderBy="visit_date"
      metrics={[
        { label: "Signed", value: (rows) => rows.filter((r) => r.signed).length.toString() },
        { label: "Drafts", value: (rows) => rows.filter((r) => !r.signed).length.toString() },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "visit_date", label: "Visit date", type: "date", required: true },
        { key: "subjective", label: "Subjective", type: "textarea", max: 4000 },
        { key: "objective", label: "Objective", type: "textarea", max: 4000 },
        { key: "assessment", label: "Assessment", type: "textarea", max: 4000 },
        { key: "plan", label: "Plan", type: "textarea", max: 4000 },
        { key: "signed", label: "Signed", type: "boolean" },
      ]}
    />
  );
}
