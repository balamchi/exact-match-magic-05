import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/migrate")({
  component: MigratePage,
  head: () => ({ meta: [{ title: "Migration Guide — ClinicPro" }, { name: "description", content: "Migrate from Boulevard, Mindbody, Vagaro, or Fresha to ClinicPro." }] }),
});

function MigratePage() {
  return (
    <PlaceholderPage title="Migration Guide">
      <p>Migrating from Boulevard, Mindbody, Vagaro, or Fresha? We handle everything.</p>
      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-border/60 bg-surface p-4">
          <strong className="text-foreground">White-glove migration</strong> — Our team exports your data, maps it, and imports everything: clients, appointments, services, and history.
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-4">
          <strong className="text-foreground">Zero downtime</strong> — Run both platforms in parallel until you're ready to switch.
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-4">
          <strong className="text-foreground">Free for all plans</strong> — Migration is included with every ClinicPro subscription.
        </div>
      </div>
      <p className="mt-6">Contact <a href="mailto:sales@clinicpro.io" className="text-primary hover:underline">sales@clinicpro.io</a> for white-glove migration.</p>
    </PlaceholderPage>
  );
}
