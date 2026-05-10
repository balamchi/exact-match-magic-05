import { useEffect, useMemo, useState, FormEvent, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserCog, Plus, Search, Users, Stethoscope, Sparkles, ShieldCheck,
  Edit3, Trash2, X, Power, PowerOff, Crown, Briefcase, Calendar,
  Phone, Mail, AlertTriangle, Loader2, Save, Palette, Check,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "@/components/photo-upload";
export const Route = createFileRoute("/app/staff")({ component: StaffPage });

/* ── Types ────────────────────────────────────────────── */

interface StaffRow {
  id: string;
  clinic_id: string;
  display_name: string;
  title: string | null;
  color: string | null;
  photo_url: string | null;
  active: boolean;
  user_id: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  online_booking_visible: boolean;
  working_hours: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface HrRow {
  id?: string;
  staff_id: string;
  clinic_id: string;
  email: string;
  phone: string;
  employment_type: string;
  hire_date: string;
  hourly_rate_cents: number | null;
  salary_cents: number | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

interface CommissionRow {
  id?: string;
  staff_id: string;
  clinic_id: string;
  commission_type: string;
  rate: number;
  applies_to: string;
  service_category: string | null;
  active: boolean;
}

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
}

const COLOR_PALETTE = [
  { name: "Purple", value: "#a78bfa" },
  { name: "Pink", value: "#f472b6" },
  { name: "Blue", value: "#60a5fa" },
  { name: "Teal", value: "#2dd4bf" },
  { name: "Green", value: "#34d399" },
  { name: "Yellow", value: "#fbbf24" },
  { name: "Orange", value: "#fb923c" },
  { name: "Red", value: "#f87171" },
  { name: "Indigo", value: "#818cf8" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Lime", value: "#a3e635" },
  { name: "Rose", value: "#fb7185" },
];

const ROLES = [
  { value: "owner", label: "Owner", desc: "Full access to everything including billing and team management" },
  { value: "admin", label: "Admin", desc: "Manage staff, services, settings — no billing access" },
  { value: "provider", label: "Provider", desc: "Perform treatments, view own schedule, manage own clients" },
  { value: "front_desk", label: "Front Desk", desc: "Booking, check-in, client intake — no clinical access" },
  { value: "manager", label: "Manager", desc: "Reports, scheduling, staff oversight" },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const PROVIDER_KEYWORDS = ["provider", "injector", "doctor", "physician", "nurse", "np", "rn", "aesthetician", "therapist"];
const isProvider = (title: string | null, role: string) => {
  if (role === "provider") return true;
  if (!title) return false;
  return PROVIDER_KEYWORDS.some(k => title.toLowerCase().includes(k));
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";

const staffSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  active: z.boolean(),
  role: z.string().min(1),
  bio: z.string().max(2000).optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().max(40).optional(),
  online_booking_visible: z.boolean(),
});

/* ── Page ─────────────────────────────────────────────── */

function StaffPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [composer, setComposer] = useState<StaffRow | "new" | null>(null);

  const load = useCallback(async () => {
    if (!clinicId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("staff").select("*").eq("clinic_id", clinicId).order("display_name");
    if (error) toast.error("Couldn't load staff");
    else setRows((data ?? []) as StaffRow[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase.channel(`staff-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "inactive" && r.active) return false;
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (!q) return true;
      return r.display_name.toLowerCase().includes(q) || (r.title ?? "").toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter, roleFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.active).length,
    providers: rows.filter(r => r.active && isProvider(r.title, r.role)).length,
    linked: rows.filter(r => r.user_id).length,
  }), [rows]);

  const toggleActive = async (row: StaffRow) => {
    const { error } = await supabase.from("staff").update({ active: !row.active }).eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(row.active ? `${row.display_name} archived` : `${row.display_name} reactivated`);
  };

  const remove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.display_name} from staff?`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Staff member removed");
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" /> Team roster
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Staff</h1>
          <p className="max-w-[95vw] sm:max-w-xl text-sm text-muted-foreground">Manage providers, front desk, and support team. Calendar colors flow through to your booking grid.</p>
        </div>
        <Button onClick={() => setComposer("new")} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" /> Add staff
        </Button>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total team" value={stats.total} accent="violet" icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Providers" value={stats.providers} accent="emerald" icon={<Stethoscope className="h-4 w-4" />} />
        <KpiCard label="Linked accounts" value={stats.linked} accent="amber" icon={<ShieldCheck className="h-4 w-4" />} />
        <KpiCard label="Inactive" value={stats.total - stats.active} accent="rose" icon={<PowerOff className="h-4 w-4" />} />
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-[95vw] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, title, email…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {["all", ...ROLES.map(r => r.value)].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                roleFilter === r ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}>{r === "all" ? "All roles" : r.replace("_", " ")}</button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-card/30 p-0.5">
          {(["active", "all", "inactive"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                statusFilter === s ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"
              )}>{s}</button>
          ))}
        </div>
      </section>

      {/* Grid */}
      {loading ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border/60 bg-card/20">
          <div className="flex flex-col items-center justify-center gap-3 px-4 sm:px-6 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No team members yet</p>
            <p className="text-xs text-muted-foreground">Add your team to start scheduling appointments.</p>
            {rows.length === 0 && <Button size="sm" onClick={() => setComposer("new")} className="mt-2"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add staff</Button>}
          </div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(row => {
            const color = row.color || "#a78bfa";
            const provider = isProvider(row.title, row.role);
            return (
              <article key={row.id} className={cn("group relative overflow-hidden rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur transition hover:border-primary/40", !row.active && "opacity-60")}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 overflow-hidden"
                    style={{ '--tw-ring-color': `${color}40` } as React.CSSProperties}>
                    {row.photo_url ? (
                      <img src={row.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-background" style={{ background: color }}>
                        {initials(row.display_name)}
                      </div>
                    )}
                    {provider && <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background" title="Provider"><Crown className="h-3 w-3 text-amber-300" /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold tracking-tight">{row.display_name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.title || "No title"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{row.role.replace("_", " ")}</Badge>
                      {row.user_id ? (
                        <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-[10px] text-sky-200"><ShieldCheck className="mr-1 h-2.5 w-2.5" /> Account</Badge>
                      ) : (
                        <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">Pending invite</Badge>
                      )}
                      {!row.active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 border-t border-border/40 pt-3 opacity-0 transition group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => setComposer(row)} className="h-7 flex-1 text-xs"><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(row)} className="h-7 px-2 text-xs" title={row.active ? "Archive" : "Reactivate"}>
                    {row.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(row)} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Composer */}
      {composer && clinicId && (
        <StaffComposer
          row={composer === "new" ? null : composer}
          clinicId={clinicId}
          onClose={() => setComposer(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────── */

const KPI_ACCENTS = {
  violet: "from-violet-500/20 ring-violet-400/30 text-violet-300",
  emerald: "from-emerald-500/20 ring-emerald-400/30 text-emerald-300",
  amber: "from-amber-500/20 ring-amber-400/30 text-amber-300",
  rose: "from-rose-500/20 ring-rose-400/30 text-rose-300",
} as const;

function KpiCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: keyof typeof KPI_ACCENTS }) {
  const t = KPI_ACCENTS[accent];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br to-transparent p-4", t.split(" ")[0])}>
      <div className="flex items-start justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/40 ring-1", t.split(" ").slice(1).join(" "))}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* ── Staff Composer (tabbed modal) ────────────────────── */

type TabKey = "profile" | "contact" | "role" | "services" | "schedule" | "hr" | "commissions";

function StaffComposer({ row, clinicId, onClose, onSaved }: { row: StaffRow | null; clinicId: string; onClose: () => void; onSaved: () => void }) {
  const { activeClinic } = useAuth();
  const editing = !!row;
  const [tab, setTab] = useState<TabKey>("profile");
  const [saving, setSaving] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState(row?.display_name ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [color, setColor] = useState(row?.color ?? "#a78bfa");
  const [photoUrl, setPhotoUrl] = useState<string | null>(row?.photo_url ?? null);
  const [active, setActive] = useState(row?.active ?? true);
  const [bio, setBio] = useState(row?.bio ?? "");
  const [role, setRole] = useState(row?.role ?? "provider");
  const [email, setEmail] = useState(row?.email ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [onlineBookingVisible, setOnlineBookingVisible] = useState(row?.online_booking_visible ?? true);

  // Working hours
  const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; start: string; end: string; lunch_start: string; lunch_end: string }>>(
    () => {
      const wh = (row?.working_hours ?? {}) as Record<string, any>;
      const result: Record<string, any> = {};
      for (const day of DAYS) {
        result[day] = wh[day] ?? { enabled: day !== "sunday" && day !== "saturday", start: "09:00", end: "17:00", lunch_start: "", lunch_end: "" };
      }
      return result;
    }
  );

  // HR
  const [hr, setHr] = useState<HrRow | null>(null);
  const [hrLoading, setHrLoading] = useState(false);

  // Commissions
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);

  // Services
  const [allServices, setAllServices] = useState<ServiceRow[]>([]);
  const [staffServices, setStaffServices] = useState<Set<string>>(new Set());

  // Load related data when editing
  useEffect(() => {
    if (!row) return;
    const loadRelated = async () => {
      setHrLoading(true);
      const [hrRes, commRes, svcRes] = await Promise.all([
        supabase.from("staff_hr").select("*").eq("staff_id", row.id).maybeSingle(),
        supabase.from("staff_commissions").select("*").eq("staff_id", row.id).order("created_at"),
        supabase.from("services").select("id, name, category, active").eq("clinic_id", clinicId).eq("active", true).order("name"),
      ]);
      if (hrRes.data) setHr(hrRes.data as any);
      else setHr({ staff_id: row.id, clinic_id: clinicId, email: "", phone: "", employment_type: "full_time", hire_date: "", hourly_rate_cents: null, salary_cents: null, emergency_contact_name: "", emergency_contact_phone: "", notes: "" });
      if (commRes.data) setCommissions(commRes.data as any[]);
      if (svcRes.data) setAllServices(svcRes.data as ServiceRow[]);
      setHrLoading(false);
    };
    loadRelated();
  }, [row?.id, clinicId]);

  // Load services for new staff
  useEffect(() => {
    if (row) return;
    supabase.from("services").select("id, name, category, active").eq("clinic_id", clinicId).eq("active", true).order("name")
      .then(({ data }) => { if (data) setAllServices(data as ServiceRow[]); });
  }, [clinicId, row]);

  const saveStaff = async () => {
    const parsed = staffSchema.safeParse({ display_name: displayName, title, color, active, role, bio, email, phone, online_booking_visible: onlineBookingVisible });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your inputs"); return; }
    setSaving(true);
    try {
      const payload = {
        clinic_id: clinicId,
        display_name: parsed.data.display_name,
        title: parsed.data.title || null,
        color: parsed.data.color,
        active: parsed.data.active,
        role: parsed.data.role,
        bio: parsed.data.bio || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        online_booking_visible: parsed.data.online_booking_visible,
        working_hours: workingHours,
        photo_url: photoUrl || null,
      };

      if (editing && row) {
        const { error } = await supabase.from("staff").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staff").insert(payload);
        if (error) throw error;
      }

      toast.success(editing ? "Staff updated" : "Staff member added");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveHr = async () => {
    if (!hr || !row) return;
    setSaving(true);
    try {
      if (hr.id) {
        const { error } = await supabase.from("staff_hr").update({
          email: hr.email || null, phone: hr.phone || null, employment_type: hr.employment_type,
          hire_date: hr.hire_date || null, hourly_rate_cents: hr.hourly_rate_cents, salary_cents: hr.salary_cents,
          emergency_contact_name: hr.emergency_contact_name || null, emergency_contact_phone: hr.emergency_contact_phone || null,
          notes: hr.notes || null,
        }).eq("id", hr.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staff_hr").insert({ ...hr, staff_id: row.id, clinic_id: clinicId });
        if (error) throw error;
      }
      toast.success("HR details saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save HR");
    } finally {
      setSaving(false);
    }
  };

  const addCommission = async () => {
    if (!row) return;
    const { error } = await supabase.from("staff_commissions").insert({ staff_id: row.id, clinic_id: clinicId, commission_type: "percentage", rate: 10, applies_to: "all", active: true });
    if (error) toast.error(error.message);
    else {
      const { data } = await supabase.from("staff_commissions").select("*").eq("staff_id", row.id).order("created_at");
      if (data) setCommissions(data as any[]);
    }
  };

  const updateCommission = async (id: string, updates: Partial<CommissionRow>) => {
    const { error } = await supabase.from("staff_commissions").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCommission = async (id: string) => {
    const { error } = await supabase.from("staff_commissions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setCommissions(prev => prev.filter(c => c.id !== id));
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { key: "profile", label: "Profile", icon: <UserCog className="h-3.5 w-3.5" /> },
    { key: "contact", label: "Contact", icon: <Phone className="h-3.5 w-3.5" /> },
    { key: "role", label: "Role", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "services", label: "Services", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { key: "schedule", label: "Schedule", icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: "hr", label: "HR", icon: <Briefcase className="h-3.5 w-3.5" />, ownerOnly: true },
    { key: "commissions", label: "Commissions", icon: <Stethoscope className="h-3.5 w-3.5" />, ownerOnly: true },
  ];

  const showTab = (t: typeof TABS[number]) => {
    if (t.ownerOnly && !editing) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 pt-[3vh] backdrop-blur-sm">
      <div className="w-full max-w-[95vw] sm:max-w-4xl rounded-2xl border border-border bg-card shadow-elevated">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">{editing ? "Edit staff" : "Add staff member"}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{editing ? "Update profile, schedule, and compensation details." : "Add a new team member to your clinic."}</p>
          </div>
          <Button aria-label="Action" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-5 [scrollbar-width:none]">
          {TABS.filter(showTab).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition whitespace-nowrap",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{t.icon}{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {tab === "profile" && (
            <div className="space-y-5">
              {/* Provider photo */}
              <div className="flex justify-center">
                <PhotoUpload
                  bucket="staff-photos"
                  currentUrl={photoUrl}
                  onUploaded={setPhotoUrl}
                  onRemoved={() => setPhotoUrl(null)}
                  shape="circle"
                  size={160}
                  clinicId={clinicId}
                  placeholder={
                    <div className="flex h-full w-full items-center justify-center rounded-full text-2xl sm:text-3xl font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${color}, #9333EA)` }}>
                      {initials(displayName || "?")}
                    </div>
                  }
                  hint="Provider photo for booking page"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Display name *">
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Dr. Sarah Chen" />
                </FormField>
                <FormField label="Title">
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lead Aesthetician" />
                </FormField>
              </div>
              <FormField label="Calendar color">
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button key={c.value} type="button" onClick={() => setColor(c.value)}
                      className={cn("h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                        color === c.value ? "ring-primary scale-110" : "ring-transparent hover:ring-border"
                      )} style={{ background: c.value }} title={c.name} />
                  ))}
                </div>
              </FormField>
              <FormField label="Bio (for booking page)">
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={2000} placeholder="Brief bio visible on your booking page…"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </FormField>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="text-sm">Active (visible on calendar and booking)</span>
              </label>
            </div>
          )}

          {tab === "contact" && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Email">
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@clinic.com" />
                </FormField>
                <FormField label="Phone">
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </FormField>
              </div>
              {editing && hr && (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-200"><AlertTriangle className="h-3.5 w-3.5" /> Emergency contact</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={hr.emergency_contact_name} onChange={e => setHr({ ...hr, emergency_contact_name: e.target.value })} placeholder="Contact name" />
                    <Input value={hr.emergency_contact_phone} onChange={e => setHr({ ...hr, emergency_contact_phone: e.target.value })} placeholder="Contact phone" />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "role" && (
            <div className="space-y-4">
              {ROLES.map(r => (
                <label key={r.value} className={cn("flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition",
                  role === r.value ? "border-primary/60 bg-primary/5" : "border-border/60 hover:border-border"
                )}>
                  <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5 accent-primary" />
                  <div>
                    <span className="text-sm font-medium">{r.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                </label>
              ))}
              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" checked={onlineBookingVisible} onChange={e => setOnlineBookingVisible(e.target.checked)} className="h-4 w-4 accent-primary" />
                <span className="text-sm">Visible on online booking page</span>
              </label>
            </div>
          )}

          {tab === "services" && (
            <ServicesPicker allServices={allServices} staffServices={staffServices} setStaffServices={setStaffServices} />
          )}

          {tab === "schedule" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set default working hours for each day of the week.</p>
              {DAYS.map(day => {
                const d = workingHours[day];
                return (
                  <div key={day} className={cn("rounded-lg border px-4 py-3 transition", d.enabled ? "border-border/60" : "border-border/30 opacity-50")}>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-28">
                        <input type="checkbox" checked={d.enabled} onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))} className="accent-primary" />
                        <span className="text-sm font-medium capitalize">{day}</span>
                      </label>
                      {d.enabled && (
                        <div className="flex items-center gap-2 text-sm">
                          <Input type="time" value={d.start} onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))} className="h-8 w-28 text-xs" />
                          <span className="text-muted-foreground">to</span>
                          <Input type="time" value={d.end} onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))} className="h-8 w-28 text-xs" />
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-xs text-muted-foreground">Lunch:</span>
                          <Input type="time" value={d.lunch_start} onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], lunch_start: e.target.value } }))} className="h-8 w-24 text-xs" placeholder="12:00" />
                          <Input type="time" value={d.lunch_end} onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], lunch_end: e.target.value } }))} className="h-8 w-24 text-xs" placeholder="13:00" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "hr" && editing && hr && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Employment type">
                  <select value={hr.employment_type} onChange={e => setHr({ ...hr, employment_type: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </FormField>
                <FormField label="Hire date">
                  <Input type="date" value={hr.hire_date} onChange={e => setHr({ ...hr, hire_date: e.target.value })} />
                </FormField>
                <FormField label="Hourly rate ($)">
                  <Input type="number" min={0} step={0.01} value={hr.hourly_rate_cents != null ? (hr.hourly_rate_cents / 100).toFixed(2) : ""} onChange={e => setHr({ ...hr, hourly_rate_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} placeholder="0.00" />
                </FormField>
              </div>
              <FormField label="Annual salary ($)">
                <Input type="number" min={0} step={0.01} value={hr.salary_cents != null ? (hr.salary_cents / 100).toFixed(2) : ""} onChange={e => setHr({ ...hr, salary_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} placeholder="0.00" className="max-w-xs" />
              </FormField>
              <FormField label="Notes">
                <textarea value={hr.notes} onChange={e => setHr({ ...hr, notes: e.target.value })} rows={3} placeholder="Internal notes…"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </FormField>
              <div className="flex justify-end">
                <Button onClick={saveHr} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save HR details
                </Button>
              </div>
            </div>
          )}

          {tab === "commissions" && editing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Define commission rules for this team member.</p>
                <Button size="sm" variant="outline" onClick={addCommission}><Plus className="mr-1 h-3 w-3" /> Add rule</Button>
              </div>
              {commissions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No commission rules. Add one to start tracking earnings.</p>
              ) : (
                <div className="space-y-3">
                  {commissions.map(c => (
                    <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3">
                      <select value={c.commission_type} onChange={e => c.id && updateCommission(c.id, { commission_type: e.target.value })}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="percentage">Percentage</option>
                        <option value="flat">Flat fee</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} step={0.01} value={c.rate} onChange={e => c.id && updateCommission(c.id, { rate: parseFloat(e.target.value) || 0 })} className="h-8 w-20 text-xs" />
                        <span className="text-xs text-muted-foreground">{c.commission_type === "percentage" ? "%" : activeClinic?.clinic?.currency || "CAD"}</span>
                      </div>
                      <select value={c.applies_to} onChange={e => c.id && updateCommission(c.id, { applies_to: e.target.value })}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="all">All services</option>
                        <option value="category">By category</option>
                      </select>
                      <label className="ml-auto flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={c.active} onChange={e => c.id && updateCommission(c.id, { active: e.target.checked })} className="accent-primary" /> Active
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => c.id && deleteCommission(c.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border p-5">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={saveStaff} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            {saving ? "Saving…" : editing ? "Save changes" : "Add staff member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Services Picker (grouped by category) ───────────── */

function ServicesPicker({ allServices, staffServices, setStaffServices }: {
  allServices: ServiceRow[];
  staffServices: Set<string>;
  setStaffServices: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [svcSearch, setSvcSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const q = svcSearch.trim().toLowerCase();
    const filtered = q ? allServices.filter(s => s.name.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q)) : allServices;
    const map = new Map<string, ServiceRow[]>();
    for (const s of filtered) {
      const cat = s.category?.trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allServices, svcSearch]);

  const toggle = (id: string) => {
    setStaffServices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectCategory = (services: ServiceRow[]) => {
    setStaffServices(prev => {
      const next = new Set(prev);
      services.forEach(s => next.add(s.id));
      return next;
    });
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (allServices.length === 0) {
    return (
      <div className="space-y-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          No active services yet. <a href="/app/services" className="text-primary hover:underline">Add services first.</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={svcSearch} onChange={e => setSvcSearch(e.target.value)} placeholder="Search services…" className="pl-9" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStaffServices(new Set(allServices.map(s => s.id)))}>Select all</Button>
          <Button size="sm" variant="outline" onClick={() => setStaffServices(new Set())}>Clear all</Button>
        </div>
        <span className="text-xs text-muted-foreground">Selected: <strong className="text-foreground">{staffServices.size}</strong></span>
      </div>

      <div className="space-y-2">
        {grouped.map(([cat, services]) => {
          const isCollapsed = collapsed.has(cat);
          const selectedInCat = services.filter(s => staffServices.has(s.id)).length;
          return (
            <div key={cat} className="rounded-lg border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCollapse(cat)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-surface/50 transition"
              >
                <span className="flex items-center gap-2">
                  <span className={cn("transition-transform", isCollapsed ? "-rotate-90" : "rotate-0")}>▼</span>
                  {cat} ({services.length})
                  {selectedInCat > 0 && <Badge variant="default" className="text-[9px] ml-1">{selectedInCat}</Badge>}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); selectCategory(services); }}
                  className="text-[10px] text-primary hover:underline"
                >Select all</button>
              </button>
              {!isCollapsed && (
                <div className="border-t border-border/40 divide-y divide-border/20">
                  {services.map(s => (
                    <label key={s.id} className={cn("flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition hover:bg-surface/30",
                      staffServices.has(s.id) && "bg-primary/5"
                    )}>
                      <input type="checkbox" checked={staffServices.has(s.id)} onChange={() => toggle(s.id)} className="accent-primary" />
                      <span className="flex-1">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
