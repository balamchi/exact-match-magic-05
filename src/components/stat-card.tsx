import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  trend?: "up" | "down";
  sub?: string;
  loading?: boolean;
  className?: string;
}

/**
 * ClinicPro reusable metric tile.
 * Spec: bg-zinc-950 (card), purple icon bubble, Fraunces value.
 */
export function StatCard({ label, value, icon: Icon, change, trend, sub, loading, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              trend === "down" ? "text-destructive" : "text-success",
            )}
          >
            {trend === "down" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl font-bold tracking-tight text-foreground">
          {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-muted" /> : value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</div>}
      </div>
    </div>
  );
}
