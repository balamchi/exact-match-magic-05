import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LimitGateProps {
  resource: "staff" | "locations" | "clients";
  current: number;
  limit: number | null;
  planName: string | null;
}

const RESOURCE_LABEL = {
  staff: { singular: "staff seat", plural: "staff seats" },
  locations: { singular: "location", plural: "locations" },
  clients: { singular: "active client", plural: "active clients" },
};

export function LimitGate({ resource, current, limit, planName }: LimitGateProps) {
  if (limit === null) return null;
  if (current < limit) return null;

  const label = RESOURCE_LABEL[resource];

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            You've reached your {label.plural} limit
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Your {planName ?? "current"} plan includes {limit} {label.plural}. Upgrade to add more.
          </p>
          <Button asChild size="sm" className="mt-3 gap-1.5 bg-gradient-to-r from-primary to-primary/80">
            <Link to="/app/settings/billing">
              Upgrade plan <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface UsageMeterProps {
  resource: "staff" | "locations" | "clients";
  current: number;
  limit: number | null;
}

export function UsageMeter({ resource, current, limit }: UsageMeterProps) {
  const label = RESOURCE_LABEL[resource];
  if (limit === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono font-semibold text-emerald-400">Unlimited</span>
        <span>{label.plural}</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((current / Math.max(1, limit)) * 100));
  const color = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="flex min-w-[140px] flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          <span className="font-mono font-semibold text-foreground">{current}</span> / {limit} {label.plural}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
