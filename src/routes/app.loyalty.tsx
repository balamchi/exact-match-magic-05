import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/loyalty")({ component: LoyaltyPage });

function LoyaltyPage() {
  return (
    <ResourceModule
      title="Loyalty"
      eyebrow="Rewards"
      description="Per-client point balances, tiers, and lifetime totals."
      table="loyalty_accounts"
      icon={<Sparkles className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "tier", "notes"]}
      columns={["client_name", "tier", "points_balance", "lifetime_points"]}
      defaults={{ tier: "bronze" }}
      orderBy="points_balance"
      metrics={[
        { label: "Total points outstanding", value: (rows) => rows.reduce((s, r) => s + Number(r.points_balance ?? 0), 0).toLocaleString() },
        { label: "Gold+ members", value: (rows) => rows.filter((r) => ["gold", "platinum"].includes(String(r.tier))).length.toString() },
      ]}
      fields={[
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "tier", label: "Tier", type: "select", options: [
          { label: "Bronze", value: "bronze" },
          { label: "Silver", value: "silver" },
          { label: "Gold", value: "gold" },
          { label: "Platinum", value: "platinum" },
        ]},
        { key: "points_balance", label: "Points balance", type: "number", min: 0 },
        { key: "lifetime_points", label: "Lifetime points", type: "number", min: 0 },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
