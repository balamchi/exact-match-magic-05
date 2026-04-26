import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/referrals")({ component: ReferralsPage });

function ReferralsPage() {
  return (
    <ResourceModule
      title="Referrals"
      eyebrow="Word of mouth"
      description="Track referrer-referee pairs, status, and reward amounts."
      table="referrals"
      icon={<Share2 className="h-4.5 w-4.5" />}
      searchKeys={["referrer_name", "referred_name", "referred_email", "status"]}
      columns={["referrer_name", "referred_name", "status", "reward_cents", "created_at"]}
      defaults={{ status: "pending" }}
      metrics={[
        { label: "Converted", value: (rows) => rows.filter((r) => r.status === "converted").length.toString() },
        {
          label: "Rewards owed",
          value: (rows) => {
            const sum = rows
              .filter((r) => r.status === "converted")
              .reduce((s, r) => s + Number(r.reward_cents ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
      ]}
      fields={[
        { key: "referrer_name", label: "Referrer", required: true, max: 160 },
        { key: "referred_name", label: "Referred", required: true, max: 160 },
        { key: "referred_email", label: "Referred email", type: "email", max: 200 },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Pending", value: "pending" },
          { label: "Booked", value: "booked" },
          { label: "Converted", value: "converted" },
          { label: "Expired", value: "expired" },
        ]},
        { key: "reward_cents", label: "Reward", type: "money", min: 0 },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
