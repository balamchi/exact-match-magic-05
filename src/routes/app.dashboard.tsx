import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Users, DollarSign, TrendingUp, ArrowUpRight, Sparkles, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

interface Stats {
  todayAppointments: number;
  weekAppointments: number;
  totalClients: number;
  weekRevenueCents: number;
  newLeads: number;
}

function formatMoney(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function Dashboard() {
  const { activeClinic, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const clinicId = activeClinic.clinic_id;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [todayRes, weekRes, clientsRes, leadsRes] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId).gte("starts_at", startOfDay).lt("starts_at", endOfDay),
        supabase.from("appointments").select("id, price_cents, status")
          .eq("clinic_id", clinicId).gte("starts_at", startOfWeek),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId).eq("stage", "new"),
      ]);

      const weekRows = weekRes.data ?? [];
      const weekRevenue = weekRows
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + (r.price_cents ?? 0), 0);

      setStats({
        todayAppointments: todayRes.count ?? 0,
        weekAppointments: weekRows.length,
        totalClients: clientsRes.count ?? 0,
        weekRevenueCents: weekRevenue,
        newLeads: leadsRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, [activeClinic]);

  const cards = [
    {
      label: "Today's appointments",
      value: stats?.todayAppointments ?? 0,
      icon: CalendarDays,
      hint: `${stats?.weekAppointments ?? 0} this week`,
    },
    {
      label: "Total clients",
      value: stats?.totalClients ?? 0,
      icon: Users,
      hint: "All-time",
    },
    {
      label: "Revenue (7d)",
      value: formatMoney(stats?.weekRevenueCents ?? 0, activeClinic?.clinic.currency ?? "CAD"),
      icon: DollarSign,
      hint: "Completed appointments",
    },
    {
      label: "New leads",
      value: stats?.newLeads ?? 0,
      icon: TrendingUp,
      hint: "Awaiting contact",
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
      {/* Greeting */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/30">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-4.5 w-4.5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <div className="font-display text-3xl font-semibold tracking-tight">
                {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" /> : card.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-[11px] text-muted-foreground/80">{card.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Today's schedule</h2>
              <p className="text-xs text-muted-foreground">Live view of your appointments.</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <EmptyState
            title="No appointments today"
            description="When you start booking clients they'll show up here in real time."
          />
        </div>

        <div className="rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
          <div className="bg-gradient-glow pointer-events-none absolute" />
          <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Get set up in 5 minutes</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Add your services, invite your team, and you're ready to book.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Add your services & pricing",
              "Invite staff and set roles",
              "Connect online booking",
              "Customize consent forms",
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground/85">{step}</span>
              </li>
            ))}
          </ul>
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
