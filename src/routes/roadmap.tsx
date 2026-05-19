import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/roadmap")({
  component: RoadmapPage,
  head: () => ({ meta: [{ title: "Roadmap — ClinicPro" }, { name: "description", content: "See what's coming next for ClinicPro." }] }),
});

function RoadmapPage() {
  return (
    <PlaceholderPage title="Product Roadmap">
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Q2 2026</div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Beta Launch</h3>
          <p>Core features live for early-access clinics. Feedback-driven iteration.</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Q3 2026</div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Mobile Apps</h3>
          <p>Native iOS and Android apps for clinic staff. Push notifications. Offline support.</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Q4 2026</div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Multi-Language Expansion</h3>
          <p>Full platform localization. Additional languages. Regional compliance packs.</p>
        </div>
      </div>
    </PlaceholderPage>
  );
}
