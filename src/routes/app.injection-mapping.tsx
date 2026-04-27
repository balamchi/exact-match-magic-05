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
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
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

type ViewKey = "front" | "left" | "right" | "body";

type RegionPoint = {
  key: string; // canonical region label stored in DB
  label: string; // display label
  view: ViewKey;
  x: number; // 0-100 percent
  y: number;
};

const REGIONS: RegionPoint[] = [
  // FRONT view
  { key: "Forehead L", label: "Forehead L", view: "front", x: 42, y: 22 },
  { key: "Forehead R", label: "Forehead R", view: "front", x: 58, y: 22 },
  { key: "Glabella", label: "Glabella", view: "front", x: 50, y: 30 },
  { key: "Brow L", label: "Brow L", view: "front", x: 36, y: 32 },
  { key: "Brow R", label: "Brow R", view: "front", x: 64, y: 32 },
  { key: "Tear trough L", label: "Tear trough L", view: "front", x: 38, y: 46 },
  { key: "Tear trough R", label: "Tear trough R", view: "front", x: 62, y: 46 },
  { key: "Cheek L", label: "Cheek L", view: "front", x: 32, y: 54 },
  { key: "Cheek R", label: "Cheek R", view: "front", x: 68, y: 54 },
  { key: "Nasolabial L", label: "NLF L", view: "front", x: 40, y: 62 },
  { key: "Nasolabial R", label: "NLF R", view: "front", x: 60, y: 62 },
  { key: "Lip top", label: "Upper lip", view: "front", x: 50, y: 70 },
  { key: "Lip bottom", label: "Lower lip", view: "front", x: 50, y: 75 },
  { key: "Marionette L", label: "Marionette L", view: "front", x: 40, y: 80 },
  { key: "Marionette R", label: "Marionette R", view: "front", x: 60, y: 80 },
  { key: "Chin", label: "Chin", view: "front", x: 50, y: 86 },

  // LEFT profile
  { key: "Temple L", label: "Temple", view: "left", x: 42, y: 30 },
  { key: "Cheek L (profile)", label: "Cheek", view: "left", x: 50, y: 52 },
  { key: "Pre-jowl L", label: "Pre-jowl", view: "left", x: 56, y: 72 },
  { key: "Jawline L", label: "Jawline", view: "left", x: 50, y: 78 },
  { key: "Masseter L", label: "Masseter", view: "left", x: 38, y: 64 },

  // RIGHT profile
  { key: "Temple R", label: "Temple", view: "right", x: 58, y: 30 },
  { key: "Cheek R (profile)", label: "Cheek", view: "right", x: 50, y: 52 },
  { key: "Pre-jowl R", label: "Pre-jowl", view: "right", x: 44, y: 72 },
  { key: "Jawline R", label: "Jawline", view: "right", x: 50, y: 78 },
  { key: "Masseter R", label: "Masseter", view: "right", x: 62, y: 64 },

  // BODY
  { key: "Neck", label: "Neck", view: "body", x: 50, y: 18 },
  { key: "Décolletage", label: "Décolletage", view: "body", x: 50, y: 32 },
  { key: "Shoulder L", label: "Shoulder L", view: "body", x: 32, y: 32 },
  { key: "Shoulder R", label: "Shoulder R", view: "body", x: 68, y: 32 },
  { key: "Hand L", label: "Hand L", view: "body", x: 22, y: 70 },
  { key: "Hand R", label: "Hand R", view: "body", x: 78, y: 70 },
];

const PRODUCT_PRESETS = ["Botox", "Dysport", "Xeomin", "Juvederm", "Restylane", "Sculptra", "Radiesse", "Belotero"];

