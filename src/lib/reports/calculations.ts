// Shared report calculations. Pure functions over plain row shapes so
// callers can pass query results from supabase-js without coupling to
// generated DB types.

export interface AppointmentLite {
  id: string;
  client_id: string | null;
  staff_id: string | null;
  starts_at: string;
  status: string;
  price_cents: number | null;
}

export interface SubscriptionLite {
  id: string;
  status: string;
  price_cents: number | null;
  billing_period?: string | null; // 'month' | 'year' | etc
  canceled_at?: string | null;
  created_at?: string | null;
}

export function calculateLTV(appointments: AppointmentLite[]): number {
  const total = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
  const uniqueClients = new Set(
    appointments.map((a) => a.client_id).filter(Boolean) as string[],
  ).size;
  if (!uniqueClients) return 0;
  return total / uniqueClients / 100;
}

export function calculateChurnRate(
  subs: SubscriptionLite[],
  periodDays: number,
): number {
  const since = Date.now() - periodDays * 86_400_000;
  const activeStart = subs.filter((s) => {
    const created = s.created_at ? new Date(s.created_at).getTime() : 0;
    return created < since;
  }).length;
  if (!activeStart) return 0;
  const churned = subs.filter((s) => {
    if (!s.canceled_at) return false;
    return new Date(s.canceled_at).getTime() >= since;
  }).length;
  return (churned / activeStart) * 100;
}

export function calculateNetMRR(subs: SubscriptionLite[]): number {
  return (
    subs
      .filter((s) => s.status === "active")
      .reduce((sum, s) => {
        const price = (s.price_cents ?? 0) / 100;
        const period = (s.billing_period ?? "month").toLowerCase();
        if (period.startsWith("year")) return sum + price / 12;
        if (period.startsWith("week")) return sum + price * 4.33;
        if (period.startsWith("day")) return sum + price * 30;
        return sum + price;
      }, 0)
  );
}

export function calculateUtilization(
  staffCount: number,
  appointments: AppointmentLite[],
  availableHoursPerStaff: number,
): number {
  if (!staffCount || !availableHoursPerStaff) return 0;
  const bookedMs = appointments
    .filter((a) => a.status === "completed" || a.status === "booked")
    .length * 30 * 60 * 1000; // assume 30 min default; replace with real duration if available
  const bookedHours = bookedMs / 3_600_000;
  const capacity = staffCount * availableHoursPerStaff;
  return Math.min(100, (bookedHours / capacity) * 100);
}

export function bucketByDay(
  appointments: AppointmentLite[],
  days: number,
): { date: string; revenue: number; bookings: number }[] {
  const byDay = new Map<string, { revenue: number; bookings: number }>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, bookings: 0 });
  }
  for (const a of appointments) {
    if (a.status !== "completed") continue;
    const key = a.starts_at.slice(0, 10);
    const cur = byDay.get(key);
    if (!cur) continue;
    cur.revenue += (a.price_cents ?? 0) / 100;
    cur.bookings += 1;
  }
  return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
}

export function sumRevenue(appts: AppointmentLite[]): number {
  return (
    appts
      .filter((a) => a.status === "completed")
      .reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100
  );
}

export function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
