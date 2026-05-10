import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock, Copy, DollarSign, Download, Edit3, Filter, HeartPulse, Plus,
  Search, Sparkles, Trash2, Upload, X, Check, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "@/components/photo-upload";
import { seedClinicDefaults } from "@/server/seed-clinic.functions";

export const Route = createFileRoute("/app/services")({ component: ServicesPage });

/* ── Types ────────────────────────────────────────────── */

interface Service {
  id: string;
  clinic_id: string;
  name: string;
  category: string | null;
  sub_category: string | null;
  duration_minutes: number;
  prep_time_minutes: number;
  cleanup_time_minutes: number;
  price_cents: number;
  member_price_cents: number | null;
  deposit_required: boolean;
  deposit_cents: number;
  active: boolean;
  online_booking_enabled: boolean;
  description: string | null;
  image_url: string | null;
  tax_category: string | null;
  pre_treatment_instructions: string | null;
  post_treatment_aftercare: string | null;
  treatment_area_tags: string[] | null;
  dosage_notes: string | null;
  recommended_interval: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Injectables", "Facials", "Laser", "Body", "Hair", "Skin", "Wellness", "Other",
] as const;

const TREATMENT_AREAS = ["Face", "Body", "Hair", "Hands", "Feet"] as const;

const PAGE_SIZE = 50;

/* ── Validation ───────────────────────────────────────── */

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  category: z.string().min(1, "Category is required"),
  sub_category: z.string().trim().max(100).optional(),
  duration_minutes: z.coerce.number().int().min(5, "Min 5 minutes").max(480, "Max 8 hours"),
  prep_time_minutes: z.coerce.number().int().min(0).max(120).default(0),
  cleanup_time_minutes: z.coerce.number().int().min(0).max(120).default(0),
  price_cents: z.coerce.number().min(0).max(99999900),
  member_price_cents: z.coerce.number().min(0).max(99999900).optional().nullable(),
  deposit_required: z.boolean(),
  deposit_cents: z.coerce.number().min(0).max(99999900).default(0),
  active: z.boolean(),
  online_booking_enabled: z.boolean(),
  description: z.string().max(2000).optional(),
  tax_category: z.string().max(80).optional(),
  pre_treatment_instructions: z.string().max(2000).optional(),
  post_treatment_aftercare: z.string().max(2000).optional(),
  treatment_area_tags: z.array(z.string()).optional(),
  dosage_notes: z.string().max(500).optional(),
  recommended_interval: z.string().max(200).optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const defaultForm: ServiceFormData = {
  name: "", category: "", sub_category: "", duration_minutes: 60,
  prep_time_minutes: 0, cleanup_time_minutes: 0, price_cents: 0,
  member_price_cents: null, deposit_required: false, deposit_cents: 0,
  active: true, online_booking_enabled: true, description: "",
  tax_category: "", pre_treatment_instructions: "", post_treatment_aftercare: "",
  treatment_area_tags: [], dosage_notes: "", recommended_interval: "",
};

