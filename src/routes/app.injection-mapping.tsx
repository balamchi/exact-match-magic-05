import { createFileRoute } from "@tanstack/react-router";
import { Syringe } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/injection-mapping")({ component: InjectionMappingPage });

function InjectionMappingPage() {
  return (
    <ResourceModule
      title="Injection mapping"
      eyebrow="Clinical"
      description="Track product, region, and units per visit for neuromodulators and dermal fillers."
      table="injection_sites"
      icon={<Syringe className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "product", "region"]}
      columns={["client_name", "product", "region", "units", "visit_date"]}
      orderBy="visit_date"
      metrics={[
        {
          label: "Total units (30 days)",
          value: (rows) => {
            const cutoff = Date.now() - 30 * 86400 * 1000;
            return rows
              .filter((r) => new Date(String(r.visit_date)).getTime() >= cutoff)
              .reduce((s, r) => s + Number(r.units ?? 0), 0)
              .toString();
          },
        },
        { label: "Distinct products", value: (rows) => new Set(rows.map((r) => r.product)).size.toString() },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "product", label: "Product", required: true, max: 120, placeholder: "Botox, Juvederm…" },
        { key: "region", label: "Region", required: true, max: 120, placeholder: "Glabella, lips…" },
        { key: "units", label: "Units", type: "number", min: 0 },
        { key: "visit_date", label: "Visit date", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
