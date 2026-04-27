import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Syringe,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/injection-mapping")({ component: InjectionMappingPage });

type Site = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  product: string;
  region: string;
  units: number;
  visit_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RegionPoint = { key: string; label: string; x: number; y: number };

const FACE_REGIONS: RegionPoint[] = [
  { key: "Forehead", label: "Forehead", x: 50, y: 18 },
  { key: "Glabella", label: "Glabella", x: 50, y: 28 },
  { key: "Brow", label: "Brow lift", x: 32, y: 26 },
  { key: "Crows feet (R)", label: "Crow's feet R", x: 22, y: 36 },
  { key: "Crows feet (L)", label: "Crow's feet L", x: 78, y: 36 },
  { key: "Temple (R)", label: "Temple R", x: 14, y: 30 },
  { key: "Temple (L)", label: "Temple L", x: 86, y: 30 },
  { key: "Cheek (R)", label: "Cheek R", x: 28, y: 50 },
  { key: "Cheek (L)", label: "Cheek L", x: 72, y: 50 },
  { key: "Tear trough (R)", label: "Tear trough R", x: 36, y: 42 },
  { key: "Tear trough (L)", label: "Tear trough L", x: 64, y: 42 },
  { key: "Nose", label: "Nose", x: 50, y: 50 },
  { key: "Nasolabial fold (R)", label: "NLF R", x: 38, y: 60 },
  { key: "Nasolabial fold (L)", label: "NLF L", x: 62, y: 60 },
  { key: "Lips", label: "Lips", x: 50, y: 68 },
  { key: "Marionette (R)", label: "Marionette R", x: 38, y: 76 },
  { key: "Marionette (L)", label: "Marionette L", x: 62, y: 76 },
  { key: "Chin", label: "Chin", x: 50, y: 82 },
  { key: "Jawline (R)", label: "Jawline R", x: 24, y: 76 },
  { key: "Jawline (L)", label: "Jawline L", x: 76, y: 76 },
  { key: "Masseter (R)", label: "Masseter R", x: 18, y: 64 },
  { key: "Masseter (L)", label: "Masseter L", x: 82, y: 64 },
];

const PRODUCT_PRESETS = ["Botox", "Dysport", "Xeomin", "Juvederm", "Restylane", "Sculptra", "Radiesse", "Belotero"];

const siteSchema = z.object({
  client_name: z.string().trim().min(1, "Client name required").max(160),
  product: z.string().trim().min(1, "Product required").max(120),
  region: z.string().trim().min(1, "Region required").max(120),
  units: z.number().min(0),
  visit_date: z.string().min(1),
  notes: z.string().trim().max(1000).optional().nullable(),
});