function formatMoney(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

/* ── Page ─────────────────────────────────────────────── */

function ServicesPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const currency = activeClinic?.clinic.currency ?? "CAD";

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Locations
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [serviceLocationMap, setServiceLocationMap] = useState<Record<string, string[]>>({});

  // Composer
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(defaultForm);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [svcRes, locRes, slRes] = await Promise.all([
      supabase.from("services").select("*").eq("clinic_id", clinicId).order("category").order("name"),
      supabase.from("locations").select("id, name").eq("clinic_id", clinicId).eq("active", true).order("name"),
      supabase.from("service_locations").select("service_id, location_id"),
    ]);
    if (svcRes.error) toast.error("Could not load services");
    else setServices((svcRes.data ?? []) as Service[]);
    setLocations((locRes.data ?? []) as { id: string; name: string }[]);
    // Build service → locations map
    const map: Record<string, string[]> = {};
    for (const row of (slRes.data ?? []) as { service_id: string; location_id: string }[]) {
      if (!map[row.service_id]) map[row.service_id] = [];
      map[row.service_id].push(row.location_id);
    }
    setServiceLocationMap(map);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  /* ── Filtering & pagination ──────────────────────── */

  const categories = useMemo(() => {
    const set = new Set(services.map(s => s.category?.trim() || "Uncategorized"));
    return Array.from(set).sort();
  }, [services]);

  const filtered = useMemo(() => {
    let list = services;
    if (catFilter !== "all") list = list.filter(s => (s.category?.trim() || "Uncategorized") === catFilter);
    if (statusFilter === "active") list = list.filter(s => s.active);
    if (statusFilter === "inactive") list = list.filter(s => !s.active);
    if (locationFilter !== "all") list = list.filter(s => serviceLocationMap[s.id]?.includes(locationFilter));
    const needle = query.trim().toLowerCase();
    if (needle) list = list.filter(s => s.name.toLowerCase().includes(needle) || (s.category ?? "").toLowerCase().includes(needle));
    return list;
  }, [services, query, catFilter, statusFilter, locationFilter, serviceLocationMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const stats = useMemo(() => {
    const active = services.filter(s => s.active);
    const avg = active.length ? active.reduce((sum, s) => sum + (s.price_cents ?? 0), 0) / active.length : 0;
    return { total: services.length, active: active.length, avgCents: Math.round(avg), categories: categories.length };
  }, [services, categories]);

  /* ── Composer helpers ────────────────────────────── */

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setImageUrl(null);
    setSelectedLocations(locations.map(l => l.id)); // default: all locations
    setErrors({});
    setOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setImageUrl(s.image_url ?? null);
    setForm({
      name: s.name,
      category: s.category ?? "",
      sub_category: s.sub_category ?? "",
      duration_minutes: s.duration_minutes,
      prep_time_minutes: s.prep_time_minutes ?? 0,
      cleanup_time_minutes: s.cleanup_time_minutes ?? 0,
      price_cents: (s.price_cents ?? 0) / 100,
      member_price_cents: s.member_price_cents != null ? s.member_price_cents / 100 : null,
      deposit_required: s.deposit_required,
      deposit_cents: (s.deposit_cents ?? 0) / 100,
      active: s.active,
      online_booking_enabled: s.online_booking_enabled ?? true,
      description: s.description ?? "",
      tax_category: s.tax_category ?? "",
      pre_treatment_instructions: s.pre_treatment_instructions ?? "",
      post_treatment_aftercare: s.post_treatment_aftercare ?? "",
      treatment_area_tags: s.treatment_area_tags ?? [],
      dosage_notes: s.dosage_notes ?? "",
      recommended_interval: s.recommended_interval ?? "",
    });
    setSelectedLocations(serviceLocationMap[s.id] ?? locations.map(l => l.id));
    setErrors({});
    setOpen(true);
  };

  const duplicate = async (s: Service) => {
    if (!clinicId) return;
    const { error } = await supabase.from("services").insert({
      clinic_id: clinicId, name: `${s.name} (Copy)`, category: s.category,
      sub_category: s.sub_category, duration_minutes: s.duration_minutes,
      prep_time_minutes: s.prep_time_minutes, cleanup_time_minutes: s.cleanup_time_minutes,
      price_cents: s.price_cents, member_price_cents: s.member_price_cents,
      deposit_required: s.deposit_required, deposit_cents: s.deposit_cents,
      active: false, online_booking_enabled: s.online_booking_enabled,
      description: s.description, tax_category: s.tax_category,
      pre_treatment_instructions: s.pre_treatment_instructions,
      post_treatment_aftercare: s.post_treatment_aftercare,
      treatment_area_tags: s.treatment_area_tags,
      dosage_notes: s.dosage_notes, recommended_interval: s.recommended_interval,
    });
    if (error) toast.error(error.message);
    else { toast.success("Service duplicated"); load(); }
  };

  const submit = async (andAnother = false) => {
    if (!clinicId) return;
    const parsed = serviceSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach(i => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const d = parsed.data;
    const payload = {
      clinic_id: clinicId,
      name: d.name,
      category: d.category || null,
      sub_category: d.sub_category || null,
      duration_minutes: d.duration_minutes,
      prep_time_minutes: d.prep_time_minutes,
      cleanup_time_minutes: d.cleanup_time_minutes,
      price_cents: Math.round((d.price_cents ?? 0) * 100),
      member_price_cents: d.member_price_cents != null ? Math.round(d.member_price_cents * 100) : null,
      deposit_required: d.deposit_required,
      deposit_cents: Math.round((d.deposit_cents ?? 0) * 100),
      active: d.active,
      online_booking_enabled: d.online_booking_enabled,
      description: d.description || null,
      tax_category: d.tax_category || null,
      pre_treatment_instructions: d.pre_treatment_instructions || null,
      post_treatment_aftercare: d.post_treatment_aftercare || null,
      treatment_area_tags: d.treatment_area_tags?.length ? d.treatment_area_tags : null,
      dosage_notes: d.dosage_notes || null,
      recommended_interval: d.recommended_interval || null,
      image_url: imageUrl || null,
    };
    const result = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id).eq("clinic_id", clinicId)
      : await supabase.from("services").insert(payload).select("id").single();
    if (result.error) toast.error(result.error.message);
    else {
      // Save location assignments if multi-location
      const serviceId = editing ? editing.id : (result.data as any)?.id;
      if (serviceId && locations.length > 1) {
        await supabase.from("service_locations").delete().eq("service_id", serviceId);
        if (selectedLocations.length > 0) {
          await supabase.from("service_locations").insert(
            selectedLocations.map(lid => ({ service_id: serviceId, location_id: lid }))
          );
        }
      }
      toast.success(editing ? "Service updated" : "Service created");
      if (andAnother) { setForm({ ...defaultForm }); setEditing(null); setImageUrl(null); setSelectedLocations(locations.map(l => l.id)); }
      else setOpen(false);
      load();
    }
    setSaving(false);
  };

  const remove = async (s: Service) => {
    if (!clinicId || !confirm(`Delete "${s.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id).eq("clinic_id", clinicId);
    if (error) toast.error(error.message);
    else { toast.success("Service deleted"); load(); }
  };

  /* ── Bulk actions ────────────────────────────────── */

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(s => s.id)));
  };

  const bulkSetActive = async (active: boolean) => {
    if (!clinicId || selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("services").update({ active }).in("id", ids).eq("clinic_id", clinicId);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} services ${active ? "activated" : "deactivated"}`); setSelected(new Set()); load(); }
  };

  const bulkDelete = async () => {
    if (!clinicId || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} services?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("services").delete().in("id", ids).eq("clinic_id", clinicId);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} services deleted`); setSelected(new Set()); load(); }
  };

  /* ── Import / Export ─────────────────────────────── */

  const exportCSV = () => {
    const header = "name,category,sub_category,duration_minutes,price,member_price,active,deposit_required,deposit,online_booking,dosage_notes,recommended_interval";
    const rows = services.map(s =>
      `"${s.name.replace(/"/g, '""')}","${(s.category ?? '').replace(/"/g, '""')}","${(s.sub_category ?? '').replace(/"/g, '""')}",${s.duration_minutes},${(s.price_cents ?? 0) / 100},${s.member_price_cents != null ? s.member_price_cents / 100 : ''},${s.active},${s.deposit_required},${(s.deposit_cents ?? 0) / 100},${s.online_booking_enabled ?? true},"${(s.dosage_notes ?? '').replace(/"/g, '""')}","${(s.recommended_interval ?? '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "services.csv"; a.click();
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      const parts = line.match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) ?? [];
      if (!parts[0]) continue;
      await supabase.from("services").insert({
        clinic_id: clinicId, name: parts[0], category: parts[1] || null,
        sub_category: parts[2] || null,
        duration_minutes: parseInt(parts[3]) || 60, price_cents: Math.round(parseFloat(parts[4] || "0") * 100),
        active: parts[6] !== "false",
      });
      count++;
    }
    toast.success(`Imported ${count} services`);
    load();
    e.target.value = "";
  };

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleTag = (tag: string) => {
    setForm(prev => {
      const tags = prev.treatment_area_tags ?? [];
      return { ...prev, treatment_area_tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] };
    });
  };

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <HeartPulse className="h-3.5 w-3.5 text-primary" /> Service menu
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Services</h1>
          <p className="max-w-[95vw] sm:max-w-xl text-sm text-muted-foreground">Build your bookable treatment menu — categories, durations, pricing, and clinical details.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1.5 h-3.5 w-3.5" /> Export</Button>
          <label>
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
            <Button variant="outline" size="sm" asChild><span><Upload className="mr-1.5 h-3.5 w-3.5" /> Import</span></Button>
          </label>
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="mr-1.5 h-4 w-4" /> New service
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total" value={stats.total} icon={<HeartPulse className="h-4 w-4" />} />
        <KpiCard label="Active" value={stats.active} icon={<Sparkles className="h-4 w-4" />} />
        <KpiCard label="Categories" value={stats.categories} icon={<Filter className="h-4 w-4" />} />
        <KpiCard label="Avg price" value={formatMoney(stats.avgCents, currency)} icon={<DollarSign className="h-4 w-4" />} />
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-[95vw] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search services…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <FilterChip active={catFilter === "all"} onClick={() => { setCatFilter("all"); setPage(0); }}>All</FilterChip>
          {CATEGORIES.map(c => (
            <FilterChip key={c} active={catFilter === c} onClick={() => { setCatFilter(c); setPage(0); }}>{c}</FilterChip>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-card/30 p-0.5">
          {(["all", "active", "inactive"] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                statusFilter === s ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"
              )}>{s}</button>
          ))}
        </div>
        {locations.length > 1 && (
          <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(0); }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </section>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)}><ToggleRight className="mr-1 h-3.5 w-3.5" /> Activate</Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)}><ToggleLeft className="mr-1 h-3.5 w-3.5" /> Deactivate</Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Table */}
      <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 sm:px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><HeartPulse className="h-6 w-6" /></div>
            <h2 className="font-display text-xl font-semibold">No services yet</h2>
            <p className="mt-1 max-w-[95vw] sm:max-w-sm text-sm text-muted-foreground">Start by loading 60+ pre-built services for medical aesthetics, or add your own.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await seedClinicDefaults();
                    if (result.seeded) {
                      toast.success(`Loaded ${result.summary?.services ?? 60}+ services!`);
                      await load();
                    } else {
                      toast.info(result.message ?? "Already seeded");
                      await load();
                    }
                  } catch (err: any) {
                    toast.error(`Seed failed: ${err.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> Load pre-built services
              </Button>
              <Button variant="outline" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Add custom service
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="p-3 w-10">
                      <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="accent-primary" />
                    </th>
                    <th className="p-3 w-12"></th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Deposit</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.map(s => (
                    <tr key={s.id} className={cn("transition hover:bg-surface/50", !s.active && "opacity-60")}>
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => {
                          const next = new Set(selected);
                          next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                          setSelected(next);
                        }} className="accent-primary" />
                      </td>
                      <td className="p-3">
                        {s.image_url ? (
                          <img src={s.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <button onClick={() => openEdit(s)} className="text-left hover:text-primary transition">
                          <span className="font-medium">{s.name}</span>
                          {s.sub_category && <span className="ml-2 text-xs text-muted-foreground">{s.sub_category}</span>}
                        </button>
                      </td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{s.category || "—"}</Badge></td>
                      <td className="p-3 text-muted-foreground">{s.duration_minutes} min</td>
                      <td className="p-3 font-medium">{formatMoney(s.price_cents ?? 0, currency)}</td>
                      <td className="p-3">{s.deposit_required ? <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{formatMoney(s.deposit_cents ?? 0, currency)}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-3">
                        <Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">{s.active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit"><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => duplicate(s)} aria-label="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(s)} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-border/40">
              {paginated.map(s => (
                <div key={s.id} className={cn("p-4 space-y-2", !s.active && "opacity-60")}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => openEdit(s)} className="font-medium hover:text-primary">{s.name}</button>
                    <Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">{s.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{s.category || "No category"}</span>
                    <span>{s.duration_minutes} min</span>
                    <span className="font-medium text-foreground">{formatMoney(s.price_cents ?? 0, currency)}</span>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicate(s)}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)} className="text-destructive"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                <span className="text-xs text-muted-foreground">Page {safePage + 1} of {totalPages} · {filtered.length} services</span>
                <div className="flex gap-1">
                  <Button aria-label="Action" variant="ghost" size="icon" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button aria-label="Action" variant="ghost" size="icon" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Composer Modal ──────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 pt-[5vh] backdrop-blur-sm">
          <div className="w-full max-w-[95vw] sm:max-w-3xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit service" : "New service"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Define what gets booked, how long it takes, and what it costs.</p>
              </div>
              <Button aria-label="Action" variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-6">
              {/* Basic info */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Service name *" error={errors.name}>
                  <Input value={form.name} onChange={e => updateForm("name", e.target.value)} placeholder="e.g. Botox forehead" maxLength={100} />
                </FormField>
                <FormField label="Category *" error={errors.category}>
                  <select value={form.category} onChange={e => updateForm("category", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Sub-category">
                  <Input value={form.sub_category ?? ""} onChange={e => updateForm("sub_category", e.target.value)} placeholder="e.g. Neuromodulators" />
                </FormField>
              </div>

              {/* Location assignment */}
              {locations.length > 1 && (
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Available at locations</Label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedLocations(locations.map(l => l.id))}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        selectedLocations.length === locations.length ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}>All Locations</button>
                    {locations.map(l => (
                      <button key={l.id} type="button" onClick={() => {
                        setSelectedLocations(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev.filter(x => x !== "all"), l.id]);
                      }}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          selectedLocations.includes(l.id) && selectedLocations.length < locations.length ? "border-primary/60 bg-primary/15 text-primary" : selectedLocations.length === locations.length ? "border-border/40 text-muted-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        )}>{l.name}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration & timing */}
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Duration (min) *" error={errors.duration_minutes}>
                  <Input type="number" min={5} max={480} value={form.duration_minutes} onChange={e => updateForm("duration_minutes", e.target.value)} />
                </FormField>
                <FormField label="Prep time (min)">
                  <Input type="number" min={0} max={120} value={form.prep_time_minutes} onChange={e => updateForm("prep_time_minutes", e.target.value)} />
                </FormField>
                <FormField label="Cleanup time (min)">
                  <Input type="number" min={0} max={120} value={form.cleanup_time_minutes} onChange={e => updateForm("cleanup_time_minutes", e.target.value)} />
                </FormField>
              </div>

              {/* Pricing */}
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label={`Price (${currency}) *`} error={errors.price_cents}>
                  <Input type="number" step="0.01" min={0} value={form.price_cents} onChange={e => updateForm("price_cents", e.target.value)} />
                </FormField>
                <FormField label={`Member price (${currency})`}>
                  <Input type="number" step="0.01" min={0} value={form.member_price_cents ?? ""} onChange={e => updateForm("member_price_cents", e.target.value ? Number(e.target.value) : null)} placeholder="Optional" />
                </FormField>
                <FormField label="Tax category">
                  <Input value={form.tax_category ?? ""} onChange={e => updateForm("tax_category", e.target.value)} placeholder="e.g. Medical" />
                </FormField>
              </div>

              {/* Deposit */}
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 pt-6">
                  <input type="checkbox" checked={form.deposit_required} onChange={e => updateForm("deposit_required", e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">Require deposit</span>
                </label>
                {form.deposit_required && (
                  <FormField label={`Deposit amount (${currency})`}>
                    <Input type="number" step="0.01" min={0} value={form.deposit_cents} onChange={e => updateForm("deposit_cents", e.target.value)} />
                  </FormField>
                )}
              </div>

              {/* Description */}
              <FormField label="Description">
                <textarea value={form.description ?? ""} onChange={e => updateForm("description", e.target.value)}
                  rows={3} maxLength={2000} placeholder="Describe this service for clients…"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </FormField>

              {/* Service photo */}
              {clinicId && (
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Service photo</Label>
                  <PhotoUpload
                    bucket="service-images"
                    currentUrl={imageUrl}
                    onUploaded={setImageUrl}
                    onRemoved={() => setImageUrl(null)}
                    shape="square"
                    size={96}
                    clinicId={clinicId}
                    hint="Upload service image (recommended 800×600)"
                  />
                </div>
              )}

              {/* Clinical details */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Pre-treatment instructions">
                  <textarea value={form.pre_treatment_instructions ?? ""} onChange={e => updateForm("pre_treatment_instructions", e.target.value)}
                    rows={2} maxLength={2000} placeholder="e.g. Avoid blood thinners 7 days prior…"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </FormField>
                <FormField label="Post-treatment aftercare">
                  <textarea value={form.post_treatment_aftercare ?? ""} onChange={e => updateForm("post_treatment_aftercare", e.target.value)}
                    rows={2} maxLength={2000} placeholder="e.g. No exercise for 24 hours…"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Standard dosage notes">
                  <Input value={form.dosage_notes ?? ""} onChange={e => updateForm("dosage_notes", e.target.value)} placeholder="e.g. Botox 25-50 units" maxLength={500} />
                </FormField>
                <FormField label="Recommended interval">
                  <Input value={form.recommended_interval ?? ""} onChange={e => updateForm("recommended_interval", e.target.value)} placeholder="e.g. Every 3 months" maxLength={200} />
                </FormField>
              </div>

              {/* Treatment area tags */}
              <FormField label="Treatment areas">
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_AREAS.map(area => (
                    <button key={area} type="button" onClick={() => toggleTag(area)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        (form.treatment_area_tags ?? []).includes(area)
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}>{area}</button>
                  ))}
                </div>
              </FormField>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.active} onChange={e => updateForm("active", e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">Active & bookable</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.online_booking_enabled} onChange={e => updateForm("online_booking_enabled", e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">Online booking</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button variant="ghost" onClick={() => { remove(editing); setOpen(false); }} className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                {!editing && (
                  <Button variant="outline" disabled={saving} onClick={() => submit(true)}>Save & add another</Button>
                )}
                <Button disabled={saving} onClick={() => submit(false)} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create service"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared components ────────────────────────────────── */

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
      active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
    )}>{children}</button>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
