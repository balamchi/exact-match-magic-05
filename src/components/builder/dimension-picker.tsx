import { X, Plus } from "lucide-react";
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

export function DimensionPicker({ source, selected, onChange, max = 5 }: Props) {
  const all = SCHEMAS[source].dimensions;
  const available = all.filter((d) => !selected.includes(d.key));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Group by ({selected.length}/{max})
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((k) => {
          const d = all.find((x) => x.key === k);
          if (!d) return null;
          return (
            <Badge key={k} variant="secondary" className="gap-1 py-1">
              {d.label}
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
              {available.map((d) => (
                <DropdownMenuItem key={d.key} onClick={() => onChange([...selected, d.key])}>
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
