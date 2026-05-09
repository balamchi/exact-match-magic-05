import { useEffect, useMemo, useState, FormEvent, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  MapPin, Plus, Search, Building2, Globe2, Phone, Mail,
  Edit3, Trash2, X, Power, PowerOff, Navigation, Clock, Star, StarOff,
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

export const Route = createFileRoute("/app/locations")({ component: LocationsPage });

/* ── Types ────────────────────────────────────────────── */

interface LocationRow {
  id: string;
  clinic_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  active: boolean;
  is_primary: boolean;
  tax_rate: number;
  tax_label: string;
  notes: string | null;
  image_url: string | null;
  operating_hours: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

const COUNTRY_PRESETS = [
  { code: "CA", label: "Canada", tz: "America/Toronto", taxRate: 0.13, taxLabel: "HST" },
  { code: "US", label: "United States", tz: "America/New_York", taxRate: 0.08, taxLabel: "Sales Tax" },
  { code: "GB", label: "United Kingdom", tz: "Europe/London", taxRate: 0.20, taxLabel: "VAT" },
  { code: "AU", label: "Australia", tz: "Australia/Sydney", taxRate: 0.10, taxLabel: "GST" },
  { code: "AE", label: "UAE", tz: "Asia/Dubai", taxRate: 0.05, taxLabel: "VAT" },
];

const TIMEZONE_OPTIONS = [
  "America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  address_line1: z.string().trim().min(1, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(120),
  region: z.string().trim().min(1, "State/Province is required").max(120),
  postal_code: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(80),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().email().or(z.literal("")).optional(),
  tax_rate: z.coerce.number().min(0).max(0.30, "Max 30%"),
  tax_label: z.string().trim().max(40),
  notes: z.string().max(1000).optional(),
  active: z.boolean(),
  is_primary: z.boolean(),
});

type FormState = z.infer<typeof locationSchema>;

const defaultOperatingHours = () => {
  const result: Record<string, { enabled: boolean; start: string; end: string }> = {};
  for (const day of DAYS) {
    result[day] = { enabled: day !== "sunday", start: "09:00", end: "17:00" };
  }
  return result;
};

const formatAddress = (loc: LocationRow) => {
  const parts = [loc.address_line1, loc.city, loc.region, loc.postal_code].filter(Boolean);
  return parts.length ? parts.join(", ") : "No address on file";
};

const mapsUrl = (loc: LocationRow) => {
  const q = [loc.name, loc.address_line1, loc.city, loc.region, loc.postal_code, loc.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

/* ── Page ─────────────────────────────────────────────── */

function LocationsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;

  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "", address_line1: "", city: "", region: "", postal_code: "", country: "CA",
    timezone: "America/Toronto", phone: "", email: "", tax_rate: 0.13, tax_label: "HST",
    notes: "", active: true, is_primary: false,
  });
  const [operatingHours, setOperatingHours] = useState(defaultOperatingHours);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase.from("locations").select("*").eq("clinic_id", clinicId).order("created_at");
    if (error) toast.error("Failed to load locations");
    else setRows((data ?? []) as LocationRow[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase.channel(`locations-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "locations", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.name, r.city, r.region, r.country, r.phone, r.address_line1].filter(Boolean).some(v => (v as string).toLowerCase().includes(q)));
  }, [rows, search]);

  const metrics = useMemo(() => ({
    active: rows.filter(r => r.active).length,
    cities: new Set(rows.map(r => r.city).filter(Boolean)).size,
    countries: new Set(rows.map(r => r.country).filter(Boolean)).size,
    timezones: new Set(rows.map(r => r.timezone).filter(Boolean)).size,
  }), [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", address_line1: "", city: "", region: "", postal_code: "", country: "CA", timezone: "America/Toronto", phone: "", email: "", tax_rate: 0.13, tax_label: "HST", notes: "", active: true, is_primary: rows.length === 0 });
    setOperatingHours(defaultOperatingHours());
    setErrors({});
    setComposerOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditing(loc);
    setForm({
      name: loc.name, address_line1: loc.address_line1 ?? "", city: loc.city ?? "",
      region: loc.region ?? "", postal_code: loc.postal_code ?? "", country: loc.country ?? "",
      timezone: loc.timezone ?? "", phone: loc.phone ?? "", email: loc.email ?? "",
      tax_rate: loc.tax_rate ?? 0.13, tax_label: loc.tax_label ?? "Tax",
      notes: loc.notes ?? "", active: loc.active, is_primary: loc.is_primary,
    });
    setOperatingHours(loc.operating_hours && Object.keys(loc.operating_hours).length ? loc.operating_hours as any : defaultOperatingHours());
    setErrors({});
    setComposerOpen(true);
  };

  const closeComposer = () => { setComposerOpen(false); setEditing(null); setErrors({}); };

  const applyCountryPreset = (code: string) => {
    const preset = COUNTRY_PRESETS.find(p => p.code === code);
    if (preset) setForm(prev => ({ ...prev, country: preset.code, timezone: preset.tz, tax_rate: preset.taxRate, tax_label: preset.taxLabel }));
    else setForm(prev => ({ ...prev, country: code }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    const parsed = locationSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach(i => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setErrors({});
    setSubmitting(true);

    const d = parsed.data;
    const payload = {
      name: d.name, address_line1: d.address_line1 || null, city: d.city || null,
      region: d.region || null, postal_code: d.postal_code || null, country: d.country || null,
      timezone: d.timezone || null, phone: d.phone || null, email: d.email || null,
      tax_rate: d.tax_rate, tax_label: d.tax_label, notes: d.notes || null,
      active: d.active, is_primary: d.is_primary, operating_hours: operatingHours,
    };

    // If setting as primary, unset others first
    if (d.is_primary) {
      await supabase.from("locations").update({ is_primary: false }).eq("clinic_id", clinicId).neq("id", editing?.id ?? "00000000-0000-0000-0000-000000000000");
    }

    if (editing) {
      const { error } = await supabase.from("locations").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Location updated"); await load(); closeComposer(); }
    } else {
      const { error } = await supabase.from("locations").insert({ ...payload, clinic_id: clinicId });
      if (error) toast.error(error.message);
      else { toast.success("Location added successfully"); await load(); closeComposer(); }
    }
    setSubmitting(false);
  };

  const toggleActive = async (loc: LocationRow) => {
    const { error } = await supabase.from("locations").update({ active: !loc.active }).eq("id", loc.id);
    if (error) toast.error(error.message);
    else toast.success(loc.active ? "Location deactivated" : "Location activated");
  };

  const setPrimary = async (loc: LocationRow) => {
    if (!clinicId) return;
    await supabase.from("locations").update({ is_primary: false }).eq("clinic_id", clinicId);
    const { error } = await supabase.from("locations").update({ is_primary: true }).eq("id", loc.id);
    if (error) toast.error(error.message);
    else toast.success(`${loc.name} is now primary`);
  };

  const handleDelete = async (loc: LocationRow) => {
    if (!confirm(`Remove ${loc.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("locations").delete().eq("id", loc.id);
    if (error) toast.error(error.message);
    else toast.success("Location removed");
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Multi-site network
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Locations</h1>
          <p className="max-w-[95vw] sm:max-w-2xl text-sm text-muted-foreground">Manage clinic sites — addresses, timezones, tax rates, and operating hours.</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" /> Add location
        </Button>
      </header>

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active locations" value={metrics.active} icon={<MapPin className="h-4 w-4" />} accent="from-violet-500/20" />
        <MetricCard label="Cities covered" value={metrics.cities} icon={<Building2 className="h-4 w-4" />} accent="from-sky-500/20" />
        <MetricCard label="Countries" value={metrics.countries} icon={<Globe2 className="h-4 w-4" />} accent="from-emerald-500/20" />
        <MetricCard label="Timezones" value={metrics.timezones} icon={<Clock className="h-4 w-4" />} accent="from-amber-500/20" />
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, city, region…" className="pl-9" />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 p-12 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">No locations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your first clinic site to start routing bookings, staff, and reporting.</p>
          <Button onClick={openCreate} className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Add location</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(loc => (
            <article key={loc.id} className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition hover:border-primary/40 hover:shadow-glow", !loc.active && "opacity-60")}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{loc.name}</h3>
                        {loc.is_primary && <Badge className="bg-amber-500/20 text-amber-300 text-[10px]"><Star className="mr-0.5 h-2.5 w-2.5" /> Primary</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {loc.country || "—"}{loc.timezone ? ` · ${loc.timezone.split("/").pop()?.replace(/_/g, " ")}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={loc.active ? "default" : "secondary"} className="shrink-0">{loc.active ? "Active" : "Paused"}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <p className="text-muted-foreground">{formatAddress(loc)}</p>
                  <div className="flex flex-wrap gap-3">
                    {loc.phone && <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-primary"><Phone className="h-3 w-3" />{loc.phone}</a>}
                    {loc.email && <a href={`mailto:${loc.email}`} className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-primary"><Mail className="h-3 w-3" />{loc.email}</a>}
                  </div>
                  <p className="text-xs text-muted-foreground">Tax: {loc.tax_label} ({(loc.tax_rate * 100).toFixed(1)}%)</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={mapsUrl(loc)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary"><Navigation className="h-3.5 w-3.5" /> Maps</a>
                  <button onClick={() => openEdit(loc)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                  {!loc.is_primary && <button onClick={() => setPrimary(loc)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary"><Star className="h-3.5 w-3.5" /> Set primary</button>}
                  <button onClick={() => toggleActive(loc)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary">
                    {loc.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}{loc.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(loc)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {rows.length === 1 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">Running multiple sites? <button onClick={openCreate} className="font-medium text-primary hover:underline">Add a second location</button> to unlock multi-site reporting.</p>
        </div>
      )}

      {/* ── Composer Modal ──────────────────────────── */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 pt-[3vh] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-[95vw] sm:max-w-3xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit location" : "Add a location"}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{editing ? "Update site details and operating info." : "Bring a new clinic site online."}</p>
              </div>
              <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={closeComposer}><X className="h-4 w-4" /></Button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-6">
              {/* Country preset */}
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country preset</Label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_PRESETS.map(p => (
                    <button key={p.code} type="button" onClick={() => applyCountryPreset(p.code)}
                      className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                        form.country === p.code ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                      )}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <FormField label="Location name *" error={errors.name}>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Yorkville Flagship" maxLength={160} />
              </FormField>

              {/* Address */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Address line 1 *" error={errors.address_line1}>
                  <Input value={form.address_line1} onChange={e => setForm(prev => ({ ...prev, address_line1: e.target.value }))} placeholder="123 Beauty Lane" />
                </FormField>
                <FormField label="City *" error={errors.city}>
                  <Input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} placeholder="Toronto" />
                </FormField>
                <FormField label="State / Province *" error={errors.region}>
                  <Input value={form.region} onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))} placeholder="Ontario" />
                </FormField>
                <FormField label="Postal / ZIP code *" error={errors.postal_code}>
                  <Input value={form.postal_code} onChange={e => setForm(prev => ({ ...prev, postal_code: e.target.value }))} placeholder="M5V 2H1" />
                </FormField>
              </div>

              {/* Timezone */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Country *" error={errors.country}>
                  <Input value={form.country} onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))} placeholder="CA" />
                </FormField>
                <FormField label="Timezone *" error={errors.timezone}>
                  <select value={form.timezone} onChange={e => setForm(prev => ({ ...prev, timezone: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Contact */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Phone">
                  <Input value={form.phone ?? ""} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1 (416) 555-0000" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={form.email ?? ""} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="toronto@clinic.com" />
                </FormField>
              </div>

              {/* Tax */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Tax rate (%)" error={errors.tax_rate}>
                  <Input type="number" step="0.1" min={0} max={30} value={(form.tax_rate * 100).toFixed(1)} onChange={e => setForm(prev => ({ ...prev, tax_rate: (parseFloat(e.target.value) || 0) / 100 }))} />
                </FormField>
                <FormField label="Tax label">
                  <Input value={form.tax_label} onChange={e => setForm(prev => ({ ...prev, tax_label: e.target.value }))} placeholder="HST" />
                </FormField>
              </div>

              {/* Operating hours */}
              <div>
                <Label className="mb-2 block text-xs font-medium text-muted-foreground">Operating hours</Label>
                <div className="space-y-2">
                  {DAYS.map(day => {
                    const d = operatingHours[day] ?? { enabled: false, start: "09:00", end: "17:00" };
                    return (
                      <div key={day} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", d.enabled ? "border-border/60" : "border-border/30 opacity-50")}>
                        <label className="flex items-center gap-2 w-28">
                          <input type="checkbox" checked={d.enabled} onChange={e => setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))} className="accent-primary" />
                          <span className="text-xs font-medium capitalize">{day}</span>
                        </label>
                        {d.enabled && (
                          <div className="flex items-center gap-2">
                            <Input type="time" value={d.start} onChange={e => setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))} className="h-8 w-28 text-xs" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="time" value={d.end} onChange={e => setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))} className="h-8 w-28 text-xs" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <FormField label="Internal notes">
                <textarea value={form.notes ?? ""} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} maxLength={1000} placeholder="Staff parking, entry codes, special instructions…"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </FormField>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">Active location</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_primary} onChange={e => setForm(prev => ({ ...prev, is_primary: e.target.checked }))} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">Primary location</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button type="button" variant="ghost" onClick={() => { handleDelete(editing); closeComposer(); }} className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={closeComposer}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {submitting ? "Saving…" : editing ? "Save changes" : "Add location"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function MetricCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br to-transparent p-4", accent)}>
      <div className="flex items-start justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
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
