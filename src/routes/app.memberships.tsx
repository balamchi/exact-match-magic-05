import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/memberships")({ component: MembershipsPage });

function MembershipsPage() {
  return (
    <ResourceModule
      title="Memberships"
      eyebrow="Recurring revenue"
      description="Configure VIP and monthly membership plans with benefits and member counts."
      table="memberships"
      icon={<BadgeCheck className="h-4.5 w-4.5" />}
      searchKeys={["name", "description", "benefits"]}
      columns={["name", "monthly_price_cents", "member_count", "active"]}
      defaults={{ active: true }}
      metrics={[
        { label: "Active plans", value: (rows) => rows.filter((r) => r.active).length.toString() },
        {
          label: "Monthly recurring",
          value: (rows) => {
            const sum = rows
              .filter((r) => r.active)
              .reduce((s, r) => s + Number(r.monthly_price_cents ?? 0) * Number(r.member_count ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
      ]}
      fields={[
        { key: "name", label: "Plan name", required: true, max: 160 },
        { key: "description", label: "Description", type: "textarea", max: 1000 },
        { key: "monthly_price_cents", label: "Monthly price", type: "money", min: 0 },
        { key: "benefits", label: "Benefits", type: "textarea", max: 2000 },
        { key: "member_count", label: "Member count", type: "number", min: 0 },
        { key: "active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
