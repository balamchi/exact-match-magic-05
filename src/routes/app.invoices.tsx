import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <PageStub
      title="Invoices"
      description="Generate, send, and track invoices with PDF export and online payment links."
      phase="Phase 2"
      icon={<FileText className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Auto-generated from POS sales",
        "PDF export with clinic branding",
        "Email delivery with payment link",
        "Status tracking: draft, sent, paid, overdue",
      ]}
    />
  );
}
