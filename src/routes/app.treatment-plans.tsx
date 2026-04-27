import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ListChecks,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  FileEdit,
  Sparkles,
  User,
  DollarSign,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/treatment-plans")({ component: TreatmentPlansPage });

type Plan = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  title: string;
  goals: string | null;
  estimated_total_cents: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type StatusKey = "draft" | "active" | "completed" | "declined";

const STATUSES: { key: StatusKey; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: "draft", label: "Draft", icon: <FileEdit className="h-3.5 w-3.5" />, tone: "border-border bg-muted/40 text-muted-foreground" },
  { key: "active", label: "Active", icon: <TrendingUp className="h-3.5 w-3.5" />, tone: "border-primary/40 bg-primary/10 text-primary" },
  { key: "completed", label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" />, tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { key: "declined", label: "Declined", icon: <XCircle className="h-3.5 w-3.5" />, tone: "border-destructive/40 bg-destructive/10 text-destructive" },
];

const TEMPLATES: { name: string; title: string; goals: string; total: number }[] = [
  {
    name: "Wrinkle reduction (3 visits)",
    title: "Wrinkle reduction program",
    goals: "Visit 1: Botox (glabella, forehead, crows feet) — assess at 2 weeks.\nVisit 2: Touch-ups + filler consult if indicated.\nVisit 3: Maintenance review at 12 weeks.",
    total: 180000,
  },
  {
    name: "Full-face rejuvenation",
    title: "Full-face rejuvenation plan",
    goals: "Phase 1: Botox upper face.\nPhase 2: HA filler — midface + lips.\nPhase 3: Skin resurfacing series (3 sessions).\nMaintenance: quarterly.",
    total: 450000,
  },
  {
    name: "Acne & skin clarity (6 sessions)",
    title: "Acne clearance & skin clarity",
    goals: "6 medical-grade facials, 3 weeks apart.\nAt-home regimen review.\nIPL for PIH at session 4 if needed.",
    total: 120000,
  },
  {
    name: "Body contouring series",
    title: "Body contouring series",
    goals: "4 sessions of body contouring on target area.\nMeasurements + photos at sessions 1 and 4.\nReassess for additional cycle.",
    total: 240000,
  },
];

const planSchema = z.object({
  client_name: z.string().trim().min(1, "Client name required").max(160),
  title: z.string().trim().min(1, "Plan title required").max(200),
  goals: z.string().trim().max(2000).optional().nullable(),
  estimated_total_cents: z.number().int().min(0),
  status: z.enum(["draft", "active", "completed", "declined"]),
});

type Draft = {
  client_name: string;
  title: string;
  goals: string;
  total_dollars: string;
  status: StatusKey;
};

const emptyDraft = (): Draft => ({
  client_name: "",
  title: "",
  goals: "",
  total_dollars: "",
  status: "draft",
});

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

