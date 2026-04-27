import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  MapPin,
  Plus,
  Search,
  Building2,
  Globe2,
  Phone,
  Edit3,
  Trash2,
  X,
  Power,
  PowerOff,
  Navigation,
  Clock,
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

export const Route = createFileRoute("/app/locations")({
  component: LocationsPage,
});

type LocationRow = {
  id: string;
  clinic_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  timezone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const COUNTRY_PRESETS = [
  { code: "CA", label: "Canada", tz: "America/Toronto" },
  { code: "US", label: "United States", tz: "America/New_York" },
  { code: "GB", label: "United Kingdom", tz: "Europe/London" },
  { code: "AU", label: "Australia", tz: "Australia/Sydney" },
  { code: "AE", label: "UAE", tz: "Asia/Dubai" },
];

const TIMEZONE_OPTIONS = [
  "America/Toronto",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const locationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(160),
  address_line1: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  timezone: z.string().trim().max(80).optional().or(z.literal("")),
  active: z.boolean(),
});

type LocationFormState = {
  name: string;
  address_line1: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  phone: string;
  timezone: string;
  active: boolean;
};

const emptyForm: LocationFormState = {
  name: "",
  address_line1: "",
  city: "",
  region: "",
  postal_code: "",
  country: "CA",
  phone: "",
  timezone: "America/Toronto",
  active: true,
};

const formatAddress = (loc: LocationRow) => {
  const parts = [loc.address_line1, loc.city, loc.region, loc.postal_code].filter(Boolean);
  return parts.length ? parts.join(", ") : "No address on file";
};

const mapsUrl = (loc: LocationRow) => {
  const q = [loc.name, loc.address_line1, loc.city, loc.region, loc.postal_code, loc.country]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

function LocationsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });
      if (!isMounted) return;
      if (error) {
        toast.error("Failed to load locations", { description: error.message });
      } else {
        setRows((data ?? []) as LocationRow[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`locations-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations", filter: `clinic_id=eq.${clinicId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.city, r.region, r.country, r.phone, r.address_line1]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const cities = new Set(rows.map((r) => r.city).filter(Boolean)).size;
    const countries = new Set(rows.map((r) => r.country).filter(Boolean)).size;
    const timezones = new Set(rows.map((r) => r.timezone).filter(Boolean)).size;
    return { active, cities, countries, timezones };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setComposerOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      address_line1: loc.address_line1 ?? "",
      city: loc.city ?? "",
      region: loc.region ?? "",
      postal_code: loc.postal_code ?? "",
      country: loc.country ?? "",
      phone: loc.phone ?? "",
      timezone: loc.timezone ?? "",
      active: loc.active,
    });
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const applyCountryPreset = (code: string) => {
    const preset = COUNTRY_PRESETS.find((p) => p.code === code);
    if (preset) {
      setForm((prev) => ({ ...prev, country: preset.code, timezone: preset.tz }));
    } else {
      setForm((prev) => ({ ...prev, country: code }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const parsed = locationSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: parsed.data.name,
      address_line1: parsed.data.address_line1 || null,
      city: parsed.data.city || null,
      region: parsed.data.region || null,
      postal_code: parsed.data.postal_code || null,
      country: parsed.data.country || null,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone || null,
      active: parsed.data.active,
    };

    if (editing) {
      const { error } = await supabase.from("locations").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Failed to update location", { description: error.message });
      } else {
        toast.success("Location updated");
        closeComposer();
      }
    } else {
      const { error } = await supabase.from("locations").insert({ ...payload, clinic_id: clinicId });
      if (error) {
        toast.error("Failed to create location", { description: error.message });
      } else {
        toast.success("Location added");
        closeComposer();
      }
    }
    setSubmitting(false);
  };

  const toggleActive = async (loc: LocationRow) => {
    const { error } = await supabase.from("locations").update({ active: !loc.active }).eq("id", loc.id);
    if (error) {
      toast.error("Failed to update", { description: error.message });
    } else {
      toast.success(loc.active ? "Location deactivated" : "Location activated");
    }
  };

  const handleDelete = async (loc: LocationRow) => {
    if (!confirm(`Remove ${loc.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("locations").delete().eq("id", loc.id);
    if (error) {
      toast.error("Failed to delete", { description: error.message });
    } else {
      toast.success("Location removed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Building2 className="h-3.5 w-3.5" />
            Multi-site network
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Locations</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Run every clinic from one cockpit. Track addresses, timezones, and contact lines so bookings, staff, and
            reporting roll up cleanly across sites.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Add location
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Active locations" value={metrics.active.toString()} icon={MapPin} accent="from-violet-500/20 to-indigo-500/10" />
        <MetricCard label="Cities covered" value={metrics.cities.toString()} icon={Building2} accent="from-sky-500/20 to-cyan-500/10" />
        <MetricCard label="Countries" value={metrics.countries.toString()} icon={Globe2} accent="from-emerald-500/20 to-teal-500/10" />
        <MetricCard label="Timezones" value={metrics.timezones.toString()} icon={Clock} accent="from-amber-500/20 to-orange-500/10" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, region, phone…"
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
          Loading locations…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No locations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first clinic site to start routing bookings, staff, and reporting.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((loc) => (
            <article
              key={loc.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition",
                "hover:border-primary/40 hover:shadow-glow",
                !loc.active && "opacity-60",
              )}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{loc.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {loc.country || "—"}
                        {loc.timezone ? ` · ${loc.timezone.split("/").pop()?.replace(/_/g, " ")}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={loc.active ? "default" : "secondary"} className="shrink-0">
                    {loc.active ? "Active" : "Paused"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{formatAddress(loc)}</p>
                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone}`}
                      className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {loc.phone}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={mapsUrl(loc)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Open in maps
                  </a>
                  <button
                    onClick={() => openEdit(loc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(loc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                  >
                    {loc.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    {loc.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(loc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Composer */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/60 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{editing ? "Edit location" : "Add a location"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing ? "Update site details and operating info." : "Bring a new clinic site online in seconds."}
                </p>
              </div>
              <button
                onClick={closeComposer}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              <div className="space-y-2">
                <Label>Country preset</Label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_PRESETS.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => applyCountryPreset(p.code)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                        form.country === p.code
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Location name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Yorkville Flagship"
                  maxLength={160}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  value={form.address_line1}
                  onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                  placeholder="123 Bloor St W"
                  maxLength={200}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Toronto"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="ON"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal code</Label>
                  <Input
                    id="postal"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="M5R 1A1"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(416) 555-0142"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Active location</div>
                  <div className="text-xs text-muted-foreground">
                    Inactive sites are hidden from booking and staff assignment.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={closeComposer}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editing ? "Save changes" : "Add location"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl", accent)} />
      <div className="relative space-y-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
          <Icon className="h-4.5 w-4.5 text-foreground/80" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
