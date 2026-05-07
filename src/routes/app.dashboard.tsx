import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CalendarDays, Users, DollarSign, Repeat, Sparkles, Activity, AlertTriangle,
  ArrowRight, Clock, Target, TrendingUp, RefreshCw, Plus, MessageSquare,
  ShoppingCart, UserPlus, FileWarning, Receipt, Package, Cake, Star,
  ChevronDown, ArrowUp, ArrowDown, Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

/* ——— Types ——— */
interface Stats {
  todayAppointments: number;
  todayRevenueCents: number;
  yesterdayRevenueCents: number;
  monthRevenueCents: number;
  lastMonthRevenueCents: number;
  activeClientsMonth: number;
  lastMonthActiveClients: number;
  noShowRateMonth: number;
  lastMonthNoShowRate: number;
  avgServiceValueCents: number;
  newClientsWeek: number;
  outstandingInvoiceCents: number;
  inventoryValueCents: number;
  confirmedToday: number;
  checkedInToday: number;
  completedToday: number;
  activeLeads: number;
  newLeadsWeek: number;
  leadConversionRate: number;
  topLeadSource: string;
}

interface TodayAppt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_cents: number;
  client?: { first_name: string; last_name: string | null } | null;
  service?: { name: string } | null;
  staff?: { display_name: string; color: string | null } | null;
}

interface LowStockItem { id: string; name: string; stock_quantity: number; reorder_threshold: number }
interface OverdueTask { id: string; title: string; due_at: string }
interface ActivityItem { id: string; text: string; icon: string; time: Date }
interface BirthdayClient { id: string; first_name: string; last_name: string | null; date_of_birth: string; vip_status: boolean }

const DEFAULT_MONTHLY_GOAL_CENTS = 5_000_000;

