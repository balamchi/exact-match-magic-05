import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Save, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ReportDatePicker } from "@/components/report-date-picker";
import { ReportTypePicker } from "@/components/reports/report-type-picker";
import { FilterBar } from "@/components/reports/filter-bar";
import { ViewModeToggle } from "@/components/reports/view-mode-toggle";
import { KpiRow } from "@/components/reports/kpi-row";
import { ResultsTable } from "@/components/reports/results-table";
import { ResultsChart } from "@/components/reports/results-chart";
import { SavePresetDialog } from "@/components/save-preset-dialog";
import { ScheduleReportDialog } from "@/components/schedule-report-dialog";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { useReportQuery } from "@/lib/reports/use-report-query";
import {
  DEFAULT_FILTERS, REPORT_TYPE_MAP, type ReportType, type ReportFilters, type ViewMode,
} from "@/lib/reports/report-types";
import { exportToCsv, exportToXlsx, exportToPdf, reportFilename } from "@/lib/reports/exporters";
import { toast } from "sonner";

interface SearchParams { preset?: string }

export const Route = createFileRoute("/app/reports/builder")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    preset: typeof s.preset === "string" ? s.preset : undefined,
  }),
  component: ReportBuilderPage,
});

function ReportBuilderPage() {
  const { activeClinic } = useAuth();
  const search = useSearch({ from: "/app/reports/builder" });
  const range = useReportRange();
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [saveOpen, setSaveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Load preset from URL
  useEffect(() => {
    if (!search.preset || !activeClinic) return;
    void (async () => {
      const { data } = await supabase.from("report_presets" as never)
        .select("config")
        .eq("id", search.preset!)
        .maybeSingle();
      const cfg = (data as unknown as { config?: { builder?: SavedConfig; presetId?: string } } | null)?.config;
      const b = cfg?.builder;
      if (b) {
        if (b.reportType) setReportType(b.reportType);
        if (b.filters) setFilters({ ...DEFAULT_FILTERS, ...b.filters });
        if (b.viewMode) setViewMode(b.viewMode);
      }
      if (cfg?.presetId) range.setPresetId(cfg.presetId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.preset, activeClinic]);

  const def = REPORT_TYPE_MAP[reportType];
  const result = useReportQuery({
    reportType,
    clinicId: activeClinic?.clinic_id ?? null,
    filters,
    range: range.range,
  });

  const description = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${fmt(range.range.from)} – ${fmt(range.range.to)} · ${result.rows.length} results`;
  }, [range.range, result.rows.length]);

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    if (result.rows.length === 0) { toast.error("Nothing to export"); return; }
    const headers = def.columns.map((c) => c.label);
    const rows = result.rows.map((r) => def.columns.map((c) => {
      const v = r.cells[c.key];
      if (v === null || v === undefined) return "";
      if (c.format === "money") return ((Number(v) ?? 0) / 100).toFixed(2);
      if (c.format === "date" || c.format === "datetime" || c.format === "time") {
        return v ? new Date(String(v)).toISOString() : "";
      }
      return v;
    }));
    if (format === "csv") {
      exportToCsv(reportFilename(reportType, "csv"), headers, rows);
    } else if (format === "xlsx") {
      exportToXlsx(reportFilename(reportType, "xls"), [{ name: def.label, headers, rows }]);
    } else {
      const html = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      exportToPdf(`${def.label} report`, html);
    }
    toast.success("Exported");
  };

  const customConfig: Record<string, unknown> = {
    reportType, filters, viewMode,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-4 pt-4 md:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link>
        </Button>
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{def.label} report</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setScheduleOpen(true)}>
              <Mail className="h-3.5 w-3.5" /> Schedule
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setSaveOpen(true)}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-4 md:p-6">
        <ReportTypePicker value={reportType} onChange={(t) => { setReportType(t); setFilters(DEFAULT_FILTERS); }} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <ReportDatePicker
              presetId={range.presetId} onPresetChange={range.setPresetId}
              compare={range.compare} onCompareChange={range.setCompare}
            />
            <FilterBar reportType={reportType} filters={filters} onChange={setFilters} />
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        <KpiRow kpis={result.kpis.length ? result.kpis : def.kpiLabels.map((l) => ({ label: l, value: "—" }))}
          loading={result.loading} />

        {result.error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {result.error}
          </div>
        )}

        {viewMode === "table" ? (
          <ResultsTable reportType={reportType} rows={result.rows} loading={result.loading} />
        ) : (
          <ResultsChart reportType={reportType} viewMode={viewMode} data={result.chart} loading={result.loading} />
        )}
      </div>

      <SavePresetDialog
        open={saveOpen} onOpenChange={setSaveOpen}
        reportKey="custom" reportTitle={`${def.label} report`}
        presetId={range.presetId} compare={range.compare}
        customConfig={customConfig}
      />
      <ScheduleReportDialog
        open={scheduleOpen} onOpenChange={setScheduleOpen}
        reportKey="custom" reportTitle={`${def.label} report`}
      />
    </div>
  );
}

interface SavedConfig {
  reportType?: ReportType;
  filters?: Partial<ReportFilters>;
  viewMode?: ViewMode;
}
