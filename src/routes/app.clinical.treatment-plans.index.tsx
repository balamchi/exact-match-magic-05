import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ListChecks, Target, CheckCircle2, XCircle, Clock, Camera, ChevronRight, Upload, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


export const Route = createFileRoute("/app/clinical/treatment-plans/")({ component: TreatmentPlansDashboard });

function TreatmentPlansDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Create plan
  const [createOpen, setCreateOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planClientId, setPlanClientId] = useState("");
  const [planServiceId, setPlanServiceId] = useState("");
  const [planSessions, setPlanSessions] = useState(3);
  const [planNotes, setPlanNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  // Detail view
  const [detail, setDetail] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPhotos, setDetailPhotos] = useState<any[]>([]);

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

  useEffect(() => {
    if (!createOpen || !clinicId) return;
    Promise.all([
      supabase.from("clients").select("id, first_name, last_name").eq("clinic_id", clinicId).order("first_name").limit(500),
      supabase.from("services").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name"),
    ]).then(([c, s]) => {
      setClients(c.data ?? []);
      setServices(s.data ?? []);
    });
  }, [createOpen, clinicId]);

  const handleCreate = async () => {
    if (!clinicId || !planName.trim() || !planClientId) return;
    setSaving(true);
    // provider_id is required - use current user id
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("treatment_plans").insert({
      clinic_id: clinicId,
      client_id: planClientId,
      provider_id: user?.id ?? "",
      service_id: planServiceId || null,
      name: planName.trim(),
      total_sessions_planned: planSessions,
      status: "proposed",
      notes: planNotes.trim() || "",
    });
    if (error) toast.error("Failed to create plan"); else toast.success("Treatment plan created!");
    setSaving(false);
    setCreateOpen(false);
    setPlanName(""); setPlanClientId(""); setPlanServiceId(""); setPlanSessions(3); setPlanNotes("");
    load();
  };

  const openDetail = async (plan: any) => {
    setDetail(plan);
    setDetailOpen(true);
    // Load photos for this plan
    const { data } = await supabase.from("treatment_plan_photos").select("*").eq("plan_id", plan.id).order("taken_at", { ascending: false });
    setDetailPhotos(data ?? []);
  };

  const updateStatus = async (planId: string, status: string) => {
    const updates: any = { status };
    if (status === "in_progress" && detail?.sessions_completed === 0) updates.sessions_completed = 0;
    const { error } = await supabase.from("treatment_plans").update(updates).eq("id", planId);
    if (error) toast.error("Failed to update"); else { toast.success("Status updated"); load(); setDetail((d: any) => d ? { ...d, status } : d); }
  };

  const recordSession = async () => {
    if (!detail) return;
    const next = (detail.sessions_completed ?? 0) + 1;
    const status = next >= detail.total_sessions_planned ? "completed" : "in_progress";
    const { error } = await supabase.from("treatment_plans").update({ sessions_completed: next, status }).eq("id", detail.id);
    if (error) toast.error("Failed to record session"); else { toast.success(`Session ${next} recorded`); setDetail((d: any) => d ? { ...d, sessions_completed: next, status } : d); load(); }
  };

  const uploadPhoto = async (planId: string, photoType: "before" | "after" | "progress") => {
    if (!clinicId) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Photo must be less than 10MB");
        return;
      }
      toast.info("Uploading…");
      const ext = file.name.split(".").pop();
      const filename = `${clinicId}/${planId}/${photoType}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("treatment-photos").upload(filename, file);
      if (uploadErr) {
        toast.error("Upload failed: " + uploadErr.message);
        return;
      }
      const { data: urlData } = await supabase.storage.from("treatment-photos").createSignedUrl(filename, 60 * 60 * 24 * 365);
      const photoUrl = urlData?.signedUrl ?? filename;
      const { error: insertErr } = await supabase.from("treatment_plan_photos").insert({
        plan_id: planId,
        clinic_id: clinicId,
        photo_url: photoUrl,
        photo_type: photoType,
        taken_at: new Date().toISOString(),
        has_consent: false,
      });
      if (insertErr) {
        toast.error("Failed to save photo record");
        return;
      }
      toast.success(`${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo uploaded`);
      // Reload photos
      const { data } = await supabase.from("treatment_plan_photos").select("*").eq("plan_id", planId).order("taken_at", { ascending: false });
      setDetailPhotos(data ?? []);
    };
    input.click();
  };

  const filtered = plans.filter(p => {
    if (!query.trim()) return true;
    const name = [p.client?.first_name, p.client?.last_name].filter(Boolean).join(" ").toLowerCase();
    return name.includes(query.toLowerCase()) || p.name?.toLowerCase().includes(query.toLowerCase());
  });

  const statusIcon = (s: string) => s === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    s === "cancelled" ? <XCircle className="h-4 w-4 text-red-400" /> :
    s === "in_progress" ? <Target className="h-4 w-4 text-primary" /> :
    <Clock className="h-4 w-4 text-muted-foreground" />;

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    return `${c.first_name} ${c.last_name ?? ""}`.toLowerCase().includes(clientSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Treatment Plans</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Multi-session treatment plans with progress tracking and before/after photos.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New Plan</Button>
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
              <button key={p.id} type="button" onClick={() => openDetail(p)} className="w-full text-left rounded-xl border border-border bg-card p-4 transition hover:border-primary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(p.status)}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{clientName} · {p.service?.name ?? "No service"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      p.status === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                      p.status === "in_progress" ? "border-primary/40 bg-primary/10 text-primary" :
                      "border-border text-muted-foreground")}>{p.status?.replace("_", " ")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{p.sessions_completed}/{p.total_sessions_planned} sessions</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Treatment Plan</DialogTitle>
            <DialogDescription>Create a multi-session treatment plan for a client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Plan Name</Label>
              <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Botox Full Face - 3 Sessions"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <Label>Client</Label>
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients…"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border">
                {filteredClients.slice(0, 30).map(c => (
                  <button key={c.id} type="button" onClick={() => setPlanClientId(c.id)}
                    className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition", planClientId === c.id && "bg-primary/10 text-primary")}>
                    {c.first_name} {c.last_name ?? ""}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Service (optional)</Label>
              <select value={planServiceId} onChange={e => setPlanServiceId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                <option value="">None</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Total Sessions Planned</Label>
              <input type="number" min={1} max={50} value={planSessions} onChange={e => setPlanSessions(Number(e.target.value))}
                className="mt-1 h-10 w-24 rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !planName.trim() || !planClientId} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? "Creating…" : "Create Plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (() => {
            const clientName = [detail.client?.first_name, detail.client?.last_name].filter(Boolean).join(" ");
            const pct = detail.total_sessions_planned > 0 ? Math.round((detail.sessions_completed / detail.total_sessions_planned) * 100) : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{detail.name}</DialogTitle>
                  <DialogDescription>{clientName} · {detail.service?.name ?? "No service"}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-5">
                  {/* Progress */}
                  <div className="rounded-xl border border-border bg-surface/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        detail.status === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                        detail.status === "in_progress" ? "border-primary/40 bg-primary/10 text-primary" :
                        "border-border text-muted-foreground")}>{detail.status?.replace("_", " ")}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{detail.sessions_completed} of {detail.total_sessions_planned} sessions completed ({pct}%)</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {detail.status !== "completed" && detail.status !== "cancelled" && (
                      <Button size="sm" onClick={recordSession} className="bg-gradient-primary text-primary-foreground shadow-glow gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Record Session
                      </Button>
                    )}
                    {(detail.status === "proposed" || detail.status === "accepted") && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(detail.id, "in_progress")}>Start Plan</Button>
                    )}
                    {detail.status !== "cancelled" && detail.status !== "completed" && (
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400/30" onClick={() => updateStatus(detail.id, "cancelled")}>Cancel Plan</Button>
                    )}
                  </div>

                  {/* Notes */}
                  {detail.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{detail.notes}</p>
                    </div>
                  )}

                  {/* Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Treatment Photos</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => uploadPhoto(detail.id, "before")}>
                          <Upload className="h-3 w-3" /> Before
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => uploadPhoto(detail.id, "after")}>
                          <Upload className="h-3 w-3" /> After
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => uploadPhoto(detail.id, "progress")}>
                          <Upload className="h-3 w-3" /> Progress
                        </Button>
                      </div>
                    </div>
                    {detailPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {detailPhotos.map((p: any) => (
                          <div key={p.id} className="group relative rounded-lg border border-border overflow-hidden">
                            <img src={p.photo_url} alt={p.photo_type ?? "Photo"} className="w-full h-28 object-cover cursor-pointer" onClick={() => window.open(p.photo_url, "_blank")} />
                            <div className="absolute top-1 left-1">
                              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                                p.photo_type === "before" ? "bg-amber-500/80 text-white" :
                                p.photo_type === "after" ? "bg-emerald-500/80 text-white" :
                                "bg-sky-500/80 text-white")}>{p.photo_type}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const path = p.photo_url.includes("treatment-photos/") ? p.photo_url.split("treatment-photos/").pop() : null;
                                if (path) await supabase.storage.from("treatment-photos").remove([path]);
                                await supabase.from("treatment_plan_photos").delete().eq("id", p.id);
                                setDetailPhotos((prev) => prev.filter((x: any) => x.id !== p.id));
                                toast.success("Photo deleted");
                              }}
                              className="absolute top-1 right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <div className="p-1.5 text-[10px] text-muted-foreground">
                              {p.taken_at ? new Date(p.taken_at).toLocaleDateString() : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        <p className="mt-2 text-xs text-muted-foreground">No photos yet. Upload before/after photos to track progress.</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground">Created {new Date(detail.created_at).toLocaleString()}</div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
