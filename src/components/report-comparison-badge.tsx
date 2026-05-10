import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  delta: number;
  direction: "up" | "down" | "flat";
  inverse?: boolean; // if true, "down" is good (e.g., churn, no-shows)
  className?: string;
}

export function ReportComparisonBadge({ delta, direction, inverse, className }: Props) {
  const good = inverse ? direction === "down" : direction === "up";
  const bad = inverse ? direction === "up" : direction === "down";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const sign = delta > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        good && "bg-emerald-500/15 text-emerald-400",
        bad && "bg-rose-500/15 text-rose-400",
        !good && !bad && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {sign}{delta.toFixed(1)}%
    </span>
  );
}
