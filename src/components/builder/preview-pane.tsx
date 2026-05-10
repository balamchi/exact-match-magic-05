import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SCHEMAS, validateConfig, type CustomReportConfig, type MetricDef } from "@/lib/reports/builder-schema";
import type { QueryResult } from "@/lib/reports/builder-engine";
import { moneyFromAmount, num, pct } from "@/lib/reports/format";

const COLORS = ["hsl(var(--primary))", "#9333ea", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a78bfa"];

const formatVal = (v: number, m?: MetricDef) => {
  if (!m) return num(v);
  if (m.format === "currency") return moneyFromAmount(v / 100);
  if (m.format === "percent") return pct(v);
  if (m.format === "duration") return `${Math.round(v)}m`;
  return num(v);
};

interface Props {
  config: CustomReportConfig;
  data: QueryResult | null;
  loading: boolean;
  error: string | null;
}

export function PreviewPane({ config, data, loading, error }: Props) {
  const validation = useMemo(() => validateConfig(config), [config]);
  const schema = SCHEMAS[config.source];
  const metDefs = config.metrics.map((k) => schema.metrics.find((m) => m.key === k)).filter(Boolean) as MetricDef[];

  if (validation) {
    return (
      <Card className="flex h-72 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{validation}</p>
      </Card>
    );
  }
  if (loading) {
    return <Card className="p-6"><Skeleton className="h-64 w-full" /></Card>;
  }
  if (error) {
    return <Card className="flex h-72 items-center justify-center p-6"><p className="text-sm text-destructive">{error}</p></Card>;
  }
  if (!data || data.rows.length === 0) {
    return (
      <Card className="flex h-72 items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-medium">No data</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different date range or remove some filters.</p>
        </div>
      </Card>
    );
  }

  const chartData = data.rows.map((r) => {
    const out: Record<string, string | number> = { name: r.group };
    if (r.group2) out.name = `${r.group} · ${r.group2}`;
    for (const m of metDefs) {
      out[m.label] = m.format === "currency" ? r.values[m.key] / 100 : r.values[m.key];
    }
    return out;
  });

  if (config.visualization === "kpi") {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {metDefs.map((m) => (
          <Card key={m.key} className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
            <div className="mt-1 text-2xl font-semibold">{formatVal(data.totals[m.key] ?? 0, m)}</div>
          </Card>
        ))}
      </div>
    );
  }

  if (config.visualization === "table") {
    return (
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {config.dimensions.length > 0 && <TableHead>{schema.dimensions.find((d) => d.key === config.dimensions[0])?.label}</TableHead>}
              {config.dimensions[1] && <TableHead>{schema.dimensions.find((d) => d.key === config.dimensions[1])?.label}</TableHead>}
              {metDefs.map((m) => <TableHead key={m.key} className="text-right">{m.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r, i) => (
              <TableRow key={i}>
                {config.dimensions.length > 0 && <TableCell className="font-medium">{r.group}</TableCell>}
                {config.dimensions[1] && <TableCell>{r.group2}</TableCell>}
                {metDefs.map((m) => <TableCell key={m.key} className="text-right">{formatVal(r.values[m.key] ?? 0, m)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (config.visualization === "pie") {
    const m = metDefs[0];
    const pieData = chartData.map((d) => ({ name: d.name, value: Number(d[m.label]) }));
    return (
      <Card className="p-4">
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatVal(m.format === "currency" ? v * 100 : v, m)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (config.visualization === "heatmap") {
    // Use a simple grid for heatmap (group × group2 -> metric color intensity)
    const m = metDefs[0];
    const cols = Array.from(new Set(data.rows.map((r) => r.group2 ?? ""))).sort();
    const groupedRows = new Map<string, Map<string, number>>();
    for (const r of data.rows) {
      const m2 = groupedRows.get(r.group) ?? new Map();
      m2.set(r.group2 ?? "", r.values[m.key] ?? 0);
      groupedRows.set(r.group, m2);
    }
    const max = Math.max(...data.rows.map((r) => r.values[m.key] ?? 0), 1);
    return (
      <Card className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead><tr><th></th>{cols.map((c) => <th key={c} className="px-2 py-1 font-medium">{c}</th>)}</tr></thead>
          <tbody>
            {Array.from(groupedRows.entries()).map(([g, m2]) => (
              <tr key={g}>
                <td className="px-2 py-1 font-medium">{g}</td>
                {cols.map((c) => {
                  const v = m2.get(c) ?? 0;
                  const intensity = v / max;
                  return (
                    <td key={c} className="px-2 py-1 text-center"
                      style={{ backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.7})` }}>
                      {formatVal(v, m)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  // Bar / Line
  const Chart = config.visualization === "line" ? LineChart : BarChart;
  return (
    <Card className="p-4">
      <ResponsiveContainer width="100%" height={360}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {metDefs.map((m, i) =>
            config.visualization === "line"
              ? <Line key={m.key} type="monotone" dataKey={m.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
              : <Bar key={m.key} dataKey={m.label} fill={COLORS[i % COLORS.length]} />,
          )}
        </Chart>
      </ResponsiveContainer>
    </Card>
  );
}
