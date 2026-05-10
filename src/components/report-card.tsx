import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReportComparisonBadge } from "./report-comparison-badge";
import { ReportSparkline } from "./report-sparkline";

interface ReportCardProps {
  href: string;
  title: string;
  icon: LucideIcon;
  primaryMetric: string;
  trend?: { value: number; direction: "up" | "down" | "flat" };
  sparkline?: number[];
  loading?: boolean;
  inverseTrend?: boolean;
  comingSoon?: boolean;
}

export function ReportCard({
  href, title, icon: Icon, primaryMetric, trend, sparkline, loading, inverseTrend, comingSoon,
}: ReportCardProps) {
  const inner = (
    <Card className={cn(
      "group relative h-full p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
      comingSoon && "opacity-60",
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
        </div>
        {trend && !loading && (
          <ReportComparisonBadge delta={trend.value} direction={trend.direction} inverse={inverseTrend} />
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold text-foreground">
          {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" /> : primaryMetric}
        </div>
        {sparkline && sparkline.length > 0 && (
          <ReportSparkline values={sparkline} className="text-primary" />
        )}
      </div>
      {comingSoon && (
        <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
    </Card>
  );

  if (comingSoon) return <div className="cursor-not-allowed">{inner}</div>;
  // Use plain anchor: detail routes ship in Part 2; avoid TanStack typed-route errors.
  return <Link to={href as never} className="block">{inner}</Link>;
}
