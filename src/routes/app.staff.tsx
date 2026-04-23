import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/staff")({ component: StaffPage });

function StaffPage() {
  return <ResourceModule title="Staff" eyebrow="Team roster" description="Manage providers, front desk users, titles, calendar colors, and active team members." table="staff" icon={<UserCog className="h-4.5 w-4.5" />} searchKeys={["display_name", "title"]} columns={["display_name", "title", "color", "active"]} defaults={{ active: true, color: "#a78bfa" }} metrics={[{ label: "Active staff", value: (rows) => rows.filter((row) => row.active).length.toString() }, { label: "Providers", value: (rows) => rows.filter((row) => String(row.title ?? "").toLowerCase().includes("provider")).length.toString() }]} fields={[{ key: "display_name", label: "Display name", required: true, max: 160 }, { key: "title", label: "Title", max: 120, placeholder: "Provider, Nurse, Front desk…" }, { key: "color", label: "Calendar color", max: 32, placeholder: "#a78bfa" }, { key: "active", label: "Active", type: "boolean" }]} />;
}