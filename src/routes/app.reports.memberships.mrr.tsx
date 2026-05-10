import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { calculateNetMRR, calculateChurnRate, type SubscriptionLite } from "@/lib/reports/calculations";
import { moneyFromAmount, num, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/memberships/mrr")({ component: MRR });

function MRR() {
  const { activeClinic } = useAuth();
  const [subs, setSubs] = useState<SubscriptionLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("membership_subscriptions" as never)
        .select("id, status, price_cents, billing_period, canceled_at, created_at")
        .eq("clinic_id", activeClinic.clinic_id);
      setSubs((data ?? []) as SubscriptionLite[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const mrr = calculateNetMRR(subs);
  const arr = mrr * 12;
  const active = subs.filter((s) => s.status === "active").length;
  const churn = calculateChurnRate(subs, 30);

  // Revenue by month (canceled_at + created_at)
  const months = new Map<string, { adds: number; churn: number }>();
  for (const s of subs) {
    if (s.created_at) {
      const k = s.created_at.slice(0, 7);
      const c = months.get(k) ?? { adds: 0, churn: 0 };
      c.adds++; months.set(k, c);
    }
    if (s.canceled_at) {
      const k = s.canceled_at.slice(0, 7);
      const c = months.get(k) ?? { adds: 0, churn: 0 };
      c.churn++; months.set(k, c);
    }
  }
  const rows = Array.from(months.entries()).map(([m, v]) => ({ month: m, ...v, net: v.adds - v.churn }))
    .sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Membership MRR"
        description="Recurring revenue from active memberships"
        primaryKpi={{ label: "MRR", value: moneyFromAmount(mrr) }}
        secondaryKpis={[
          { label: "ARR", value: moneyFromAmount(arr) },
          { label: "Active", value: num(active) },
          { label: "Churn (30d)", value: pct(churn) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("mrr", "csv"),
          ["Month", "New", "Churned", "Net"], rows.map((r) => [r.month, r.adds, r.churn, r.net]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "m", header: "Month", cell: (r: typeof rows[number]) => r.month },
            { key: "a", header: "New", align: "right", cell: (r) => r.adds },
            { key: "c", header: "Churned", align: "right", cell: (r) => r.churn },
            { key: "n", header: "Net", align: "right", cell: (r) => r.net },
          ]}
          rows={rows}
          empty="No membership activity"
        />
      </ReportShell>
    </>
  );
}
