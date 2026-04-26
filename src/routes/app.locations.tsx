import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/locations")({ component: LocationsPage });

function LocationsPage() {
  return (
    <ResourceModule
      title="Locations"
      eyebrow="Multi-site"
      description="Manage additional clinic locations with address, timezone, and contact details."
      table="locations"
      icon={<MapPin className="h-4.5 w-4.5" />}
      searchKeys={["name", "city", "region", "phone"]}
      columns={["name", "city", "region", "phone", "active"]}
      defaults={{ active: true, country: "CA", timezone: "America/Toronto" }}
      metrics={[
        { label: "Active locations", value: (rows) => rows.filter((r) => r.active).length.toString() },
        { label: "Cities covered", value: (rows) => new Set(rows.map((r) => r.city).filter(Boolean)).size.toString() },
      ]}
      fields={[
        { key: "name", label: "Location name", required: true, max: 160 },
        { key: "address_line1", label: "Address", max: 200 },
        { key: "city", label: "City", max: 120 },
        { key: "region", label: "Province / state", max: 120 },
        { key: "postal_code", label: "Postal code", max: 20 },
        { key: "country", label: "Country", max: 80 },
        { key: "phone", label: "Phone", type: "tel", max: 40 },
        { key: "timezone", label: "Timezone", max: 80, placeholder: "America/Toronto" },
        { key: "active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