function formatMoney(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function statusTint(status: string) {
  switch (status) {
    case "completed": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "confirmed": return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "checked_in": return "border-violet-500/40 bg-violet-500/10 text-violet-300";
    case "no_show": return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "cancelled": return "border-border bg-muted text-muted-foreground line-through";
    default: return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }
}

function deltaLabel(current: number, previous: number) {
  if (previous === 0) return { text: current > 0 ? "+∞" : "—", trend: "up" as const };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}%`, trend: pct >= 0 ? "up" as const : "down" as const };
}

function Dashboard() {
  const { activeClinic, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodayAppt[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [overdue, setOverdue] = useState<OverdueTask[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayClient[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!activeClinic) return;
    setLoading((prev) => !refreshing && prev);
    const clinicId = activeClinic.clinic_id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = startOfMonth;
    const startOfWeek = new Date(now.getTime() - (now.getDay() || 7) * 86400000).toISOString();

    const [
      todayList, yesterdayRes, monthRes, lastMonthRes, monthClientsRes, lastMonthClientsRes,
      inv, tasks, invItems, locRes, weekClientsRes,
      recentApptsRes, birthdayRes,
    ] = await Promise.all([
      supabase.from("appointments")
        .select("id, starts_at, ends_at, status, price_cents, client:clients(first_name,last_name), service:services(name), staff:staff(display_name,color)")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfDay).lt("starts_at", endOfDay)
        .order("starts_at", { ascending: true }),
      supabase.from("appointments")
        .select("price_cents, status")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfYesterday).lt("starts_at", startOfDay),
      supabase.from("appointments")
        .select("price_cents, status, client_id")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfMonth),
      supabase.from("appointments")
        .select("price_cents, status, client_id")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfLastMonth).lt("starts_at", endOfLastMonth),
      supabase.from("appointments")
        .select("client_id")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfMonth)
        .not("client_id", "is", null)
        .neq("status", "cancelled"),
      supabase.from("appointments")
        .select("client_id")
        .eq("clinic_id", clinicId)
        .gte("starts_at", startOfLastMonth).lt("starts_at", endOfLastMonth)
        .not("client_id", "is", null)
        .neq("status", "cancelled"),
      supabase.from("invoices").select("total_cents, status").eq("clinic_id", clinicId),
      supabase.from("tasks").select("id, title, due_at").eq("clinic_id", clinicId).neq("status", "done").not("due_at", "is", null).lt("due_at", now.toISOString()).order("due_at", { ascending: true }).limit(5),
      supabase.from("inventory_items").select("id, name, stock_quantity, reorder_threshold, unit_cost_cents").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("locations").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("is_primary", { ascending: false }),
      supabase.from("clients").select("id").eq("clinic_id", clinicId).gte("created_at", startOfWeek),
      supabase.from("appointments")
        .select("id, starts_at, status, price_cents, client:clients(first_name, last_name), service:services(name)")
        .eq("clinic_id", clinicId)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase.from("clients")
        .select("id, first_name, last_name, date_of_birth, vip_status")
        .eq("clinic_id", clinicId)
        .not("date_of_birth", "is", null),
    ]);

    const todayRows = (todayList.data ?? []) as unknown as TodayAppt[];
    setTodaySchedule(todayRows);
    setLocations(locRes.data ?? []);

    // Today's stats
    const todayRevenue = todayRows.filter((r) => r.status === "completed").reduce((s, r) => s + (r.price_cents ?? 0), 0);
    const confirmedToday = todayRows.filter((r) => r.status === "confirmed").length;
    const checkedInToday = todayRows.filter((r) => r.status === "checked_in").length;
    const completedToday = todayRows.filter((r) => r.status === "completed").length;

    // Yesterday
    const yesterdayRevenue = (yesterdayRes.data ?? []).filter((r) => r.status === "completed").reduce((s, r) => s + (r.price_cents ?? 0), 0);

    // This month
    const monthRows = monthRes.data ?? [];
    const monthRevenue = monthRows.filter((r) => r.status === "completed").reduce((s, r) => s + (r.price_cents ?? 0), 0);
    const monthTotal = monthRows.filter((r) => r.status !== "cancelled").length;
    const monthNoShows = monthRows.filter((r) => r.status === "no_show").length;
    const noShowRateMonth = monthTotal > 0 ? Math.round((monthNoShows / monthTotal) * 100) : 0;
    const monthCompletedCount = monthRows.filter((r) => r.status === "completed").length;
    const avgServiceValueCents = monthCompletedCount > 0 ? Math.round(monthRevenue / monthCompletedCount) : 0;

    // Last month
    const lastMonthRows = lastMonthRes.data ?? [];
    const lastMonthRevenue = lastMonthRows.filter((r) => r.status === "completed").reduce((s, r) => s + (r.price_cents ?? 0), 0);
    const lastMonthTotal = lastMonthRows.filter((r) => r.status !== "cancelled").length;
    const lastMonthNoShows = lastMonthRows.filter((r) => r.status === "no_show").length;
    const lastMonthNoShowRate = lastMonthTotal > 0 ? Math.round((lastMonthNoShows / lastMonthTotal) * 100) : 0;

    // Active clients
    const activeClientsMonth = new Set((monthClientsRes.data ?? []).map((r: any) => r.client_id).filter(Boolean)).size;
    const lastMonthActiveClients = new Set((lastMonthClientsRes.data ?? []).map((r: any) => r.client_id).filter(Boolean)).size;

    // Invoices
    const outstandingInvoices = (inv.data ?? []).filter((i) => i.status === "draft" || i.status === "sent" || i.status === "overdue");
    const outstandingInvoiceCents = outstandingInvoices.reduce((s, i) => s + (i.total_cents ?? 0), 0);

    // Inventory
    const invItemsData = invItems.data ?? [];
    const inventoryValueCents = invItemsData.reduce((s, i) => s + (i.stock_quantity * i.unit_cost_cents), 0);

    setStats({
      todayAppointments: todayRows.length,
      todayRevenueCents: todayRevenue,
      yesterdayRevenueCents: yesterdayRevenue,
      monthRevenueCents: monthRevenue,
      lastMonthRevenueCents: lastMonthRevenue,
      activeClientsMonth,
      lastMonthActiveClients,
      noShowRateMonth,
      lastMonthNoShowRate,
      avgServiceValueCents,
      newClientsWeek: weekClientsRes.data?.length ?? 0,
      outstandingInvoiceCents,
      inventoryValueCents,
      confirmedToday,
      checkedInToday,
      completedToday,
    });

    setLowStock(invItemsData.filter((i) => i.stock_quantity <= i.reorder_threshold).slice(0, 5));
    setOverdue((tasks.data ?? []) as OverdueTask[]);

    // Recent activity from appointments
    const recentAppts = (recentApptsRes.data ?? []) as any[];
    setRecentActivity(recentAppts.map((a) => {
      const clientName = a.client ? `${a.client.first_name}${a.client.last_name ? ` ${a.client.last_name}` : ""}` : "Walk-in";
      const serviceName = a.service?.name ?? "appointment";
      let text = `${clientName} — ${serviceName}`;
      if (a.status === "completed") text = `${clientName} completed ${serviceName} (${formatMoney(a.price_cents ?? 0, activeClinic.clinic.currency ?? "CAD")})`;
      else if (a.status === "confirmed") text = `${clientName} confirmed ${serviceName}`;
      else if (a.status === "cancelled") text = `${clientName} cancelled ${serviceName}`;
      else if (a.status === "no_show") text = `${clientName} no-showed for ${serviceName}`;
      else text = `${clientName} booked ${serviceName}`;
      return { id: a.id, text, icon: a.status, time: new Date(a.starts_at) };
    }));

    // Birthdays in next 7 days
    const allClients = (birthdayRes.data ?? []) as BirthdayClient[];
    const upcoming: BirthdayClient[] = [];
    for (const c of allClients) {
      if (!c.date_of_birth) continue;
      const dob = new Date(c.date_of_birth);
      const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      if (bday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        bday.setFullYear(bday.getFullYear() + 1);
      }
      const diff = (bday.getTime() - now.getTime()) / 86400000;
      if (diff >= 0 && diff <= 7) upcoming.push(c);
    }
    upcoming.sort((a, b) => {
      if (a.vip_status && !b.vip_status) return -1;
      if (!a.vip_status && b.vip_status) return 1;
      return 0;
    });
    setBirthdays(upcoming.slice(0, 5));

    setLoading(false);
    setRefreshing(false);
  }, [activeClinic, refreshing]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const currency = activeClinic?.clinic.currency ?? "CAD";
  const revenueDelta = stats ? deltaLabel(stats.todayRevenueCents, stats.yesterdayRevenueCents) : null;
  const clientsDelta = stats ? deltaLabel(stats.activeClientsMonth, stats.lastMonthActiveClients) : null;
  const noShowDelta = stats ? deltaLabel(stats.noShowRateMonth, stats.lastMonthNoShowRate) : null;

  const goalCents = DEFAULT_MONTHLY_GOAL_CENTS;
  const progressCents = stats?.monthRevenueCents ?? 0;
  const progressPct = Math.min(100, Math.round((progressCents / goalCents) * 100));
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.email?.split("@")[0]?.split(".")[0] ?? "";

  const insights = useMemo(() => {
    if (!stats) return [];
    const items: { icon: typeof TrendingUp; title: string; body: string; tone: "primary" | "success" | "amber"; link?: string }[] = [];
    const revDelta = stats.lastMonthRevenueCents > 0 ? Math.round(((stats.monthRevenueCents - stats.lastMonthRevenueCents) / stats.lastMonthRevenueCents) * 100) : 0;
    if (revDelta > 0) items.push({ icon: TrendingUp, tone: "primary", title: `Revenue up ${revDelta}% vs last month`, body: "Keep the momentum going with targeted follow-ups.", link: "/app/reports" });
    else if (revDelta < 0) items.push({ icon: TrendingUp, tone: "amber", title: `Revenue down ${Math.abs(revDelta)}% vs last month`, body: "Consider running a promotion to boost bookings.", link: "/app/marketing" });
    if (stats.noShowRateMonth > 5) items.push({ icon: AlertTriangle, tone: "amber", title: `No-show rate at ${stats.noShowRateMonth}%`, body: "Enable 24h confirmation reminders to reduce no-shows.", link: "/app/automations" });
    if (lowStock.length > 0) items.push({ icon: Package, tone: "amber", title: `${lowStock.length} items low on stock`, body: "Review inventory before your next busy day.", link: "/app/inventory" });
    if (stats.newClientsWeek > 0) items.push({ icon: UserPlus, tone: "success", title: `${stats.newClientsWeek} new clients this week`, body: "Send a welcome message to make a great first impression.", link: "/app/clients" });
    if (items.length === 0) items.push({ icon: Sparkles, tone: "primary", title: "Everything looks great!", body: "Your clinic is running smoothly. Keep up the excellent work." });
    return items.slice(0, 4);
  }, [stats, lowStock]);

  // Pending actions count
  const pendingCount = overdue.length + lowStock.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" — "}
            {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting}, <span className="capitalize">{firstName}</span>!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening at <span className="text-foreground">{activeClinic?.clinic.name}</span> today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {locations.length > 1 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatMoney(stats?.todayRevenueCents ?? 0, currency)}
          icon={DollarSign}
          change={revenueDelta?.text}
          trend={revenueDelta?.trend}
          sub="vs yesterday"
          loading={loading}
        />
        <StatCard
          label="Today's Appointments"
          value={stats?.todayAppointments ?? 0}
          icon={CalendarDays}
          sub={stats ? `${stats.confirmedToday} confirmed · ${stats.checkedInToday} checked-in · ${stats.completedToday} completed` : ""}
          loading={loading}
        />
        <StatCard
          label="Active Clients"
          value={stats?.activeClientsMonth ?? 0}
          icon={Users}
          change={clientsDelta?.text}
          trend={clientsDelta?.trend}
          sub="This month vs last"
          loading={loading}
        />
        <StatCard
          label="No-Show Rate"
          value={`${stats?.noShowRateMonth ?? 0}%`}
          icon={AlertTriangle}
          change={noShowDelta?.text}
          trend={noShowDelta?.trend === "up" ? "down" : "up"}
          sub="This month vs last"
          loading={loading}
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniKpi label="Avg Service Value" value={formatMoney(stats?.avgServiceValueCents ?? 0, currency)} loading={loading} />
        <MiniKpi label="New Clients (Week)" value={stats?.newClientsWeek ?? 0} loading={loading} />
        <MiniKpi label="Outstanding Invoices" value={formatMoney(stats?.outstandingInvoiceCents ?? 0, currency)} loading={loading} />
        <MiniKpi label="Inventory Value" value={formatMoney(stats?.inventoryValueCents ?? 0, currency)} loading={loading} />
      </div>

      {/* Revenue Goal + AI Insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Revenue goal</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{monthName} target</h3>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tracking-tight">
              {formatMoney(progressCents, currency)}
            </span>
            <span className="text-xs text-muted-foreground">of {formatMoney(goalCents, currency)}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-primary shadow-glow transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{progressPct}% complete</span>
            <Link to="/app/settings" className="text-primary hover:underline">Edit goal</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">AI Insights</h3>
                <p className="text-[11px] text-muted-foreground">Powered by your real clinic data.</p>
              </div>
            </div>
            <Link to="/app/ai" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Ask AI <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-24 rounded-xl" /></li>)}
              </>
            ) : (
              insights.map((ins) => {
                const Icon = ins.icon;
                const tone =
                  ins.tone === "success" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : ins.tone === "amber" ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                  : "border-primary/30 bg-primary/5 text-primary";
                return (
                  <li key={ins.title} className={cn("rounded-xl border p-3", tone)}>
                    <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-background/40">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs font-semibold leading-snug text-foreground">{ins.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ins.body}</p>
                    {ins.link && (
                      <Link to={ins.link as any} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
                        View details <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Main content: Schedule + Sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left — Today's Schedule + Pending Actions */}
        <div className="space-y-4 lg:col-span-2">
          {/* Today's Schedule */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Today's Schedule</h2>
                <p className="text-xs text-muted-foreground">
                  {todaySchedule.length} appointment{todaySchedule.length !== 1 ? "s" : ""} today
                </p>
              </div>
              <Link to="/app/calendar" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Open calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : todaySchedule.length === 0 ? (
              <EmptyState title="No appointments today" description="When you book clients they'll show up here in real time." />
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((appt) => {
                  const start = new Date(appt.starts_at);
                  const end = new Date(appt.ends_at);
                  const clientName = appt.client ? `${appt.client.first_name}${appt.client.last_name ? ` ${appt.client.last_name}` : ""}` : "Walk-in";
                  return (
                    <div key={appt.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:border-primary/30">
                      <div className="w-1 self-stretch rounded-full" style={{ background: appt.staff?.color ?? "hsl(var(--primary))" }} />
                      <div className="min-w-12 text-center">
                        <div className="font-mono text-sm font-medium">{start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                        <div className="text-[10px] text-muted-foreground">{Math.round((end.getTime() - start.getTime()) / 60000)}m</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{clientName}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {appt.service?.name ?? "Service"}{appt.staff && ` · ${appt.staff.display_name}`}
                        </div>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusTint(appt.status))}>
                        {appt.status.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Actions */}
          {pendingCount > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <FileWarning className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-semibold">Pending Actions</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{pendingCount}</span>
              </div>
              <div className="space-y-2">
                {overdue.map((t) => (
                  <Link key={t.id} to="/app/tasks" className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-3 transition hover:border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-sm">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-amber-300">Due {new Date(t.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </Link>
                ))}
                {lowStock.map((item) => (
                  <Link key={item.id} to="/app/inventory" className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-3 transition hover:border-rose-500/30">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-rose-300">{item.stock_quantity} left</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h2 className="font-display text-base font-semibold">Recent Activity</h2>
                </div>
              </div>
              <div className="space-y-2">
                {recentActivity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg p-2 text-sm">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      <ActivityIcon status={item.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground/90">{item.text}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(item.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Birthdays */}
          {birthdays.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300">
                  <Cake className="h-4 w-4" />
                </div>
                <h3 className="font-display text-sm font-semibold">Upcoming Birthdays</h3>
              </div>
              <ul className="space-y-2">
                {birthdays.map((c) => {
                  const dob = new Date(c.date_of_birth);
                  const bday = new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate());
                  const isToday = bday.toDateString() === new Date().toDateString();
                  return (
                    <li key={c.id} className="flex items-center justify-between">
                      <Link to="/app/clients/$clientId" params={{ clientId: c.id }} className="flex items-center gap-2 text-sm hover:text-primary">
                        <span className="truncate">{c.first_name} {c.last_name ?? ""}</span>
                        {c.vip_status && <Star className="h-3 w-3 text-amber-400" />}
                      </Link>
                      <span className={cn("text-[10px]", isToday ? "font-bold text-pink-400" : "text-muted-foreground")}>
                        {isToday ? "🎂 Today!" : bday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* All Clear card when no alerts */}
          {lowStock.length === 0 && overdue.length === 0 && birthdays.length === 0 && !loading && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">All clear</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">No alerts or actions needed. Great work!</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/app/leads" className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs hover:border-primary/40">
                  <Target className="h-3.5 w-3.5 text-primary" /> Leads
                </Link>
                <Link to="/app/reports" className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs hover:border-primary/40">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Reports
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="sticky bottom-4 z-10 mx-auto w-fit rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Link to="/app/booking" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Appointment
          </Link>
          <Link to="/app/clients" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium transition hover:border-primary/40">
            <UserPlus className="h-3.5 w-3.5 text-primary" /> New Client
          </Link>
          <Link to="/app/pos" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium transition hover:border-primary/40">
            <ShoppingCart className="h-3.5 w-3.5 text-primary" /> POS Sale
          </Link>
          <Link to="/app/inbox" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium transition hover:border-primary/40 max-sm:hidden">
            <MessageSquare className="h-3.5 w-3.5 text-primary" /> Message
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ——— Small helper components ——— */

function MiniKpi({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      {loading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <div className="font-display text-lg font-semibold tracking-tight">{value}</div>
      )}
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ActivityIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <DollarSign className="h-3 w-3 text-emerald-400" />;
    case "confirmed": return <CalendarDays className="h-3 w-3 text-sky-400" />;
    case "cancelled": return <AlertTriangle className="h-3 w-3 text-rose-400" />;
    case "no_show": return <AlertTriangle className="h-3 w-3 text-amber-400" />;
    default: return <CalendarDays className="h-3 w-3 text-primary" />;
  }
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarDays className="h-5 w-5" />
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
