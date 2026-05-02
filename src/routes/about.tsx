import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — ClinicPro by Divan Digital Corp" },
      { name: "description", content: "ClinicPro is built by Divan Digital Corp, a Toronto-based company that has managed operations for 50+ clinics since 2019." },
    ],
  }),
});

function AboutPage() {
  return (
    <PlaceholderPage title="About ClinicPro">
      <div className="space-y-8">
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8">
          <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full [background:linear-gradient(135deg,#9333EA,#D946EF)]">
            <span className="font-display text-4xl font-bold text-white">SB</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Shahab Balamchi</h2>
            <p className="text-sm text-muted-foreground">Founder & CEO · Divan Digital Corp</p>
            <p className="mt-4">
              Since 2019, Divan Digital Corp has managed marketing and operations for 50+ medical aesthetic, dental, and wellness clinics across Toronto, Montreal, Dubai, and Los Angeles.
            </p>
            <p className="mt-3">
              We built ClinicPro because every clinic we worked with said the same thing: their software was the bottleneck, not their growth. So we replaced six tools with one operating system.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface p-8">
          <h3 className="text-xl font-bold text-foreground">Divan Digital Corp</h3>
          <p className="mt-2 text-muted-foreground">Toronto, Canada</p>
          <p className="mt-4">
            Divan Digital Corp is a technology company focused on building software that helps clinics operate more efficiently. ClinicPro is our flagship product — the operating system for modern clinics.
          </p>
        </div>

        <div className="text-center">
          <p className="font-display text-lg italic text-foreground/70">Discipline · Consistency · Creativity</p>
        </div>
      </div>
    </PlaceholderPage>
  );
}
