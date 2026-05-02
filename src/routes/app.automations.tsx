import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkflowBuilder, type WorkflowNode } from "@/components/workflow-builder";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Gift,
  Mail,
  MessageSquare,
  Plus,
  Power,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/automations")({ component: AutomationsPage });

type Automation = Tables<"automations">;
type Trigger =
  | "appointment_booked"
  | "appointment_completed"
  | "no_show"
  | "lead_created"
  | "birthday"
  | "rebook_due";
type Action = "email" | "sms" | "task";

interface AutomationForm {
  name: string;
  trigger_event: Trigger;
  action_type: Action;
  active: boolean;
}

const emptyForm: AutomationForm = {
  name: "",
  trigger_event: "appointment_completed",
  action_type: "email",
  active: true,
};

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  trigger_event: z.enum([
    "appointment_booked",
    "appointment_completed",
    "no_show",
    "lead_created",
    "birthday",
    "rebook_due",
  ]),
  action_type: z.enum(["email", "sms", "task"]),
  active: z.boolean(),
});

const TRIGGER_META: Record<Trigger, { label: string; Icon: typeof Bell; tone: string; description: string }> = {
  appointment_booked: {
    label: "Appointment booked",
    Icon: CalendarCheck,
    tone: "text-sky-300 bg-sky-500/10",
    description: "When a client books online or in-app.",
  },
  appointment_completed: {
    label: "Appointment completed",
    Icon: CheckCircle2,
    tone: "text-emerald-300 bg-emerald-500/10",
    description: "After a visit is marked complete.",
  },
  no_show: {
    label: "No-show",
    Icon: XCircle,
    tone: "text-rose-300 bg-rose-500/10",
    description: "When a client doesn't make it in.",
  },
  lead_created: {
    label: "New lead",
    Icon: UserPlus,
    tone: "text-violet-300 bg-violet-500/10",
    description: "When a new lead lands in your CRM.",
  },
  birthday: {
    label: "Client birthday",
    Icon: Gift,
    tone: "text-pink-300 bg-pink-500/10",
    description: "On a client's birthday.",
  },
  rebook_due: {
    label: "Rebook due",
    Icon: Bell,
    tone: "text-amber-300 bg-amber-500/10",
    description: "75–90 days since last visit, no booking.",
  },
};

const ACTION_META: Record<Action, { label: string; Icon: typeof Mail; tone: string; description: string }> = {
  email: { label: "Send email", Icon: Mail, tone: "text-primary bg-primary/15", description: "Branded HTML email" },
  sms: { label: "Send SMS", Icon: MessageSquare, tone: "text-emerald-300 bg-emerald-500/10", description: "Text message" },
  task: { label: "Create task", Icon: ClipboardList, tone: "text-amber-300 bg-amber-500/10", description: "Assign internal follow-up" },
};

interface Recipe {
  name: string;
  trigger: Trigger;
  action: Action;
  icon: typeof Sparkles;
  blurb: string;
}

const RECIPES: Recipe[] = [
  {
    name: "Post-visit thank you",
    trigger: "appointment_completed",
    action: "email",
    icon: Sparkles,
    blurb: "Thank clients within an hour of their visit.",
  },
  {
    name: "24-hour reminder",
    trigger: "appointment_booked",
    action: "sms",
    icon: Bell,
    blurb: "SMS reminder one day before the appointment.",
  },
  {
    name: "Win back no-shows",
    trigger: "no_show",
    action: "sms",
    icon: XCircle,
    blurb: "Friendly nudge to reschedule the same week.",
  },
  {
    name: "Rebook nudge (90d)",
    trigger: "rebook_due",
    action: "email",
    icon: CalendarCheck,
    blurb: "Send touch-up reminders to lapsing clients.",
  },
  {
    name: "Birthday gift card",
    trigger: "birthday",
    action: "email",
    icon: Gift,
    blurb: "Give clients a $25 gift card on their birthday.",
  },
  {
    name: "New lead → call task",
    trigger: "lead_created",
    action: "task",
    icon: UserPlus,
    blurb: "Assign a callback task to the front desk.",
  },
  {
    name: "Review request",
    trigger: "appointment_completed",
    action: "sms",
    icon: Star,
    blurb: "Ask happy clients to leave a Google review.",
  },
];

