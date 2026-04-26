import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/pos")({ component: PosPage });

function PosPage() {
  return (
    <ResourceModule
      title="POS orders"
      eyebrow="Point of sale"
      description="Ring up sales for services, retail, and packages. Track totals, payment method, and staff."
      table="pos_orders"
      icon={<CreditCard className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "staff_name", "notes"]}
      columns={["client_name", "total_cents", "payment_method", "status", "staff_name"]}
      defaults={{ payment_method: "card", status: "completed" }}
      orderBy="created_at"
      metrics={[
        {
          label: "Today's revenue",
          value: (rows) => {
            const today = new Date().toDateString();
            const sum = rows
              .filter((r) => new Date(String(r.created_at)).toDateString() === today)
              .reduce((s, r) => s + Number(r.total_cents ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
        {
          label: "Completed orders",
          value: (rows) => rows.filter((r) => r.status === "completed").length.toString(),
        },
      ]}
      fields={[
        { key: "client_name", label: "Client name", max: 160, placeholder: "Walk-in" },
        { key: "total_cents", label: "Total", type: "money", min: 0, required: true },
        { key: "payment_method", label: "Payment method", type: "select", options: [
          { label: "Card", value: "card" },
          { label: "Cash", value: "cash" },
          { label: "Gift card", value: "gift_card" },
          { label: "Other", value: "other" },
        ]},
        { key: "status", label: "Status", type: "select", options: [
          { label: "Completed", value: "completed" },
          { label: "Pending", value: "pending" },
          { label: "Refunded", value: "refunded" },
          { label: "Voided", value: "voided" },
        ]},
        { key: "staff_name", label: "Staff", max: 120 },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
