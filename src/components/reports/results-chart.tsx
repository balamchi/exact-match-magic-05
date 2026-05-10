import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { REPORT_TYPE_MAP, type ReportType, type ViewMode } from "@/lib/reports/report-types";
import type { ReportChartPoint } from "@/lib/reports/use-report-query";

const COLORS = ["#9333EA", "#a78bfa", "#7c3aed", "#c084fc", "#6d28d9", "#ddd6fe", "#5b21b6", "#ede9fe"];

interface Props {
  reportType: ReportType;
  viewMode: Exclude<ViewMode, "table">;
  data: ReportChartPoint[];
  loading?: boolean;
}

export function ResultsChart({ reportType, viewMode, data, loading }: Props) {
  const def = REPORT_TYPE_MAP[reportType];

  if (loading) {
    return <Card className="flex h-80 items-center justify-center text-muted-foreground">Loading…</Card>;
  }
  if (data.length === 0) {
    return <Card className="flex h-80 items-center justify-center text-muted-foreground">No data to chart</Card>;
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{def.chart.yLabel} by {def.chart.xLabel.toLowerCase()}</h3>
        <span className="text-xs text-muted-foreground">{data.length} points</span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "bar" ? (
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="y" fill="#9333EA" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : viewMode === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="y" stroke="#9333EA" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="y" nameKey="x" outerRadius={120} label={(e) => e.x}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
