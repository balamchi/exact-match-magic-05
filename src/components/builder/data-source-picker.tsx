import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHEMAS, type DataSource } from "@/lib/reports/builder-schema";

export function DataSourcePicker({
  value, onChange,
}: { value: DataSource; onChange: (v: DataSource) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data source</label>
      <Select value={value} onValueChange={(v) => {
        if (v !== value && !window.confirm("Switching data source will clear dimensions & metrics. Continue?")) return;
        onChange(v as DataSource);
      }}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.keys(SCHEMAS) as DataSource[]).map((k) => (
            <SelectItem key={k} value={k}>{SCHEMAS[k].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
