import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/integrations")({
  component: IntegrationsPage,
  head: () => ({ meta: [{ title: "Integrations — ClinicPro" }, { name: "description", content: "ClinicPro integrations with Google Calendar, QuickBooks, Twilio, and more." }] }),
});

const INTEGRATIONS = [
  { name: "Google Calendar", status: "Coming soon" },
  { name: "Outlook Calendar", status: "Coming soon" },
  { name: "Meta (Facebook & Instagram)", status: "Coming soon" },
  { name: "Google Ads", status: "Coming soon" },
  { name: "Google Analytics (GA4)", status: "Coming soon" },
  { name: "QuickBooks", status: "Available on Pro+" },
  { name: "Twilio (SMS)", status: "Available on Pro+" },
  { name: "WhatsApp Business", status: "Available on Pro+" },
  { name: "Mailchimp", status: "Coming soon" },
];

function IntegrationsPage() {
  return (
    <PlaceholderPage title="Integrations">
      <p className="mb-8">Connect ClinicPro with the tools you already use.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-5">
            <span className="font-semibold text-foreground">{i.name}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              i.status.includes("Available") ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>{i.status}</span>
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
