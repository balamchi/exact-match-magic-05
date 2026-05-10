import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { bucketByDay, sumRevenue, deltaPercent, type AppointmentLite } from "@/lib/reports/calculations";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { moneyFromAmount, num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/financial/revenue")({ component: RevenueReport });

function RevenueReport() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<AppointmentLite[]>([]);
  const [prev, setPrev] = useState<AppointmentLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ms = range.range.to.getTime() - range.range.from.getTime();
      const [cur, prv] = await Promise.all([
        supabase.from("appointments")
          .select("id, client_id, staff_id, starts_at, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
        supabase.from("appointments")
          .select("id, client_id, staff_id, starts_at, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", new Date(range.range.from.getTime() - ms - 1).toISOString())
          .lte("starts_at", new Date(range.range.from.getTime() - 1).toISOString()),
      ]);
      if (cancelled) return;
      setAppts((cur.data ?? []) as AppointmentLite[]);
      setPrev((prv.data ?? []) as AppointmentLite[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeClinic, range.range]);

  const revenue = sumRevenue(appts);
  const prevRev = sumRevenue(prev);
  const delta = deltaPercent(revenue, prevRev);
  const completed = appts.filter((a) => a.status === "completed");
  const avg = completed.length ? revenue / completed.length : 0;
  const days = Math.max(1, Math.round((range.range.to.getTime() - range.range.from.getTime()) / 86400000));
  const series = bucketByDay(appts, Math.min(days, 90));

  const handleExport = (fmt: "csv" | "pdf" | "xlsx") => {
    if (fmt === "csv") {
      exportToCsv(reportFilename("revenue", "csv"), ["Date", "Bookings", "Revenue"],
        series.map((s) => [s.date, s.bookings, s.revenue.toFixed(2)]));
    }
  };

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Revenue"
        description="Completed appointment revenue over the selected period"
        rangeControl={range}
        primaryKpi={{
          label: "Total revenue",
          value: moneyFromAmount(revenue),
          trend: { value: delta, direction: delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat" },
        }}
        secondaryKpis={[
          { label: "Bookings", value: num(completed.length) },
          { label: "Avg ticket", value: moneyFromAmount(avg) },
          { label: "Previous", value: moneyFromAmount(prevRev) },
        ]}
        exportFormats={["csv"]}
        onExport={handleExport}
      >
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Daily revenue</h3>
          <Sparkbars values={series.map((s) => s.revenue)} labels={series.map((s) => s.date)} />
        </Card>
        <ReportTable
          loading={loading}
          columns={[
            { key: "date", header: "Date", cell: (r: typeof series[number]) => r.date },
            { key: "bookings", header: "Bookings", align: "right", cell: (r) => num(r.bookings) },
            { key: "revenue", header: "Revenue", align: "right", cell: (r) => moneyFromAmount(r.revenue) },
          ]}
          rows={series.slice().reverse()}
          empty="No revenue in this period"
        />
      </ReportShell>
    </>
  );
}

function Sparkbars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-32 items-end gap-0.5">
      {values.map((v, i) => (
        <div key={i} className="group relative flex-1" title={`${labels[i]}: ${moneyFromAmount(v)}`}>
          <div className="rounded-t bg-primary/70 transition-all group-hover:bg-primary" style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }} />
        </div>
      ))}
    </div>
  );
}
