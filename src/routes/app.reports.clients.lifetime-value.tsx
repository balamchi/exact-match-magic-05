import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { money, daysAgo, num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/clients/lifetime-value")({ component: LTV });

interface Client { id: string; first_name: string; last_name: string | null; lifetime_value_cents: number | null; first_visit_date: string | null; last_visit_date: string | null }

function LTV() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("clients")
        .select("id, first_name, last_name, lifetime_value_cents, first_visit_date, last_visit_date")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("lifetime_value_cents", { ascending: false, nullsFirst: false })
        .limit(500);
      setRows((data ?? []) as Client[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const total = rows.reduce((s, r) => s + (r.lifetime_value_cents ?? 0), 0);
  const withValue = rows.filter((r) => (r.lifetime_value_cents ?? 0) > 0);
  const avg = withValue.length ? total / withValue.length : 0;

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Client Lifetime Value"
        description="Top clients by total spend"
        primaryKpi={{ label: "Average LTV", value: money(avg) }}
        secondaryKpis={[
          { label: "Clients", value: num(rows.length) },
          { label: "Total revenue", value: money(total) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("ltv", "csv"),
          ["Client", "First visit", "Last visit", "LTV"],
          rows.map((r) => [`${r.first_name} ${r.last_name ?? ""}`.trim(), r.first_visit_date ?? "", r.last_visit_date ?? "", ((r.lifetime_value_cents ?? 0) / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Client", cell: (r: Client) => `${r.first_name} ${r.last_name ?? ""}`.trim() },
            { key: "f", header: "First visit", cell: (r) => r.first_visit_date ?? "—" },
            { key: "l", header: "Last visit", cell: (r) => daysAgo(r.last_visit_date) + " ago" },
            { key: "v", header: "LTV", align: "right", cell: (r) => money(r.lifetime_value_cents ?? 0) },
          ]}
          rows={rows.slice(0, 100)}
          empty="No clients yet"
        />
      </ReportShell>
    </>
  );
}
