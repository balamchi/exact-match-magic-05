import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface PageStubProps {
  title: string;
  description: string;
  phase?: "MVP" | "Phase 2" | "Phase 3";
  icon?: ReactNode;
  features?: string[];
}

export function PageStub({ title, description, phase = "MVP", icon, features }: PageStubProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {phase} · Coming next
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-12 shadow-card">
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            {icon ?? <Sparkles className="h-6 w-6 text-primary-foreground" />}
          </div>
          <h2 className="font-display text-xl font-semibold">Module scaffolded — building next</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            The database schema, RLS policies, and navigation for this module are already in place.
            Full UI ships in the next iteration.
          </p>

          {features && features.length > 0 && (
            <ul className="mt-6 grid max-w-xl grid-cols-1 gap-2 text-left text-sm sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
