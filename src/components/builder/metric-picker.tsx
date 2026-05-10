import { X, Plus, DollarSign, Hash, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SCHEMAS, type DataSource } from "@/lib/reports/builder-schema";

interface Props {
  source: DataSource;
  selected: string[];
  onChange: (v: string[]) => void;
  max?: number;
}

const formatIcon = (f: string) => {
  if (f === "currency") return <DollarSign className="h-3 w-3" />;
  if (f === "percent") return <Percent className="h-3 w-3" />;
  return <Hash className="h-3 w-3" />;
};

export function MetricPicker({ source, selected, onChange, max = 8 }: Props) {
  const all = SCHEMAS[source].metrics;
  const available = all.filter((m) => !selected.includes(m.key));
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Metrics ({selected.length}/{max})
      </label>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((k) => {
          const m = all.find((x) => x.key === k);
          if (!m) return null;
          return (
            <Badge key={k} variant="secondary" className="gap-1 py-1">
              {formatIcon(m.format)}
              {m.label}
              <button onClick={() => onChange(selected.filter((s) => s !== k))} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        {available.length > 0 && selected.length < max && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {available.map((m) => (
                <DropdownMenuItem key={m.key} onClick={() => onChange([...selected, m.key])} className="gap-2">
                  {formatIcon(m.format)} {m.label}
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">{m.aggregation}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
