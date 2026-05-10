import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { num, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/clients/retention")({ component: Retention });

interface Client { id: string; first_visit_date: string | null; last_visit_date: string | null }

function Retention() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("clients")
        .select("id, first_visit_date, last_visit_date")
        .eq("clinic_id", activeClinic.clinic_id);
      setRows((data ?? []) as Client[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const now = Date.now();
  const total = rows.length;
  const active30 = rows.filter((r) => r.last_visit_date && now - new Date(r.last_visit_date).getTime() < 30 * 86400000).length;
  const active90 = rows.filter((r) => r.last_visit_date && now - new Date(r.last_visit_date).getTime() < 90 * 86400000).length;
  const lapsed = rows.filter((r) => r.last_visit_date && now - new Date(r.last_visit_date).getTime() > 180 * 86400000).length;
  const repeat = rows.filter((r) => r.first_visit_date && r.last_visit_date && r.first_visit_date !== r.last_visit_date).length;
  const repeatRate = total ? (repeat / total) * 100 : 0;

  // Cohort by first-visit month
  const cohort = new Map<string, { total: number; retained30: number; retained90: number }>();
  for (const r of rows) {
    if (!r.first_visit_date) continue;
    const k = r.first_visit_date.slice(0, 7);
    const c = cohort.get(k) ?? { total: 0, retained30: 0, retained90: 0 };
    c.total++;
    if (r.last_visit_date) {
      const dd = (now - new Date(r.last_visit_date).getTime()) / 86400000;
      if (dd < 30) c.retained30++;
      if (dd < 90) c.retained90++;
    }
    cohort.set(k, c);
  }
  const cohorts = Array.from(cohort.entries()).map(([m, v]) => ({
    month: m, ...v,
    pct30: v.total ? (v.retained30 / v.total) * 100 : 0,
    pct90: v.total ? (v.retained90 / v.total) * 100 : 0,
  })).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Client Retention"
        description="Repeat visit rate and cohort retention"
        primaryKpi={{ label: "Repeat client rate", value: pct(repeatRate) }}
        secondaryKpis={[
          { label: "Active 30d", value: num(active30) },
          { label: "Active 90d", value: num(active90) },
          { label: "Lapsed 180d+", value: num(lapsed) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("retention", "csv"),
          ["Cohort month", "New clients", "Retained 30d", "Retained 90d"],
          cohorts.map((c) => [c.month, c.total, `${c.pct30.toFixed(1)}%`, `${c.pct90.toFixed(1)}%`]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "m", header: "Cohort", cell: (r: typeof cohorts[number]) => r.month },
            { key: "t", header: "New clients", align: "right", cell: (r) => r.total },
            { key: "r30", header: "Retained 30d", align: "right", cell: (r) => `${r.retained30} (${r.pct30.toFixed(1)}%)` },
            { key: "r90", header: "Retained 90d", align: "right", cell: (r) => `${r.retained90} (${r.pct90.toFixed(1)}%)` },
          ]}
          rows={cohorts}
          empty="Not enough data"
        />
      </ReportShell>
    </>
  );
}
