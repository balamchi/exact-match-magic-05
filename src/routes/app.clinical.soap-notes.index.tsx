import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, FormEvent } from "react";
import {
  FileText, Plus, Search, Calendar, User, CheckCircle2, Circle, Edit3,
  AlertTriangle, Clock, Filter, ChevronDown, Stethoscope, PenLine, Eye, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/clinical/soap-notes/")({ component: SoapNotesDashboard });

/* ——— Types ——— */
interface SoapNoteRow {
  id: string;
  clinic_id: string;
  client_id: string;
  appointment_id: string | null;
  service_id: string | null;
  template_id: string | null;
  provider_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: "draft" | "finalized" | "amended";
  finalized_at: string | null;
  amendment_count: number;
  created_at: string;
  updated_at: string;
  client?: { first_name: string; last_name: string | null } | null;
  service?: { name: string } | null;
}

interface SoapTemplate {
  id: string;
  name: string;
  subjective_template: string;
  objective_template: string;
  assessment_template: string;
  plan_template: string;
}

interface ClientOption { id: string; first_name: string; last_name: string | null }

function SoapNotesDashboard() {
  const { activeClinic, user } = useAuth();
  const clinicId = activeClinic?.clinic_id;

  const [notes, setNotes] = useState<SoapNoteRow[]>([]);
  const [templates, setTemplates] = useState<SoapTemplate[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "finalized" | "amended">("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [notesRes, tmplRes, clientsRes] = await Promise.all([
      supabase.from("soap_notes")
        .select("*, client:clients(first_name, last_name), service:services(name)")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("soap_templates")
        .select("id, name, subjective_template, objective_template, assessment_template, plan_template")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("name"),
      supabase.from("clients")
        .select("id, first_name, last_name")
        .eq("clinic_id", clinicId)
        .order("first_name")
        .limit(500),
    ]);
    if (notesRes.error) toast.error("Failed to load notes");
    setNotes((notesRes.data ?? []) as SoapNoteRow[]);
    setTemplates((tmplRes.data ?? []) as SoapTemplate[]);
    setClients((clientsRes.data ?? []) as ClientOption[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase.channel(`soap-notes-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "soap_notes", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (!q) return true;
      const name = [n.client?.first_name, n.client?.last_name].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || n.subjective?.toLowerCase().includes(q) || n.assessment?.toLowerCase().includes(q);
    });
  }, [notes, query, statusFilter]);

  const stats = useMemo(() => {
    const total = notes.length;
    const draft = notes.filter(n => n.status === "draft").length;
    const finalized = notes.filter(n => n.status === "finalized" || n.status === "amended").length;
    const today = notes.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length;
    return { total, draft, finalized, today };
  }, [notes]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId || !newClientId) return toast.error("Select a client");

    // Get current user's clinic_members id
    const { data: memberData } = await supabase
      .from("clinic_members")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("user_id", user?.id ?? "")
      .single();

    if (!memberData) return toast.error("You are not a member of this clinic");

    setCreating(true);
    const template = templates.find(t => t.id === newTemplateId);
    const { data, error } = await supabase.from("soap_notes").insert({
      clinic_id: clinicId,
      client_id: newClientId,
      provider_id: memberData.id,
      template_id: newTemplateId || null,
      subjective: template?.subjective_template ?? "",
      objective: template?.objective_template ?? "",
      assessment: template?.assessment_template ?? "",
      plan: template?.plan_template ?? "",
      status: "draft",
    }).select("id").single();

    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("SOAP note created");
    setCreateOpen(false);
    setNewClientId("");
    setNewTemplateId("");
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical Documentation</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">SOAP Notes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Medical-grade documentation with amendment audit trail. Draft → Finalize → Amend only.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New SOAP Note
        </Button>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Total Notes" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Finalized" value={stats.finalized} accent />
        <StatCard icon={<Circle className="h-4 w-4" />} label="Drafts" value={stats.draft} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Today" value={stats.today} />
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by client or content…"
            className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(["all", "draft", "finalized", "amended"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition capitalize",
                statusFilter === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Notes List */}
      {loading ? (
        <div className="space-y-3">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{notes.length === 0 ? "No SOAP notes yet. Create your first note." : "No notes match your filters."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(note => {
            const clientName = [note.client?.first_name, note.client?.last_name].filter(Boolean).join(" ") || "Unknown";
            return (
              <Link key={note.id} to="/app/clinical/soap-notes/$noteId" params={{ noteId: note.id }}
                className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-glow/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      note.status === "draft" ? "bg-muted text-muted-foreground" :
                      note.status === "finalized" ? "bg-emerald-500/15 text-emerald-300" :
                      "bg-amber-500/15 text-amber-300")}>
                      {note.status === "draft" ? <Circle className="h-4 w-4" /> :
                       note.status === "finalized" ? <CheckCircle2 className="h-4 w-4" /> :
                       <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{clientName}</span>
                        <StatusBadge status={note.status} />
                        {note.amendment_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">({note.amendment_count} amendment{note.amendment_count > 1 ? "s" : ""})</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(note.created_at).toLocaleDateString()}</span>
                        {note.service && <span>· {(note.service as any).name}</span>}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note.assessment || note.subjective || "No content"}</p>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New SOAP Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                <SelectTrigger><SelectValue placeholder="Blank note" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Blank note</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating || !newClientId} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {creating ? "Creating…" : "Create Note"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ——— Helpers ——— */
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", accent && "text-primary")}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    draft: { bg: "border-amber-500/30 bg-amber-500/10", text: "text-amber-300" },
    finalized: { bg: "border-emerald-500/40 bg-emerald-500/10", text: "text-emerald-300" },
    amended: { bg: "border-blue-500/40 bg-blue-500/10", text: "text-blue-300" },
  };
  const s = map[status] ?? map.draft;
  return <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", s.bg, s.text)}>{status}</span>;
}
