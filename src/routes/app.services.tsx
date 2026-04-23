import { createFileRoute } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/services")({ component: ServicesPage });

function ServicesPage() {
  return <ResourceModule title="Services" eyebrow="Service menu" description="Manage bookable treatments, categories, durations, pricing, and availability." table="services" icon={<HeartPulse className="h-4.5 w-4.5" />} searchKeys={["name", "category"]} columns={["name", "category", "duration_minutes", "price_cents", "active"]} defaults={{ active: true, duration_minutes: "60", price_cents: "0" }} metrics={[{ label: "Active services", value: (rows) => rows.filter((row) => row.active).length.toString() }, { label: "Average price", value: (rows) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format((rows.reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0) / Math.max(rows.length, 1)) / 100) }]} fields={[{ key: "name", label: "Service name", required: true, max: 160 }, { key: "category", label: "Category", max: 120, placeholder: "Injectables, Skin, Wellness…" }, { key: "duration_minutes", label: "Duration minutes", type: "number", min: 5 }, { key: "price_cents", label: "Price", type: "money", min: 0 }, { key: "active", label: "Active", type: "boolean" }]} />;
}