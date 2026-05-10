import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { money, num, daysAgo } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/financial/ar-aging")({ component: ARAging });

interface Inv { id: string; client_name: string; total_cents: number; status: string; created_at: string; due_at: string | null }

function ARAging() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices")
        .select("id, client_name, total_cents, status, created_at, due_at" as never)
        .eq("clinic_id", activeClinic.clinic_id)
        .in("status", ["unpaid", "overdue", "partial"])
        .order("created_at", { ascending: true });
      setRows((data ?? []) as Inv[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const bucket = (i: Inv) => {
    const days = (Date.now() - new Date(i.due_at ?? i.created_at).getTime()) / 86400000;
    if (days <= 0) return "Current";
    if (days <= 30) return "1-30";
    if (days <= 60) return "31-60";
    if (days <= 90) return "61-90";
    return "90+";
  };
  const buckets = ["Current", "1-30", "31-60", "61-90", "90+"];
  const totals: Record<string, number> = Object.fromEntries(buckets.map((b) => [b, 0]));
  for (const r of rows) totals[bucket(r)] += r.total_cents ?? 0;
  const total = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="AR Aging"
        description="Outstanding invoices by age"
        primaryKpi={{ label: "Outstanding", value: money(total) }}
        secondaryKpis={buckets.map((b) => ({ label: b, value: money(totals[b]) }))}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("ar-aging", "csv"),
          ["Invoice", "Client", "Status", "Created", "Due", "Bucket", "Amount"],
          rows.map((r) => [r.id, r.client_name, r.status, r.created_at, r.due_at ?? "", bucket(r), (r.total_cents / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "client", header: "Client", cell: (r: Inv) => r.client_name },
            { key: "status", header: "Status", cell: (r) => <span className="capitalize">{r.status}</span> },
            { key: "age", header: "Age", cell: (r) => daysAgo(r.due_at ?? r.created_at) },
            { key: "bucket", header: "Bucket", cell: (r) => bucket(r) },
            { key: "amt", header: "Amount", align: "right", cell: (r) => money(r.total_cents) },
          ]}
          rows={rows}
          empty="No outstanding invoices"
        />
        <p className="text-xs text-muted-foreground">{num(rows.length)} open invoice(s)</p>
      </ReportShell>
    </>
  );
}
