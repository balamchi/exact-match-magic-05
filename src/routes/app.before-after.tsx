import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/before-after")({ component: BeforeAfterPage });

function BeforeAfterPage() {
  return (
    <ResourceModule
      title="Before / after"
      eyebrow="Photo library"
      description="Track before-and-after photos per client and treatment with a consent flag."
      table="before_after_photos"
      icon={<Images className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "treatment", "notes"]}
      columns={["client_name", "treatment", "taken_on", "consent_given"]}
      defaults={{ consent_given: false }}
      orderBy="taken_on"
      metrics={[
        { label: "With consent", value: (rows) => rows.filter((r) => r.consent_given).length.toString() },
        {
          label: "Last 30 days",
          value: (rows) => {
            const cutoff = Date.now() - 30 * 86400 * 1000;
            return rows.filter((r) => new Date(String(r.taken_on)).getTime() >= cutoff).length.toString();
          },
        },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "treatment", label: "Treatment", max: 160 },
        { key: "taken_on", label: "Taken on", type: "date" },
        { key: "before_url", label: "Before image URL", max: 500 },
        { key: "after_url", label: "After image URL", max: 500 },
        { key: "consent_given", label: "Consent given", type: "boolean" },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
