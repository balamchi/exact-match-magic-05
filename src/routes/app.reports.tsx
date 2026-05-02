import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, CalendarDays, DollarSign, Target, Users, TrendingUp, Award,
  Boxes, UserCog, Repeat, Package,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

type Range = "7" | "30" | "90";
type ReportTab = "revenue" | "clients" | "services" | "staff" | "inventory" | "marketing" | "retention";

const RANGES: { id: Range; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: "revenue", label: "Revenue", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: "clients", label: "Clients", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "services", label: "Services", icon: <Award className="h-3.5 w-3.5" /> },
  { id: "staff", label: "Staff", icon: <UserCog className="h-3.5 w-3.5" /> },
  { id: "inventory", label: "Inventory", icon: <Boxes className="h-3.5 w-3.5" /> },
  { id: "marketing", label: "Marketing", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "retention", label: "Retention", icon: <Repeat className="h-3.5 w-3.5" /> },
];

const STAGE_COLORS: Record<string, string> = {
  new: "#a78bfa", contacted: "#38bdf8", qualified: "#fbbf24",
  consult_booked: "#c084fc", won: "#34d399", lost: "#f87171",
};

interface AppointmentRow { id: string; price_cents: number; status: string; starts_at: string; service_id: string | null; staff_id: string | null; client_id: string | null }
interface LeadRow { id: string; stage: string; estimated_value_cents: number; source: string | null }
interface ServiceRow { id: string; name: string; price_cents: number; category: string | null }
interface StaffRow { id: string; display_name: string; color: string | null }
interface InventoryRow { id: string; name: string; stock_quantity: number; reorder_threshold: number; unit_cost_cents: number; expires_at: string | null }
interface CampaignRow { id: string; name: string; sent_count: number; open_count: number; click_count: number; status: string }

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
}

