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

export const Route = createFileRoute("/app/reports/financial/tax-summary")({ component: TaxSummary });

interface Inv { tax_cents: number | null; subtotal_cents: number | null; total_cents: number | null; created_at: string; status: string }

function TaxSummary() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [rows, setRows] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices")
        .select("tax_cents, subtotal_cents, total_cents, created_at, status" as never)
        .eq("clinic_id", activeClinic.clinic_id)
        .eq("status", "paid")
        .gte("created_at", range.range.from.toISOString())
        .lte("created_at", range.range.to.toISOString());
      setRows(((data ?? []) as unknown) as Inv[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const byMonth = new Map<string, { subtotal: number; tax: number; total: number }>();
  for (const r of rows) {
    const k = r.created_at.slice(0, 7);
    const cur = byMonth.get(k) ?? { subtotal: 0, tax: 0, total: 0 };
    cur.subtotal += r.subtotal_cents ?? 0;
    cur.tax += r.tax_cents ?? 0;
    cur.total += r.total_cents ?? 0;
    byMonth.set(k, cur);
  }
  const months = Array.from(byMonth.entries()).map(([m, v]) => ({ month: m, ...v })).sort((a, b) => b.month.localeCompare(a.month));
  const totalTax = months.reduce((s, m) => s + m.tax, 0);
  const totalSub = months.reduce((s, m) => s + m.subtotal, 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Tax Summary"
        description="Tax collected on paid invoices by month"
        rangeControl={range}
        primaryKpi={{ label: "Total tax collected", value: money(totalTax) }}
        secondaryKpis={[{ label: "Taxable sales", value: money(totalSub) }]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("tax-summary", "csv"),
          ["Month", "Subtotal", "Tax", "Total"],
          months.map((m) => [m.month, (m.subtotal / 100).toFixed(2), (m.tax / 100).toFixed(2), (m.total / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "m", header: "Month", cell: (r: typeof months[number]) => r.month },
            { key: "s", header: "Subtotal", align: "right", cell: (r) => money(r.subtotal) },
            { key: "t", header: "Tax", align: "right", cell: (r) => money(r.tax) },
            { key: "tot", header: "Total", align: "right", cell: (r) => money(r.total) },
          ]}
          rows={months}
          empty="No paid invoices in period"
        />
      </ReportShell>
    </>
  );
}
