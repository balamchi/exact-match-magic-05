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
import { money, num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/staff/performance")({ component: Performance });

interface Appt { staff_id: string | null; status: string; price_cents: number | null; client_id: string | null }
interface Staff { id: string; display_name: string }

function Performance() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const [a, s] = await Promise.all([
        supabase.from("appointments")
          .select("staff_id, status, price_cents, client_id")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
        supabase.from("staff").select("id, display_name").eq("clinic_id", activeClinic.clinic_id),
      ]);
      setAppts(((a.data ?? []) as unknown) as Appt[]);
      setStaff(((s.data ?? []) as unknown) as Staff[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const byStaff = new Map<string, { bookings: number; completed: number; revenue: number; clients: Set<string>; noShows: number }>();
  for (const a of appts) {
    const k = a.staff_id ?? "unassigned";
    const cur = byStaff.get(k) ?? { bookings: 0, completed: 0, revenue: 0, clients: new Set<string>(), noShows: 0 };
    cur.bookings++;
    if (a.status === "completed") {
      cur.completed++;
      cur.revenue += a.price_cents ?? 0;
    }
    if (a.status === "no_show") cur.noShows++;
    if (a.client_id) cur.clients.add(a.client_id);
    byStaff.set(k, cur);
  }
  const rows = Array.from(byStaff.entries()).map(([id, v]) => {
    const s = staff.find((x) => x.id === id);
    return {
      id,
      name: s ? s.display_name : "Unassigned",
      bookings: v.bookings,
      completed: v.completed,
      revenue: v.revenue,
      clients: v.clients.size,
      noShows: v.noShows,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Staff Performance"
        description="Bookings, revenue and clients seen per staff member"
        rangeControl={range}
        primaryKpi={{ label: "Total revenue", value: money(totalRev) }}
        secondaryKpis={[{ label: "Staff active", value: num(rows.length) }]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("staff-performance", "csv"),
          ["Staff", "Bookings", "Completed", "Clients", "No-shows", "Revenue"],
          rows.map((r) => [r.name, r.bookings, r.completed, r.clients, r.noShows, (r.revenue / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Staff", cell: (r: typeof rows[number]) => r.name },
            { key: "b", header: "Bookings", align: "right", cell: (r) => r.bookings },
            { key: "c", header: "Completed", align: "right", cell: (r) => r.completed },
            { key: "cl", header: "Clients", align: "right", cell: (r) => r.clients },
            { key: "ns", header: "No-shows", align: "right", cell: (r) => r.noShows },
            { key: "r", header: "Revenue", align: "right", cell: (r) => money(r.revenue) },
          ]}
          rows={rows}
          empty="No bookings in period"
        />
      </ReportShell>
    </>
  );
}
