import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Target, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { cn } from "@/lib/utils";

type Lead = Tables<"leads">;
type Stage = Lead["stage"];

const STAGES: { id: Stage; label: string; tint: string }[] = [
  { id: "new", label: "New", tint: "border-primary/40 bg-primary/10 text-primary" },
  { id: "contacted", label: "Contacted", tint: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  { id: "qualified", label: "Qualified", tint: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { id: "consult_booked", label: "Consult booked", tint: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  { id: "won", label: "Won", tint: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { id: "lost", label: "Lost", tint: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
];

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

interface DraftForm {
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: Stage;
  estimated_value: string;
  notes: string;
}

const emptyDraft: DraftForm = {
  name: "",
  email: "",
  phone: "",
  source: "",
  stage: "new",
  estimated_value: "0",
  notes: "",
};

export const Route = createFileRoute("/app/leads")({ component: LeadsPage });

function LeadsPage() {
  const { activeClinic } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load leads");
    setLeads(data ?? []);
    setLoading(false);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("leads", activeClinic?.clinic_id, load);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.email, lead.phone, lead.source, lead.notes].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }, [leads, query]);

  const byStage = useMemo(() => {
    const map: Record<Stage, Lead[]> = {
      new: [], contacted: [], qualified: [], consult_booked: [], won: [], lost: [],
    };
    for (const lead of filtered) map[lead.stage].push(lead);
    return map;
  }, [filtered]);

  const totalValue = leads.filter((l) => l.stage !== "lost").reduce((s, l) => s + l.estimated_value_cents, 0);
  const wonCount = leads.filter((l) => l.stage === "won").length;
  const conversionRate = leads.length ? Math.round((wonCount / leads.length) * 100) : 0;

  const openCreate = (stage: Stage = "new") => {
    setEditing(null);
    setDraft({ ...emptyDraft, stage });
    setOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setDraft({
      name: lead.name,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      source: lead.source ?? "",
      stage: lead.stage,
      estimated_value: String((lead.estimated_value_cents ?? 0) / 100),
      notes: lead.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      name: draft.name.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      source: draft.source.trim() || null,
      stage: draft.stage,
      estimated_value_cents: Math.round(Number(draft.estimated_value || 0) * 100),
      notes: draft.notes.trim() || null,
    };
    const res = editing
      ? await supabase.from("leads").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("leads").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Lead updated" : "Lead added");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead deleted");
      setOpen(false);
      await load();
    }
  };

  const moveLead = async (leadId: string, stage: Stage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage || !activeClinic) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    const { error } = await supabase
      .from("leads")
      .update({ stage })
      .eq("id", leadId)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not move lead");
      await load();
    } else {
      toast.success(`Moved to ${STAGES.find((s) => s.id === stage)?.label}`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pipeline</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Drag cards across stages to move leads through your funnel.</p>
        </div>
        <Button onClick={() => openCreate("new")} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> Add lead
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Open leads" value={String(leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length)} />
        <Metric label="Pipeline value" value={money(totalValue)} />
        <Metric label="Won" value={wonCount.toString()} />
        <Metric label="Conversion" value={`${conversionRate}%`} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads…"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading pipeline…</div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1100px] gap-4" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
            {STAGES.map((stage) => {
              const items = byStage[stage.id];
              const stageValue = items.reduce((s, l) => s + l.estimated_value_cents, 0);
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => {
                    if (dragging) moveLead(dragging, stage.id);
                    setDragging(null);
                    setDragOver(null);
                  }}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card transition",
                    dragOver === stage.id ? "border-primary/60 shadow-glow" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", stage.tint)}>
                        {stage.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{money(stageValue)}</span>
                  </div>

                  <div className="flex-1 space-y-2 p-2">
                    {items.length === 0 ? (
                      <button
                        onClick={() => openCreate(stage.id)}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add lead
                      </button>
                    ) : (
                      items.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => setDragging(lead.id)}
                          onDragEnd={() => {
                            setDragging(null);
                            setDragOver(null);
                          }}
                          onClick={() => openEdit(lead)}
                          className={cn(
                            "group cursor-grab rounded-xl border border-border bg-surface/60 p-3 transition hover:border-primary/40 hover:bg-surface active:cursor-grabbing",
                            dragging === lead.id && "opacity-40"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{lead.name}</div>
                              {lead.source && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">via {lead.source}</div>}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary">{money(lead.estimated_value_cents)}</span>
                                {lead.email && (
                                  <span className="truncate text-[10px] text-muted-foreground">{lead.email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit lead" : "New lead"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture contact, source, value, and current stage.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
              <Field label="Phone" type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <Field label="Source" placeholder="Instagram, referral, website…" value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} />
              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Stage</span>
                <select
                  value={draft.stage}
                  onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm capitalize focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Estimated value" type="number" value={draft.estimated_value} onChange={(v) => setDraft({ ...draft, estimated_value: v })} />
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</span>
                <textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
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
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add lead"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Target className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
