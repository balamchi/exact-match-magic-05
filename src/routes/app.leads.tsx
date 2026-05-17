import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Search, Target, X, GripVertical, Upload, Phone, Mail,
  MessageSquare, CalendarPlus, UserPlus, ChevronDown, Clock, Filter,
  TrendingUp, Users, Flame, FileText, MoreHorizontal, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

type Lead = Tables<"leads">;
type LeadActivity = Tables<"lead_activities">;
type Stage = Lead["stage"];

const STAGES: { id: Stage; label: string; tint: string }[] = [
  { id: "new", label: "New", tint: "border-primary/40 bg-primary/10 text-primary" },
  { id: "contacted", label: "Contacted", tint: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  { id: "qualified", label: "Qualified", tint: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { id: "consultation_booked", label: "Consult Booked", tint: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  { id: "treatment_booked", label: "Treatment Booked", tint: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" },
  { id: "converted", label: "Converted", tint: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { id: "lost", label: "Lost", tint: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
];

// Keep old stages for backward compat in DB but hide from kanban
const VISIBLE_STAGES = STAGES;

// Default hardcoded sources — used as fallback if lead_sources_config query fails or is empty.
const DEFAULT_SOURCES = [
  { key: "booking_widget", label: "Booking Widget" },
  { key: "google_ads", label: "Google Ads" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "walk_in", label: "Walk-in" },
  { key: "referral", label: "Referral" },
  { key: "phone_call", label: "Phone Call" },
  { key: "dm_social", label: "Social DM" },
  { key: "online_booking", label: "Online Booking" },
  { key: "other", label: "Other" },
];

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function daysAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

interface StaffMember { id: string; display_name: string; color: string | null }
interface ServiceItem { id: string; name: string }

interface DraftForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  source_details: string;
  stage: Stage;
  estimated_value: string;
  notes: string;
  assigned_to: string;
  service_interest: string;
  next_follow_up_at: string;
}

const emptyDraft: DraftForm = {
  first_name: "", last_name: "", email: "", phone: "",
  source: "other", source_details: "", stage: "new",
  estimated_value: "0", notes: "", assigned_to: "",
  service_interest: "", next_follow_up_at: "",
};

export const Route = createFileRoute("/app/leads")({ component: LeadsPage });

function LeadsPage() {
  const { activeClinic, user } = useAuth();
  const canWriteClients = hasPermission(activeClinic?.role, "clients.write");
  const canDeleteClients = hasPermission(activeClinic?.role, "clients.delete");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [activityNote, setActivityNote] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);

  const clinicId = activeClinic?.clinic_id;

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [leadsRes, staffRes, svcRes] = await Promise.all([
      supabase.from("leads").select("*").eq("clinic_id", clinicId).order("updated_at", { ascending: false }),
      supabase.from("staff").select("id, display_name, color").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("services").select("id, name").eq("clinic_id", clinicId).eq("active", true),
    ]);
    if (leadsRes.error) toast.error("Could not load leads");
    setLeads(leadsRes.data ?? []);
    setStaffList(staffRes.data ?? []);
    setServicesList(svcRes.data ?? []);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("leads", clinicId, load);

  const [sources, setSources] = useState<Array<{ key: string; label: string }>>(DEFAULT_SOURCES);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("lead_sources_config")
          .select("source_key, display_name")
          .eq("is_active", true)
          .order("display_name");
        if (!mounted) return;
        if (error || !data || data.length === 0) {
          setSources(DEFAULT_SOURCES);
          return;
        }
        setSources(data.map((r: any) => ({ key: r.source_key, label: r.display_name })));
      } catch {
        setSources(DEFAULT_SOURCES);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filters
  const filtered = useMemo(() => {
    let result = leads;
    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter((l) =>
        [l.first_name, l.last_name, l.email, l.phone, l.source, l.notes, l.name]
          .filter(Boolean).join(" ").toLowerCase().includes(needle)
      );
    }
    if (sourceFilter !== "all") result = result.filter((l) => l.source === sourceFilter);
    if (staffFilter !== "all") result = result.filter((l) => l.assigned_to === staffFilter);
    return result;
  }, [leads, query, sourceFilter, staffFilter]);

  const byStage = useMemo(() => {
    const map: Record<Stage, Lead[]> = {} as any;
    for (const s of STAGES) map[s.id] = [];
    // Also add old stages in case
    for (const l of filtered) {
      if (map[l.stage]) map[l.stage].push(l);
      else {
        // Map old stages: consult_booked -> consultation_booked, won -> converted
        if (l.stage === "consult_booked" as any) (map["consultation_booked"] ??= []).push(l);
        else if (l.stage === "won" as any) (map["converted"] ??= []).push(l);
        else (map["new"] ??= []).push(l);
      }
    }
    return map;
  }, [filtered]);

  // Stats
  const activeLeads = leads.filter((l) => l.stage !== "converted" && l.stage !== "lost" && l.stage !== ("won" as any));
  const convertedCount = leads.filter((l) => l.stage === "converted" || l.stage === ("won" as any)).length;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;
  const totalValue = activeLeads.reduce((s, l) => s + l.estimated_value_cents, 0);

  // New this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const newThisWeek = leads.filter((l) => l.created_at >= weekAgo).length;

  // Top source
  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.source || "other";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];

  const openCreate = (stage: Stage = "new") => {
    setEditing(null);
    setDraft({ ...emptyDraft, stage });
    setOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setDraft({
      first_name: lead.first_name ?? "",
      last_name: lead.last_name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      source: lead.source ?? "other",
      source_details: lead.source_details ?? "",
      stage: lead.stage,
      estimated_value: String((lead.estimated_value_cents ?? 0) / 100),
      notes: lead.notes ?? "",
      assigned_to: lead.assigned_to ?? "",
      service_interest: lead.service_interest ?? "",
      next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const openDetail = async (lead: Lead) => {
    setDetailLead(lead);
    setActivityLoading(true);
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setActivities(data ?? []);
    setActivityLoading(false);
  };

  const addActivity = async (type: LeadActivity["activity_type"], description: string, metadata?: Record<string, any>) => {
    if (!detailLead || !clinicId) return;
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: detailLead.id,
      clinic_id: clinicId,
      activity_type: type,
      description,
      performed_by: null, // We don't have clinic_member id easily; could be enhanced
      metadata: metadata ?? {},
    });
    if (error) toast.error("Could not log activity");
    else {
      const { data } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", detailLead.id)
        .order("created_at", { ascending: false });
      setActivities(data ?? []);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clinicId) return;
    if (!canWriteClients) return toast.error("You don't have permission to modify leads");
    if (!draft.first_name.trim()) return toast.error("First name is required");
    setSaving(true);
    const oldStage = editing?.stage;
    const payload = {
      clinic_id: clinicId,
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      name: `${draft.first_name.trim()} ${draft.last_name.trim()}`.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      source: draft.source || null,
      source_details: draft.source_details.trim() || null,
      stage: draft.stage,
      estimated_value_cents: Math.round(Number(draft.estimated_value || 0) * 100),
      notes: draft.notes.trim() || null,
      assigned_to: draft.assigned_to || null,
      service_interest: draft.service_interest || null,
      next_follow_up_at: draft.next_follow_up_at ? new Date(draft.next_follow_up_at).toISOString() : null,
    };
    const res = editing
      ? await supabase.from("leads").update(payload).eq("id", editing.id).eq("clinic_id", clinicId)
      : await supabase.from("leads").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      // Log stage change activity
      if (editing && oldStage !== draft.stage) {
        await supabase.from("lead_activities").insert({
          lead_id: editing.id, clinic_id: clinicId,
          activity_type: "stage_change" as any,
          description: `Stage changed from ${oldStage} to ${draft.stage}`,
          metadata: { from: oldStage, to: draft.stage },
        });
      }
      toast.success(editing ? "Lead updated" : "Lead added");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !clinicId) return;
    if (!canDeleteClients) return toast.error("You don't have permission to delete leads");
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", editing.id).eq("clinic_id", clinicId);
    if (error) toast.error(error.message);
    else { toast.success("Lead deleted"); setOpen(false); await load(); }
  };

  const moveLead = async (leadId: string, newStage: Stage) => {
    if (!canWriteClients) return toast.error("You don't have permission to update leads");
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage || !clinicId) return;
    const oldStage = lead.stage;
    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));
    const { error } = await supabase.from("leads").update({ stage: newStage }).eq("id", leadId).eq("clinic_id", clinicId);
    if (error) { toast.error("Could not move lead"); await load(); return; }
    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId, clinic_id: clinicId,
      activity_type: "stage_change" as any,
      description: `Stage changed from ${oldStage} to ${newStage}`,
      metadata: { from: oldStage, to: newStage },
    });
    toast.success(`Moved to ${STAGES.find((s) => s.id === newStage)?.label}`);
  };

  const convertToClient = async (lead: Lead) => {
    if (!clinicId) return;
    if (lead.converted_to_client_id) { toast.info("Already converted"); return; }
    // Check if client exists by email
    let clientId: string | null = null;
    if (lead.email) {
      const { data } = await supabase.from("clients").select("id").eq("clinic_id", clinicId).eq("email", lead.email).maybeSingle();
      if (data) clientId = data.id;
    }
    if (!clientId && lead.phone) {
      const { data } = await supabase.from("clients").select("id").eq("clinic_id", clinicId).eq("phone", lead.phone).maybeSingle();
      if (data) clientId = data.id;
    }
    if (!clientId) {
      const { data, error } = await supabase.from("clients").insert({
        clinic_id: clinicId,
        first_name: lead.first_name ?? lead.name?.split(" ")[0] ?? "",
        last_name: lead.last_name ?? lead.name?.split(" ").slice(1).join(" ") ?? "",
        email: lead.email,
        phone: lead.phone,
        source: "lead_conversion",
        tags: ["converted-lead"],
      }).select("id").single();
      if (error) { toast.error("Could not create client"); return; }
      clientId = data.id;
    }
    await supabase.from("leads").update({
      stage: "converted" as Stage,
      converted_to_client_id: clientId,
    }).eq("id", lead.id).eq("clinic_id", clinicId);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id, clinic_id: clinicId,
      activity_type: "converted" as any,
      description: `Converted to client`,
      metadata: { client_id: clientId },
    });
    toast.success("Lead converted to client!");
    await load();
    if (detailLead?.id === lead.id) {
      const { data } = await supabase.from("leads").select("*").eq("id", lead.id).single();
      if (data) setDetailLead(data);
    }
  };

  const markAsLost = async (lead: Lead) => {
    if (!clinicId) return;
    const reason = prompt("Reason for losing this lead?");
    if (reason === null) return;
    await supabase.from("leads").update({
      stage: "lost" as Stage,
      lost_reason: reason || null,
    }).eq("id", lead.id).eq("clinic_id", clinicId);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id, clinic_id: clinicId,
      activity_type: "stage_change" as any,
      description: `Marked as lost${reason ? `: ${reason}` : ""}`,
      metadata: { reason },
    });
    toast.success("Lead marked as lost");
    await load();
  };

  if (!activeClinic) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading clinic…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pipeline</p>
          <h1 className="mt-1 font-display text-2xl sm:text-4xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Track and convert leads from all your marketing channels.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => openCreate("new")} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard icon={Target} label="Active Leads" value={String(activeLeads.length)} />
        <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} />
        <KpiCard icon={Flame} label="New This Week" value={String(newThisWeek)} />
        <KpiCard icon={Users} label="Top Source" value={topSource ? sources.find((s) => s.key === topSource[0])?.label ?? topSource[0] : "—"} sub={topSource ? `${topSource[1]} leads` : undefined} />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-[95vw] sm:max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads…"
              className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-surface px-3 text-sm">
            <option value="all">All Sources</option>
            {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          {staffList.length > 0 && (
            <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-surface px-3 text-sm">
              <option value="all">All Staff</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          )}
        </div>
      </section>

      {/* Kanban Board */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading pipeline…</div>
      ) : (
        <>
        {/* Desktop: Kanban Board */}
        <div className="hidden lg:block overflow-x-auto pb-2">
          <div className="grid min-w-[1200px] gap-3" style={{ gridTemplateColumns: `repeat(${VISIBLE_STAGES.length}, minmax(0, 1fr))` }}>
            {VISIBLE_STAGES.map((stage) => {
              const items = byStage[stage.id] ?? [];
              return (
                <div key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => { if (dragging) moveLead(dragging, stage.id); setDragging(null); setDragOver(null); }}
                  className={cn("flex flex-col rounded-2xl border bg-card transition min-h-[200px]",
                    dragOver === stage.id ? "border-primary/60 shadow-glow" : "border-border"
                  )}>
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", stage.tint)}>
                        {stage.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    <button onClick={() => openCreate(stage.id)} className="rounded-md p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {items.length === 0 ? (
                      <button onClick={() => openCreate(stage.id)}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-8 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                        <Plus className="h-3.5 w-3.5" /> Add lead
                      </button>
                    ) : (
                      items.map((lead) => (
                        <div key={lead.id} draggable
                          onDragStart={() => setDragging(lead.id)}
                          onDragEnd={() => { setDragging(null); setDragOver(null); }}
                          onClick={() => openDetail(lead)}
                          className={cn("group cursor-grab rounded-xl border border-border bg-surface/60 p-3 transition hover:border-primary/40 hover:bg-surface active:cursor-grabbing",
                            dragging === lead.id && "opacity-40"
                          )}>
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {lead.first_name ?? ""} {lead.last_name ?? ""}
                                {!lead.first_name && lead.name}
                              </div>
                              {lead.source && (
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {sources.find((s) => s.key === lead.source)?.label ?? lead.source}
                                </div>
                              )}
                              <div className="mt-2 flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-primary">{money(lead.estimated_value_cents)}</span>
                                <span className="text-[10px] text-muted-foreground">{daysAgo(lead.created_at)}</span>
                              </div>
                              {lead.assigned_to && (
                                <div className="mt-1.5 flex items-center gap-1">
                                  <div className="h-4 w-4 rounded-full bg-primary/20 text-[8px] font-bold text-primary flex items-center justify-center">
                                    {staffList.find((s) => s.id === lead.assigned_to)?.display_name?.[0] ?? "?"}
                                  </div>
                                  <span className="truncate text-[10px] text-muted-foreground">
                                    {staffList.find((s) => s.id === lead.assigned_to)?.display_name}
                                  </span>
                                </div>
                              )}
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

        {/* Mobile: Stacked List by Stage */}
        <div className="lg:hidden space-y-4">
          {VISIBLE_STAGES.map((stage) => {
            const items = byStage[stage.id] ?? [];
            return (
              <section key={stage.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", stage.tint)}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <button onClick={() => openCreate(stage.id)} className="rounded-md p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </header>
                <div className="divide-y divide-border">
                  {items.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">No leads</div>
                  ) : items.map((lead) => (
                    <button key={lead.id} onClick={() => openDetail(lead)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition">
                      <div className="font-medium text-sm">
                        {lead.first_name ?? ""} {lead.last_name ?? ""}
                        {!lead.first_name && lead.name}
                      </div>
                      {lead.source && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sources.find((s) => s.key === lead.source)?.label ?? lead.source}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">{money(lead.estimated_value_cents)}</span>
                        <span className="text-[10px] text-muted-foreground">{daysAgo(lead.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit Lead" : "New Lead"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture and track a potential client.</p>
              </div>
              <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="First Name" required value={draft.first_name} onChange={(v) => setDraft({ ...draft, first_name: v })} />
              <Field label="Last Name" value={draft.last_name} onChange={(v) => setDraft({ ...draft, last_name: v })} />
              <Field label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
              <Field label="Phone" type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Source</span>
                <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                  {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <Field label="Source Details" placeholder="e.g. Instagram DM about Botox" value={draft.source_details} onChange={(v) => setDraft({ ...draft, source_details: v })} />
              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Stage</span>
                <select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <Field label="Estimated Value ($)" type="number" value={draft.estimated_value} onChange={(v) => setDraft({ ...draft, estimated_value: v })} />
              {staffList.length > 0 && (
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Assigned To</span>
                  <select value={draft.assigned_to} onChange={(e) => setDraft({ ...draft, assigned_to: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">Unassigned</option>
                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                  </select>
                </label>
              )}
              {servicesList.length > 0 && (
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Service Interest</span>
                  <select value={draft.service_interest} onChange={(e) => setDraft({ ...draft, service_interest: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">None selected</option>
                    {servicesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              )}
              <Field label="Next Follow-up" type="datetime-local" value={draft.next_follow_up_at} onChange={(v) => setDraft({ ...draft, next_follow_up_at: v })} />
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</span>
                <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>{editing && <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">Delete</Button>}</div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add lead"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Detail / Activity Panel */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setDetailLead(null); }}>
          <div className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {detailLead.first_name ?? ""} {detailLead.last_name ?? ""}
                  {!detailLead.first_name && detailLead.name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {detailLead.email && <span>{detailLead.email}</span>}
                  {detailLead.phone && <span>· {detailLead.phone}</span>}
                </div>
              </div>
              <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => setDetailLead(null)}><X className="h-4 w-4" /></Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detailLead); setDetailLead(null); }}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              {detailLead.stage !== "converted" && detailLead.stage !== ("won" as any) && (
                <Button size="sm" variant="outline" onClick={() => convertToClient(detailLead)}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Convert to Client
                </Button>
              )}
              {detailLead.stage !== "lost" && detailLead.stage !== "converted" && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => { markAsLost(detailLead); setDetailLead(null); }}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Mark Lost
                </Button>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4 text-sm">
              <div><span className="text-muted-foreground">Stage:</span> <span className="ml-1 font-medium">{STAGES.find((s) => s.id === detailLead.stage)?.label ?? detailLead.stage}</span></div>
              <div><span className="text-muted-foreground">Source:</span> <span className="ml-1 font-medium">{sources.find((s) => s.key === detailLead.source)?.label ?? detailLead.source ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Value:</span> <span className="ml-1 font-medium text-primary">{money(detailLead.estimated_value_cents)}</span></div>
              <div><span className="text-muted-foreground">Assigned:</span> <span className="ml-1 font-medium">{staffList.find((s) => s.id === detailLead.assigned_to)?.display_name ?? "Unassigned"}</span></div>
              {detailLead.service_interest && <div className="col-span-2"><span className="text-muted-foreground">Interested in:</span> <span className="ml-1 font-medium">{servicesList.find((s) => s.id === detailLead.service_interest)?.name ?? "—"}</span></div>}
              {detailLead.next_follow_up_at && <div className="col-span-2"><span className="text-muted-foreground">Follow-up:</span> <span className="ml-1 font-medium">{new Date(detailLead.next_follow_up_at).toLocaleString()}</span></div>}
              {detailLead.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span className="ml-1">{detailLead.notes}</span></div>}
            </div>

            {/* Activity Timeline */}
            <div className="border-t border-border px-5 py-4">
              <h3 className="mb-3 text-sm font-semibold">Activity Timeline</h3>

              {/* Quick log buttons */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => addActivity("call_made", "Phone call logged")}>
                  <Phone className="mr-1 h-3 w-3" /> Call
                </Button>
                <Button size="sm" variant="outline" onClick={() => addActivity("email_sent", "Email sent")}>
                  <Mail className="mr-1 h-3 w-3" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => addActivity("sms_sent", "SMS sent")}>
                  <MessageSquare className="mr-1 h-3 w-3" /> SMS
                </Button>
                <Button size="sm" variant="outline" onClick={() => addActivity("meeting_booked", "Meeting booked")}>
                  <CalendarPlus className="mr-1 h-3 w-3" /> Meeting
                </Button>
              </div>

              {/* Add note */}
              <div className="mb-4 flex gap-2">
                <input value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Add a note…"
                  className="h-9 flex-1 rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && activityNote.trim()) {
                      addActivity("note", activityNote.trim());
                      setActivityNote("");
                    }
                  }} />
                <Button size="sm" disabled={!activityNote.trim()} onClick={() => { addActivity("note", activityNote.trim()); setActivityNote(""); }}>
                  Add
                </Button>
              </div>

              {/* Timeline */}
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ActivityIcon type={a.activity_type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground">{a.description}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvOpen && <CsvImportModal clinicId={clinicId!} onClose={() => setCsvOpen(false)} onDone={() => { setCsvOpen(false); load(); }} sources={sources} />}
    </div>
  );
}

/* ——— Sub-components ——— */

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "call_made": return <Phone className="h-3 w-3" />;
    case "email_sent": return <Mail className="h-3 w-3" />;
    case "sms_sent": return <MessageSquare className="h-3 w-3" />;
    case "stage_change": return <ArrowRight className="h-3 w-3" />;
    case "converted": return <UserPlus className="h-3 w-3" />;
    case "meeting_booked": return <CalendarPlus className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} required={required} step={type === "number" ? "0.01" : undefined} min={type === "number" ? "0" : undefined}
        placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}

/* ——— CSV Import ——— */

interface CsvRow { first_name: string; last_name: string; email: string; phone: string; source: string; notes: string }

function CsvImportModal({ clinicId, onClose, onDone, sources }: { clinicId: string; onClose: () => void; onDone: () => void; sources: Array<{ key: string; label: string }> }) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { setErrors(["CSV must have a header row and at least one data row"]); return; }
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const parsed: CsvRow[] = [];
      const errs: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const row: CsvRow = {
          first_name: cols[headers.indexOf("first_name")] ?? cols[headers.indexOf("firstname")] ?? cols[0] ?? "",
          last_name: cols[headers.indexOf("last_name")] ?? cols[headers.indexOf("lastname")] ?? cols[1] ?? "",
          email: cols[headers.indexOf("email")] ?? "",
          phone: cols[headers.indexOf("phone")] ?? "",
          source: cols[headers.indexOf("source")] ?? "other",
          notes: cols[headers.indexOf("notes")] ?? "",
        };
        if (!row.first_name) { errs.push(`Row ${i}: missing first name`); continue; }
        parsed.push(row);
      }
      setRows(parsed);
      setErrors(errs);
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of rows) {
      const { error } = await supabase.from("leads").insert({
        clinic_id: clinicId,
        first_name: row.first_name,
        last_name: row.last_name,
        name: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email || null,
        phone: row.phone || null,
        source: sources.some((s) => s.key === row.source) ? row.source : "other",
        stage: "new" as Stage,
        notes: row.notes || null,
        estimated_value_cents: 0,
      });
      if (error) failed++; else success++;
    }
    setResult({ success, failed });
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} leads`);
    if (failed > 0) toast.error(`${failed} rows failed`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display text-xl font-semibold">Import Leads from CSV</h2>
          <Button aria-label="Action" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4 p-5">
          {!result ? (
            <>
              <p className="text-sm text-muted-foreground">
                Upload a CSV with columns: <code className="text-xs bg-surface px-1 py-0.5 rounded">first_name, last_name, email, phone, source, notes</code>
              </p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="text-sm" />
              {errors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              {rows.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{rows.length} rows ready to import</p>
                  <div className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                    {rows.slice(0, 5).map((r, i) => (
                      <div key={i}>{r.first_name} {r.last_name} — {r.email || r.phone || "no contact"}</div>
                    ))}
                    {rows.length > 5 && <div>…and {rows.length - 5} more</div>}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button disabled={rows.length === 0 || importing} onClick={doImport}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {importing ? "Importing…" : `Import ${rows.length} leads`}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-semibold">{result.success} imported successfully</p>
                {result.failed > 0 && <p className="text-sm text-destructive">{result.failed} failed</p>}
              </div>
              <div className="flex justify-center">
                <Button onClick={onDone} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">Done</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
