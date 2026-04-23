import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/consent")({ component: ConsentPage });

function ConsentPage() {
  return <ResourceModule title="Consent Forms" eyebrow="Digital consent" description="Maintain reusable treatment consent templates and active form versions." table="consent_forms" icon={<Shield className="h-4.5 w-4.5" />} searchKeys={["title", "body"]} columns={["title", "active", "body"]} defaults={{ active: true }} metrics={[{ label: "Active", value: (rows) => rows.filter((row) => row.active).length.toString() }, { label: "Inactive", value: (rows) => rows.filter((row) => !row.active).length.toString() }]} fields={[{ key: "title", label: "Title", required: true, max: 160 }, { key: "body", label: "Body", type: "textarea", max: 4000 }, { key: "active", label: "Active", type: "boolean" }]} />;
}