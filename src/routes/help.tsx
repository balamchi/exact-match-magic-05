import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({ meta: [{ title: "Help Center — ClinicPro" }, { name: "description", content: "Get help with ClinicPro. FAQs and support contact." }] }),
});

function HelpPage() {
  return (
    <PlaceholderPage title="Help Center">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">How do I get started?</h3>
          <p>Sign up for a free 14-day trial — no credit card required. Your clinic will be pre-loaded with 322 services and 73 consent forms.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Can I migrate from another platform?</h3>
          <p>Yes! We offer free migration from Boulevard, Mindbody, Vagaro, and Fresha. Contact us for a white-glove migration.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Do you support multiple locations?</h3>
          <p>Yes. Professional plan supports up to 3 locations, Growth and Enterprise support unlimited locations.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Need more help?</h3>
          <p>Email us at <a href="mailto:support@clinicpro.io" className="text-primary hover:underline">support@clinicpro.io</a> and we'll respond within 24 hours.</p>
        </div>
      </div>
    </PlaceholderPage>
  );
}
