import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageStub } from "@/components/page-stub";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { activeClinic, user, memberships } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your clinic, team, and account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Clinic</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={activeClinic?.clinic.name} />
            <Row label="Slug" value={activeClinic?.clinic.slug} />
            <Row label="Currency" value={activeClinic?.clinic.currency} />
            <Row label="Timezone" value={activeClinic?.clinic.timezone} />
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Email" value={user?.email} />
            <Row label="Your role" value={activeClinic?.role.replace("_", " ")} />
            <Row label="Clinics" value={memberships.length.toString()} />
          </dl>
        </div>
      </div>

      <PageStub
        title="Full settings panel"
        description="Branding, billing, integrations, team management, locations, and security all live here."
        icon={<Settings className="h-6 w-6 text-primary-foreground" />}
        features={[
          "Brand & logo",
          "Billing & subscription",
          "Team & role management",
          "Multi-location",
          "Integrations (Stripe, QuickBooks, etc.)",
          "Audit log & security",
        ]}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value ?? "—"}</dd>
    </div>
  );
}
