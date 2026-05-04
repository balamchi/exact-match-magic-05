import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Package as PackageIcon, Plus, Search, Sparkles, Calendar, TrendingUp,
  Layers, Tag, CheckCircle2, PauseCircle, Pencil, Copy, Trash2, X,
  MapPin, Download, Users, ShoppingBag, Clock, User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoUpload } from "@/components/photo-upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/packages")({ component: PackagesPage });

type PackageRow = {
  id: string; clinic_id: string; name: string; description: string | null;
  sessions: number; price_cents: number; expires_after_days: number | null;
  active: boolean; image_url: string | null; session_type: string | null;
  validity_type: string | null; validity_days: number | null;
  activation_policy: string | null; transferable: boolean;
  member_only: boolean; tax_category: string | null;
  created_at: string; updated_at: string;
};
type ServiceRow = { id: string; name: string; category: string | null; active: boolean };
type LocationRow = { id: string; name: string; active: boolean };
type ClientRow = { id: string; first_name: string; last_name: string | null; email: string | null };
type ClientPackageRow = {
  id: string; package_id: string; client_id: string; clinic_id: string;
  total_sessions: number; sessions_used: number; purchased_at: string;
  activated_at: string | null; expires_at: string | null; status: string;
  paid_amount_cents: number; created_at: string;
};

const RECIPES = [
  { name: "Botox Annual Plan", description: "3 sessions, $899 — saves $100", sessions: 3, price_cents: 89900, expires_after_days: 365 },
  { name: "Filler Maintenance Pro", description: "4 syringes/year, $2,400", sessions: 4, price_cents: 240000, expires_after_days: 365 },
  { name: "Hydrafacial Membership", description: "12 sessions/year, $1,800", sessions: 12, price_cents: 180000, expires_after_days: 365 },
  { name: "Laser Hair Removal Bikini", description: "6 sessions, $799", sessions: 6, price_cents: 79900, expires_after_days: 540 },
  { name: "Wedding Beauty Package", description: "1 consultation + 3 treatments, $1,499", sessions: 4, price_cents: 149900, expires_after_days: 180 },
  { name: "PRP Hair Restoration", description: "4 sessions, $1,599", sessions: 4, price_cents: 159900, expires_after_days: 365 },
  { name: "Sculptra 3-Session Plan", description: "3 vials over 6 weeks, $2,400", sessions: 3, price_cents: 240000, expires_after_days: 90 },
];

const fmtMoney = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(cents / 100);

type FormState = {
  name: string; description: string; image_url: string;
  price: string; sessions: string; session_type: string;
  validity_type: string; validity_days: string;
  activation_policy: string; transferable: boolean;
  member_only: boolean; tax_category: string;
  active: boolean; service_ids: string[]; location_ids: string[];
};

const emptyForm: FormState = {
  name: "", description: "", image_url: "",
  price: "", sessions: "3", session_type: "specific",
  validity_type: "never", validity_days: "",
  activation_policy: "on_purchase", transferable: false,
  member_only: false, tax_category: "",
  active: true, service_ids: [], location_ids: [],
};

function PackagesPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pkgServiceMap, setPkgServiceMap] = useState<Record<string, string[]>>({});
  const [pkgLocationMap, setPkgLocationMap] = useState<Record<string, string[]>>({});
  const [clientPackages, setClientPackages] = useState<ClientPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [mainTab, setMainTab] = useState("types");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [sellOpen, setSellOpen] = useState(false);
  const [sellPkg, setSellPkg] = useState<PackageRow | null>(null);
  const [sellClientId, setSellClientId] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [cpFilter, setCpFilter] = useState<"all" | "active" | "expired" | "used">("all");

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    const [pRes, sRes, lRes, psRes, plRes, cpRes, cRes] = await Promise.all([
      supabase.from("packages").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("services").select("id, name, category, active").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("locations").select("id, name, active").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("package_services").select("package_id, service_id"),
      supabase.from("package_locations").select("package_id, location_id"),
      supabase.from("client_packages").select("*").eq("clinic_id", clinicId).order("purchased_at", { ascending: false }),
      supabase.from("clients").select("id, first_name, last_name, email").eq("clinic_id", clinicId).order("first_name").limit(500),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    setRows((pRes.data ?? []) as PackageRow[]);
    setServices((sRes.data ?? []) as ServiceRow[]);
    setLocations((lRes.data ?? []) as LocationRow[]);
    setClients((cRes.data ?? []) as ClientRow[]);
    setClientPackages((cpRes.data ?? []) as ClientPackageRow[]);

    const sm: Record<string, string[]> = {};
    (psRes.data ?? []).forEach((r: any) => { if (!sm[r.package_id]) sm[r.package_id] = []; sm[r.package_id].push(r.service_id); });
    setPkgServiceMap(sm);
    const lm: Record<string, string[]> = {};
    (plRes.data ?? []).forEach((r: any) => { if (!lm[r.package_id]) lm[r.package_id] = []; lm[r.package_id].push(r.location_id); });
    setPkgLocationMap(lm);
    setLoading(false);
  };

  useEffect(() => {
    if (!clinicId) return;
    load();
    const ch = supabase.channel(`pkgs-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "packages", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const totalValue = rows.reduce((s, r) => s + r.price_cents, 0);
    const soldMonth = clientPackages.filter((cp) => {
      const d = new Date(cp.purchased_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sessionsUsed = clientPackages.reduce((s, cp) => s + cp.sessions_used, 0);
    return { active, totalValue, soldMonthCount: soldMonth.length, sessionsUsed };
  }, [rows, clientPackages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && !r.active) return false;
      if (filter === "paused" && r.active) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q)) return false;
      if (locationFilter !== "all") {
        const locs = pkgLocationMap[r.id];
        if (locs && locs.length > 0 && !locs.includes(locationFilter)) return false;
      }
      return true;
    });
  }, [rows, search, filter, locationFilter, pkgLocationMap]);

  const filteredCP = useMemo(() => {
    return clientPackages.filter((cp) => {
      if (cpFilter === "active" && cp.status !== "active") return false;
      if (cpFilter === "expired" && cp.status !== "expired") return false;
      if (cpFilter === "used" && cp.sessions_used < cp.total_sessions) return false;
      return true;
    });
  }, [clientPackages, cpFilter]);

  const openNew = (recipe?: typeof RECIPES[number]) => {
    setEditing(null);
    const f = { ...emptyForm, location_ids: locations.map((l) => l.id) };
    if (recipe) {
      f.name = recipe.name; f.description = recipe.description;
      f.sessions = recipe.sessions.toString();
      f.price = (recipe.price_cents / 100).toFixed(2);
      f.validity_type = recipe.expires_after_days ? "custom" : "never";
      f.validity_days = recipe.expires_after_days?.toString() ?? "";
    }
    setForm(f);
    setActiveTab("basic");
    setComposeOpen(true);
  };

  const openEdit = (row: PackageRow) => {
    setEditing(row);
    setForm({
      name: row.name, description: row.description ?? "",
      image_url: row.image_url ?? "",
      price: (row.price_cents / 100).toFixed(2),
      sessions: row.sessions.toString(),
      session_type: row.session_type ?? "specific",
      validity_type: row.validity_type ?? "never",
      validity_days: row.validity_days?.toString() ?? row.expires_after_days?.toString() ?? "",
      activation_policy: row.activation_policy ?? "on_purchase",
      transferable: row.transferable ?? false,
      member_only: row.member_only ?? false,
      tax_category: row.tax_category ?? "",
      active: row.active,
      service_ids: pkgServiceMap[row.id] ?? [],
      location_ids: pkgLocationMap[row.id] ?? [],
    });
    setActiveTab("basic");
    setComposeOpen(true);
  };

  const closeComposer = () => { setComposeOpen(false); setEditing(null); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const priceCents = Math.round(parseFloat(form.price || "0") * 100);
    const sessions = parseInt(form.sessions || "1");
    if (priceCents < 0 || sessions < 1) { toast.error("Invalid price or sessions"); return; }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(), description: form.description || null,
      image_url: form.image_url || null,
      price_cents: priceCents, sessions,
      session_type: form.session_type, validity_type: form.validity_type,
      validity_days: form.validity_days ? parseInt(form.validity_days) : null,
      expires_after_days: form.validity_days ? parseInt(form.validity_days) : null,
      activation_policy: form.activation_policy,
      transferable: form.transferable, member_only: form.member_only,
      tax_category: form.tax_category || null, active: form.active,
    };

    let pkgId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("packages").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from("packages").insert({ ...payload, clinic_id: clinicId } as any).select("id").single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      pkgId = data.id;
    }

    if (pkgId) {
      // Sync services
      await supabase.from("package_services").delete().eq("package_id", pkgId);
      if (form.service_ids.length > 0) {
        await supabase.from("package_services").insert(
          form.service_ids.map((sid) => ({ package_id: pkgId, service_id: sid })) as any
        );
      }
      // Sync locations
      await supabase.from("package_locations").delete().eq("package_id", pkgId);
      if (form.location_ids.length > 0 && form.location_ids.length < locations.length) {
        await supabase.from("package_locations").insert(
          form.location_ids.map((lid) => ({ package_id: pkgId, location_id: lid })) as any
        );
      }
    }

    toast.success(editing ? "Package updated" : "Package created");
    setSubmitting(false);
    closeComposer();
    await load();
  };

  const togglePackage = async (row: PackageRow) => {
    const { error } = await supabase.from("packages").update({ active: !row.active } as any).eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(row.active ? "Package paused" : "Package activated");
  };

  const duplicate = async (row: PackageRow) => {
    if (!clinicId) return;
    const { error } = await supabase.from("packages").insert({
      clinic_id: clinicId, name: `${row.name} (copy)`, description: row.description,
      sessions: row.sessions, price_cents: row.price_cents,
      expires_after_days: row.expires_after_days, active: false,
    } as any);
    if (error) toast.error(error.message);
    else toast.success("Package duplicated");
  };

  const remove = async (row: PackageRow) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await supabase.from("packages").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Package deleted");
  };

  const openSell = (pkg: PackageRow) => {
    setSellPkg(pkg);
    setSellPrice((pkg.price_cents / 100).toFixed(2));
    setSellClientId("");
    setSellOpen(true);
  };

  const handleSell = async () => {
    if (!clinicId || !sellPkg || !sellClientId) { toast.error("Select a client"); return; }
    const paidCents = Math.round(parseFloat(sellPrice || "0") * 100);
    let expiresAt: string | null = null;
    if (sellPkg.expires_after_days) {
      expiresAt = new Date(Date.now() + sellPkg.expires_after_days * 86400000).toISOString();
    }
    const { error } = await supabase.from("client_packages").insert({
      package_id: sellPkg.id, client_id: sellClientId, clinic_id: clinicId,
      total_sessions: sellPkg.sessions, sessions_used: 0,
      paid_amount_cents: paidCents,
      activated_at: sellPkg.activation_policy === "on_purchase" ? new Date().toISOString() : null,
      expires_at: expiresAt, status: "active",
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Package sold to client"); setSellOpen(false); await load(); }
  };

  const exportCSV = () => {
    const headers = ["Name", "Sessions", "Price", "Active"];
    const csvRows = [headers.join(",")];
    filtered.forEach((r) => csvRows.push([`"${r.name}"`, r.sessions, (r.price_cents / 100).toFixed(2), r.active].join(",")));
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "packages.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Group services by category for picker
  const serviceCategories = useMemo(() => {
    const cats: Record<string, ServiceRow[]> = {};
    services.forEach((s) => {
      const cat = s.category || "Uncategorized";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });
    return cats;
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <PackageIcon className="h-3.5 w-3.5" /> Prepaid care
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Packages & Series</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build prepaid bundles with session counts, locked-in pricing, and expiry windows. Sell once, deliver over months.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} aria-label="Export packages CSV"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button onClick={() => openNew()} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New Package
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active Packages" value={stats.active.toString()} sub={`${rows.length - stats.active} paused`} icon={<CheckCircle2 className="h-4 w-4" />} accent="text-emerald-300" />
        <KpiCard label="Sold This Month" value={stats.soldMonthCount.toString()} sub="Client packages" icon={<ShoppingBag className="h-4 w-4" />} accent="text-sky-300" />
        <KpiCard label="Sessions Used" value={stats.sessionsUsed.toString()} sub="All time" icon={<Layers className="h-4 w-4" />} accent="text-violet-300" />
        <KpiCard label="Revenue Potential" value={fmtMoney(stats.totalValue)} sub="Sum of all packages" icon={<TrendingUp className="h-4 w-4" />} accent="text-amber-300" />
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="types">Package Types</TabsTrigger>
          <TabsTrigger value="sold">Sold Packages ({clientPackages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4 mt-4">
          {/* Recipe library */}
          {rows.length === 0 && !loading && (
            <Card className="border-border/60 bg-card/40 p-6 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Start from a template</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {RECIPES.map((r) => (
                  <button key={r.name} onClick={() => openNew(r)}
                    className="group rounded-xl border border-border/60 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:shadow-glow">
                    <div className="text-sm font-semibold group-hover:text-primary">{r.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-muted-foreground">{r.sessions} sessions</span>
                      <span className="font-mono font-semibold">{fmtMoney(r.price_cents)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packages…" className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              {locations.length >= 2 && (
                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 rounded-lg border border-border/60 bg-card/40 px-3 text-xs text-foreground" aria-label="Filter by location">
                  <option value="all">All Locations</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              <div className="flex gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
                {(["all", "active", "paused"] as const).map((k) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                      filter === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">Loading packages…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-16 text-center">
              <PackageIcon className="h-8 w-8 text-muted-foreground" />
              <div className="font-medium">No packages yet</div>
              <p className="text-sm text-muted-foreground">Build your first prepaid bundle.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => {
                const perSession = row.sessions > 0 ? row.price_cents / row.sessions : 0;
                const locs = pkgLocationMap[row.id];
                const svcCount = pkgServiceMap[row.id]?.length ?? 0;
                return (
                  <Card key={row.id}
                    className={cn("group relative flex flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur transition hover:border-primary/30",
                      !row.active && "opacity-60")}>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                    {row.image_url && (
                      <div className="h-32 overflow-hidden">
                        <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 p-5">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => openEdit(row)} className="text-left font-semibold hover:text-primary">{row.name}</button>
                        {row.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>}
                      </div>
                      <Badge variant="outline" className={cn("shrink-0 gap-1 border",
                        row.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border/60 bg-muted/30 text-muted-foreground")}>
                        {row.active ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                        {row.active ? "Live" : "Paused"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-y border-border/40 bg-background/40 px-5 py-4">
                      <Stat icon={<Layers className="h-3 w-3" />} label="Sessions" value={row.sessions.toString()} />
                      <Stat icon={<Tag className="h-3 w-3" />} label="Per visit" value={fmtMoney(perSession)} />
                      <Stat icon={<Calendar className="h-3 w-3" />} label="Expires" value={row.expires_after_days ? `${row.expires_after_days}d` : "Never"} />
                    </div>

                    <div className="flex flex-wrap gap-1 px-5 pt-3 text-[10px] text-muted-foreground">
                      {svcCount > 0 && <span className="rounded-full border border-border/40 px-2 py-0.5">{svcCount} service{svcCount > 1 ? "s" : ""}</span>}
                      {locs && locs.length > 0 && locs.length < locations.length && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5"><MapPin className="h-3 w-3" /> {locs.length} loc</span>
                      )}
                      {row.member_only && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Members only</span>}
                      {row.transferable && <span className="rounded-full border border-border/40 px-2 py-0.5">Transferable</span>}
                    </div>

                    <div className="flex items-center justify-between p-5">
                      <div>
                        <div className="font-display text-2xl font-semibold">{fmtMoney(row.price_cents)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total package</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openSell(row)} title="Sell to client" aria-label="Sell to client"><ShoppingBag className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)} title="Edit" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicate(row)} title="Duplicate" aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => togglePackage(row)} title={row.active ? "Pause" : "Activate"} aria-label={row.active ? "Pause" : "Activate"}>
                          {row.active ? <PauseCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(row)} title="Delete" aria-label="Delete" className="text-muted-foreground hover:text-rose-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sold" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1 w-fit">
            {(["all", "active", "expired", "used"] as const).map((f) => (
              <button key={f} onClick={() => setCpFilter(f)}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                  cpFilter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {f === "used" ? "Fully Used" : f}
              </button>
            ))}
          </div>
          {filteredCP.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
              No sold packages yet. Sell a package to a client from the Package Types tab.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40 bg-card/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Package</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Used / Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCP.map((cp) => {
                    const pkg = rows.find((r) => r.id === cp.package_id);
                    const client = clients.find((c) => c.id === cp.client_id);
                    const remaining = cp.total_sessions - cp.sessions_used;
                    const pct = cp.total_sessions > 0 ? (cp.sessions_used / cp.total_sessions) * 100 : 0;
                    return (
                      <tr key={cp.id} className="border-b border-border/20 hover:bg-card/30">
                        <td className="px-4 py-3">{client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : "—"}</td>
                        <td className="px-4 py-3 font-medium">{pkg?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs tabular-nums">{cp.sessions_used} / {cp.total_sessions}</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-background">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{cp.expires_at ? new Date(cp.expires_at).toLocaleDateString() : "Never"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs",
                            cp.status === "active" ? "border-emerald-500/30 text-emerald-300" : "border-border/60 text-muted-foreground")}>
                            {cp.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmtMoney(cp.paid_amount_cents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sell Modal */}
      {sellOpen && sellPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Sell Package</h2>
              <button onClick={() => setSellOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="font-medium">{sellPkg.name}</div>
                <div className="text-sm text-muted-foreground">{sellPkg.sessions} sessions · {fmtMoney(sellPkg.price_cents)}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellClient">Client</Label>
                <select id="sellClient" value={sellClientId} onChange={(e) => setSellClientId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm" aria-label="Select client">
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""} {c.email ? `(${c.email})` : ""}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPrice">Amount ($)</Label>
                <Input id="sellPrice" type="number" min="0" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setSellOpen(false)}>Cancel</Button>
                <Button onClick={handleSell} disabled={!sellClientId} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Sell Package
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Dialog */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{editing ? "Edit Package" : "New Package"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{editing ? "Update package details." : "Configure a prepaid bundle."}</p>
              </div>
              <button onClick={closeComposer} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full grid grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="validity">Validity</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="locations">Locations</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pname">Package Name *</Label>
                    <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Botox Annual Plan" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdesc">Description</Label>
                    <Textarea id="pdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Package Image</Label>
                    <PhotoUpload bucket="package-images" currentUrl={form.image_url || null} onUploaded={(url: string) => setForm({ ...form, image_url: url })} onRemoved={() => setForm({ ...form, image_url: "" })} clinicId={clinicId ?? ""} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pprice">Total Price ($) *</Label>
                      <Input id="pprice" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="psess">Number of Sessions *</Label>
                      <Input id="psess" type="number" min="1" max="100" value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} required />
                    </div>
                  </div>
                  {form.price && form.sessions && parseInt(form.sessions) > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                      <span className="text-primary font-medium">{fmtMoney(Math.round(parseFloat(form.price) * 100 / parseInt(form.sessions)))} per session</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="services" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ id: "specific", label: "Single Service" }, { id: "choice", label: "Choice of Services" }, { id: "different", label: "Different Each" }].map((t) => (
                        <button key={t.id} type="button" onClick={() => setForm({ ...form, session_type: t.id })}
                          className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition",
                            form.session_type === t.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Linked Services</Label>
                    <div className="max-h-60 overflow-y-auto space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
                      {Object.entries(serviceCategories).map(([cat, svcs]) => (
                        <div key={cat}>
                          <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{cat}</div>
                          {svcs.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-background/60 cursor-pointer">
                              <input type="checkbox" checked={form.service_ids.includes(s.id)}
                                onChange={(e) => setForm({ ...form, service_ids: e.target.checked ? [...form.service_ids, s.id] : form.service_ids.filter((x) => x !== s.id) })}
                                className="h-4 w-4 rounded border-border accent-primary" />
                              <span className="text-sm">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{form.service_ids.length} selected</p>
                  </div>
                </TabsContent>

                <TabsContent value="validity" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sessions expire after</Label>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: "never", label: "Never" }, { id: "30", label: "30 days" }, { id: "60", label: "60 days" }, { id: "90", label: "90 days" }, { id: "180", label: "6 months" }, { id: "365", label: "1 year" }, { id: "custom", label: "Custom" }].map((v) => (
                        <button key={v.id} type="button"
                          onClick={() => setForm({ ...form, validity_type: v.id, validity_days: v.id !== "never" && v.id !== "custom" ? v.id : form.validity_days })}
                          className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                            form.validity_type === v.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    {form.validity_type === "custom" && (
                      <Input type="number" min="1" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} placeholder="Days" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Activation Policy</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: "on_purchase", label: "Activates on purchase" }, { id: "on_first_use", label: "Activates on first use" }].map((a) => (
                        <button key={a.id} type="button" onClick={() => setForm({ ...form, activation_policy: a.id })}
                          className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition",
                            form.activation_policy === a.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div><div className="text-sm font-medium">Transferable to family</div><div className="text-xs text-muted-foreground">Allow sharing sessions with family members</div></div>
                    <Switch checked={form.transferable} onCheckedChange={(v) => setForm({ ...form, transferable: v })} />
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div><div className="text-sm font-medium">Members only</div><div className="text-xs text-muted-foreground">Only members can purchase this package</div></div>
                    <Switch checked={form.member_only} onCheckedChange={(v) => setForm({ ...form, member_only: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxCat">Tax Category</Label>
                    <Input id="taxCat" value={form.tax_category} onChange={(e) => setForm({ ...form, tax_category: e.target.value })} placeholder="e.g. medical, cosmetic" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div><div className="text-sm font-medium">Active</div><div className="text-xs text-muted-foreground">Paused packages can't be sold</div></div>
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  </div>
                </TabsContent>

                <TabsContent value="locations" className="space-y-4">
                  {locations.length < 2 ? (
                    <p className="text-sm text-muted-foreground">Single location — redeemable everywhere.</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Select where this package can be redeemed.</p>
                      {locations.map((l) => (
                        <label key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 cursor-pointer hover:border-primary/30">
                          <input type="checkbox" checked={form.location_ids.includes(l.id)}
                            onChange={(e) => setForm({ ...form, location_ids: e.target.checked ? [...form.location_ids, l.id] : form.location_ids.filter((x) => x !== l.id) })}
                            className="h-4 w-4 rounded border-border accent-primary" />
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{l.name}</span>
                        </label>
                      ))}
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={closeComposer}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {submitting ? "Saving…" : editing ? "Save Changes" : "Create Package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <Card className="border-border/60 bg-card/40 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60", accent)}>{icon}</div>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground/60">{sub}</div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center text-muted-foreground">{icon}</div>
      <div className="text-xs font-medium tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
