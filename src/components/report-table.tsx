import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export interface ReportTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: ReportTableColumn<T>[];
  rows: T[];
  empty?: string;
  loading?: boolean;
}

export function ReportTable<T>({ columns, rows, empty = "No data", loading }: Props<T>) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border/50 bg-muted/30">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{empty}</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${
                        c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : ""
                      }`}
                    >
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
