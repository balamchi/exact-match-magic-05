import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { money, num } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/inventory/stock")({ component: Stock });

interface Item { id: string; name: string; sku: string | null; stock_quantity: number | null; reorder_threshold: number | null; unit_cost_cents: number | null }

function Stock() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("inventory_items")
        .select("id, name, sku, stock_quantity, reorder_threshold, unit_cost_cents")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("stock_quantity", { ascending: true });
      setRows((data ?? []) as Item[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const totalValue = rows.reduce((s, r) => s + (r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0), 0);
  const low = rows.filter((r) => (r.stock_quantity ?? 0) <= (r.reorder_threshold ?? 0));
  const out = rows.filter((r) => (r.stock_quantity ?? 0) === 0);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Stock Levels"
        description="Current inventory on hand and reorder alerts"
        primaryKpi={{ label: "Inventory value", value: money(totalValue) }}
        secondaryKpis={[
          { label: "SKUs", value: num(rows.length) },
          { label: "Low stock", value: num(low.length) },
          { label: "Out of stock", value: num(out.length) },
        ]}
        exportFormats={["csv"]}
        onExport={() => exportToCsv(reportFilename("stock", "csv"),
          ["Name", "SKU", "On hand", "Reorder at", "Unit cost", "Value"],
          rows.map((r) => [r.name, r.sku ?? "", r.stock_quantity ?? 0, r.reorder_threshold ?? 0, ((r.unit_cost_cents ?? 0) / 100).toFixed(2), (((r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0)) / 100).toFixed(2)]))}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Item", cell: (r: Item) => (
              <span className="flex items-center gap-2">
                {(r.stock_quantity ?? 0) <= (r.reorder_threshold ?? 0) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                {r.name}
              </span>
            )},
            { key: "s", header: "SKU", cell: (r) => r.sku ?? "—" },
            { key: "q", header: "On hand", align: "right", cell: (r) => r.stock_quantity ?? 0 },
            { key: "r", header: "Reorder at", align: "right", cell: (r) => r.reorder_threshold ?? 0 },
            { key: "v", header: "Value", align: "right", cell: (r) => money((r.stock_quantity ?? 0) * (r.unit_cost_cents ?? 0)) },
          ]}
          rows={rows}
          empty="No inventory items"
        />
      </ReportShell>
    </>
  );
}