type Draft = {
  client_name: string;
  product: string;
  region: string;
  units: string;
  visit_date: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({
  client_name: "",
  product: "Botox",
  region: "",
  units: "",
  visit_date: today(),
  notes: "",
});

function InjectionMappingPage() {
  const { activeClinic } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("injection_sites")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("visit_date", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) toast.error("Could not load injection records");
    setSites((data ?? []) as Site[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!activeClinic) return;
    const ch = supabase
      .channel(`injection-sites-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "injection_sites", filter: `clinic_id=eq.${activeClinic.clinic_id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const stats = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400 * 1000;
    const last30 = sites.filter((s) => new Date(s.visit_date).getTime() >= cutoff);
    const units30 = last30.reduce((sum, s) => sum + Number(s.units ?? 0), 0);
    const products = new Set(sites.map((s) => s.product)).size;
    const clients = new Set(sites.map((s) => s.client_name)).size;
    return { totalRecords: sites.length, units30, products, clients };
  }, [sites]);

  const clients = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sites) {
      map.set(s.client_name, (map.get(s.client_name) ?? 0) + Number(s.units ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units);
  }, [sites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      if (clientFilter && s.client_name !== clientFilter) return false;
      if (!q) return true;
      return [s.client_name, s.product, s.region, s.notes].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [sites, query, clientFilter]);

  // Aggregate units per region for the heat map (filtered scope)
  const regionTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filtered) {
      const key = s.region.trim();
      map.set(key, (map.get(key) ?? 0) + Number(s.units ?? 0));
    }
    return map;
  }, [filtered]);

  const maxRegionUnits = Math.max(1, ...Array.from(regionTotals.values()));

  const openCreate = (preset?: { region?: string; client?: string }) => {
    setEditing(null);
    setDraft({ ...emptyDraft(), region: preset?.region ?? "", client_name: preset?.client ?? "" });
    setOpen(true);
  };

  const openEdit = (s: Site) => {
    setEditing(s);
    setDraft({
      client_name: s.client_name,
      product: s.product,
      region: s.region,
      units: String(s.units ?? ""),
      visit_date: s.visit_date.slice(0, 10),
      notes: s.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = siteSchema.safeParse({
      client_name: draft.client_name,
      product: draft.product,
      region: draft.region,
      units: parseFloat(draft.units) || 0,
      visit_date: draft.visit_date,
      notes: draft.notes || null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const payload = { clinic_id: activeClinic.clinic_id, ...parsed.data };
    const res = editing
      ? await supabase
          .from("injection_sites")
          .update(payload)
          .eq("id", editing.id)
          .eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("injection_sites").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Record updated" : "Injection logged");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase
      .from("injection_sites")
      .delete()
      .eq("id", editing.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Record deleted");
      setOpen(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical mapping</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Injection Mapping</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Visual face-map of every neuromodulator and dermal filler dose — by client, region, and visit.
          </p>
        </div>
        <Button
          onClick={() => openCreate()}
          className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Log injection
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Total records" value={stats.totalRecords.toString()} icon={<Activity className="h-4 w-4" />} />
        <Metric
          label="Units (30 days)"
          value={stats.units30.toString()}
          sub="All products combined"
          icon={<TrendingUp className="h-4 w-4" />}
          accent
        />
        <Metric label="Products in use" value={stats.products.toString()} icon={<Syringe className="h-4 w-4" />} />
        <Metric label="Unique clients" value={stats.clients.toString()} icon={<User className="h-4 w-4" />} />
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading records…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          {/* Face map */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" /> Anatomical heat map
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Click a region to log a new injection there. Bigger / brighter = more units.
                </p>
              </div>
              {clientFilter && (
                <button
                  onClick={() => setClientFilter(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  <User className="h-3 w-3" /> {clientFilter}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="relative mx-auto aspect-[3/4] w-full max-w-md rounded-2xl border border-border bg-gradient-to-b from-surface to-card">
              {/* Stylized face outline */}
              <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <radialGradient id="faceFill" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.06)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.01)" />
                  </radialGradient>
                </defs>
                {/* Face oval */}
                <ellipse cx="50" cy="55" rx="32" ry="42" fill="url(#faceFill)" stroke="hsl(var(--border))" strokeWidth="0.6" />
                {/* Brows */}
                <path d="M28 36 Q34 32 42 35" stroke="hsl(var(--border))" strokeWidth="0.5" fill="none" />
                <path d="M58 35 Q66 32 72 36" stroke="hsl(var(--border))" strokeWidth="0.5" fill="none" />
                {/* Eyes */}
                <ellipse cx="36" cy="42" rx="3" ry="1.4" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
                <ellipse cx="64" cy="42" rx="3" ry="1.4" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
                {/* Nose */}
                <path d="M50 44 Q48 56 50 62 Q52 56 50 44" stroke="hsl(var(--border))" strokeWidth="0.4" fill="none" />
                {/* Lips */}
                <path d="M42 70 Q50 73 58 70 Q50 76 42 70" stroke="hsl(var(--border))" strokeWidth="0.5" fill="none" />
                {/* Jaw */}
                <path d="M22 70 Q50 100 78 70" stroke="hsl(var(--border))" strokeWidth="0.4" fill="none" opacity="0.6" />
              </svg>

              {/* Region markers */}
              {FACE_REGIONS.map((r) => {
                const units = regionTotals.get(r.key) ?? 0;
                const ratio = units / maxRegionUnits;
                const size = 14 + Math.min(28, ratio * 28); // 14–42px
                const opacity = units > 0 ? 0.4 + ratio * 0.6 : 0.15;
                return (
                  <button
                    key={r.key}
                    onClick={() => openCreate({ region: r.key, client: clientFilter ?? "" })}
                    title={`${r.label}${units ? ` — ${units} units` : ""}`}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-110 focus:outline-none"
                    style={{ left: `${r.x}%`, top: `${r.y}%`, width: size, height: size }}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full border transition",
                        units > 0
                          ? "border-primary/60 bg-primary shadow-glow"
                          : "border-border bg-surface group-hover:border-primary/40"
                      )}
                      style={{ opacity }}
                    />
                    {units > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                        {units}
                      </span>
                    )}
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-foreground shadow-elevated group-hover:block">
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Top clients chips */}
            {clients.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Filter by client</div>
                <div className="flex flex-wrap gap-1.5">
                  {clients.slice(0, 12).map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setClientFilter(clientFilter === c.name ? null : c.name)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                        clientFilter === c.name
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {c.name}
                      <span className="rounded-full bg-background/60 px-1.5 text-[10px]">{c.units}u</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History list */}
          <aside className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client, product, region…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {sites.length === 0 ? "No injections logged yet." : "Nothing matches your filters."}
                </div>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{s.client_name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Syringe className="h-3 w-3" /> {s.product}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {s.region}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(s.visit_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {s.units}u
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit record" : "Log injection"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture product, anatomical region, and dose.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="client_name">Client</Label>
                  <Input
                    id="client_name"
                    value={draft.client_name}
                    onChange={(e) => setDraft({ ...draft, client_name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="visit_date">Visit date</Label>
                  <Input
                    id="visit_date"
                    type="date"
                    value={draft.visit_date}
                    onChange={(e) => setDraft({ ...draft, visit_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Product</Label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PRODUCT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDraft({ ...draft, product: p })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        draft.product === p
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Input
                  value={draft.product}
                  onChange={(e) => setDraft({ ...draft, product: e.target.value })}
                  placeholder="Or type a custom product"
                  required
                />
              </div>

              <div>
                <Label>Region</Label>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Pick from common regions or type your own
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {FACE_REGIONS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setDraft({ ...draft, region: r.key })}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] transition",
                        draft.region === r.key
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <Input
                  value={draft.region}
                  onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                  placeholder="e.g. Glabella"
                  required
                />
              </div>

              <div>
                <Label htmlFor="units">Units / volume</Label>
                <Input
                  id="units"
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.units}
                  onChange={(e) => setDraft({ ...draft, units: e.target.value })}
                  placeholder="e.g. 20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Lot #, technique, dilution, observations…"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={remove}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={saving}
                  className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {saving ? "Saving…" : editing ? (<><Edit3 className="h-3.5 w-3.5" /> Save changes</>) : (<><Plus className="h-3.5 w-3.5" /> Log injection</>)}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent ? "bg-emerald-500/15 text-emerald-300" : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}
