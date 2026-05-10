// Single hook to load data for the simplified Report Builder.
// Uses RLS-scoped supabase queries, then aggregates client-side.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportType, ReportFilters } from "./report-types";

export interface ReportRow {
  id: string;
  cells: Record<string, string | number | null>;
}

export interface ReportKpi {
  label: string;
  value: string;
  delta?: number;
  direction?: "up" | "down" | "flat";
  inverse?: boolean;
}

export interface ReportChartPoint { x: string; y: number }

export interface ReportResult {
  rows: ReportRow[];
  kpis: ReportKpi[];
  chart: ReportChartPoint[];
  loading: boolean;
  error: string | null;
}

export interface DateRange { from: Date; to: Date }

interface Args {
  reportType: ReportType;
  clinicId: string | null;
  filters: ReportFilters;
  range: DateRange;
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
const num = (n: number) => new Intl.NumberFormat("en-CA").format(n ?? 0);
const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`;

function dayKey(iso: string) { return iso.slice(0, 10); }
function deltaPct(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / prev) * 100;
}
function dirOf(d: number): "up" | "down" | "flat" {
  return d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
}

export function useReportQuery({ reportType, clinicId, filters, range }: Args): ReportResult {
  const [state, setState] = useState<ReportResult>({
    rows: [], kpis: [], chart: [], loading: true, error: null,
  });

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;
    void (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await runQuery(reportType, clinicId, filters, range);
        if (!cancelled) setState({ ...result, loading: false, error: null });
      } catch (e) {
        if (!cancelled) setState({ rows: [], kpis: [], chart: [], loading: false,
          error: e instanceof Error ? e.message : "Query failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [reportType, clinicId, JSON.stringify(filters), range.from.getTime(), range.to.getTime()]);

  return state;
}

async function runQuery(
  type: ReportType, clinicId: string, filters: ReportFilters, range: DateRange,
): Promise<{ rows: ReportRow[]; kpis: ReportKpi[]; chart: ReportChartPoint[] }> {
  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();
  const ms = range.to.getTime() - range.from.getTime();
  const prevFromISO = new Date(range.from.getTime() - ms - 1).toISOString();
  const prevToISO = new Date(range.from.getTime() - 1).toISOString();

  switch (type) {
    case "sales":
    case "appointments": {
      let q = supabase.from("appointments")
        .select("id, starts_at, ends_at, status, price_cents, client_id, staff_id, service_id, location_id, clients(first_name,last_name), staff(display_name), services(name,duration_minutes)")
        .eq("clinic_id", clinicId)
        .gte("starts_at", fromISO).lte("starts_at", toISO)
        .order("starts_at", { ascending: false }).limit(1000);
      if (filters.locationId !== "all") q = q.eq("location_id", filters.locationId);
      if (filters.staffId !== "all") q = q.eq("staff_id", filters.staffId);
      if (filters.serviceId !== "all") q = q.eq("service_id", filters.serviceId);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      const appts = (data ?? []) as ApptJoin[];

      if (type === "sales") {
        const completed = appts.filter((a) => a.status === "completed");
        const revenue = completed.reduce((s, a) => s + (a.price_cents ?? 0), 0);
        const noShow = appts.filter((a) => a.status === "no_show").length;
        const noShowPct = appts.length ? (noShow / appts.length) * 100 : 0;
        const avg = completed.length ? revenue / completed.length : 0;

        // Previous period (revenue only) for delta
        const { data: prev } = await supabase.from("appointments")
          .select("price_cents,status")
          .eq("clinic_id", clinicId)
          .gte("starts_at", prevFromISO).lte("starts_at", prevToISO);
        const prevRev = ((prev ?? []) as { price_cents: number; status: string }[])
          .filter((a) => a.status === "completed").reduce((s, a) => s + (a.price_cents ?? 0), 0);
        const dRev = deltaPct(revenue, prevRev);

        const chartMap = new Map<string, number>();
        for (const a of completed) {
          const k = dayKey(a.starts_at);
          chartMap.set(k, (chartMap.get(k) ?? 0) + (a.price_cents ?? 0) / 100);
        }
        const chart = Array.from(chartMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([x, y]) => ({ x, y }));

        const rows: ReportRow[] = completed.map((a) => ({
          id: a.id,
          cells: {
            date: a.starts_at,
            client: clientName(a.clients),
            service: a.services?.name ?? "—",
            staff: a.staff?.display_name ?? "—",
            amount: a.price_cents ?? 0,
          },
        }));

        return {
          rows,
          chart,
          kpis: [
            { label: "Revenue", value: money(revenue), delta: dRev, direction: dirOf(dRev) },
            { label: "Bookings", value: num(completed.length) },
            { label: "Avg ticket", value: money(avg) },
            { label: "No-show %", value: pct(noShowPct), inverse: true },
          ],
        };
      }

      // appointments
      const completed = appts.filter((a) => a.status === "completed").length;
      const cancelled = appts.filter((a) => a.status === "cancelled").length;
      const totalMinutes = appts.reduce((s, a) =>
        s + ((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000), 0);
      const days = Math.max(1, Math.round(ms / 86400000));
      const utilization = (totalMinutes / (days * 8 * 60)) * 100; // rough: 8 working hours/day

      const chartMap = new Map<string, number>();
      for (const a of appts) {
        const k = dayKey(a.starts_at);
        chartMap.set(k, (chartMap.get(k) ?? 0) + 1);
      }
      const chart = Array.from(chartMap.entries())
        .sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));

      const rows: ReportRow[] = appts.map((a) => {
        const d = new Date(a.starts_at);
        return {
          id: a.id,
          cells: {
            date: a.starts_at,
            time: d.toISOString(),
            client: clientName(a.clients),
            service: a.services?.name ?? "—",
            staff: a.staff?.display_name ?? "—",
            status: a.status,
          },
        };
      });
      return {
        rows, chart,
        kpis: [
          { label: "Bookings", value: num(appts.length) },
          { label: "Completed", value: num(completed) },
          { label: "Cancelled", value: num(cancelled), inverse: true },
          { label: "Utilization", value: pct(Math.min(utilization, 100)) },
        ],
      };
    }

    case "clients": {
      // Pull all clients + their appts in range (for ltv / visits)
      const { data: clients, error } = await supabase.from("clients")
        .select("id, first_name, last_name, source, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      const list = (clients ?? []) as ClientLite[];

      const { data: allAppts } = await supabase.from("appointments")
        .select("client_id, starts_at, status, price_cents")
        .eq("clinic_id", clinicId)
        .eq("status", "completed");
      const appts = (allAppts ?? []) as { client_id: string|null; starts_at: string; price_cents: number }[];

      const byClient = new Map<string, { visits: number; ltv: number; first: string; last: string }>();
      for (const a of appts) {
        if (!a.client_id) continue;
        const ex = byClient.get(a.client_id) ?? { visits: 0, ltv: 0, first: a.starts_at, last: a.starts_at };
        ex.visits += 1;
        ex.ltv += a.price_cents ?? 0;
        if (a.starts_at < ex.first) ex.first = a.starts_at;
        if (a.starts_at > ex.last) ex.last = a.starts_at;
        byClient.set(a.client_id, ex);
      }

      const filtered = list.filter((c) => {
        if (filters.source && filters.source !== "all" && (c.source ?? "") !== filters.source) return false;
        if (filters.firstTimeOnly && (byClient.get(c.id)?.visits ?? 0) > 1) return false;
        return true;
      });

      const newCount = filtered.filter((c) => new Date(c.created_at) >= range.from && new Date(c.created_at) <= range.to).length;
      const activeCount = filtered.filter((c) => {
        const last = byClient.get(c.id)?.last;
        return last && new Date(last) >= range.from;
      }).length;
      const returning = filtered.filter((c) => (byClient.get(c.id)?.visits ?? 0) > 1).length;
      const totalLtv = filtered.reduce((s, c) => s + (byClient.get(c.id)?.ltv ?? 0), 0);
      const avgLtv = filtered.length ? totalLtv / filtered.length : 0;

      const sourceMap = new Map<string, number>();
      for (const c of filtered) {
        const k = c.source || "Unknown";
        sourceMap.set(k, (sourceMap.get(k) ?? 0) + 1);
      }
      const chart = Array.from(sourceMap.entries()).map(([x, y]) => ({ x, y })).sort((a,b)=>b.y-a.y);

      const rows: ReportRow[] = filtered.map((c) => {
        const a = byClient.get(c.id);
        return {
          id: c.id,
          cells: {
            name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
            first_visit: a?.first ?? null,
            last_visit: a?.last ?? null,
            visits: a?.visits ?? 0,
            ltv: a?.ltv ?? 0,
          },
        };
      });
      return {
        rows, chart,
        kpis: [
          { label: "Active", value: num(activeCount) },
          { label: "New", value: num(newCount) },
          { label: "Returning", value: num(returning) },
          { label: "Avg LTV", value: money(avgLtv) },
        ],
      };
    }

    case "staff": {
      const { data: staffList } = await supabase.from("staff")
        .select("id, display_name").eq("clinic_id", clinicId).eq("active", true);
      const staff = (staffList ?? []) as { id: string; display_name: string }[];

      let q = supabase.from("appointments")
        .select("staff_id, starts_at, ends_at, price_cents, status, location_id, service_id")
        .eq("clinic_id", clinicId)
        .gte("starts_at", fromISO).lte("starts_at", toISO);
      if (filters.locationId !== "all") q = q.eq("location_id", filters.locationId);
      if (filters.serviceId !== "all") q = q.eq("service_id", filters.serviceId);
      if (filters.status !== "all") q = q.eq("status", filters.status);
      const { data: appts } = await q;
      const list = (appts ?? []) as { staff_id: string|null; starts_at: string; ends_at: string; price_cents: number; status: string }[];

      const agg = new Map<string, { bookings: number; minutes: number; revenue: number }>();
      for (const a of list) {
        if (!a.staff_id) continue;
        const ex = agg.get(a.staff_id) ?? { bookings: 0, minutes: 0, revenue: 0 };
        ex.bookings += 1;
        ex.minutes += (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000;
        if (a.status === "completed") ex.revenue += a.price_cents ?? 0;
        agg.set(a.staff_id, ex);
      }

      const rows: ReportRow[] = staff.map((s) => {
        const a = agg.get(s.id) ?? { bookings: 0, minutes: 0, revenue: 0 };
        return {
          id: s.id,
          cells: {
            name: s.display_name,
            bookings: a.bookings,
            hours: Math.round(a.minutes / 6) / 10,
            revenue: a.revenue,
            avg_ticket: a.bookings ? a.revenue / a.bookings : 0,
          },
        };
      }).sort((a, b) => Number(b.cells.revenue) - Number(a.cells.revenue));

      const top = rows[0]?.cells.name as string ?? "—";
      const totalHours = rows.reduce((s, r) => s + Number(r.cells.hours), 0);
      const totalRev = rows.reduce((s, r) => s + Number(r.cells.revenue), 0);
      const days = Math.max(1, Math.round(ms / 86400000));
      const util = staff.length ? (totalHours / (staff.length * days * 8)) * 100 : 0;

      const chart = rows.slice(0, 10).map((r) => ({ x: String(r.cells.name), y: Number(r.cells.revenue) / 100 }));
      return {
        rows, chart,
        kpis: [
          { label: "Top staff", value: top },
          { label: "Hours booked", value: num(Math.round(totalHours)) },
          { label: "Revenue", value: money(totalRev) },
          { label: "Utilization", value: pct(Math.min(util, 100)) },
        ],
      };
    }

    case "memberships": {
      const { data: subs } = await supabase.from("membership_subscriptions")
        .select("id, status, started_at, canceled_at, monthly_price_cents, membership_id, client_id, clients(first_name,last_name)")
        .eq("clinic_id", clinicId).limit(1000);
      const list = (subs ?? []) as MemSub[];
      const { data: plans } = await supabase.from("memberships")
        .select("id, name, monthly_price_cents, billing_cadence").eq("clinic_id", clinicId);
      const planMap = new Map((plans ?? []).map((p: any) => [p.id, p]));

      const active = list.filter((s) => s.status === "active");
      const newOnes = list.filter((s) => s.started_at && new Date(s.started_at) >= range.from && new Date(s.started_at) <= range.to);
      const cancelledInRange = list.filter((s) => s.canceled_at && new Date(s.canceled_at) >= range.from && new Date(s.canceled_at) <= range.to);
      const churn = active.length ? (cancelledInRange.length / (active.length + cancelledInRange.length)) * 100 : 0;

      const monthlyOf = (s: MemSub) => {
        const p = planMap.get(s.membership_id) as any;
        const cents = s.monthly_price_cents ?? p?.monthly_price_cents ?? 0;
        const cadence = (p?.billing_cadence ?? "MONTHLY").toUpperCase();
        if (cadence === "ANNUAL" || cadence === "YEARLY") return cents / 12;
        if (cadence === "QUARTERLY") return cents / 3;
        return cents;
      };
      const mrr = active.reduce((s, x) => s + monthlyOf(x), 0);

      const planAgg = new Map<string, number>();
      for (const s of active) {
        const p = planMap.get(s.membership_id) as any;
        const name = p?.name ?? "Plan";
        planAgg.set(name, (planAgg.get(name) ?? 0) + monthlyOf(s) / 100);
      }
      const chart = Array.from(planAgg.entries()).map(([x, y]) => ({ x, y }));

      const rows: ReportRow[] = list.map((s) => {
        const p = planMap.get(s.membership_id) as any;
        return {
          id: s.id,
          cells: {
            client: clientName(s.clients),
            plan: p?.name ?? "—",
            started: s.started_at,
            mrr: monthlyOf(s),
            status: s.status,
          },
        };
      });

      return {
        rows, chart,
        kpis: [
          { label: "MRR", value: money(mrr) },
          { label: "Active", value: num(active.length) },
          { label: "New", value: num(newOnes.length) },
          { label: "Churn rate", value: pct(churn), inverse: true },
        ],
      };
    }

    case "inventory": {
      const { data } = await supabase.from("inventory_items")
        .select("id, name, stock_quantity, reorder_threshold, unit_cost_cents, expires_at, active")
        .eq("clinic_id", clinicId).eq("active", true).limit(1000);
      const items = (data ?? []) as InvItem[];
      const lowStock = items.filter((i) => i.stock_quantity <= i.reorder_threshold).length;
      const expiring = items.filter((i) => {
        if (!i.expires_at) return false;
        const d = new Date(i.expires_at);
        const in60 = Date.now() + 60 * 86400000;
        return d.getTime() < in60;
      }).length;
      const totalValue = items.reduce((s, i) => s + i.stock_quantity * i.unit_cost_cents, 0);

      const rows: ReportRow[] = items.map((i) => ({
        id: i.id,
        cells: {
          name: i.name,
          stock: i.stock_quantity,
          threshold: i.reorder_threshold,
          cost: i.unit_cost_cents,
          value: i.stock_quantity * i.unit_cost_cents,
        },
      }));
      const chart = rows.slice().sort((a, b) => Number(b.cells.value) - Number(a.cells.value)).slice(0, 10)
        .map((r) => ({ x: String(r.cells.name), y: Number(r.cells.value) / 100 }));

      return {
        rows, chart,
        kpis: [
          { label: "Items", value: num(items.length) },
          { label: "Low stock", value: num(lowStock), inverse: true },
          { label: "Expiring", value: num(expiring), inverse: true },
          { label: "Total value", value: money(totalValue) },
        ],
      };
    }

    case "giftcards": {
      const { data } = await supabase.from("gift_cards")
        .select("id, code, recipient_name, purchaser_name, initial_value_cents, balance_cents, status, created_at, active")
        .eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(1000);
      const cards = (data ?? []) as GiftCard[];
      const issuedInRange = cards.filter((c) => new Date(c.created_at) >= range.from && new Date(c.created_at) <= range.to);
      const issuedTotal = issuedInRange.reduce((s, c) => s + c.initial_value_cents, 0);
      const redeemedTotal = cards.reduce((s, c) => s + (c.initial_value_cents - c.balance_cents), 0);
      const outstandingTotal = cards.filter((c) => c.active).reduce((s, c) => s + c.balance_cents, 0);

      const rows: ReportRow[] = cards.map((c) => ({
        id: c.id,
        cells: {
          code: c.code,
          recipient: c.recipient_name || c.purchaser_name || "—",
          issued: c.created_at,
          balance: c.balance_cents,
          status: c.status ?? (c.active ? "active" : "inactive"),
        },
      }));

      const monthMap = new Map<string, number>();
      for (const c of cards) {
        const k = c.created_at.slice(0, 7);
        monthMap.set(k, (monthMap.get(k) ?? 0) + c.initial_value_cents / 100);
      }
      const chart = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));

      return {
        rows, chart,
        kpis: [
          { label: "Issued", value: money(issuedTotal) },
          { label: "Redeemed", value: money(redeemedTotal) },
          { label: "Outstanding", value: num(cards.filter((c) => c.balance_cents > 0).length) },
          { label: "Liability", value: money(outstandingTotal) },
        ],
      };
    }

    case "refunds": {
      let q = supabase.from("pos_orders")
        .select("id, total_cents, payment_method, status, created_at, client_name, clients(first_name,last_name)")
        .eq("clinic_id", clinicId).eq("status", "refunded")
        .gte("created_at", fromISO).lte("created_at", toISO)
        .order("created_at", { ascending: false }).limit(1000);
      if (filters.paymentMethod && filters.paymentMethod !== "all") q = q.eq("payment_method", filters.paymentMethod);
      const { data } = await q;
      const refunds = (data ?? []) as RefundOrder[];

      const { data: allOrders } = await supabase.from("pos_orders")
        .select("status").eq("clinic_id", clinicId)
        .gte("created_at", fromISO).lte("created_at", toISO);
      const totalOrders = (allOrders ?? []).length;
      const totalRefunded = refunds.reduce((s, r) => s + r.total_cents, 0);
      const avg = refunds.length ? totalRefunded / refunds.length : 0;
      const rate = totalOrders ? (refunds.length / totalOrders) * 100 : 0;

      const rows: ReportRow[] = refunds.map((r) => ({
        id: r.id,
        cells: {
          date: r.created_at,
          client: r.client_name || clientName(r.clients) || "Walk-in",
          original: r.total_cents,
          refund: r.total_cents,
          method: r.payment_method ?? "—",
        },
      }));

      const dayMap = new Map<string, number>();
      for (const r of refunds) {
        const k = dayKey(r.created_at);
        dayMap.set(k, (dayMap.get(k) ?? 0) + r.total_cents / 100);
      }
      const chart = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));

      return {
        rows, chart,
        kpis: [
          { label: "Total refunded", value: money(totalRefunded), inverse: true },
          { label: "Count", value: num(refunds.length), inverse: true },
          { label: "Avg refund", value: money(avg) },
          { label: "Refund rate", value: pct(rate), inverse: true },
        ],
      };
    }
  }
}

// ----- types -----
interface ClientNameSrc { first_name?: string | null; last_name?: string | null }
function clientName(c: ClientNameSrc | ClientNameSrc[] | null | undefined): string {
  if (!c) return "Walk-in";
  const x = Array.isArray(c) ? c[0] : c;
  if (!x) return "Walk-in";
  return `${x.first_name ?? ""} ${x.last_name ?? ""}`.trim() || "Walk-in";
}

interface ApptJoin {
  id: string; starts_at: string; ends_at: string; status: string; price_cents: number;
  client_id: string|null; staff_id: string|null; service_id: string|null; location_id: string|null;
  clients: ClientNameSrc | null;
  staff: { display_name: string } | null;
  services: { name: string; duration_minutes: number } | null;
}
interface ClientLite { id: string; first_name: string; last_name: string|null; source: string|null; created_at: string }
interface MemSub {
  id: string; status: string; started_at: string|null; canceled_at: string|null;
  monthly_price_cents: number|null; membership_id: string; client_id: string;
  clients: ClientNameSrc | null;
}
interface InvItem { id: string; name: string; stock_quantity: number; reorder_threshold: number; unit_cost_cents: number; expires_at: string|null; active: boolean }
interface GiftCard { id: string; code: string; recipient_name: string|null; purchaser_name: string|null; initial_value_cents: number; balance_cents: number; status: string|null; created_at: string; active: boolean }
interface RefundOrder { id: string; total_cents: number; payment_method: string; status: string; created_at: string; client_name: string|null; clients: ClientNameSrc | null }
