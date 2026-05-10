import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportHeatmap } from "@/components/report-heatmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/services/heat-map")({ component: HeatMap });

interface Appt { starts_at: string; status: string }

function HeatMap() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("appointments")
        .select("starts_at, status")
        .eq("clinic_id", activeClinic.clinic_id)
        .gte("starts_at", range.range.from.toISOString())
        .lte("starts_at", range.range.to.toISOString());
      setAppts((data ?? []) as Appt[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const a of appts) {
    const d = new Date(a.starts_at);
    matrix[d.getDay()][d.getHours()]++;
  }
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}`);
  const total = appts.length;
  const peak = matrix.flat().reduce((m, v) => Math.max(m, v), 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Booking Heat Map"
        description="When clients are booking — by day of week and hour"
        rangeControl={range}
        primaryKpi={{ label: "Total bookings", value: num(total) }}
        secondaryKpis={[{ label: "Peak slot", value: num(peak) }]}
      >
        <Card className="p-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            <ReportHeatmap matrix={matrix} rowLabels={dayLabels} colLabels={hourLabels} />}
        </Card>
      </ReportShell>
    </>
  );
}
