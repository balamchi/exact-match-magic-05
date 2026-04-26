import { FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Shield, X, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Form = Tables<"consent_forms">;

interface Draft { title: string; body: string; active: boolean }
const emptyDraft: Draft = { title: "", body: "", active: true };

export const Route = createFileRoute("/app/consent")({ component: ConsentPage });

function ConsentPage() {
  const { activeClinic } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("consent_forms")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load consent forms");
    setForms(data ?? []);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const filtered = forms.filter((f) =>
    !query.trim() || [f.title, f.body].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())
  );
  const selected = forms.find((f) => f.id === selectedId) ?? filtered[0] ?? null;

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (form: Form) => {
    setEditing(form);
    setDraft({ title: form.title, body: form.body ?? "", active: form.active });
    setOpen(true);
  };

  const toggleActive = async (form: Form) => {
    if (!activeClinic) return;
    setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, active: !f.active } : f)));
    const { error } = await supabase.from("consent_forms").update({ active: !form.active }).eq("id", form.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not update");
      await load();
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      title: draft.title.trim(),
      body: draft.body.trim() || null,
      active: draft.active,
    };
    const res = editing
      ? await supabase.from("consent_forms").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("consent_forms").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Form updated" : "Form added");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this form?")) return;
    const { error } = await supabase.from("consent_forms").delete().eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Form deleted");
      setSelectedId(null);
      setOpen(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Digital consent</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Consent Forms</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Maintain reusable treatment consent templates with live preview.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New form
        </Button>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <Metric label="Total" value={forms.length.toString()} />
        <Metric label="Active" value={forms.filter((f) => f.active).length.toString()} accent />
        <Metric label="Drafts" value={forms.filter((f) => !f.active).length.toString()} />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading forms…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search forms…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No forms yet. Create your first template.
                </div>
              ) : filtered.map((form) => (
                <button
                  key={form.id}
                  onClick={() => setSelectedId(form.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selected?.id === form.id ? "border-primary/60 bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{form.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {form.body?.slice(0, 100) || "No content"}
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      form.active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border text-muted-foreground"
                    )}>
                      {form.active ? "Live" : "Draft"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card shadow-card">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{selected.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(selected.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(selected)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        selected.active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:opacity-80" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {selected.active ? "Active" : "Activate"}
                    </button>
                    <Button variant="ghost" onClick={() => openEdit(selected)}>Edit</Button>
                  </div>
                </div>
                <div className="p-6">
                  {selected.body ? (
                    <article className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {selected.body}
                    </article>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      No content yet. Click Edit to add the consent text.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                <Shield className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select or create a consent form to preview.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit form" : "New form"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Write the consent template clients will sign.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</span>
                <input
                  required
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Botox treatment consent"
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Body</span>
                <textarea
                  rows={14}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="Enter the full consent text. Plain line breaks are preserved."
                  className="w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 font-mono text-xs leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-4 w-4 rounded border-input" />
                <span className="text-sm">Active — available for clients to sign</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">Delete</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add form"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent ? "bg-emerald-500/15 text-emerald-300" : "bg-primary/10 text-primary")}>
        <Shield className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