function AutomationsPage() {
  const { activeClinic } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [form, setForm] = useState<AutomationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [builderNodes, setBuilderNodes] = useState<WorkflowNode[]>([
    { id: "t1", kind: "trigger", label: "Appointment Completed", config: { type: "appointment_completed" } },
    { id: "d1", kind: "delay", label: "Wait 1 hour", config: { duration: "1", unit: "hours" } },
    { id: "a1", kind: "action", label: "Send Thank-You Email", config: { type: "send_email", template: "post-visit-thanks" } },
  ]);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load automations");
      setAutomations([]);
    } else {
      setAutomations(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return automations.filter((a) => {
      if (filter === "active" && !a.active) return false;
      if (filter === "paused" && a.active) return false;
      if (!needle) return true;
      return [a.name, a.trigger_event, a.action_type].join(" ").toLowerCase().includes(needle);
    });
  }, [automations, query, filter]);

  const stats = useMemo(() => {
    const active = automations.filter((a) => a.active).length;
    const totalRuns = automations.reduce((s, a) => s + (a.run_count ?? 0), 0);
    return { active, paused: automations.length - active, totalRuns };
  }, [automations]);

  const openCreate = (preset?: Recipe) => {
    setEditing(null);
    setForm(
      preset
        ? { name: preset.name, trigger_event: preset.trigger, action_type: preset.action, active: true }
        : emptyForm,
    );
    setOpen(true);
  };

  const openEdit = (a: Automation) => {
    setEditing(a);
    setForm({
      name: a.name,
      trigger_event: (a.trigger_event as Trigger) ?? "appointment_completed",
      action_type: (a.action_type as Action) ?? "email",
      active: a.active,
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      name: parsed.data.name,
      trigger_event: parsed.data.trigger_event,
      action_type: parsed.data.action_type,
      active: parsed.data.active,
    };
    const result = editing
      ? await supabase.from("automations").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("automations").insert(payload);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(editing ? "Workflow updated" : "Workflow created");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const toggle = async (a: Automation) => {
    if (!activeClinic) return;
    const { error } = await supabase
      .from("automations")
      .update({ active: !a.active })
      .eq("id", a.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success(a.active ? "Paused" : "Activated");
      await load();
    }
  };

  const remove = async (a: Automation) => {
    if (!activeClinic || !confirm(`Delete "${a.name}"?`)) return;
    const { error } = await supabase
      .from("automations")
      .delete()
      .eq("id", a.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Workflow deleted");
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Growth</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Automations</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set-and-forget workflows. Send reminders, recover no-shows, and grow rebook rates on autopilot.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New workflow
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Active workflows" value={stats.active.toString()} icon={<Zap className="h-4 w-4" />} accent />
        <Metric label="Paused" value={stats.paused.toString()} icon={<Power className="h-4 w-4" />} />
        <Metric label="Total runs" value={stats.totalRuns.toLocaleString()} icon={<Sparkles className="h-4 w-4" />} />
        <Metric label="Recipes" value={RECIPES.length.toString()} icon={<ClipboardList className="h-4 w-4" />} />
      </section>

      {/* Recipe library */}
      <section className="rounded-2xl border border-border bg-gradient-surface p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Recipe library</h2>
            <p className="text-xs text-muted-foreground">Pre-built workflows your team can launch in one click.</p>
          </div>
          <span className="hidden text-[11px] uppercase tracking-wider text-muted-foreground sm:inline">
            One-click setup
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {RECIPES.map((r) => {
            const t = TRIGGER_META[r.trigger];
            const a = ACTION_META[r.action];
            const Icon = r.icon;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => openCreate(r)}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-glow"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
                <h3 className="text-sm font-semibold">{r.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{r.blurb}</p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", t.tone)}>
                    <t.Icon className="h-2.5 w-2.5" /> {t.label}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", a.tone)}>
                    <a.Icon className="h-2.5 w-2.5" /> {a.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visual Builder */}
      <section className="rounded-2xl border border-border bg-card shadow-card p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Visual Workflow Builder
          </h2>
          <p className="text-xs text-muted-foreground">
            Drag-and-drop nodes to build complex automation sequences. Add triggers, delays, conditions, and actions.
          </p>
        </div>
        <WorkflowBuilder nodes={builderNodes} onChange={setBuilderNodes} />
      </section>

      {/* Workflow list */}
      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows…"
              className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1">
            {(["all", "active", "paused"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition",
                  filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Zap className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl font-semibold">No workflows yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Pick a recipe above or build a custom flow. Your first automation pays for itself within a week.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((a) => {
              const t = TRIGGER_META[(a.trigger_event as Trigger) ?? "appointment_completed"];
              const act = ACTION_META[(a.action_type as Action) ?? "email"];
              return (
                <li key={a.id} className="grid items-center gap-4 p-4 md:grid-cols-[1.5fr_2fr_auto_auto]">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", a.active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground")}>
                      <Zap className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{a.name}</h3>
                        {a.active ? (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {(a.run_count ?? 0).toLocaleString()} runs lifetime
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", t.tone)}>
                      <t.Icon className="h-3 w-3" /> {t.label}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", act.tone)}>
                      <act.Icon className="h-3 w-3" /> {act.label}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(a)}
                    className={cn("gap-1", a.active ? "text-amber-300" : "text-emerald-300")}
                  >
                    <Power className="h-3.5 w-3.5" /> {a.active ? "Pause" : "Activate"}
                  </Button>

                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label="Edit">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(a)}
                      aria-label="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {editing ? "Edit workflow" : "New workflow"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">When this happens, do that.</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>

            <div className="space-y-5 p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Workflow name</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Post-visit thank you"
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  When (trigger)
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {(Object.keys(TRIGGER_META) as Trigger[]).map((key) => {
                    const m = TRIGGER_META[key];
                    const Icon = m.Icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, trigger_event: key })}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition",
                          form.trigger_event === key
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface/40 hover:border-primary/40",
                        )}
                      >
                        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", m.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium">{m.label}</span>
                        <span className="text-[10px] leading-snug text-muted-foreground">{m.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Then (action)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ACTION_META) as Action[]).map((key) => {
                    const m = ACTION_META[key];
                    const Icon = m.Icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, action_type: key })}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition",
                          form.action_type === key
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface/40 hover:border-primary/40",
                        )}
                      >
                        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", m.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium">{m.label}</span>
                        <span className="text-[10px] leading-snug text-muted-foreground">{m.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5 accent-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Activate immediately</div>
                  <div className="text-[11px] text-muted-foreground">Toggle off to save as a draft.</div>
                </div>
                <Power className={cn("h-4 w-4", form.active ? "text-emerald-300" : "text-muted-foreground")} />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {saving ? "Saving…" : editing ? "Save changes" : "Create workflow"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card", accent ? "border-primary/40" : "border-border")}>
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-primary/10 text-primary",
        )}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