// Color a region by the product family (for the dot tint).
const productTone = (product: string): { bg: string; ring: string; text: string } => {
  const p = product.toLowerCase();
  if (["botox", "dysport", "xeomin"].some((x) => p.includes(x))) {
    return { bg: "bg-violet-500", ring: "shadow-[0_0_24px_4px_hsl(270_85%_60%/0.55)]", text: "text-white" };
  }
  if (["juvederm", "restylane", "belotero", "filler"].some((x) => p.includes(x))) {
    return { bg: "bg-pink-500", ring: "shadow-[0_0_24px_4px_hsl(330_85%_60%/0.55)]", text: "text-white" };
  }
  if (["sculptra", "radiesse", "biostim", "collagen"].some((x) => p.includes(x))) {
    return { bg: "bg-amber-500", ring: "shadow-[0_0_24px_4px_hsl(38_92%_55%/0.55)]", text: "text-white" };
  }
  return { bg: "bg-primary", ring: "shadow-glow", text: "text-primary-foreground" };
};

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
  const [view, setView] = useState<ViewKey>("front");
  const [showHistory, setShowHistory] = useState(false);
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
    const map = new Map<string, { units: number; lastDate: string }>();
    for (const s of sites) {
      const cur = map.get(s.client_name) ?? { units: 0, lastDate: s.visit_date };
      cur.units += Number(s.units ?? 0);
      if (new Date(s.visit_date) > new Date(cur.lastDate)) cur.lastDate = s.visit_date;
      map.set(s.client_name, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.units - a.units);
  }, [sites]);

  // Derive scope: when a client is selected, sessions = grouped visit_dates for them.
  const sessions = useMemo(() => {
    if (!clientFilter) return [];
    const dates = Array.from(new Set(sites.filter((s) => s.client_name === clientFilter).map((s) => s.visit_date)));
    return dates.sort((a, b) => (a < b ? 1 : -1));
  }, [sites, clientFilter]);

  const [sessionDate, setSessionDate] = useState<string | null>(null);
  // Reset session selection when client changes
  useEffect(() => {
    setSessionDate(sessions[0] ?? null);
  }, [clientFilter, sessions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Records visible on the canvas right now
  const canvasRecords = useMemo(() => {
    return sites.filter((s) => {
      const r = REGIONS.find((reg) => reg.key === s.region);
      if (!r || r.view !== view) return false;
      if (clientFilter && s.client_name !== clientFilter) return false;
      // When a client + session is selected, only show that session unless history is on
      if (clientFilter && sessionDate && !showHistory && s.visit_date !== sessionDate) return false;
      return true;
    });
  }, [sites, view, clientFilter, sessionDate, showHistory]);

  // Group canvas records by region so multiple visits to same spot stack as one numbered marker
  const canvasMarkers = useMemo(() => {
    const byRegion = new Map<string, { records: Site[]; total: number }>();
    for (const r of canvasRecords) {
      const cur = byRegion.get(r.region) ?? { records: [], total: 0 };
      cur.records.push(r);
      cur.total += Number(r.units ?? 0);
      byRegion.set(r.region, cur);
    }
    // Order regions by view+y to assign deterministic numbers top→bottom
    const ordered = Array.from(byRegion.entries())
      .map(([regionKey, v]) => {
        const r = REGIONS.find((reg) => reg.key === regionKey)!;
        return { region: r, ...v };
      })
      .sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x);
    return ordered.map((m, idx) => ({ ...m, number: idx + 1 }));
  }, [canvasRecords]);

  // History list (right rail)
  const historyRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      if (clientFilter && s.client_name !== clientFilter) return false;
      if (!q) return true;
      return [s.client_name, s.product, s.region, s.notes].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [sites, query, clientFilter]);

  const sessionTotal = useMemo(
    () => canvasRecords.reduce((s, r) => s + Number(r.units ?? 0), 0),
    [canvasRecords]
  );

  const openCreate = (preset?: { region?: string }) => {
    setEditing(null);
    setDraft({
      ...emptyDraft(),
      region: preset?.region ?? "",
      client_name: clientFilter ?? "",
      visit_date: sessionDate ?? today(),
    });
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

  const sessionMeta = useMemo(() => {
    if (!clientFilter || !sessionDate) return null;
    const idx = sessions.indexOf(sessionDate);
    return { number: sessions.length - idx, total: sessions.length };
  }, [clientFilter, sessionDate, sessions]);

  const stepSession = (dir: -1 | 1) => {
    if (!sessions.length || !sessionDate) return;
    const i = sessions.indexOf(sessionDate);
    const next = sessions[i + dir];
    if (next) setSessionDate(next);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Syringe className="h-3 w-3" /> Clinical
          </span>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Injection Mapping</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientFilter && sessionMeta
              ? `${clientFilter} · Session ${sessionMeta.number} · ${new Date(sessionDate!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
              : "Visual face-map of every neuromodulator and dermal filler dose."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowHistory((v) => !v)}
            className="gap-1.5 rounded-xl border border-border bg-card"
          >
            {showHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showHistory ? "Hide history" : "View history"}
          </Button>
          <Button
            onClick={() => openCreate()}
            className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add point
          </Button>
        </div>
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
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Canvas */}
          <div className="rounded-2xl border border-border bg-card shadow-card">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div className="inline-flex rounded-xl border border-border bg-surface p-1">
                {(["front", "left", "right", "body"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition",
                      view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Legend swatch="bg-violet-500" label="Neuromodulator" />
                <Legend swatch="bg-pink-500" label="Filler" />
                <Legend swatch="bg-amber-500" label="Biostimulator" />
              </div>
            </div>

            {/* Stage */}
            <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-b-2xl bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_60%)]">
              {/* Stylized silhouette — perfectly centered */}
              <div className="absolute left-1/2 top-1/2 h-[88%] w-[42%] -translate-x-1/2 -translate-y-1/2">
                <FaceSilhouette view={view} />

                {/* Markers */}
                {canvasMarkers.map((m) => {
                  const tone = productTone(m.records[0].product);
                  return (
                    <button
                      key={m.region.key}
                      onClick={() => openEdit(m.records[0])}
                      title={`${m.region.label} · ${m.total}u · ${m.records[0].product}`}
                      className={cn(
                        "group absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-[11px] font-bold transition hover:scale-110",
                        tone.bg,
                        tone.text,
                        tone.ring
                      )}
                      style={{ left: `${m.region.x}%`, top: `${m.region.y}%` }}
                    >
                      {m.number}
                      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[10px] text-foreground shadow-elevated group-hover:block">
                        <span className="font-semibold">{m.region.label}</span> · {m.total}u {m.records[0].product}
                      </span>
                    </button>
                  );
                })}

                {/* Empty-region affordances (faint dots that say "click to add") */}
                {REGIONS.filter((r) => r.view === view && !canvasMarkers.find((m) => m.region.key === r.key)).map((r) => (
                  <button
                    key={r.key}
                    onClick={() => openCreate({ region: r.key })}
                    title={`Add to ${r.label}`}
                    className="group absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/40 opacity-30 transition hover:opacity-100 hover:border-primary/60 hover:bg-primary/30"
                    style={{ left: `${r.x}%`, top: `${r.y}%` }}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground shadow-elevated group-hover:block">
                      + {r.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Session pager (only when a client is selected) */}
              {clientFilter && sessions.length > 1 && (
                <div className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 px-1.5 py-1 backdrop-blur">
                  <button
                    onClick={() => stepSession(1)}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={!sessionDate || sessions.indexOf(sessionDate) >= sessions.length - 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-xs font-medium tabular-nums">
                    {sessionMeta ? `Session ${sessionMeta.number} of ${sessionMeta.total}` : ""}
                  </span>
                  <button
                    onClick={() => stepSession(-1)}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                    disabled={!sessionDate || sessions.indexOf(sessionDate) <= 0}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* This session panel */}
            <div className="border-t border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {clientFilter ? "This session" : "All visible doses"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {canvasRecords.length} {canvasRecords.length === 1 ? "point" : "points"} · {sessionTotal}u
                </span>
              </div>
              {canvasMarkers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  {clientFilter
                    ? "No injections recorded on this view for the selected session."
                    : "Pick a client on the right to scope to one chart, or click any region to log a new dose."}
                </div>
              ) : (
                <div className="grid gap-1.5 md:grid-cols-2">
                  {canvasMarkers.map((m) => {
                    const tone = productTone(m.records[0].product);
                    return (
                      <button
                        key={m.region.key}
                        onClick={() => openEdit(m.records[0])}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-2.5 text-left transition hover:border-primary/40"
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            tone.bg,
                            tone.text
                          )}
                        >
                          {m.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{m.region.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{m.records[0].product}</div>
                        </div>
                        <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {m.total}u
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right rail — clients & history */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Clients</h3>
                {clientFilter && (
                  <button
                    onClick={() => setClientFilter(null)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search clients & notes…"
                  className="h-9 w-full rounded-lg border border-input bg-surface pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
                {clients.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                    No clients yet.
                  </div>
                ) : (
                  clients
                    .filter((c) => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setClientFilter(clientFilter === c.name ? null : c.name)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left transition",
                          clientFilter === c.name
                            ? "border-primary/50 bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-surface/60"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Last visit {new Date(c.lastDate).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
                          {c.units}u
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  History {clientFilter && `· ${clientFilter}`}
                </h3>
                <span className="text-[10px] text-muted-foreground">{historyRecords.length} entries</span>
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                {historyRecords.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                    No matching records.
                  </div>
                ) : (
                  historyRecords.map((s) => {
                    const tone = productTone(s.product);
                    return (
                      <button
                        key={s.id}
                        onClick={() => openEdit(s)}
                        className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface/40 p-2.5 text-left transition hover:border-primary/40"
                      >
                        <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", tone.bg)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium">{s.client_name}</span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(s.visit_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">
                              {s.product} · {s.region}
                            </span>
                            <span className="shrink-0 font-semibold text-foreground/80">{s.units}u</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
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
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit point" : "Add point"}</h2>
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
                    placeholder="e.g. Anna Lee"
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
                <Label>Region ({view})</Label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {REGIONS.filter((r) => r.view === view).map((r) => (
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

              <div className="grid gap-3 md:grid-cols-2">
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
                <div className="flex items-end">
                  <div className="text-[11px] text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {new Date(draft.visit_date || today()).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
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
                  {saving ? "Saving…" : editing ? (<><Edit3 className="h-3.5 w-3.5" /> Save changes</>) : (<><Plus className="h-3.5 w-3.5" /> Add point</>)}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FaceSilhouette({ view }: { view: ViewKey }) {
  const stroke = "hsl(var(--border))";
  if (view === "body") {
    return (
      <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="bodyFill" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.06)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.01)" />
          </radialGradient>
        </defs>
        {/* Head */}
        <ellipse cx="50" cy="14" rx="9" ry="11" fill="url(#bodyFill)" stroke={stroke} strokeWidth="0.5" />
        {/* Neck */}
        <rect x="46" y="22" width="8" height="6" fill="url(#bodyFill)" stroke={stroke} strokeWidth="0.5" />
        {/* Torso */}
        <path
          d="M30 32 Q50 28 70 32 L72 70 Q50 76 28 70 Z"
          fill="url(#bodyFill)"
          stroke={stroke}
          strokeWidth="0.5"
        />
        {/* Arms */}
        <path d="M30 33 L18 60 L20 78" fill="none" stroke={stroke} strokeWidth="0.5" />
        <path d="M70 33 L82 60 L80 78" fill="none" stroke={stroke} strokeWidth="0.5" />
        {/* Hands */}
        <circle cx="20" cy="80" r="3.5" fill="url(#bodyFill)" stroke={stroke} strokeWidth="0.5" />
        <circle cx="80" cy="80" r="3.5" fill="url(#bodyFill)" stroke={stroke} strokeWidth="0.5" />
      </svg>
    );
  }

  // Profile views — same drawing mirrored via transform
  if (view === "left" || view === "right") {
    const flip = view === "right";
    return (
      <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="profileFill" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.06)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.01)" />
          </radialGradient>
        </defs>
        <g transform={flip ? "translate(100,0) scale(-1,1)" : undefined}>
          {/* Profile outline */}
          <path
            d="M58 14 Q72 16 76 32 Q80 48 72 64 Q68 76 60 84 Q55 92 48 96 Q40 92 36 80 Q32 64 34 48 Q38 26 58 14 Z"
            fill="url(#profileFill)"
            stroke={stroke}
            strokeWidth="0.6"
          />
          {/* Ear */}
          <ellipse cx="42" cy="52" rx="3" ry="5" fill="none" stroke={stroke} strokeWidth="0.4" />
          {/* Eye hint */}
          <ellipse cx="58" cy="44" rx="2" ry="0.9" fill="none" stroke={stroke} strokeWidth="0.4" />
          {/* Brow */}
          <path d="M54 39 Q60 37 64 40" stroke={stroke} strokeWidth="0.4" fill="none" />
          {/* Nose tip */}
          <path d="M76 50 Q80 54 76 58" stroke={stroke} strokeWidth="0.4" fill="none" />
          {/* Lips */}
          <path d="M68 66 Q72 67 70 70" stroke={stroke} strokeWidth="0.4" fill="none" />
        </g>
      </svg>
    );
  }

  // Front
  return (
    <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="frontFill" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.06)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.01)" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="32" ry="44" fill="url(#frontFill)" stroke={stroke} strokeWidth="0.6" />
      {/* Brows */}
      <path d="M28 38 Q34 34 42 37" stroke={stroke} strokeWidth="0.5" fill="none" />
      <path d="M58 37 Q66 34 72 38" stroke={stroke} strokeWidth="0.5" fill="none" />
      {/* Eyes */}
      <ellipse cx="36" cy="44" rx="3" ry="1.4" fill="none" stroke={stroke} strokeWidth="0.5" />
      <ellipse cx="64" cy="44" rx="3" ry="1.4" fill="none" stroke={stroke} strokeWidth="0.5" />
      {/* Nose */}
      <path d="M50 46 Q48 60 50 66 Q52 60 50 46" stroke={stroke} strokeWidth="0.4" fill="none" />
      {/* Lips */}
      <path d="M42 72 Q50 75 58 72 Q50 78 42 72" stroke={stroke} strokeWidth="0.5" fill="none" />
      {/* Jaw hint */}
      <path d="M22 72 Q50 102 78 72" stroke={stroke} strokeWidth="0.4" fill="none" opacity="0.5" />
    </svg>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", swatch)} />
      {label}
    </span>
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
