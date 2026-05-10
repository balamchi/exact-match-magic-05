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
import { num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/clients/acquisition")({ component: Acquisition });

interface Client { id: string; created_at: string; referral_source?: string | null }

function Acquisition() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("clients")
        .select("id, created_at, referral_source" as never)
        .eq("clinic_id", activeClinic.clinic_id)
        .gte("created_at", range.range.from.toISOString())
        .lte("created_at", range.range.to.toISOString());
      setRows((data ?? []) as Client[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const bySource = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const s = r.referral_source ?? "Direct";
    bySource.set(s, (bySource.get(s) ?? 0) + 1);
    const d = r.created_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const sources = Array.from(bySource.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Client Acquisition"
        description="New clients added in period, by source"
        rangeControl={range}
        primaryKpi={{ label: "New clients", value: num(rows.length) }}
        secondaryKpis={[{ label: "Top source", value: sources[0]?.source ?? "—" }]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("acquisition", "csv"),
          ["Source", "New clients"], sources.map((s) => [s.source, s.count]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "s", header: "Source", cell: (r: typeof sources[number]) => r.source },
            { key: "c", header: "New clients", align: "right", cell: (r) => r.count },
          ]}
          rows={sources}
          empty="No new clients in period"
        />
      </ReportShell>
    </>
  );
}
