import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/packages")({ component: PackagesPage });

function PackagesPage() {
  return <ResourceModule title="Packages" eyebrow="Prepaid care" description="Build prepaid bundles with session counts, pricing, and expiry rules." table="packages" icon={<Package className="h-4.5 w-4.5" />} searchKeys={["name", "description"]} columns={["name", "sessions", "price_cents", "expires_after_days", "active"]} defaults={{ sessions: "1", active: true }} metrics={[{ label: "Active", value: (rows) => rows.filter((row) => row.active).length.toString() }, { label: "Package value", value: (rows) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(rows.reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0) / 100) }]} fields={[{ key: "name", label: "Name", required: true, max: 120 }, { key: "description", label: "Description", type: "textarea", max: 1000 }, { key: "sessions", label: "Sessions", type: "number", min: 1 }, { key: "price_cents", label: "Price", type: "money", min: 0 }, { key: "expires_after_days", label: "Expires after days", type: "number", min: 1 }, { key: "active", label: "Active", type: "boolean" }]} />;
}