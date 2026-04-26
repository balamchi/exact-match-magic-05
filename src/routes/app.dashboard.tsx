import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  DollarSign,
  Repeat,
  Sparkles,
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Target,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

interface Stats {
  todayAppointments: number;
  todayRevenueCents: number;
  monthRevenueCents: number;
  activeClients: number;        // distinct clients with appt in last 90d
  rebookRatePct: number;        // % of clients in last 90d with 2+ visits
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

// Default monthly revenue goal until per-clinic settings exist.
const DEFAULT_MONTHLY_GOAL_CENTS = 5_000_000; // $50,000

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

function Dashboard() {
  const { activeClinic, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodayAppt[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [overdue, setOverdue] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const clinicId = activeClinic.clinic_id;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOf90d = new Date(now.getTime() - 90 * 86400000).toISOString();

      const [todayList, monthRes, last90Res, inv, tasks] = await Promise.all([
        supabase.from("appointments")
          .select("id, starts_at, ends_at, status, price_cents, client:clients(first_name,last_name), service:services(name), staff:staff(display_name,color)")
          .eq("clinic_id", clinicId)
          .gte("starts_at", startOfDay).lt("starts_at", endOfDay)
          .order("starts_at", { ascending: true }),
        supabase.from("appointments")
          .select("price_cents, status")
          .eq("clinic_id", clinicId)
          .gte("starts_at", startOfMonth),
        supabase.from("appointments")
          .select("client_id, status")
          .eq("clinic_id", clinicId)
          .gte("starts_at", startOf90d)
          .not("client_id", "is", null),
        supabase.from("inventory_items").select("id, name, stock_quantity, reorder_threshold").eq("clinic_id", clinicId).eq("active", true),
        supabase.from("tasks").select("id, title, due_at").eq("clinic_id", clinicId).neq("status", "done").not("due_at", "is", null).lt("due_at", now.toISOString()).order("due_at", { ascending: true }).limit(5),
      ]);

      const todayRows = (todayList.data ?? []) as unknown as TodayAppt[];
      setTodaySchedule(todayRows);

      const todayRevenue = todayRows
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + (r.price_cents ?? 0), 0);

      const monthRows = monthRes.data ?? [];
      const monthRevenue = monthRows
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + (r.price_cents ?? 0), 0);

      const last90Rows = (last90Res.data ?? []) as Array<{ client_id: string | null; status: string }>;
      const counts = new Map<string, number>();
      for (const r of last90Rows) {
        if (!r.client_id) continue;
        if (r.status === "cancelled" || r.status === "no_show") continue;
        counts.set(r.client_id, (counts.get(r.client_id) ?? 0) + 1);
      }
      const activeClients = counts.size;
      const repeat = Array.from(counts.values()).filter((n) => n >= 2).length;
      const rebookRatePct = activeClients > 0 ? Math.round((repeat / activeClients) * 100) : 0;

      setStats({
        todayAppointments: todayRows.length,
        todayRevenueCents: todayRevenue,
        monthRevenueCents: monthRevenue,
        activeClients,
        rebookRatePct,
      });

      setLowStock((inv.data ?? []).filter((i) => i.stock_quantity <= i.reorder_threshold).slice(0, 5));
      setOverdue((tasks.data ?? []) as OverdueTask[]);
      setLoading(false);
    };
    load();
  }, [activeClinic]);

  const currency = activeClinic?.clinic.currency ?? "CAD";

  const cards = [
    { label: "Today's appointments", value: stats?.todayAppointments ?? 0, icon: CalendarDays, hint: "Scheduled today" },
    { label: "Today's revenue", value: formatMoney(stats?.todayRevenueCents ?? 0, currency), icon: DollarSign, hint: "Completed visits" },
    { label: "Active clients (90d)", value: stats?.activeClients ?? 0, icon: Users, hint: "Visited in last 90 days" },
    { label: "Rebook rate (90d)", value: `${stats?.rebookRatePct ?? 0}%`, icon: Repeat, hint: "Clients with 2+ visits" },
  ];

  const goalCents = DEFAULT_MONTHLY_GOAL_CENTS;
  const progressCents = stats?.monthRevenueCents ?? 0;
  const progressPct = Math.min(100, Math.round((progressCents / goalCents) * 100));
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });

  const insights: { icon: typeof Lightbulb; title: string; body: string; tone: "primary" | "success" | "amber" }[] = [
    {
      icon: TrendingUp,
      tone: "primary",
      title: "Friday afternoons are your peak",
      body: "Last 30 days: Fri 2–5pm averages 92% utilization. Consider opening a 6pm slot.",
    },
    {
      icon: Repeat,
      tone: "success",
      title: "12 clients due for a rebook",
      body: "Filler clients last seen 75–90 days ago haven't booked. Send a touch-up reminder.",
    },
    {
      icon: AlertTriangle,
      tone: "amber",
      title: "No-show rate trending up",
      body: "Up 3% week-over-week. Enable the 24h confirmation automation to recover ~$1.2k/mo.",
    },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.email?.split("@")[0]?.split(".")[0] ?? "";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {greeting}, <span className="capitalize">{firstName}</span>.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here's what's happening at <span className="text-foreground">{activeClinic?.clinic.name}</span> today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} sub={card.hint} loading={loading} />
        ))}
      </div>

      {/* Monthly goal + AI Insights */}
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
            <span className="text-xs text-muted-foreground">
              of {formatMoney(goalCents, currency)}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary shadow-glow transition-all"
              style={{ width: `${progressPct}%` }}
            />
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
                <p className="text-[11px] text-muted-foreground">Sample suggestions — full intelligence unlocks in Round 4.</p>
              </div>
            </div>
            <Link to="/app/ai" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Ask AI <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {insights.map((ins) => {
              const Icon = ins.icon;
              const tone =
                ins.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : ins.tone === "amber"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                  : "border-primary/30 bg-primary/5 text-primary";
              return (
                <li key={ins.title} className={cn("rounded-xl border p-3", tone)}>
                  <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-background/40">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-semibold leading-snug text-foreground">{ins.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ins.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Today's schedule</h2>
              <p className="text-xs text-muted-foreground">Live view of your appointments.</p>
            </div>
            <Link to="/app/calendar" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
              ))}
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

        <div className="space-y-4">
          {lowStock.length > 0 && (
            <div className="rounded-2xl border border-rose-500/40 bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-semibold">Low stock</h3>
                </div>
                <Link to="/app/inventory" className="text-[11px] text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              <ul className="space-y-1.5 text-sm">
                {lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <span className="font-mono text-xs text-rose-300">{item.stock_quantity} / {item.reorder_threshold}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {overdue.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-semibold">Overdue tasks</h3>
                </div>
                <Link to="/app/tasks" className="text-[11px] text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              <ul className="space-y-1.5 text-sm">
                {overdue.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-[10px] text-amber-300">
                      {new Date(t.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lowStock.length === 0 && overdue.length === 0 && !loading && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">All clear</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">No low stock alerts or overdue tasks. Great work.</p>
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
    </div>
  );
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
