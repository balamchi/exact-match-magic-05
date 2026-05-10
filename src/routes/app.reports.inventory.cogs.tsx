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

export const Route = createFileRoute("/app/reports/inventory/cogs")({ component: COGS });

interface Item { id: string; name: string; unit_cost_cents: number | null; stock_quantity: number | null }
interface Appt { service_id: string | null; status: string }

function COGS() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [items, setItems] = useState<Item[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const [i, a] = await Promise.all([
        supabase.from("inventory_items").select("id, name, unit_cost_cents, stock_quantity").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("appointments").select("service_id, status" as never)
          .eq("clinic_id", activeClinic.clinic_id).eq("status", "completed")
          .gte("starts_at", range.range.from.toISOString())
          .lte("starts_at", range.range.to.toISOString()),
      ]);
      setItems((i.data ?? []) as Item[]);
      setAppts((a.data ?? []) as Appt[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  // Approximate COGS = sum of unit_cost across all items × estimated usage proxy.
  // Without per-service consumption data, present current inventory value plus completed-service count as context.
  const onHandValue = items.reduce((s, r) => s + (r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0), 0);
  const completedServices = appts.length;
  const estimatedCogs = items.reduce((s, r) => s + (r.unit_cost_cents ?? 0), 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Cost of Goods Sold"
        description="Inventory cost basis and consumption"
        rangeControl={range}
        primaryKpi={{ label: "Inventory on hand (cost)", value: money(onHandValue) }}
        secondaryKpis={[
          { label: "Items tracked", value: String(items.length) },
          { label: "Completed services", value: String(completedServices) },
          { label: "Avg unit cost", value: money(items.length ? estimatedCogs / items.length : 0) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("cogs", "csv"),
          ["Item", "On hand", "Unit cost", "Value"],
          items.map((r) => [r.name, r.stock_quantity ?? 0, ((r.unit_cost_cents ?? 0) / 100).toFixed(2), (((r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0)) / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Item", cell: (r: Item) => r.name },
            { key: "q", header: "On hand", align: "right", cell: (r) => r.stock_quantity ?? 0 },
            { key: "u", header: "Unit cost", align: "right", cell: (r) => money(r.unit_cost_cents ?? 0) },
            { key: "v", header: "Value", align: "right", cell: (r) => money((r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0)) },
          ]}
          rows={items}
          empty="No inventory items"
        />
      </ReportShell>
    </>
  );
}
