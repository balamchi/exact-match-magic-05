import { BarChart3, LineChart, PieChart, Table as TableIcon, Grid3x3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Visualization } from "@/lib/reports/builder-schema";

const OPTIONS: { id: Visualization; label: string; icon: typeof BarChart3 }[] = [
  { id: "bar", label: "Bar", icon: BarChart3 },
  { id: "line", label: "Line", icon: LineChart },
  { id: "pie", label: "Pie", icon: PieChart },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "heatmap", label: "Heatmap", icon: Grid3x3 },
  { id: "kpi", label: "KPI", icon: LayoutGrid },
];

export function VisualizationPicker({ value, onChange }: { value: Visualization; onChange: (v: Visualization) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Visualization</label>
      <div className="grid grid-cols-3 gap-1.5">
        {OPTIONS.map((o) => (
          <Button
            key={o.id} variant={value === o.id ? "default" : "outline"} size="sm"
            className={cn("h-auto flex-col gap-1 py-2", value === o.id && "ring-2 ring-primary")}
            onClick={() => onChange(o.id)}
          >
            <o.icon className="h-4 w-4" />
            <span className="text-[10px]">{o.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
