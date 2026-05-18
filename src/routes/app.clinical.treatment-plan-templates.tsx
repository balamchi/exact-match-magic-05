import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Search, Edit3, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/clinical/treatment-plan-templates")({
  component: TreatmentPlanTemplatesPage,
});

type TemplateRow = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  service_id: string | null;
  default_session_count: number;
  default_session_interval_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Service = { id: string; name: string };

function TreatmentPlanTemplatesPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const canManage = hasPermission(activeClinic?.role, "treatment_templates.manage");

  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    service_id: "",
    default_session_count: 1,
    default_session_interval_days: 30,
    is_active: true,
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [tpl, svc] = await Promise.all([
        supabase.from("treatment_plan_templates").select("*").eq("clinic_id", clinicId).order("name"),
        supabase.from("services").select("id, name").eq("clinic_id", clinicId).order("name"),
      ]);
      if (!active) return;
      if (tpl.error) toast.error(tpl.error.message);
      else setRows((tpl.data as TemplateRow[]) ?? []);
      if (svc.data) setServices(svc.data as Service[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.is_active) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, showInactive]);

  const openCreate = () => {
    if (!canManage) return toast.error("You don't have permission to manage templates.");
    setEditingId(null);
    setForm({ name: "", description: "", service_id: "", default_session_count: 1, default_session_interval_days: 30, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (row: TemplateRow) => {
    if (!canManage) return toast.error("You don't have permission to manage templates.");
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description ?? "",
      service_id: row.service_id ?? "",
      default_session_count: row.default_session_count,
      default_session_interval_days: row.default_session_interval_days,
      is_active: row.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return toast.error("You don't have permission to manage templates.");
    if (!clinicId) return;
    if (!form.name.trim()) return toast.error("Name is required.");
    if (form.default_session_count < 1) return toast.error("Session count must be at least 1.");
    if (form.default_session_interval_days < 1) return toast.error("Interval must be at least 1 day.");

    const payload = {
      clinic_id: clinicId,
      name: form.name.trim(),
      description: form.description.trim(),
      service_id: form.service_id || null,
      default_session_count: form.default_session_count,
      default_session_interval_days: form.default_session_interval_days,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from("treatment_plan_templates").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r)));
      toast.success("Template updated");
    } else {
      const { data, error } = await supabase.from("treatment_plan_templates").insert(payload).select().single();
      if (error) return toast.error(error.message);
      if (data) setRows((prev) => [...prev, data as TemplateRow].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Template created");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!canManage) return toast.error("You don't have permission.");

    const { count, error: checkErr } = await supabase
      .from("treatment_plans")
      .select("id", { count: "exact", head: true })
      .eq("template_id", deleteId);
    if (checkErr) { toast.error(checkErr.message); return; }
    if ((count ?? 0) > 0) {
      toast.error(`Cannot delete — this template is in use by ${count} treatment plan${count === 1 ? "" : "s"}. Archive it instead by toggling Active off.`);
      setDeleteId(null);
      return;
    }

    const { error } = await supabase.from("treatment_plan_templates").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    toast.success("Template deleted");
    setDeleteId(null);
  };

  const toggleActive = async (row: TemplateRow) => {
    if (!canManage) return toast.error("You don't have permission.");
    const newActive = !row.is_active;
    const { error } = await supabase.from("treatment_plan_templates").update({ is_active: newActive }).eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: newActive } : r)));
    toast.success(newActive ? "Template activated" : "Template archived");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-semibold">Treatment Plan Templates</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable templates for recurring treatments. Save time by pre-defining session counts, intervals, and notes.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New template
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 px-1">
          <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 px-4 sm:px-6 py-16 text-center">
          <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {rows.length === 0 ? "No treatment plan templates yet" : "No templates match your filter"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {rows.length === 0
              ? "Create reusable templates for treatments you do often — like a 3-session lip filler course or PRP hair series."
              : "Try clearing your search or toggling Show inactive."}
          </p>
          {canManage && rows.length === 0 && (
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create your first template</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const svc = services.find((s) => s.id === row.service_id);
            return (
              <div key={row.id} className="rounded-2xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{row.name}</h3>
                    {svc && <p className="mt-0.5 text-xs text-muted-foreground">{svc.name}</p>}
                  </div>
                  {!row.is_active && (
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Inactive</Badge>
                  )}
                </div>
                {row.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                )}
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sessions</div>
                    <div className="font-medium">{row.default_session_count}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Interval</div>
                    <div className="font-medium">{row.default_session_interval_days} days</div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(row)} className="text-xs">
                      <Power className="mr-1 h-3 w-3" />
                      {row.is_active ? "Archive" : "Activate"}
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Name *</Label>
              <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Lip Filler 3-Session Course" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes about this template…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-svc">Linked service (optional)</Label>
              <select id="t-svc" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">— None —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-sessions">Default sessions</Label>
                <Input id="t-sessions" type="number" min={1} value={form.default_session_count}
                  onChange={(e) => setForm({ ...form, default_session_count: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-interval">Days between</Label>
                <Input id="t-interval" type="number" min={1} value={form.default_session_interval_days}
                  onChange={(e) => setForm({ ...form, default_session_interval_days: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="t-active" checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              <Label htmlFor="t-active" className="text-sm">Active (visible to providers)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? "Save changes" : "Create template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If the template is in use by existing treatment plans, you'll be asked to archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
