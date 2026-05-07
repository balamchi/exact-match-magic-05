import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, CheckCircle2, Save, AlertTriangle, Clock, PenLine, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/clinical/soap-notes/$noteId")({ component: SoapNoteEditor });

function SoapNoteEditor() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const { activeClinic, user } = useAuth();
  const clinicId = activeClinic?.clinic_id;

  const [note, setNote] = useState<any>(null);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [noteRes, amendRes] = await Promise.all([
      supabase.from("soap_notes").select("*, client:clients(first_name, last_name), service:services(name)")
        .eq("id", noteId).eq("clinic_id", clinicId).single(),
      supabase.from("soap_note_amendments").select("*").eq("note_id", noteId).eq("clinic_id", clinicId).order("amended_at", { ascending: false }),
    ]);
    if (noteRes.error) { toast.error("Note not found"); navigate({ to: "/app/clinical/soap-notes" }); return; }
    setNote(noteRes.data);
    setDraft({ subjective: noteRes.data.subjective, objective: noteRes.data.objective, assessment: noteRes.data.assessment, plan: noteRes.data.plan });
    setAmendments(amendRes.data ?? []);
    setLoading(false);
  }, [clinicId, noteId, navigate]);

  useEffect(() => { load(); }, [load]);

  // Auto-save every 30s for drafts
  useEffect(() => {
    if (!note || note.status !== "draft") return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { saveDraft(true); }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [draft, note?.status]);

  const saveDraft = async (silent = false) => {
    if (!clinicId || !note || note.status !== "draft") return;
    setSaving(true);
    const { error } = await supabase.from("soap_notes").update({
      subjective: draft.subjective, objective: draft.objective, assessment: draft.assessment, plan: draft.plan,
    }).eq("id", noteId).eq("clinic_id", clinicId);
    setSaving(false);
    if (error) { if (!silent) toast.error(error.message); return; }
    if (!silent) toast.success("Saved");
  };

  const finalize = async () => {
    if (!clinicId || !note) return;
    if (!confirm("Finalize this note? Once finalized, it can only be amended — never directly edited.")) return;
    const { data: memberData } = await supabase.from("clinic_members").select("id").eq("clinic_id", clinicId).eq("user_id", user?.id ?? "").single();
    if (!memberData) return toast.error("Not a clinic member");
    // Save latest content first
    await supabase.from("soap_notes").update({
      subjective: draft.subjective, objective: draft.objective, assessment: draft.assessment, plan: draft.plan,
      status: "finalized", finalized_at: new Date().toISOString(), finalized_by: memberData.id,
    }).eq("id", noteId).eq("clinic_id", clinicId);
    toast.success("Note finalized — locked for editing");
    load();
  };

  const submitAmendment = async () => {
    if (!clinicId || !note || !amendReason.trim()) return toast.error("Amendment reason required");
    const { data: memberData } = await supabase.from("clinic_members").select("id").eq("clinic_id", clinicId).eq("user_id", user?.id ?? "").single();
    if (!memberData) return toast.error("Not a clinic member");
    setSaving(true);
    // Insert amendment record
    await supabase.from("soap_note_amendments").insert({
      note_id: noteId, clinic_id: clinicId, amended_by: memberData.id, amendment_reason: amendReason,
      previous_subjective: note.subjective, previous_objective: note.objective, previous_assessment: note.assessment, previous_plan: note.plan,
      new_subjective: draft.subjective, new_objective: draft.objective, new_assessment: draft.assessment, new_plan: draft.plan,
    });
    // Update note
    await supabase.from("soap_notes").update({
      subjective: draft.subjective, objective: draft.objective, assessment: draft.assessment, plan: draft.plan,
      status: "amended", amendment_reason: amendReason, amendment_count: (note.amendment_count ?? 0) + 1,
    }).eq("id", noteId).eq("clinic_id", clinicId);
    setSaving(false);
    setAmendOpen(false);
    setAmendReason("");
    toast.success("Amendment recorded");
    load();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!note) return null;

  const clientName = [note.client?.first_name, note.client?.last_name].filter(Boolean).join(" ") || "Unknown";
  const isEditable = note.status === "draft";
  const isFinalized = note.status === "finalized" || note.status === "amended";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/app/clinical/soap-notes" className="rounded-lg border border-border p-2 hover:bg-surface transition">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{clientName}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{new Date(note.created_at).toLocaleDateString()}</span>
            {note.service && <span>· {note.service.name}</span>}
            <StatusBadge status={note.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <Button variant="outline" size="sm" onClick={() => saveDraft()} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" onClick={finalize} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />Finalize
              </Button>
            </>
          )}
          {isFinalized && (
            <Button size="sm" onClick={() => setAmendOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              <PenLine className="h-3.5 w-3.5" />Amend
            </Button>
          )}
        </div>
      </div>

      {/* SOAP Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {(["subjective", "objective", "assessment", "plan"] as const).map(section => (
          <div key={section} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider font-semibold text-primary">
              {section === "subjective" ? "S — Subjective" : section === "objective" ? "O — Objective" : section === "assessment" ? "A — Assessment" : "P — Plan"}
            </Label>
            <textarea
              value={draft[section]}
              onChange={e => { if (isEditable) setDraft(d => ({ ...d, [section]: e.target.value })); }}
              readOnly={!isEditable && !amendOpen}
              rows={8}
              className={cn("w-full rounded-lg border border-input bg-surface p-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y",
                !isEditable && !amendOpen && "opacity-70 cursor-not-allowed")}
              placeholder={`Enter ${section}…`}
            />
          </div>
        ))}
      </div>

      {/* Amendment History */}
      {amendments.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />Amendment History ({amendments.length})
          </h3>
          <div className="space-y-3">
            {amendments.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface p-3 text-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Reason: {a.amendment_reason}</span>
                  <span>{new Date(a.amended_at).toLocaleString()}</span>
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">View changes</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div><span className="font-semibold text-primary">Previous S:</span> {a.previous_subjective || "—"}</div>
                    <div><span className="font-semibold text-primary">New S:</span> {a.new_subjective || "—"}</div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amend Dialog */}
      <Dialog open={amendOpen} onOpenChange={setAmendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Amend SOAP Note</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Edit the sections above, then provide a reason for the amendment. The original content will be preserved in the audit trail.</p>
          <div className="space-y-2">
            <Label>Amendment Reason *</Label>
            <textarea value={amendReason} onChange={e => setAmendReason(e.target.value)} rows={3}
              className="w-full rounded-lg border border-input bg-surface p-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="e.g., Updated assessment after follow-up review" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAmendOpen(false)}>Cancel</Button>
            <Button onClick={submitAmendment} disabled={saving || !amendReason.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? "Saving…" : "Submit Amendment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
