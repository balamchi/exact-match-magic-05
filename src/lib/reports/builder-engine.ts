// Query engine for custom reports. Fetches rows from supabase and
// performs aggregation client-side using the whitelisted schema.
import { supabase } from "@/integrations/supabase/client";
import {
  CustomReportConfig,
  DAY_LABELS,
  DimensionDef,
  MetricDef,
  SCHEMAS,
  getDim,
  getMet,
} from "./builder-schema";

export interface QueryRow {
  group: string; // primary group label
  group2?: string; // secondary group label (heatmap / stacked)
  values: Record<string, number>; // metric.key -> value
}

export interface QueryResult {
  rows: QueryRow[];
  totals: Record<string, number>;
  rowCount: number;
}

function readPath(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, p) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return (acc[0] as Record<string, unknown> | undefined)?.[p];
    return (acc as Record<string, unknown>)[p];
  }, row);
}

function dimValue(row: Record<string, unknown>, def: DimensionDef): string {
  const raw = readPath(row, def.field);
  if (raw == null || raw === "") return "—";
  if (def.derived === "day_of_week") {
    return DAY_LABELS[new Date(String(raw)).getDay()] ?? "—";
  }
  if (def.derived === "hour_of_day") {
    return `${String(new Date(String(raw)).getHours()).padStart(2, "0")}:00`;
  }
  if (def.derived === "month") {
    const d = new Date(String(raw));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (def.derived === "quarter") {
    const d = new Date(String(raw));
    return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  }
  if (def.derived === "year") {
    return String(new Date(String(raw)).getFullYear());
  }
  if (def.derived === "week") {
    const d = new Date(String(raw));
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  if (def.derived === "boolean") return raw ? "Yes" : "No";
  return String(raw);
}

function metricValue(rows: Record<string, unknown>[], def: MetricDef): number {
  const filtered = def.filter ? rows.filter(def.filter) : rows;
  if (def.aggregation === "count") return filtered.length;
  if (def.aggregation === "count_distinct") {
    const set = new Set<unknown>();
    for (const r of filtered) set.add(readPath(r, def.field));
    return set.size;
  }
  const nums = filtered
    .map((r) => Number(readPath(r, def.field) ?? 0))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  if (def.aggregation === "sum") return nums.reduce((a, b) => a + b, 0);
  if (def.aggregation === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (def.aggregation === "min") return Math.min(...nums);
  if (def.aggregation === "max") return Math.max(...nums);
  return 0;
}

export function presetToRange(preset?: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "90d" ? 90 : preset === "365d" ? 365 : 30;
  from.setDate(to.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function runCustomReport(
  clinicId: string,
  config: CustomReportConfig,
): Promise<QueryResult> {
  const schema = SCHEMAS[config.source];
  const range =
    config.dateRange.from && config.dateRange.to
      ? { from: config.dateRange.from, to: config.dateRange.to }
      : presetToRange(config.dateRange.preset);

  // Type assertion: allowing dynamic table names beyond the strongly-typed enum.
  let q = supabase
    .from(schema.table as never)
    .select(schema.select)
    .eq("clinic_id", clinicId)
    .gte(schema.dateField, range.from)
    .lte(schema.dateField, range.to);

  for (const f of config.filters) {
    if (f.operator === "eq") q = q.eq(f.field, f.value as string);
    else if (f.operator === "neq") q = q.neq(f.field, f.value as string);
    else if (f.operator === "in") q = q.in(f.field, f.value as string[]);
    else if (f.operator === "gt") q = q.gt(f.field, f.value as string);
    else if (f.operator === "lt") q = q.lt(f.field, f.value as string);
    else if (f.operator === "contains") q = q.ilike(f.field, `%${String(f.value)}%`);
  }

  const { data, error } = await q.limit(5000);
  if (error) throw error;
  const rows = ((data ?? []) as unknown) as Record<string, unknown>[];

  const dimDefs = config.dimensions.map((k) => getDim(config.source, k)).filter(Boolean) as DimensionDef[];
  const metDefs = config.metrics.map((k) => getMet(config.source, k)).filter(Boolean) as MetricDef[];

  // Group rows by composite dim key
  const groups = new Map<string, { g1: string; g2?: string; rows: Record<string, unknown>[] }>();
  if (dimDefs.length === 0) {
    groups.set("__all__", { g1: "Total", rows });
  } else {
    for (const r of rows) {
      const g1 = dimValue(r, dimDefs[0]);
      const g2 = dimDefs[1] ? dimValue(r, dimDefs[1]) : undefined;
      const key = g2 ? `${g1}|${g2}` : g1;
      const existing = groups.get(key);
      if (existing) existing.rows.push(r);
      else groups.set(key, { g1, g2, rows: [r] });
    }
  }

  const out: QueryRow[] = Array.from(groups.values()).map((g) => {
    const values: Record<string, number> = {};
    for (const m of metDefs) values[m.key] = metricValue(g.rows, m);
    return { group: g.g1, group2: g.g2, values };
  });

  // Sort
  if (config.sortBy && metDefs.find((m) => m.key === config.sortBy?.metric)) {
    const k = config.sortBy.metric;
    out.sort((a, b) => (config.sortBy!.direction === "asc" ? a.values[k] - b.values[k] : b.values[k] - a.values[k]));
  } else if (metDefs[0]) {
    const k = metDefs[0].key;
    out.sort((a, b) => b.values[k] - a.values[k]);
  }

  if (config.limit) out.splice(config.limit);

  const totals: Record<string, number> = {};
  for (const m of metDefs) totals[m.key] = metricValue(rows, m);

  return { rows: out, totals, rowCount: rows.length };
}
