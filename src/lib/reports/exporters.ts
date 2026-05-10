// Lightweight client-side exporters. Keeps bundle size minimal — no
// heavy spreadsheet libs. CSV is native; PDF uses browser print; XLSX
// is exported as TSV inside an .xls envelope which Excel opens cleanly.

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const r of rows) lines.push(r.map(escapeCsv).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  download(filename.endsWith(".csv") ? filename : `${filename}.csv`, blob);
}

export function exportToXlsx(
  filename: string,
  sheets: { name: string; headers: string[]; rows: unknown[][] }[],
) {
  // Single-sheet TSV inside an .xls envelope. Excel/Numbers/Sheets all
  // open this; multi-sheet would require a real xlsx writer.
  const sheet = sheets[0];
  if (!sheet) return;
  const lines = [sheet.headers.join("\t")];
  for (const r of sheet.rows) lines.push(r.map((v) => (v ?? "")).join("\t"));
  const blob = new Blob([lines.join("\n")], { type: "application/vnd.ms-excel" });
  download(filename.endsWith(".xls") ? filename : `${filename}.xls`, blob);
}

export function exportToPdf(title: string, html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0a0a0b}
h1{font-size:20px;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left}
th{background:#f9fafb;font-weight:600}</style></head><body>
<h1>${title}</h1>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function reportFilename(key: string, ext: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `report-${key}-${today}.${ext}`;
}
