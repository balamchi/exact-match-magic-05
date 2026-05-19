import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customer Stories — ClinicPro" }, { name: "description", content: "Hear how clinics use ClinicPro to grow." }] }),
});

function CustomersPage() {
  return (
    <PlaceholderPage title="Customer Stories">
      <p>Customer stories coming soon. Reach out to be featured.</p>
      <p className="mt-4">Email us at <a href="mailto:support@clinicpro.io" className="text-primary hover:underline">support@clinicpro.io</a> to share your story.</p>
    </PlaceholderPage>
  );
}
