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

export const Route = createFileRoute("/app/reports/operations/no-shows")({ component: NoShows });

interface Appt { id: string; client_id: string | null; staff_id: string | null; starts_at: string; status: string; price_cents: number | null }
interface Client { id: string; first_name: string; last_name: string | null }

function NoShows() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const [a, c] = await Promise.all([
        supabase.from("appointments")
          .select("id, client_id, staff_id, starts_at, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
        supabase.from("clients").select("id, first_name, last_name").eq("clinic_id", activeClinic.clinic_id),
      ]);
      setAppts((a.data ?? []) as Appt[]);
      setClients((c.data ?? []) as Client[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const noShows = appts.filter((a) => a.status === "no_show");
  const cancels = appts.filter((a) => a.status === "cancelled" || a.status === "canceled");
  const noShowRate = appts.length ? (noShows.length / appts.length) * 100 : 0;
  const lostRevenue = noShows.reduce((s, a) => s + (a.price_cents ?? 0), 0);

  // Top offenders
  const byClient = new Map<string, number>();
  for (const a of noShows) if (a.client_id) byClient.set(a.client_id, (byClient.get(a.client_id) ?? 0) + 1);
  const offenders = Array.from(byClient.entries()).map(([id, count]) => {
    const c = clients.find((x) => x.id === id);
    return { id, name: c ? `${c.first_name} ${c.last_name ?? ""}`.trim() : id.slice(0, 8), count };
  }).sort((a, b) => b.count - a.count).slice(0, 25);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="No-shows & Cancellations"
        description="Missed appointment rates and lost revenue"
        rangeControl={range}
        primaryKpi={{
          label: "No-show rate",
          value: pct(noShowRate),
          trend: { value: noShowRate, direction: noShowRate > 5 ? "up" : noShowRate > 0 ? "flat" : "down" },
          inverse: true,
        }}
        secondaryKpis={[
          { label: "No-shows", value: num(noShows.length) },
          { label: "Cancellations", value: num(cancels.length) },
          { label: "Lost revenue", value: money(lostRevenue) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("no-shows", "csv"),
          ["Client", "No-shows in period"], offenders.map((o) => [o.name, o.count]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Client", cell: (r: typeof offenders[number]) => r.name },
            { key: "c", header: "No-shows", align: "right", cell: (r) => r.count },
          ]}
          rows={offenders}
          empty="No no-shows in period"
        />
      </ReportShell>
    </>
  );
}
