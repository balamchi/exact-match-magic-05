import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { money } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/services/profitability")({ component: Profitability });

interface Appt { service_id: string | null; status: string; price_cents: number | null }
interface Service { id: string; name: string; price_cents: number | null; duration_minutes?: number | null }

function Profitability() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const [a, s] = await Promise.all([
        supabase.from("appointments")
          .select("service_id, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .eq("status", "completed")
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
        supabase.from("services").select("id, name, price_cents, duration_minutes").eq("clinic_id", activeClinic.clinic_id),
      ]);
      setAppts(((a.data ?? []) as unknown) as Appt[]);
      setServices(((s.data ?? []) as unknown) as Service[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const rows = services.map((s) => {
    const matching = appts.filter((a) => a.service_id === s.id);
    const revenue = matching.reduce((sum, a) => sum + (a.price_cents ?? s.price_cents ?? 0), 0);
    const minutes = matching.length * (s.duration_minutes ?? 0);
    const revPerHour = minutes ? Math.round((revenue / minutes) * 60) : 0;
    return { id: s.id, name: s.name, count: matching.length, revenue, minutes, revPerHour };
  }).filter((r) => r.count > 0).sort((a, b) => b.revenue - a.revenue);

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
  const avgRevPerHour = totalMin ? Math.round((totalRev / totalMin) * 60) : 0;

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Service Profitability"
        description="Revenue, cost, and margin by service"
        rangeControl={range}
        primaryKpi={{ label: "Gross profit", value: money(totalProfit) }}
        secondaryKpis={[
          { label: "Revenue", value: money(totalRev) },
          { label: "Margin", value: totalRev ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : "—" },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("profitability", "csv"),
          ["Service", "Count", "Revenue", "Cost", "Profit", "Margin %"],
          rows.map((r) => [r.name, r.count, (r.revenue / 100).toFixed(2), (r.cost / 100).toFixed(2), (r.profit / 100).toFixed(2), r.margin.toFixed(1)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Service", cell: (r: typeof rows[number]) => r.name },
            { key: "c", header: "Count", align: "right", cell: (r) => r.count },
            { key: "r", header: "Revenue", align: "right", cell: (r) => money(r.revenue) },
            { key: "co", header: "Cost", align: "right", cell: (r) => money(r.cost) },
            { key: "p", header: "Profit", align: "right", cell: (r) => money(r.profit) },
            { key: "m", header: "Margin", align: "right", cell: (r) => `${r.margin.toFixed(1)}%` },
          ]}
          rows={rows}
          empty="No completed services in period"
        />
      </ReportShell>
    </>
  );
}
