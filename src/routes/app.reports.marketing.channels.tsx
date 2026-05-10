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
import { money, num, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/marketing/channels")({ component: Channels });

interface Lead { id: string; source: string | null; status: string; estimated_value_cents: number | null; created_at: string; converted_at?: string | null }

function Channels() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("leads")
        .select("id, source, status, estimated_value_cents, created_at, converted_at" as never)
        .eq("clinic_id", activeClinic.clinic_id)
        .gte("created_at", range.range.from.toISOString())
        .lte("created_at", range.range.to.toISOString());
      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const byChannel = new Map<string, { leads: number; converted: number; revenue: number }>();
  for (const l of leads) {
    const k = l.source ?? "Direct";
    const c = byChannel.get(k) ?? { leads: 0, converted: 0, revenue: 0 };
    c.leads++;
    if (l.status === "converted" || l.converted_at) {
      c.converted++;
      c.revenue += l.estimated_value_cents ?? 0;
    }
    byChannel.set(k, c);
  }
  const rows = Array.from(byChannel.entries()).map(([source, v]) => ({
    source, ...v,
    rate: v.leads ? (v.converted / v.leads) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalConverted = rows.reduce((s, r) => s + r.converted, 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Channel ROI"
        description="Lead volume, conversion, and pipeline value by source"
        rangeControl={range}
        primaryKpi={{ label: "Total leads", value: num(totalLeads) }}
        secondaryKpis={[
          { label: "Converted", value: num(totalConverted) },
          { label: "Conversion", value: pct(totalLeads ? (totalConverted / totalLeads) * 100 : 0) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("channels", "csv"),
          ["Source", "Leads", "Converted", "Conv %", "Pipeline value"],
          rows.map((r) => [r.source, r.leads, r.converted, r.rate.toFixed(1), (r.revenue / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "s", header: "Source", cell: (r: typeof rows[number]) => r.source },
            { key: "l", header: "Leads", align: "right", cell: (r) => r.leads },
            { key: "c", header: "Converted", align: "right", cell: (r) => r.converted },
            { key: "r", header: "Rate", align: "right", cell: (r) => pct(r.rate) },
            { key: "v", header: "Value", align: "right", cell: (r) => money(r.revenue) },
          ]}
          rows={rows}
          empty="No leads in period"
        />
      </ReportShell>
    </>
  );
}
