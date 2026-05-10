import { ReactNode, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Download, Save, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ReportDatePicker } from "./report-date-picker";
import { ReportComparisonBadge } from "./report-comparison-badge";
import { SavePresetDialog } from "./save-preset-dialog";
import { ScheduleReportDialog } from "./schedule-report-dialog";
import { useReportRange } from "@/lib/reports/hooks";
import type { DateRange } from "@/lib/reports/hooks";

export interface ReportShellProps {
  title: string;
  description?: string;
  reportKey?: string;
  primaryKpi?: { label: string; value: string; trend?: { value: number; direction: "up" | "down" | "flat" }; inverse?: boolean };
  secondaryKpis?: { label: string; value: string }[];
  exportFormats?: ("csv" | "pdf" | "xlsx")[];
  onExport?: (format: "csv" | "pdf" | "xlsx") => void;
  toolbar?: ReactNode;
  children: ReactNode;
  rangeControl?: {
    presetId: string;
    setPresetId: (id: string) => void;
    compare: boolean;
    setCompare: (v: boolean) => void;
    range: DateRange;
  };
}

export function ReportShell({
  title, description, reportKey, primaryKpi, secondaryKpis, exportFormats = ["csv"], onExport,
  toolbar, children, rangeControl,
}: ReportShellProps) {
  const fallback = useReportRange();
  const r = rangeControl ?? fallback;
  const location = useLocation();
  const derivedKey = reportKey ?? location.pathname.replace(/^\/app\/reports\//, "").replace(/\//g, ".");
  const [saveOpen, setSaveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportDatePicker
            presetId={r.presetId}
            onPresetChange={r.setPresetId}
            compare={r.compare}
            onCompareChange={r.setCompare}
          />
          {toolbar}
          {exportFormats.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {exportFormats.map((f) => (
                  <DropdownMenuItem key={f} onClick={() => onExport?.(f)}>
                    {f.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSaveOpen(true)}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setScheduleOpen(true)}>
            <Mail className="h-3.5 w-3.5" /> Schedule
          </Button>
        </div>
      </div>

      <SavePresetDialog
        open={saveOpen} onOpenChange={setSaveOpen}
        reportKey={derivedKey} reportTitle={title}
        presetId={r.presetId} compare={r.compare}
      />
      <ScheduleReportDialog
        open={scheduleOpen} onOpenChange={setScheduleOpen}
        reportKey={derivedKey} reportTitle={title}
      />

      {primaryKpi && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{primaryKpi.label}</div>
              <div className="mt-1 flex items-center gap-2 text-3xl font-semibold md:text-4xl">
                {primaryKpi.value}
                {primaryKpi.trend && (
                  <ReportComparisonBadge
                    delta={primaryKpi.trend.value}
                    direction={primaryKpi.trend.direction}
                    inverse={primaryKpi.inverse}
                  />
                )}
              </div>
            </div>
            {secondaryKpis && secondaryKpis.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {secondaryKpis.map((k) => (
                  <div key={k.label}>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                    <div className="mt-0.5 text-lg font-semibold">{k.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
