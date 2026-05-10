import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Save, Mail, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ReportDatePicker } from "@/components/report-date-picker";
import { DataSourcePicker } from "@/components/builder/data-source-picker";
import { DimensionPicker } from "@/components/builder/dimension-picker";
import { MetricPicker } from "@/components/builder/metric-picker";
import { FilterBuilder } from "@/components/builder/filter-builder";
import { VisualizationPicker } from "@/components/builder/visualization-picker";
import { PreviewPane } from "@/components/builder/preview-pane";
import { SavePresetDialog } from "@/components/save-preset-dialog";
import { ScheduleReportDialog } from "@/components/schedule-report-dialog";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { runCustomReport, type QueryResult } from "@/lib/reports/builder-engine";
import {
  DEFAULT_CONFIG, SCHEMAS, type CustomReportConfig, type DataSource,
} from "@/lib/reports/builder-schema";
import { exportToCsv, reportFilename } from "@/lib/reports/exporters";
import { toast } from "sonner";

const DRAFT_KEY = "clinicpro:report-builder-draft";

interface SearchParams { preset?: string }

export const Route = createFileRoute("/app/reports/builder")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    preset: typeof s.preset === "string" ? s.preset : undefined,
  }),
  component: BuilderPage,
});

function loadDraft(): CustomReportConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function BuilderPage() {
  const { activeClinic } = useAuth();
  const search = useSearch({ from: "/app/reports/builder" });
  const range = useReportRange();
  const [config, setConfig] = useState<CustomReportConfig>(() => loadDraft() ?? DEFAULT_CONFIG);
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preset from URL
  useEffect(() => {
    if (!search.preset || !activeClinic) return;
    void (async () => {
      const { data: row } = await supabase.from("report_presets" as never)
        .select("config")
        .eq("id", search.preset!)
        .maybeSingle();
      const cfg = (row as unknown as { config?: CustomReportConfig })?.config;
      if (cfg && cfg.source) setConfig(cfg);
    })();
  }, [search.preset, activeClinic]);

  // Sync date range from preset picker
  const effectiveConfig = useMemo<CustomReportConfig>(() => ({
    ...config,
    dateRange: { from: range.range.from.toISOString(), to: range.range.to.toISOString(), preset: range.presetId },
  }), [config, range.range, range.presetId]);

  // Auto-save draft
  useEffect(() => {
    if (draftRef.current) clearTimeout(draftRef.current);
    draftRef.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(config)); } catch { /* noop */ }
    }, 5000);
    return () => { if (draftRef.current) clearTimeout(draftRef.current); };
  }, [config]);

  // Debounced query
  useEffect(() => {
    if (!activeClinic) return;
    if (config.metrics.length === 0) { setData(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const result = await runCustomReport(activeClinic.clinic_id, effectiveConfig);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Query failed");
        setData(null);
      } finally { setLoading(false); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [activeClinic, effectiveConfig]);

  const setSource = (source: DataSource) => {
    const sch = SCHEMAS[source];
    setConfig({ ...config, source, dimensions: [sch.dimensions[0]?.key].filter(Boolean) as string[],
      metrics: [sch.metrics[0]?.key].filter(Boolean) as string[], filters: [] });
  };

  const handleExport = (format: "csv") => {
    if (!data) return;
    const sch = SCHEMAS[config.source];
    const dimLabels = config.dimensions.map((k) => sch.dimensions.find((d) => d.key === k)?.label ?? k);
    const metLabels = config.metrics.map((k) => sch.metrics.find((m) => m.key === k)?.label ?? k);
    const headers = [...dimLabels, ...metLabels];
    const rows = data.rows.map((r) => {
      const dimVals: string[] = [r.group, ...(r.group2 ? [r.group2] : [])].slice(0, dimLabels.length);
      while (dimVals.length < dimLabels.length) dimVals.push("");
      const metVals = config.metrics.map((k) => r.values[k] ?? 0);
      return [...dimVals, ...metVals];
    });
    exportToCsv(reportFilename("custom", format), headers, rows);
    toast.success("Exported");
  };

  const Controls = (
    <div className="space-y-5">
      <DataSourcePicker value={config.source} onChange={setSource} />
      <Separator />
      <DimensionPicker source={config.source} selected={config.dimensions}
        onChange={(v) => setConfig({ ...config, dimensions: v })} />
      <MetricPicker source={config.source} selected={config.metrics}
        onChange={(v) => setConfig({ ...config, metrics: v })} />
      <Separator />
      <VisualizationPicker value={config.visualization}
        onChange={(v) => setConfig({ ...config, visualization: v })} />
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-border/50 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/reports"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">Custom Report Builder</h1>
            <p className="text-xs text-muted-foreground">Pick dimensions, metrics, and a chart — preview updates live.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportDatePicker presetId={range.presetId} onPresetChange={range.setPresetId}
            compare={range.compare} onCompareChange={range.setCompare} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setScheduleOpen(true)}>
            <Mail className="h-3.5 w-3.5" /> Schedule
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setSaveOpen(true)}>
            <Save className="h-3.5 w-3.5" /> Save report
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Mobile: bottom-sheet trigger */}
        <div className="border-b border-border/50 p-3 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full gap-2"><Settings2 className="h-4 w-4" /> Configure report</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader><SheetTitle>Configure</SheetTitle></SheetHeader>
              <div className="mt-4">{Controls}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-border/50 p-4 md:block lg:w-80">
          {Controls}
        </aside>

        <main className="flex-1 space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filters:</span>
            <FilterBuilder source={config.source} filters={config.filters}
              onChange={(f) => setConfig({ ...config, filters: f })} />
          </div>
          {data && config.visualization !== "kpi" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {config.metrics.slice(0, 4).map((k) => {
                const m = SCHEMAS[config.source].metrics.find((x) => x.key === k);
                if (!m) return null;
                const v = data.totals[k] ?? 0;
                const display = m.format === "currency" ? `$${(v / 100).toLocaleString()}` : v.toLocaleString();
                return (
                  <div key={k} className="rounded-lg border border-border/50 bg-card/40 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                    <div className="mt-1 text-xl font-semibold">{display}</div>
                  </div>
                );
              })}
            </div>
          )}
          <PreviewPane config={effectiveConfig} data={data} loading={loading} error={error} />
          {data && (
            <p className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" />
              {data.rowCount.toLocaleString()} rows scanned · {data.rows.length} groups shown
            </p>
          )}
        </main>
      </div>

      <SavePresetDialog
        open={saveOpen} onOpenChange={setSaveOpen}
        reportKey="custom" reportTitle="Custom report"
        presetId={range.presetId} compare={range.compare}
        customConfig={effectiveConfig}
      />
      <ScheduleReportDialog
        open={scheduleOpen} onOpenChange={setScheduleOpen}
        reportKey="custom" reportTitle="Custom report"
      />
    </div>
  );
}
