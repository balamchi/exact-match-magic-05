import { useEffect, useMemo, useState } from "react";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportPreset {
  id: string;
  label: string;
  range: () => DateRange;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
};

export const REPORT_PRESETS: ReportPreset[] = [
  { id: "today", label: "Today", range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { id: "yesterday", label: "Yesterday", range: () => ({ from: daysAgo(1), to: endOfDay(daysAgo(1)) }) },
  { id: "7d", label: "Last 7 days", range: () => ({ from: daysAgo(6), to: endOfDay(new Date()) }) },
  { id: "30d", label: "Last 30 days", range: () => ({ from: daysAgo(29), to: endOfDay(new Date()) }) },
  { id: "90d", label: "Last 90 days", range: () => ({ from: daysAgo(89), to: endOfDay(new Date()) }) },
  { id: "this-month", label: "This month", range: () => {
    const n = new Date();
    return { from: startOfDay(new Date(n.getFullYear(), n.getMonth(), 1)), to: endOfDay(new Date()) };
  } },
  { id: "last-month", label: "Last month", range: () => {
    const n = new Date();
    return {
      from: startOfDay(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
      to: endOfDay(new Date(n.getFullYear(), n.getMonth(), 0)),
    };
  } },
  { id: "this-year", label: "This year", range: () => {
    const n = new Date();
    return { from: startOfDay(new Date(n.getFullYear(), 0, 1)), to: endOfDay(new Date()) };
  } },
];

export function previousRange(r: DateRange): DateRange {
  const ms = r.to.getTime() - r.from.getTime();
  return {
    from: new Date(r.from.getTime() - ms - 1),
    to: new Date(r.from.getTime() - 1),
  };
}

const STORAGE_KEY = "clinicpro:report-range";

export function useReportRange(initialPresetId = "30d") {
  const [presetId, setPresetId] = useState<string>(() => {
    if (typeof window === "undefined") return initialPresetId;
    return localStorage.getItem(STORAGE_KEY) || initialPresetId;
  });
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, presetId);
  }, [presetId]);

  const range = useMemo(() => {
    const preset = REPORT_PRESETS.find((p) => p.id === presetId) ?? REPORT_PRESETS[3];
    return preset.range();
  }, [presetId]);

  const comparison = useMemo(() => (compare ? previousRange(range) : null), [compare, range]);

  return { presetId, setPresetId, range, comparison, compare, setCompare };
}

export function useReportComparison(current: number, previous: number) {
  const delta = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const direction: "up" | "down" | "flat" = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  return { delta, direction, formatted: `${sign}${delta.toFixed(1)}%` };
}
