import { Table2, BarChart3, LineChart, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/reports/report-types";

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { id: ViewMode; label: string; Icon: typeof Table2 }[] = [
  { id: "table", label: "Table", Icon: Table2 },
  { id: "bar", label: "Bar", Icon: BarChart3 },
  { id: "line", label: "Line", Icon: LineChart },
  { id: "pie", label: "Pie", Icon: PieChart },
];

export function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-border/60 bg-card/40 p-0.5">
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
