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
  { key: "Neck", label: "Neck", view: "body", x: 50, y: 19 },
  { key: "Décolletage", label: "Décolletage", view: "body", x: 50, y: 30 },
  { key: "Shoulder L", label: "Shoulder L", view: "body", x: 33, y: 32 },
  { key: "Shoulder R", label: "Shoulder R", view: "body", x: 67, y: 32 },
  { key: "Abdomen", label: "Abdomen", view: "body", x: 50, y: 60 },
  { key: "Glutes", label: "Glutes", view: "body", x: 50, y: 78 },
  { key: "Outer thigh L", label: "Outer thigh L", view: "body", x: 38, y: 88 },
  { key: "Outer thigh R", label: "Outer thigh R", view: "body", x: 62, y: 88 },
  { key: "Inner thigh L", label: "Inner thigh L", view: "body", x: 46, y: 92 },
  { key: "Inner thigh R", label: "Inner thigh R", view: "body", x: 54, y: 92 },
  { key: "Knee L", label: "Knee L", view: "body", x: 42, y: 108 },
  { key: "Knee R", label: "Knee R", view: "body", x: 58, y: 108 },
  { key: "Hand L", label: "Hand L", view: "body", x: 19, y: 80 },
  { key: "Hand R", label: "Hand R", view: "body", x: 81, y: 80 },
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

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-3 text-xs">
                  <Legend swatch="bg-violet-500" label="Neuromodulator" />
                  <Legend swatch="bg-pink-500" label="Filler" />
                  <Legend swatch="bg-amber-500" label="Biostimulator" />
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  Click any zone to log a dose · Hover to preview
                </p>
              </div>
            </div>

            {/* Stage */}
            <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-b-2xl bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_65%)]">
              {/* Stylized silhouette — perfectly centered, scaled larger for easier interaction */}
              <div className="absolute left-1/2 top-1/2 h-[94%] w-[68%] -translate-x-1/2 -translate-y-1/2">
                <FaceSilhouette view={view} />

                {/* Markers — used regions (filled, color-coded by product) */}
                {canvasMarkers.map((m) => {
                  const tone = productTone(m.records[0].product);
                  return (
                    <button
                      key={m.region.key}
                      onClick={() => openEdit(m.records[0])}
                      className={cn(
                        "group absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-white text-[10px] font-bold transition-all duration-200 hover:scale-125",
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

                {/* Empty-region affordances — visible, pulsing, click to add */}
                {REGIONS.filter((r) => r.view === view && !canvasMarkers.find((m) => m.region.key === r.key)).map((r) => (
                  <button
                    key={r.key}
                    onClick={() => openCreate({ region: r.key })}
                    className="group absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-violet-400/40 bg-white/[0.04] transition-all duration-200 animate-injection-pulse hover:h-4 hover:w-4 hover:border-violet-400 hover:bg-violet-500/20"
                    style={{ left: `${r.x}%`, top: `${r.y}%` }}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[10px] text-foreground shadow-elevated group-hover:block">
                      <span className="font-semibold">{r.label}</span>
                      <span className="ml-1 text-muted-foreground">· click to log</span>
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

            {/* Recent activity strip */}
            <RecentActivityStrip sites={sites} />

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
                    : "Select a client from the right panel, or click any zone on the diagram to log a new injection."}
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
  // Clinical-grade tones: dark slate gradient face, mid-grey outline, lighter-grey features
  const fillTop = "#1F1F23";
  const fillBottom = "#0F0F11";
  const outline = "#3F3F46";
  const feature = "#52525B";
  const featureSoft = "#52525B";
  const gradId = `clinicalFill-${view}`;

  if (view === "body") {
    return (
      <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor={fillBottom} />
          </linearGradient>
        </defs>
        {/* Head */}
        <ellipse cx="50" cy="13" rx="7.5" ry="9" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        {/* Eyes */}
        <ellipse cx="47" cy="12" rx="0.9" ry="0.5" fill={feature} />
        <ellipse cx="53" cy="12" rx="0.9" ry="0.5" fill={feature} />
        {/* Mouth */}
        <path d="M48 16 Q50 17 52 16" stroke={feature} strokeWidth="0.6" fill="none" strokeLinecap="round" />
        {/* Neck */}
        <path d="M45 21 Q50 23 55 21 L56 26 Q50 27 44 26 Z" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        {/* Shoulders & torso */}
        <path
          d="M28 30 Q38 26 50 27 Q62 26 72 30 L74 44 Q72 56 70 70 Q68 84 66 96 L34 96 Q32 84 30 70 Q28 56 26 44 Z"
          fill={`url(#${gradId})`}
          stroke={outline}
          strokeWidth="1.2"
        />
        {/* Collarbones */}
        <path d="M34 30 Q42 33 50 32 Q58 33 66 30" stroke={featureSoft} strokeWidth="0.6" fill="none" opacity="0.6" />
        {/* Sternum / center line */}
        <path d="M50 33 L50 70" stroke={featureSoft} strokeWidth="0.5" fill="none" opacity="0.4" />
        {/* Chest contour */}
        <path d="M36 42 Q44 50 50 50 Q56 50 64 42" stroke={featureSoft} strokeWidth="0.55" fill="none" opacity="0.5" />
        {/* Waist hint */}
        <path d="M34 70 Q50 72 66 70" stroke={featureSoft} strokeWidth="0.55" fill="none" opacity="0.5" />
        {/* Arms */}
        <path d="M28 31 Q22 44 18 60 Q17 72 19 82 L24 82 Q22 72 22 60 Q24 44 28 36 Z" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        <path d="M72 31 Q78 44 82 60 Q83 72 81 82 L76 82 Q78 72 78 60 Q76 44 72 36 Z" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        {/* Hands */}
        <ellipse cx="20.5" cy="86" rx="3" ry="4" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        <ellipse cx="79.5" cy="86" rx="3" ry="4" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        {/* Hips/legs */}
        <path d="M34 96 Q40 110 42 124 L48 124 Q49 110 49 96 Z" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
        <path d="M66 96 Q60 110 58 124 L52 124 Q51 110 51 96 Z" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
      </svg>
    );
  }

  // Profile views — left and right (mirrored)
  if (view === "left" || view === "right") {
    const flip = view === "right";
    return (
      <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor={fillBottom} />
          </linearGradient>
        </defs>
        <g transform={flip ? "translate(100,0) scale(-1,1)" : undefined}>
          {/* Profile outline */}
          <path
            d="M40 18 Q34 30 34 44 Q34 50 36 54 L40 56 Q42 60 44 60 L46 62 Q44 64 46 66 L50 68 Q48 70 50 72 Q52 74 50 76 L48 80 Q50 86 56 92 Q62 94 68 92 Q74 86 76 78 Q78 66 78 54 Q78 36 70 24 Q60 14 50 14 Q44 14 40 18 Z"
            fill={`url(#${gradId})`}
            stroke={outline}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Nose bridge to tip */}
          <path d="M40 40 Q38 48 42 56 Q44 58 46 58" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Nostril */}
          <path d="M44 60 Q46 61 47 60" stroke={feature} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* Lips */}
          <path d="M46 66 Q49 65 52 66" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M46 68 Q49 70 52 68" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Eye almond */}
          <path d="M48 44 Q52 42 56 44 Q52 46 48 44 Z" fill="none" stroke={feature} strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="52" cy="44" r="0.9" fill={feature} />
          {/* Brow */}
          <path d="M48 39 Q52 37 58 39" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Ear */}
          <path d="M68 48 Q72 50 72 56 Q72 62 68 62 Q66 58 67 52 Z" fill="none" stroke={feature} strokeWidth="1" strokeLinejoin="round" />
          {/* Hair line */}
          <path d="M40 22 Q56 12 72 26" stroke={featureSoft} strokeWidth="0.7" fill="none" opacity="0.6" />
        </g>
      </svg>
    );
  }

  // Front view — anatomical face with clearly visible eyes, brows, nose, lips
  return (
    <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor={fillBottom} />
        </linearGradient>
      </defs>
      {/* Face shape — refined oval */}
      <path
        d="M50 12 Q72 14 78 36 Q80 56 74 76 Q68 92 50 100 Q32 92 26 76 Q20 56 22 36 Q28 14 50 12 Z"
        fill={`url(#${gradId})`}
        stroke={outline}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Hairline */}
      <path d="M28 24 Q50 14 72 24" stroke={featureSoft} strokeWidth="0.7" fill="none" opacity="0.55" />

      {/* Brows — arched strokes */}
      <path d="M30 38 Q36 34 42 38" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M58 38 Q64 34 70 38" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Eyes — almond outlines */}
      <path d="M30 45 Q36 41 42 45 Q36 49 30 45 Z" fill="none" stroke={feature} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="36" cy="45" r="1.4" fill={feature} />
      <path d="M58 45 Q64 41 70 45 Q64 49 58 45 Z" fill="none" stroke={feature} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="64" cy="45" r="1.4" fill={feature} />

      {/* Nose — vertical ridge with nostrils */}
      <path d="M50 47 L50 64" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M46 65 Q48 67 50 67 Q52 67 54 65" stroke={feature} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Mouth — subtle curve at lower third */}
      <path d="M40 74 Q50 78 60 74" stroke={feature} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M42 74 Q50 71 58 74" stroke={feature} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Chin contour */}
      <path d="M44 92 Q50 96 56 92" stroke={featureSoft} strokeWidth="0.7" fill="none" opacity="0.5" />

      {/* Jaw line accent */}
      <path d="M26 70 Q38 92 50 96 Q62 92 74 70" stroke={featureSoft} strokeWidth="0.6" fill="none" opacity="0.4" />

      {/* Neck */}
      <path d="M42 100 L42 110 Q50 112 58 110 L58 100" fill={`url(#${gradId})`} stroke={outline} strokeWidth="1.2" />
    </svg>
  );
}

function RecentActivityStrip({ sites }: { sites: Site[] }) {
  const recent = useMemo(() => {
    return [...sites]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [sites]);

  if (recent.length === 0) return null;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return `Today ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
    }
    const yesterday = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase()}`;
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Recent activity
        </h3>
        <span className="text-[10px] text-muted-foreground/70">Last {recent.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recent.map((s) => {
          const tone = productTone(s.product);
          return (
            <div
              key={s.id}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-[11px]"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", tone.bg)} />
              <span className="text-muted-foreground">{fmtTime(s.updated_at)}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium text-foreground">{s.region}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">
                {s.product} {s.units}u
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground/80">{s.client_name}</span>
            </div>
          );
        })}
      </div>
    </div>
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
