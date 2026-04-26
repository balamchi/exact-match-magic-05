import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, DollarSign, Target, Users, TrendingUp, Award } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

type Range = "7" | "30" | "90";
const RANGES: { id: Range; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
];

const STAGE_COLORS: Record<string, string> = {
  new: "#a78bfa",
  contacted: "#38bdf8",
  qualified: "#fbbf24",
  consult_booked: "#c084fc",
  won: "#34d399",
  lost: "#f87171",
};

interface AppointmentRow { id: string; price_cents: number; status: string; starts_at: string; service_id: string | null }
interface LeadRow { id: string; stage: string; estimated_value_cents: number }
interface ServiceRow { id: string; name: string; price_cents: number }

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
}

function ReportsPage() {
  const { activeClinic } = useAuth();
  const [range, setRange] = useState<Range>("30");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const days = Number(range);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [a, l, s, c] = await Promise.all([
        supabase.from("appointments").select("id, price_cents, status, starts_at, service_id").eq("clinic_id", activeClinic.clinic_id).gte("starts_at", since),
        supabase.from("leads").select("id, stage, estimated_value_cents").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("services").select("id, name, price_cents").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinic.clinic_id),
      ]);
      setAppointments(a.data ?? []);
      setLeads(l.data ?? []);
      setServices(s.data ?? []);
      setClientsCount(c.count ?? 0);
      setLoading(false);
    };
    load();
  }, [activeClinic, range]);

  // Revenue trend by day
  const revenueSeries = useMemo(() => {
    const days = Number(range);
    const buckets: Record<string, { date: string; revenue: number; bookings: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, revenue: 0, bookings: 0 };
    }
    for (const a of appointments) {
      const key = a.starts_at.slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].bookings += 1;
      if (a.status === "completed") buckets[key].revenue += a.price_cents / 100;
    }
    return Object.values(buckets);
  }, [appointments, range]);

  // Top services by completed booking count
  const topServices = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of appointments) {
      if (a.status !== "completed" || !a.service_id) continue;
      const svc = services.find((s) => s.id === a.service_id);
      const name = svc?.name ?? "Unknown";
      const cur = counts.get(a.service_id) ?? { name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += a.price_cents / 100;
      counts.set(a.service_id, cur);
    }
    return Array.from(counts.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [appointments, services]);

  // Lead funnel
  const leadFunnel = useMemo(() => {
    const stages = ["new", "contacted", "qualified", "consult_booked", "won", "lost"];
    return stages.map((stage) => ({
      stage,
      count: leads.filter((l) => l.stage === stage).length,
      color: STAGE_COLORS[stage],
    }));
  }, [leads]);

  // Appointment status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) map.set(a.status, (map.get(a.status) ?? 0) + 1);
    return Array.from(map.entries()).map(([status, value]) => ({ status, value }));
  }, [appointments]);

  const totalRevenue = appointments.filter((a) => a.status === "completed").reduce((s, a) => s + a.price_cents, 0);
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const noShowRate = appointments.length ? Math.round((appointments.filter((a) => a.status === "no_show").length / appointments.length) * 100) : 0;
  const wonLeads = leads.filter((l) => l.stage === "won").length;
  const conversionRate = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;
  const avgTicket = completedCount ? totalRevenue / completedCount : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Analytics</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Revenue trends, conversion funnels, and top performers across your clinic.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                range === r.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Revenue" value={money(totalRevenue)} icon={<DollarSign className="h-4.5 w-4.5" />} hint={`${completedCount} completed`} />
        <Metric label="Avg ticket" value={money(avgTicket)} icon={<TrendingUp className="h-4.5 w-4.5" />} hint="Per visit" />
        <Metric label="Lead conversion" value={`${conversionRate}%`} icon={<Target className="h-4.5 w-4.5" />} hint={`${wonLeads} won / ${leads.length} total`} />
        <Metric label="No-show rate" value={`${noShowRate}%`} icon={<CalendarDays className="h-4.5 w-4.5" />} hint={`${clientsCount} clients`} />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">Revenue trend</h2>
                  <p className="text-xs text-muted-foreground">Daily completed-appointment revenue.</p>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    labelFormatter={(d) => new Date(d as string).toLocaleDateString()}
                    formatter={(v: number) => [`$${v.toFixed(0)}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">Top services</h2>
                  <p className="text-xs text-muted-foreground">By completed revenue this period.</p>
                </div>
              </div>
              {topServices.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                  No completed bookings yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc, i) => {
                    const max = topServices[0].revenue || 1;
                    const pct = (svc.revenue / max) * 100;
                    return (
                      <div key={svc.name + i}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{svc.name}</span>
                          <span className="text-muted-foreground">{money(svc.revenue * 100)} <span className="text-[10px]">· {svc.count}</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">Lead funnel</h2>
                  <p className="text-xs text-muted-foreground">Distribution across pipeline stages.</p>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadFunnel} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} tickFormatter={(s) => s.replace("_", " ")} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {leadFunnel.map((entry) => (
                        <Cell key={entry.stage} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">Appointment outcomes</h2>
                <p className="text-xs text-muted-foreground">Completed, scheduled, cancelled, and no-show split.</p>
              </div>
            </div>
            {statusBreakdown.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                No appointments in this range.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {statusBreakdown.map((entry, i) => (
                          <Cell key={entry.status} fill={["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#94a3b8"][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {statusBreakdown.map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#94a3b8"][i % 6] }} />
                        <span className="text-sm capitalize">{s.status.replace("_", " ")}</span>
                      </div>
                      <span className="font-mono text-sm">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, icon, hint }: { label: string; value: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}
