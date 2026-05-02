import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({ meta: [{ title: "API Docs — ClinicPro" }, { name: "description", content: "ClinicPro API documentation. Coming Q3 2026." }] }),
});

function DocsPage() {
  return (
    <PlaceholderPage title="API Documentation">
      <p>Coming Q3 2026. Join the waitlist to be notified when the API is available.</p>
      <p className="mt-4">Email <a href="mailto:api@clinicpro.io" className="text-primary hover:underline">api@clinicpro.io</a> for early access.</p>
    </PlaceholderPage>
  );
}
