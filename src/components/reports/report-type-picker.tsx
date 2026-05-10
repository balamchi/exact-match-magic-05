import { REPORT_TYPES, type ReportType } from "@/lib/reports/report-types";
import { cn } from "@/lib/utils";

interface Props {
  value: ReportType;
  onChange: (v: ReportType) => void;
}

export function ReportTypePicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {REPORT_TYPES.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary/15 text-foreground shadow-sm"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <span aria-hidden>{t.icon}</span>
            <span className="font-medium">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
