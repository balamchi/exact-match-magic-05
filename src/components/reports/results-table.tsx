import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_MAP, type ReportType, type ColumnFormat } from "@/lib/reports/report-types";
import type { ReportRow } from "@/lib/reports/use-report-query";

interface Props {
  reportType: ReportType;
  rows: ReportRow[];
  loading?: boolean;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format((n ?? 0) / 100);
const fmtNum = (n: number) => new Intl.NumberFormat("en-CA").format(n ?? 0);

function formatCell(v: string | number | null, fmt?: ColumnFormat) {
  if (v === null || v === undefined || v === "") return "—";
  switch (fmt) {
    case "money": return fmtMoney(Number(v));
    case "num": return fmtNum(Number(v));
    case "pct": return `${Number(v).toFixed(1)}%`;
    case "date": return new Date(String(v)).toLocaleDateString();
    case "datetime": return new Date(String(v)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    case "time": return new Date(String(v)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    case "status": return <span className="capitalize">{String(v).replace(/_/g, " ")}</span>;
    default: return String(v);
  }
}

export function ResultsTable({ reportType, rows, loading }: Props) {
  const def = REPORT_TYPE_MAP[reportType];
  const cols = def.columns;
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a.cells[sort.key];
      const bv = b.cells[sort.key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const totals: Record<string, number> = {};
  for (const c of cols) {
    if (c.format === "money" || c.format === "num") {
      totals[c.key] = rows.reduce((s, r) => s + Number(r.cells[c.key] ?? 0), 0);
    }
  }

  const toggleSort = (k: string) => {
    setSort((s) => s?.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" });
    setPage(0);
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-muted/30">
            <tr>
              {cols.map((c) => (
                <th key={c.key}
                  className={cn(
                    "px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  )}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {c.label}
                      {sort?.key === c.key
                        ? sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cols.length} className="px-3 py-12 text-center text-muted-foreground">Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-3 py-12 text-center text-muted-foreground">No results in this period</td></tr>
            ) : visible.map((r) => (
              <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                {cols.map((c) => (
                  <td key={c.key}
                    className={cn(
                      "px-3 py-2",
                      c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : "",
                    )}>
                    {formatCell(r.cells[c.key], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && Object.keys(totals).length > 0 && (
            <tfoot className="border-t-2 border-border/50 bg-muted/20 font-medium">
              <tr>
                {cols.map((c, i) => (
                  <td key={c.key}
                    className={cn(
                      "px-3 py-2",
                      c.align === "right" ? "text-right tabular-nums" : "",
                    )}>
                    {i === 0 ? "Total" : c.key in totals ? formatCell(totals[c.key], c.format) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {!loading && rows.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
