// Shared helpers for report detail pages.
export const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format((cents ?? 0) / 100);

export const moneyFromAmount = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n ?? 0);

export const num = (n: number) => new Intl.NumberFormat("en-CA").format(n ?? 0);

export const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`;

export function daysAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return d < 1 ? "today" : `${Math.floor(d)}d`;
}
