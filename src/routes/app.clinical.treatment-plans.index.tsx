import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ListChecks, Target, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/clinical/treatment-plans/")({ component: TreatmentPlansDashboard });

function TreatmentPlansDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase.from("treatment_plans")
      .select("*, client:clients(first_name, last_name), service:services(name)")
      .eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(200);
    if (error) toast.error("Failed to load plans");
    setPlans(data ?? []);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const filtered = plans.filter(p => {
    if (!query.trim()) return true;
    const name = [p.client?.first_name, p.client?.last_name].filter(Boolean).join(" ").toLowerCase();
    return name.includes(query.toLowerCase()) || p.name?.toLowerCase().includes(query.toLowerCase());
  });

  const statusIcon = (s: string) => s === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    s === "cancelled" ? <XCircle className="h-4 w-4 text-red-400" /> :
    s === "in_progress" ? <Target className="h-4 w-4 text-primary" /> :
    <Clock className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Treatment Plans</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Multi-session treatment plans with progress tracking and before/after photos.</p>
        </div>
        <Button className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New Plan</Button>
      </section>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search plans…"
          className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>
      {loading ? <div className="space-y-3">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> :
       filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{plans.length === 0 ? "No treatment plans yet." : "No plans match your search."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => {
            const clientName = [p.client?.first_name, p.client?.last_name].filter(Boolean).join(" ") || "Unknown";
            const pct = p.total_sessions_planned > 0 ? Math.round((p.sessions_completed / p.total_sessions_planned) * 100) : 0;
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(p.status)}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{clientName} · {p.service?.name ?? "No service"}</div>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    p.status === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                    p.status === "in_progress" ? "border-primary/40 bg-primary/10 text-primary" :
                    "border-border text-muted-foreground")}>{p.status?.replace("_", " ")}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{p.sessions_completed}/{p.total_sessions_planned} sessions</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
