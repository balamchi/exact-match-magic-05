import { ReportComparisonBadge } from "@/components/report-comparison-badge";
import type { ReportKpi } from "@/lib/reports/use-report-query";

export function KpiRow({ kpis, loading }: { kpis: ReportKpi[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(loading ? Array.from({ length: 4 }, (_, i) => ({ label: "—", value: "—" } as ReportKpi)) : kpis).map((k, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-xl font-semibold tracking-tight md:text-2xl">{k.value}</div>
            {k.delta !== undefined && k.direction && (
              <ReportComparisonBadge delta={k.delta} direction={k.direction} inverse={k.inverse} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
