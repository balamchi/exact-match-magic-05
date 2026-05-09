import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary",
        className
      )}
    >
      Beta
    </span>
  );
}

export function ComingSoonBanner({
  title = "Coming in Phase 4",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4 flex items-start gap-3",
        className
      )}
      role="status"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PhaseInlineNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}
