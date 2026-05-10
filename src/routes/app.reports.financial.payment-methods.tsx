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
import { money, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/financial/payment-methods")({ component: PaymentMethods });

interface Inv { payment_method: string | null; total_cents: number; status: string; created_at: string }

function PaymentMethods() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [rows, setRows] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices")
        .select("payment_method, total_cents, status, created_at" as never)
        .eq("clinic_id", activeClinic.clinic_id)
        .eq("status", "paid")
        .gte("created_at", range.range.from.toISOString())
        .lte("created_at", range.range.to.toISOString());
      setRows(((data ?? []) as unknown) as Inv[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const byMethod = new Map<string, { count: number; cents: number }>();
  for (const r of rows) {
    const k = (r.payment_method ?? "Unknown").toString();
    const cur = byMethod.get(k) ?? { count: 0, cents: 0 };
    cur.count++;
    cur.cents += r.total_cents ?? 0;
    byMethod.set(k, cur);
  }
  const total = Array.from(byMethod.values()).reduce((s, v) => s + v.cents, 0);
  const grouped = Array.from(byMethod.entries()).map(([m, v]) => ({ method: m, ...v, share: total ? (v.cents / total) * 100 : 0 }))
    .sort((a, b) => b.cents - a.cents);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Payment Methods"
        description="Distribution of paid invoice amounts by method"
        rangeControl={range}
        primaryKpi={{ label: "Collected", value: money(total) }}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("payment-methods", "csv"),
          ["Method", "Transactions", "Total", "Share %"],
          grouped.map((g) => [g.method, g.count, (g.cents / 100).toFixed(2), g.share.toFixed(1)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "m", header: "Method", cell: (r: typeof grouped[number]) => <span className="capitalize">{r.method}</span> },
            { key: "c", header: "Transactions", align: "right", cell: (r) => r.count },
            { key: "t", header: "Total", align: "right", cell: (r) => money(r.cents) },
            { key: "s", header: "Share", align: "right", cell: (r) => pct(r.share) },
          ]}
          rows={grouped}
          empty="No paid invoices in period"
        />
      </ReportShell>
    </>
  );
}
