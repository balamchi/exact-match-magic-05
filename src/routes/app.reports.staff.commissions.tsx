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

export const Route = createFileRoute("/app/reports/staff/commissions")({ component: Commissions });

interface Appt { staff_id: string | null; status: string; price_cents: number | null }
interface Staff { id: string; display_name: string }
interface Comm { staff_id: string; rate: number; applies_to: string | null; commission_type: string | null }

function Commissions() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [commissions, setCommissions] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const [a, s, c] = await Promise.all([
        supabase.from("appointments")
          .select("staff_id, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .eq("status", "completed")
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
        supabase.from("staff").select("id, display_name").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("staff_commissions").select("staff_id, rate, applies_to, commission_type")
          .eq("clinic_id", activeClinic.clinic_id).eq("active", true),
      ]);
      setAppts(((a.data ?? []) as unknown) as Appt[]);
      setStaff(((s.data ?? []) as unknown) as Staff[]);
      setCommissions(((c.data ?? []) as unknown) as Comm[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const rows = staff.map((s) => {
    const rev = appts.filter((a) => a.staff_id === s.id).reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
    // Take the highest "all"-applied rate for staff as default; rate is stored as 0-100 percent or 0-1 decimal
    const def = commissions.find((c) => c.staff_id === s.id && (c.applies_to === "all" || !c.applies_to));
    const rawRate = def?.rate ?? 0;
    // Normalize: if <=1, treat as fraction; else treat as percent
    const ratePct = rawRate <= 1 ? rawRate * 100 : rawRate;
    return {
      id: s.id,
      name: s.display_name,
      revenue: rev,
      rate: ratePct,
      commission: Math.round(rev * (ratePct / 100)),
    };
  }).filter((r) => r.revenue > 0).sort((a, b) => b.commission - a.commission);

  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Commissions"
        description="Calculated commissions on completed services"
        rangeControl={range}
        primaryKpi={{ label: "Total commissions", value: money(totalCommission) }}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("commissions", "csv"),
          ["Staff", "Revenue", "Rate %", "Commission"],
          rows.map((r) => [r.name, (r.revenue / 100).toFixed(2), r.rate, (r.commission / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Staff", cell: (r: typeof rows[number]) => r.name },
            { key: "r", header: "Revenue", align: "right", cell: (r) => money(r.revenue) },
            { key: "rt", header: "Rate", align: "right", cell: (r) => `${r.rate.toFixed(1)}%` },
            { key: "c", header: "Commission", align: "right", cell: (r) => money(r.commission) },
          ]}
          rows={rows}
          empty="No completed services in period"
        />
        <p className="text-xs text-muted-foreground">Set commission rates per staff member in Settings → Staff.</p>
      </ReportShell>
    </>
  );
}
