import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/invoices")({ component: InvoicesPage });

function InvoicesPage() {
  return (
    <ResourceModule
      title="Invoices"
      eyebrow="Billing"
      description="Issue invoices to clients with status tracking, due dates, and totals."
      table="invoices"
      icon={<FileText className="h-4.5 w-4.5" />}
      searchKeys={["client_name", "invoice_number", "status"]}
      columns={["invoice_number", "client_name", "total_cents", "status", "issued_on", "due_on"]}
      defaults={{ status: "draft" }}
      orderBy="issued_on"
      metrics={[
        {
          label: "Outstanding",
          value: (rows) => {
            const sum = rows
              .filter((r) => ["sent", "overdue"].includes(String(r.status)))
              .reduce((s, r) => s + Number(r.total_cents ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
        {
          label: "Paid this month",
          value: (rows) => {
            const start = new Date();
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            const sum = rows
              .filter((r) => r.status === "paid" && new Date(String(r.issued_on)) >= start)
              .reduce((s, r) => s + Number(r.total_cents ?? 0), 0);
            return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(sum / 100);
          },
        },
      ]}
      fields={[
        { key: "invoice_number", label: "Invoice #", max: 40, placeholder: "INV-0001" },
        { key: "client_name", label: "Client", required: true, max: 160 },
        { key: "total_cents", label: "Total", type: "money", min: 0, required: true },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Draft", value: "draft" },
          { label: "Sent", value: "sent" },
          { label: "Paid", value: "paid" },
          { label: "Overdue", value: "overdue" },
          { label: "Voided", value: "voided" },
        ]},
        { key: "issued_on", label: "Issued on", type: "date" },
        { key: "due_on", label: "Due on", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", max: 1000 },
      ]}
    />
  );
}
