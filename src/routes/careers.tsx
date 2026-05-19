import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/careers")({
  component: CareersPage,
  head: () => ({ meta: [{ title: "Careers — ClinicPro" }, { name: "description", content: "Join the ClinicPro team at Divan Group." }] }),
});

function CareersPage() {
  return (
    <PlaceholderPage title="Careers">
      <p>We're a small team building the operating system for modern clinics. Open roles will be posted here when available.</p>
      <p className="mt-4">Interested? Email <a href="mailto:careers@clinicpro.io" className="text-primary hover:underline">careers@clinicpro.io</a> with your resume and what excites you about clinic tech.</p>
    </PlaceholderPage>
  );
}