function ReportsPage() {
  const { activeClinic } = useAuth();
  const [range, setRange] = useState<Range>("30");
  const [tab, setTab] = useState<ReportTab>("revenue");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const days = Number(range);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [a, l, s, st, inv, camp, c] = await Promise.all([
        supabase.from("appointments").select("id, price_cents, status, starts_at, service_id, staff_id, client_id").eq("clinic_id", activeClinic.clinic_id).gte("starts_at", since),
        supabase.from("leads").select("id, stage, estimated_value_cents, source").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("services").select("id, name, price_cents, category").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("staff").select("id, display_name, color").eq("clinic_id", activeClinic.clinic_id).eq("active", true),
        supabase.from("inventory_items").select("id, name, stock_quantity, reorder_threshold, unit_cost_cents, expires_at").eq("clinic_id", activeClinic.clinic_id).eq("active", true),
        supabase.from("marketing_campaigns").select("id, name, sent_count, open_count, click_count, status").eq("clinic_id", activeClinic.clinic_id),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinic.clinic_id),
      ]);
      setAppointments(a.data ?? []);
      setLeads(l.data ?? []);
      setServices(s.data ?? []);
      setStaffList(st.data ?? []);
      setInventory(inv.data ?? []);
      setCampaigns(camp.data ?? []);
      setClientsCount(c.count ?? 0);
      setLoading(false);
    };
    load();
  }, [activeClinic?.clinic_id, range]);

  const completed = useMemo(() => appointments.filter((a) => a.status === "completed"), [appointments]);
  const totalRevenue = completed.reduce((s, a) => s + a.price_cents, 0);
  const avgTicket = completed.length ? totalRevenue / completed.length : 0;
  const noShowRate = appointments.length ? Math.round((appointments.filter((a) => a.status === "no_show").length / appointments.length) * 100) : 0;
  const wonLeads = leads.filter((l) => l.stage === "won").length;
  const conversionRate = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;

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

  // Top services
  const topServices = useMemo(() => {
    const counts = new Map<string, { name: string; category: string; count: number; revenue: number }>();
    for (const a of completed) {
      if (!a.service_id) continue;
      const svc = services.find((s) => s.id === a.service_id);
      const name = svc?.name ?? "Unknown";
      const cur = counts.get(a.service_id) ?? { name, category: svc?.category ?? "", count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += a.price_cents;
      counts.set(a.service_id, cur);
    }
    return Array.from(counts.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [completed, services]);

  // Staff performance
  const staffPerformance = useMemo(() => {
    const map = new Map<string, { name: string; color: string; bookings: number; revenue: number; completed: number }>();
    for (const a of appointments) {
      if (!a.staff_id) continue;
      const staff = staffList.find((s) => s.id === a.staff_id);
      const cur = map.get(a.staff_id) ?? { name: staff?.display_name ?? "Unknown", color: staff?.color ?? "#a78bfa", bookings: 0, revenue: 0, completed: 0 };
      cur.bookings += 1;
      if (a.status === "completed") { cur.completed += 1; cur.revenue += a.price_cents; }
      map.set(a.staff_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, staffList]);

  // Lead sources
  const leadSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) { const src = l.source || "unknown"; map.set(src, (map.get(src) ?? 0) + 1); }
    return Array.from(map.entries()).map(([source, count]) => ({ source: source.replace("_", " "), count })).sort((a, b) => b.count - a.count);
  }, [leads]);

  // Lead funnel
  const leadFunnel = useMemo(() => {
    const stages = ["new", "contacted", "qualified", "consult_booked", "won", "lost"];
    return stages.map((stage) => ({ stage, count: leads.filter((l) => l.stage === stage).length, color: STAGE_COLORS[stage] }));
  }, [leads]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) map.set(a.status, (map.get(a.status) ?? 0) + 1);
    return Array.from(map.entries()).map(([status, value]) => ({ status, value }));
  }, [appointments]);

  // Retention: unique clients with 2+ visits
  const retentionStats = useMemo(() => {
    const clientVisits = new Map<string, number>();
    for (const a of completed) {
      if (a.client_id) clientVisits.set(a.client_id, (clientVisits.get(a.client_id) ?? 0) + 1);
    }
    const uniqueClients = clientVisits.size;
    const repeatClients = Array.from(clientVisits.values()).filter((v) => v >= 2).length;
    const rebookRate = uniqueClients ? Math.round((repeatClients / uniqueClients) * 100) : 0;
    return { uniqueClients, repeatClients, rebookRate };
  }, [completed]);

  // Inventory alerts
  const lowStock = useMemo(() => inventory.filter((i) => i.stock_quantity <= i.reorder_threshold), [inventory]);
  const expiringSoon = useMemo(() => {
    const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return inventory.filter((i) => i.expires_at && i.expires_at <= cutoff);
  }, [inventory]);
  const inventoryValue = useMemo(() => inventory.reduce((s, i) => s + i.stock_quantity * i.unit_cost_cents, 0), [inventory]);

  // Smart insights
  const insights = useMemo(() => {
    const items: string[] = [];
    if (totalRevenue > 0) items.push(`Revenue this period: ${money(totalRevenue)} across ${completed.length} completed visits.`);
    if (noShowRate > 10) items.push(`⚠ No-show rate is ${noShowRate}% — consider implementing deposit collection.`);
    if (lowStock.length > 0) items.push(`📦 ${lowStock.length} inventory item${lowStock.length > 1 ? "s" : ""} below reorder threshold.`);
    if (expiringSoon.length > 0) items.push(`⏰ ${expiringSoon.length} product${expiringSoon.length > 1 ? "s" : ""} expiring within 30 days.`);
    if (retentionStats.rebookRate > 0 && retentionStats.rebookRate < 60) items.push(`📉 Rebook rate is ${retentionStats.rebookRate}%. Consider follow-up automations.`);
    if (conversionRate > 0) items.push(`🎯 Lead conversion rate: ${conversionRate}% (${wonLeads} of ${leads.length} leads).`);
    return items;
  }, [totalRevenue, completed.length, noShowRate, lowStock.length, expiringSoon.length, retentionStats.rebookRate, conversionRate, wonLeads, leads.length]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Analytics</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Insights into every part of your clinic.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", range === r.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <TrendingUp className="h-4 w-4" /> Smart Insights
          </h2>
          <ul className="space-y-1.5">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-foreground/85">• {insight}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition whitespace-nowrap", tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tab === "revenue" && (
          <>
            <Metric label="Revenue" value={money(totalRevenue)} icon={<DollarSign className="h-4.5 w-4.5" />} hint={`${completed.length} completed`} />
            <Metric label="Avg ticket" value={money(avgTicket)} icon={<TrendingUp className="h-4.5 w-4.5" />} hint="Per visit" />
            <Metric label="No-show rate" value={`${noShowRate}%`} icon={<CalendarDays className="h-4.5 w-4.5" />} />
            <Metric label="Total bookings" value={appointments.length.toString()} icon={<CalendarDays className="h-4.5 w-4.5" />} />
          </>
        )}
        {tab === "clients" && (
          <>
            <Metric label="Total clients" value={clientsCount.toString()} icon={<Users className="h-4.5 w-4.5" />} />
            <Metric label="Active this period" value={retentionStats.uniqueClients.toString()} icon={<Users className="h-4.5 w-4.5" />} />
            <Metric label="Repeat clients" value={retentionStats.repeatClients.toString()} icon={<Repeat className="h-4.5 w-4.5" />} />
            <Metric label="Rebook rate" value={`${retentionStats.rebookRate}%`} icon={<TrendingUp className="h-4.5 w-4.5" />} />
          </>
        )}
        {tab === "services" && (
          <>
            <Metric label="Active services" value={services.length.toString()} icon={<Package className="h-4.5 w-4.5" />} />
            <Metric label="Top revenue" value={topServices[0] ? money(topServices[0].revenue) : "$0"} icon={<Award className="h-4.5 w-4.5" />} hint={topServices[0]?.name} />
            <Metric label="Categories" value={new Set(services.map((s) => s.category).filter(Boolean)).size.toString()} icon={<BarChart3 className="h-4.5 w-4.5" />} />
            <Metric label="Avg price" value={money(services.length ? services.reduce((s, sv) => s + sv.price_cents, 0) / services.length : 0)} icon={<DollarSign className="h-4.5 w-4.5" />} />
          </>
        )}
        {tab === "staff" && (
          <>
            <Metric label="Active staff" value={staffList.length.toString()} icon={<UserCog className="h-4.5 w-4.5" />} />
            <Metric label="Total revenue" value={money(totalRevenue)} icon={<DollarSign className="h-4.5 w-4.5" />} />
            <Metric label="Avg per staff" value={money(staffPerformance.length ? totalRevenue / staffPerformance.length : 0)} icon={<TrendingUp className="h-4.5 w-4.5" />} />
            <Metric label="Top performer" value={staffPerformance[0]?.name ?? "—"} icon={<Award className="h-4.5 w-4.5" />} hint={staffPerformance[0] ? money(staffPerformance[0].revenue) : undefined} />
          </>
        )}
        {tab === "inventory" && (
          <>
            <Metric label="Total items" value={inventory.length.toString()} icon={<Boxes className="h-4.5 w-4.5" />} />
            <Metric label="Inventory value" value={money(inventoryValue)} icon={<DollarSign className="h-4.5 w-4.5" />} />
            <Metric label="Low stock alerts" value={lowStock.length.toString()} icon={<Boxes className="h-4.5 w-4.5" />} />
            <Metric label="Expiring soon" value={expiringSoon.length.toString()} icon={<CalendarDays className="h-4.5 w-4.5" />} hint="Within 30 days" />
          </>
        )}
        {tab === "marketing" && (
          <>
            <Metric label="Total leads" value={leads.length.toString()} icon={<Target className="h-4.5 w-4.5" />} />
            <Metric label="Conversion" value={`${conversionRate}%`} icon={<TrendingUp className="h-4.5 w-4.5" />} hint={`${wonLeads} won`} />
            <Metric label="Campaigns" value={campaigns.length.toString()} icon={<BarChart3 className="h-4.5 w-4.5" />} />
            <Metric label="Pipeline value" value={money(leads.reduce((s, l) => s + l.estimated_value_cents, 0))} icon={<DollarSign className="h-4.5 w-4.5" />} />
          </>
        )}
        {tab === "retention" && (
          <>
            <Metric label="Rebook rate" value={`${retentionStats.rebookRate}%`} icon={<Repeat className="h-4.5 w-4.5" />} />
            <Metric label="Repeat clients" value={retentionStats.repeatClients.toString()} icon={<Users className="h-4.5 w-4.5" />} />
            <Metric label="No-shows" value={`${noShowRate}%`} icon={<CalendarDays className="h-4.5 w-4.5" />} />
            <Metric label="Avg lifetime" value={money(avgTicket * (retentionStats.rebookRate / 100 + 1))} icon={<DollarSign className="h-4.5 w-4.5" />} hint="Est. LTV" />
          </>
        )}
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <>
          {/* Revenue tab */}
          {tab === "revenue" && (
            <>
              <ChartCard icon={<BarChart3 className="h-5 w-5" />} title="Revenue trend" subtitle="Daily completed-appointment revenue.">
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
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} labelFormatter={(d) => new Date(d as string).toLocaleDateString()} formatter={(v: number) => [`$${v.toFixed(0)}`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard icon={<CalendarDays className="h-5 w-5" />} title="Appointment outcomes" subtitle="Status distribution for this period.">
                {statusBreakdown.length === 0 ? (
                  <EmptyChart message="No appointments in this range." />
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
              </ChartCard>
            </>
          )}

          {/* Services tab */}
          {tab === "services" && (
            <ChartCard icon={<Award className="h-5 w-5" />} title="Top services" subtitle="By completed revenue this period.">
              {topServices.length === 0 ? <EmptyChart message="No completed bookings yet." /> : (
                <div className="space-y-3">
                  {topServices.map((svc, i) => {
                    const max = topServices[0].revenue || 1;
                    const pct = (svc.revenue / max) * 100;
                    return (
                      <div key={svc.name + i}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{svc.name}</span>
                            {svc.category && <span className="ml-2 text-xs text-muted-foreground">{svc.category}</span>}
                          </div>
                          <span className="text-muted-foreground">{money(svc.revenue)} <span className="text-[10px]">· {svc.count} bookings</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          )}

          {/* Staff tab */}
          {tab === "staff" && (
            <ChartCard icon={<UserCog className="h-5 w-5" />} title="Staff performance" subtitle="Revenue and booking count per staff member.">
              {staffPerformance.length === 0 ? <EmptyChart message="No staff bookings in this period." /> : (
                <div className="space-y-3">
                  {staffPerformance.map((sp) => {
                    const max = staffPerformance[0].revenue || 1;
                    const pct = (sp.revenue / max) * 100;
                    const completionRate = sp.bookings ? Math.round((sp.completed / sp.bookings) * 100) : 0;
                    return (
                      <div key={sp.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ background: sp.color }} />
                            <span className="font-medium">{sp.name}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {money(sp.revenue)} · {sp.bookings} bookings · {completionRate}% completion
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sp.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          )}

          {/* Clients tab */}
          {tab === "clients" && (
            <ChartCard icon={<Users className="h-5 w-5" />} title="Client activity" subtitle="Booking trend by day for this period.">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} labelFormatter={(d) => new Date(d as string).toLocaleDateString()} />
                    <Bar dataKey="bookings" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Inventory tab */}
          {tab === "inventory" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard icon={<Boxes className="h-5 w-5" />} title="Low stock alerts" subtitle={`${lowStock.length} items at or below reorder threshold.`}>
                {lowStock.length === 0 ? <EmptyChart message="All items above reorder threshold." /> : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lowStock.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="font-mono text-sm text-destructive">{item.stock_quantity} / {item.reorder_threshold}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
              <ChartCard icon={<CalendarDays className="h-5 w-5" />} title="Expiring soon" subtitle="Items expiring within 30 days.">
                {expiringSoon.length === 0 ? <EmptyChart message="No items expiring soon." /> : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {expiringSoon.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="font-mono text-sm text-amber-400">{item.expires_at}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          )}

          {/* Marketing tab */}
          {tab === "marketing" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard icon={<Target className="h-5 w-5" />} title="Lead funnel" subtitle="Pipeline stage distribution.">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadFunnel} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} tickFormatter={(s) => s.replace("_", " ")} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {leadFunnel.map((entry) => <Cell key={entry.stage} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
              <ChartCard icon={<BarChart3 className="h-5 w-5" />} title="Lead sources" subtitle="Where your leads come from.">
                {leadSources.length === 0 ? <EmptyChart message="No leads yet." /> : (
                  <div className="space-y-2">
                    {leadSources.slice(0, 8).map((src) => (
                      <div key={src.source} className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2">
                        <span className="text-sm capitalize">{src.source}</span>
                        <span className="font-mono text-sm">{src.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          )}

          {/* Retention tab */}
          {tab === "retention" && (
            <ChartCard icon={<Repeat className="h-5 w-5" />} title="Client retention" subtitle="Rebooking patterns and client loyalty.">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface/40 p-5 text-center">
                  <div className="font-display text-4xl font-bold text-primary">{retentionStats.rebookRate}%</div>
                  <div className="mt-1 text-sm text-muted-foreground">Rebook rate</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">Clients with 2+ visits</div>
                </div>
                <div className="rounded-xl border border-border bg-surface/40 p-5 text-center">
                  <div className="font-display text-4xl font-bold">{retentionStats.uniqueClients}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Unique clients</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">In this period</div>
                </div>
                <div className="rounded-xl border border-border bg-surface/40 p-5 text-center">
                  <div className="font-display text-4xl font-bold text-emerald-400">{retentionStats.repeatClients}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Repeat clients</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">2+ visits in period</div>
                </div>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">{message}</div>;
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
