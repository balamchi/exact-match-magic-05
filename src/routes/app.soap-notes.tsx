import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
  Stethoscope,
  ClipboardList,
  Activity,
  ListChecks,
  Calendar,
  User,
  Sparkles,
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

export const Route = createFileRoute("/app/soap-notes")({ component: SoapNotesPage });

type Note = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  visit_date: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  signed: boolean;
  created_at: string;
  updated_at: string;
};

const noteSchema = z.object({
  client_name: z.string().trim().min(1, "Client name required").max(160),
  visit_date: z.string().min(1, "Visit date required"),
  subjective: z.string().trim().max(4000).optional().nullable(),
  objective: z.string().trim().max(4000).optional().nullable(),
  assessment: z.string().trim().max(4000).optional().nullable(),
  plan: z.string().trim().max(4000).optional().nullable(),
  signed: z.boolean(),
});

type Draft = {
  client_name: string;
  visit_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  signed: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({
  client_name: "",
  visit_date: today(),
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  signed: false,
});

const TEMPLATES: { name: string; subjective: string; objective: string; assessment: string; plan: string }[] = [
  {
    name: "Botox follow-up",
    subjective: "Pt reports satisfaction with previous Botox treatment. No bruising, swelling, or asymmetry. Denies headaches.",
    objective: "Forehead and glabella smooth at rest and with animation. No ptosis. Skin clear, no erythema.",
    assessment: "Successful neuromodulator treatment, due for re-treatment per maintenance schedule.",
    plan: "Re-treat glabella + forehead with same units as prior visit. Reassess in 2 weeks. RTC in 12–14 weeks.",
  },
  {
    name: "Filler consultation",
    subjective: "Pt presents with concern over midface volume loss and nasolabial folds. Reports gradual onset over past 2 years.",
    objective: "Mild-moderate midface deflation, NLF depth grade 2/4, no asymmetry. Skin quality good, no active lesions.",
    assessment: "Age-related midface volume loss, candidate for HA filler with cannula technique.",
    plan: "Recommend 1–2 syringes HA filler to midface. Discussed risks/benefits/alternatives. Consent obtained. Schedule treatment.",
  },
  {
    name: "Laser/IPL session",
    subjective: "Pt tolerated previous session well. Mild erythema resolved within 24h. No PIH or blistering.",
    objective: "Treatment area: face. Fitzpatrick III. No active lesions. Pre-treatment photos taken.",
    assessment: "On track with treatment plan, responding well.",
    plan: "Continue series. Today: settings as per protocol. Sun protection emphasized. RTC in 4 weeks.",
  },
  {
    name: "Skin/medical-grade facial",
    subjective: "Pt reports mild congestion, occasional breakouts. No new products at home.",
    objective: "Skin: combination, mild comedones T-zone. No active inflammation. Hydration moderate.",
    assessment: "Stable, benefiting from regular treatment cadence.",
    plan: "Performed standard protocol with extractions. Recommended at-home regimen review. RTC in 4–6 weeks.",
  },
];

function SoapNotesPage() {
  const { activeClinic } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "drafts" | "signed">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("visit_date", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load notes");
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!activeClinic) return;
    const ch = supabase
      .channel(`soap-notes-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "soap_notes", filter: `clinic_id=eq.${activeClinic.clinic_id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (tab === "drafts" && n.signed) return false;
      if (tab === "signed" && !n.signed) return false;
      if (!q) return true;
      return [n.client_name, n.subjective, n.objective, n.assessment, n.plan]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [notes, query, tab]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? filtered[0] ?? null,
    [notes, selectedId, filtered]
  );

  const stats = useMemo(() => {
    const total = notes.length;
    const signed = notes.filter((n) => n.signed).length;
    const drafts = total - signed;
    const last7 = notes.filter((n) => {
      const d = new Date(n.visit_date).getTime();
      return d >= Date.now() - 7 * 24 * 3600 * 1000;
    }).length;
    const signRate = total ? Math.round((signed / total) * 100) : 0;
    return { total, signed, drafts, last7, signRate };
  }, [notes]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  };

  const openEdit = (n: Note) => {
    setEditing(n);
    setDraft({
      client_name: n.client_name,
      visit_date: n.visit_date.slice(0, 10),
      subjective: n.subjective ?? "",
      objective: n.objective ?? "",
      assessment: n.assessment ?? "",
      plan: n.plan ?? "",
      signed: n.signed,
    });
    setOpen(true);
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setDraft((d) => ({
      ...d,
      subjective: d.subjective ? d.subjective : t.subjective,
      objective: d.objective ? d.objective : t.objective,
      assessment: d.assessment ? d.assessment : t.assessment,
      plan: d.plan ? d.plan : t.plan,
    }));
    toast.success(`Applied template: ${t.name}`);
  };

  const toggleSign = async (n: Note) => {
    if (!activeClinic) return;
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, signed: !x.signed } : x)));
    const { error } = await supabase
      .from("soap_notes")
      .update({ signed: !n.signed })
      .eq("id", n.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not update");
      await load();
    } else {
      toast.success(n.signed ? "Marked as draft" : "Note signed");
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = noteSchema.safeParse(draft);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      client_name: parsed.data.client_name,
      visit_date: parsed.data.visit_date,
      subjective: parsed.data.subjective || null,
      objective: parsed.data.objective || null,
      assessment: parsed.data.assessment || null,
      plan: parsed.data.plan || null,
      signed: parsed.data.signed,
    };
    const res = editing
      ? await supabase
          .from("soap_notes")
          .update(payload)
          .eq("id", editing.id)
          .eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("soap_notes").insert(payload).select("id").single();
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Note updated" : "Note saved");
      setOpen(false);
      if (!editing && (res as any).data?.id) setSelectedId((res as any).data.id);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this SOAP note? This cannot be undone.")) return;
    const { error } = await supabase
      .from("soap_notes")
      .delete()
      .eq("id", editing.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Note deleted");
      setSelectedId(null);
      setOpen(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical documentation</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">SOAP Notes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Subjective, Objective, Assessment, Plan — structured notes for every visit, with templates and e-signature.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New note
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Total notes" value={stats.total.toString()} icon={<FileText className="h-4 w-4" />} />
        <Metric
          label="Signed"
          value={stats.signed.toString()}
          sub={`${stats.signRate}% completion`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent
        />
        <Metric label="Drafts" value={stats.drafts.toString()} icon={<Circle className="h-4 w-4" />} />
        <Metric label="Last 7 days" value={stats.last7.toString()} icon={<Calendar className="h-4 w-4" />} />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading notes…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client or content…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {([
                ["all", `All ${notes.length ? `(${notes.length})` : ""}`],
                ["drafts", `Drafts ${stats.drafts ? `(${stats.drafts})` : ""}`],
                ["signed", `Signed ${stats.signed ? `(${stats.signed})` : ""}`],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                    tab === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {notes.length === 0 ? "No notes yet. Create your first SOAP note." : "Nothing matches your filters."}
                </div>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition",
                      selected?.id === n.id
                        ? "border-primary/60 bg-primary/5 shadow-glow"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            n.signed ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {n.signed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{n.client_name}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(n.visit_date).toLocaleDateString()}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                            {n.assessment || n.subjective || n.plan || "No content yet"}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          n.signed
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        )}
                      >
                        {n.signed ? "Signed" : "Draft"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card shadow-card">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Client</span>
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{selected.client_name}</h2>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Visit {new Date(selected.visit_date).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span>Updated {new Date(selected.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSign(selected)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                        selected.signed
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:opacity-80"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {selected.signed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {selected.signed ? "Signed" : "Sign note"}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(selected)} className="gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2">
                  <Section
                    title="Subjective"
                    icon={<Stethoscope className="h-4 w-4" />}
                    body={selected.subjective}
                    hint="What the client reports."
                  />
                  <Section
                    title="Objective"
                    icon={<Activity className="h-4 w-4" />}
                    body={selected.objective}
                    hint="Clinical observations & exam."
                  />
                  <Section
                    title="Assessment"
                    icon={<ClipboardList className="h-4 w-4" />}
                    body={selected.assessment}
                    hint="Diagnosis or interpretation."
                  />
                  <Section
                    title="Plan"
                    icon={<ListChecks className="h-4 w-4" />}
                    body={selected.plan}
                    hint="Treatment, follow-up, instructions."
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select a note to preview, or create a new one.</p>
                <Button onClick={openCreate} variant="ghost" className="gap-2">
                  <Plus className="h-4 w-4" /> New SOAP note
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
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit SOAP note" : "New SOAP note"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Document the visit using the SOAP framework. Templates speed up common cases.
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
                  <Label htmlFor="visit_date">Visit date</Label>
                  <Input
                    id="visit_date"
                    type="date"
                    value={draft.visit_date}
                    onChange={(e) => setDraft({ ...draft, visit_date: e.target.value })}
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

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Subjective"
                  icon={<Stethoscope className="h-3.5 w-3.5" />}
                  value={draft.subjective}
                  onChange={(v) => setDraft({ ...draft, subjective: v })}
                  placeholder="Symptoms, concerns, history as reported by the client…"
                />
                <Field
                  label="Objective"
                  icon={<Activity className="h-3.5 w-3.5" />}
                  value={draft.objective}
                  onChange={(v) => setDraft({ ...draft, objective: v })}
                  placeholder="Exam findings, measurements, photos noted…"
                />
                <Field
                  label="Assessment"
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  value={draft.assessment}
                  onChange={(v) => setDraft({ ...draft, assessment: v })}
                  placeholder="Clinical impression, diagnosis…"
                />
                <Field
                  label="Plan"
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  value={draft.plan}
                  onChange={(v) => setDraft({ ...draft, plan: v })}
                  placeholder="Treatment performed, recommendations, follow-up…"
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
                <input
                  type="checkbox"
                  checked={draft.signed}
                  onChange={(e) => setDraft({ ...draft, signed: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Sign and lock this note</div>
                  <div className="text-[11px] text-muted-foreground">
                    Signed notes are part of the medical record. You can re-open later if needed.
                  </div>
                </div>
                {draft.signed && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Signed</Badge>
                )}
              </label>
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
                  {saving ? "Saving…" : editing ? "Save changes" : "Save note"}
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

function Section({
  title,
  icon,
  body,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  body: string | null;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{hint}</span>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {body || <span className="text-muted-foreground italic">Not documented.</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}
