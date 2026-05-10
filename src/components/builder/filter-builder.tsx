import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHEMAS, type DataSource, type FilterClause } from "@/lib/reports/builder-schema";

interface Props {
  source: DataSource;
  filters: FilterClause[];
  onChange: (f: FilterClause[]) => void;
}

const OPS: { value: FilterClause["operator"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "contains", label: "contains" },
];

export function FilterBuilder({ source, filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const dims = SCHEMAS[source].dimensions;
  const [field, setField] = useState(dims[0]?.field ?? "");
  const [op, setOp] = useState<FilterClause["operator"]>("eq");
  const [value, setValue] = useState("");

  const add = () => {
    if (!field || !value) return;
    const dim = dims.find((d) => d.field === field);
    onChange([...filters, { field, operator: op, value, label: `${dim?.label ?? field} ${op} ${value}` }]);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f, i) => (
        <Badge key={i} variant="outline" className="gap-1 py-1">
          {f.label ?? `${f.field} ${f.operator} ${String(f.value)}`}
          <button onClick={() => onChange(filters.filter((_, j) => j !== i))} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Filter</Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start">
          <Select value={field} onValueChange={setField}>
            <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
            <SelectContent>
              {dims.map((d) => <SelectItem key={d.key} value={d.field}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={op} onValueChange={(v) => setOp(v as FilterClause["operator"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button size="sm" className="w-full" onClick={add} disabled={!value}>Add filter</Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