function TreatmentPlansPage() {
  const { activeClinic } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | StatusKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("treatment_plans")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load treatment plans");
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!activeClinic) return;
    const ch = supabase
      .channel(`treatment-plans-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "treatment_plans", filter: `clinic_id=eq.${activeClinic.clinic_id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const stats = useMemo(() => {
    const counts: Record<StatusKey, number> = { draft: 0, active: 0, completed: 0, declined: 0 };
    let pipeline = 0;
    let earned = 0;
    for (const p of plans) {
      const s = (p.status as StatusKey) ?? "draft";
      if (counts[s] !== undefined) counts[s]++;
      if (s === "active" || s === "draft") pipeline += Number(p.estimated_total_cents ?? 0);
      if (s === "completed") earned += Number(p.estimated_total_cents ?? 0);
    }
    const conversion =
      counts.active + counts.completed + counts.declined > 0
        ? Math.round(((counts.active + counts.completed) / (counts.active + counts.completed + counts.declined)) * 100)
        : 0;
    return { counts, pipeline, earned, conversion };
  }, [plans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (!q) return true;
      return [p.client_name, p.title, p.goals].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [plans, query, tab]);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [plans, selectedId, filtered]
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setDraft({
      client_name: p.client_name,
      title: p.title,
      goals: p.goals ?? "",
      total_dollars: p.estimated_total_cents ? (p.estimated_total_cents / 100).toString() : "",
      status: (p.status as StatusKey) ?? "draft",
    });
    setOpen(true);
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setDraft((d) => ({
      ...d,
      title: d.title || t.title,
      goals: d.goals || t.goals,
      total_dollars: d.total_dollars || (t.total / 100).toString(),
    }));
    toast.success(`Template applied: ${t.name}`);
  };

  const setStatus = async (p: Plan, status: StatusKey) => {
    if (!activeClinic || p.status === status) return;
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    const { error } = await supabase
      .from("treatment_plans")
      .update({ status })
      .eq("id", p.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not update");
      await load();
    } else {
      toast.success(`Marked ${STATUSES.find((s) => s.key === status)?.label.toLowerCase()}`);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = planSchema.safeParse({
      client_name: draft.client_name,
      title: draft.title,
      goals: draft.goals || null,
      estimated_total_cents: Math.round((parseFloat(draft.total_dollars) || 0) * 100),
      status: draft.status,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const payload = { clinic_id: activeClinic.clinic_id, ...parsed.data };
    const res = editing
      ? await supabase
          .from("treatment_plans")
          .update(payload)
          .eq("id", editing.id)
          .eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("treatment_plans").insert(payload).select("id").single();
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Plan updated" : "Plan created");
      setOpen(false);
      if (!editing && (res as any).data?.id) setSelectedId((res as any).data.id);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this treatment plan?")) return;
    const { error } = await supabase
      .from("treatment_plans")
      .delete()
      .eq("id", editing.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plan deleted");
      setSelectedId(null);
      setOpen(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Care planning</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Treatment Plans</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Build multi-visit care journeys with goals, pricing, and progression — convert consults into long-term clients.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label="Active plans"
          value={stats.counts.active.toString()}
          sub={`${stats.counts.draft} drafts`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent
        />
        <Metric label="Pipeline value" value={fmtCurrency(stats.pipeline)} icon={<DollarSign className="h-4 w-4" />} />
        <Metric label="Completed value" value={fmtCurrency(stats.earned)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Metric
          label="Conversion"
          value={`${stats.conversion}%`}
          sub="Active or completed vs. declined"
          icon={<Target className="h-4 w-4" />}
        />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading plans…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plans, clients, goals…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-card p-1">
              {([
                ["all", "All", plans.length],
                ["draft", "Draft", stats.counts.draft],
                ["active", "Active", stats.counts.active],
                ["completed", "Done", stats.counts.completed],
                ["declined", "Lost", stats.counts.declined],
              ] as const).map(([k, label, count]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "rounded-md px-1 py-1.5 text-[11px] font-medium transition",
                    tab === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label} {count > 0 && <span className="opacity-60">{count}</span>}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {plans.length === 0 ? "No plans yet. Create your first care plan." : "Nothing matches your filters."}
                </div>
              ) : (
                filtered.map((p) => {
                  const status = STATUSES.find((s) => s.key === p.status) ?? STATUSES[0];
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition",
                        selected?.id === p.id
                          ? "border-primary/60 bg-primary/5 shadow-glow"
                          : "border-border bg-card hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{p.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3" /> {p.client_name}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                            status.tone
                          )}
                        >
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground/80">
                          {fmtCurrency(p.estimated_total_cents ?? 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card shadow-card">
            {selected ? (
              <>
                <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {selected.client_name}
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{selected.title}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" /> {fmtCurrency(selected.estimated_total_cents ?? 0)} estimated
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Updated {new Date(selected.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(selected)} className="gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>

                <div className="border-b border-border p-5">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Stage</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setStatus(selected, s.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                          selected.status === s.key ? s.tone : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Target className="h-4 w-4 text-primary" /> Goals & roadmap
                  </div>
                  <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-surface/40 p-4 text-sm leading-relaxed text-foreground/90">
                    {selected.goals || (
                      <span className="italic text-muted-foreground">
                        No goals documented yet. Click Edit to add the treatment roadmap.
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                <ListChecks className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select a plan, or create a new one.</p>
                <Button onClick={openCreate} variant="ghost" className="gap-2">
                  <Plus className="h-4 w-4" /> New treatment plan
                </Button>
              </div>
            )}
          </main>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit plan" : "New treatment plan"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Define a multi-visit roadmap and estimated investment for the client.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="client_name">Client</Label>
                  <Input
                    id="client_name"
                    value={draft.client_name}
                    onChange={(e) => setDraft({ ...draft, client_name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Plan title</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Wrinkle reduction program"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick templates
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="goals">Goals & roadmap</Label>
                <textarea
                  id="goals"
                  value={draft.goals}
                  onChange={(e) => setDraft({ ...draft, goals: e.target.value })}
                  placeholder="Visit-by-visit plan, goals, expected outcomes…"
                  rows={8}
                  className="w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="total">Estimated total (CAD)</Label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="total"
                      type="number"
                      min="0"
                      step="50"
                      value={draft.total_dollars}
                      onChange={(e) => setDraft({ ...draft, total_dollars: e.target.value })}
                      placeholder="0"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, status: s.key })}
                        className={cn(
                          "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
                          draft.status === s.key ? s.tone : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={remove}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={saving}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Create plan"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent ? "bg-emerald-500/15 text-emerald-300" : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}
