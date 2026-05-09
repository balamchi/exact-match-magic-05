import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, CheckSquare, X, GripVertical, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

type Task = Tables<"tasks">;
type Status = Task["status"];

const COLUMNS: { id: Status; label: string; tint: string }[] = [
  { id: "todo", label: "To do", tint: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  { id: "in_progress", label: "In progress", tint: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { id: "done", label: "Done", tint: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
];

interface Draft {
  title: string;
  description: string;
  status: Status;
  due_at: string;
}

const emptyDraft: Draft = { title: "", description: "", status: "todo", due_at: "" };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueState(due: string | null, status: Status) {
  if (!due || status === "done") return null;
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { label: "Overdue", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" };
  if (ms < 86400000) return { label: "Due today", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" };
  if (ms < 86400000 * 3) return { label: "Soon", className: "border-sky-500/40 bg-sky-500/10 text-sky-300" };
  return null;
}

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

function TasksPage() {
  const { activeClinic } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);

  const load = useCallback(async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error) toast.error("Could not load tasks");
    setTasks(data ?? []);
    setLoading(false);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("tasks", activeClinic?.clinic_id, load);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tasks;
    return tasks.filter((t) => [t.title, t.description].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [tasks, query]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of filtered) map[task.status].push(task);
    return map;
  }, [filtered]);

  const overdueCount = tasks.filter((t) => t.status !== "done" && t.due_at && new Date(t.due_at) < new Date()).length;
  const openCount = tasks.filter((t) => t.status !== "done").length;

  const openCreate = (status: Status = "todo") => {
    setEditing(null);
    setDraft({ ...emptyDraft, status });
    setOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      due_at: toLocalInput(task.due_at),
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
    };
    const res = editing
      ? await supabase.from("tasks").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("tasks").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Task updated" : "Task added");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Task deleted");
      setOpen(false);
      await load();
    }
  };

  const moveTask = async (taskId: string, status: Status) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status || !activeClinic) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId).eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not move task");
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Team work</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Drag to update status. Overdue items are flagged automatically.</p>
        </div>
        <Button onClick={() => openCreate("todo")} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Metric label="Open" value={openCount.toString()} icon={<CheckSquare className="h-4.5 w-4.5" />} />
        <Metric label="Overdue" value={overdueCount.toString()} icon={<Clock className="h-4.5 w-4.5" />} accent={overdueCount > 0} />
        <Metric label="Done" value={byStatus.done.length.toString()} icon={<CheckSquare className="h-4.5 w-4.5" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading tasks…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = byStatus[col.id];
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => {
                  if (dragging) moveTask(dragging, col.id);
                  setDragging(null);
                  setDragOver(null);
                }}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card transition",
                  dragOver === col.id ? "border-primary/60 shadow-glow" : "border-border"
                )}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", col.tint)}>
                    {col.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  {items.length === 0 ? (
                    <button
                      onClick={() => openCreate(col.id)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add task
                    </button>
                  ) : (
                    items.map((task) => {
                      const due = dueState(task.due_at, task.status);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDragging(task.id)}
                          onDragEnd={() => {
                            setDragging(null);
                            setDragOver(null);
                          }}
                          onClick={() => openEdit(task)}
                          className={cn(
                            "group cursor-grab rounded-xl border border-border bg-surface/60 p-3 transition hover:border-primary/40 hover:bg-surface active:cursor-grabbing",
                            dragging === task.id && "opacity-40"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100" />
                            <div className="min-w-0 flex-1">
                              <div className={cn("text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</div>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                {task.due_at && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <CalendarIcon className="h-3 w-3" />
                                    {new Date(task.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  </span>
                                )}
                                {due && (
                                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", due.className)}>
                                    {due.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit task" : "New task"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture title, status, due date, and details.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</span>
                <input
                  required
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</span>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm capitalize focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due</span>
                <input
                  type="datetime-local"
                  value={draft.due_at}
                  onChange={(e) => setDraft({ ...draft, due_at: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</span>
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add task"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card", accent ? "border-rose-500/40" : "border-border")}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent ? "bg-rose-500/15 text-rose-300" : "bg-primary/10 text-primary")}>
        {icon}
      </div>
      <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
