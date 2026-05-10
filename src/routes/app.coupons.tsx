import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Ticket, Plus, Search, Percent, DollarSign, Calendar, Copy, Edit3,
  Trash2, X, Power, PowerOff, TrendingUp, Sparkles, Clock, MapPin,
  Download, Upload, Gift, Users, Shield, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/coupons")({ component: CouponsPage });

/* ── types ── */
type CouponRow = {
  id: string; clinic_id: string; code: string; name: string | null;
  description: string | null; discount_type: string; discount_value: number;
  max_discount_cents: number | null; min_purchase_cents: number | null;
  stackable: boolean; usage_limit: number | null; per_client_limit: number | null;
  first_time_only: boolean; used_count: number; expires_at: string | null;
  starts_at: string | null; valid_days: string[] | null;
  valid_start_time: string | null; valid_end_time: string | null;
  applies_to_type: string | null; applies_to_ids: string[] | null;
  visible_to_clients: boolean; active: boolean;
  created_at: string; updated_at: string;
};
type LocationRow = { id: string; name: string; active: boolean };

/* ── templates ── */
const TEMPLATES = [
  { name: "Welcome 10%", code: "WELCOME10", type: "percent" as const, value: 10, hint: "10% off first visit" },
  { name: "Birthday 25%", code: "BIRTHDAY25", type: "percent" as const, value: 25, hint: "25% off birthday month" },
  { name: "Refer $50", code: "REFER50", type: "fixed" as const, value: 5000, hint: "$50 off referrals" },
  { name: "VIP 15%", code: "VIP15", type: "percent" as const, value: 15, hint: "15% off VIP members" },
  { name: "Win-back 20%", code: "WINBACK20", type: "percent" as const, value: 20, hint: "20% off after 60 days" },
  { name: "Botox 10%", code: "BOTOX10", type: "percent" as const, value: 10, hint: "10% off Botox" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type FormState = {
  name: string; code: string; description: string;
  discount_type: "percent" | "fixed"; discount_value: string;
  max_discount_cents: string; min_purchase_cents: string;
  stackable: boolean; usage_limit: string; per_client_limit: string;
  first_time_only: boolean; starts_at: string; expires_at: string;
  valid_days: string[]; valid_start_time: string; valid_end_time: string;
  applies_to_type: string; visible_to_clients: boolean; active: boolean;
  location_ids: string[];
};

const empty: FormState = {
  name: "", code: "", description: "",
  discount_type: "percent", discount_value: "10",
  max_discount_cents: "", min_purchase_cents: "",
  stackable: false, usage_limit: "", per_client_limit: "1",
  first_time_only: false, starts_at: "", expires_at: "",
  valid_days: [...DAYS], valid_start_time: "", valid_end_time: "",
  applies_to_type: "all", visible_to_clients: true, active: true,
  location_ids: [],
};

const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let o = "";
  for (let i = 0; i < 8; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
};

const fmtDiscount = (c: CouponRow) =>
  c.discount_type === "percent"
    ? `${c.discount_value}% off`
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(c.discount_value / 100) + " off";

const isExpired = (c: CouponRow) => !!c.expires_at && new Date(c.expires_at) < new Date();
const isScheduled = (c: CouponRow) => !!c.starts_at && new Date(c.starts_at) > new Date();
const isExhausted = (c: CouponRow) => c.usage_limit !== null && c.used_count >= c.usage_limit;

function CouponsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [couponLocationMap, setCouponLocationMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "expired" | "disabled">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "most_used" | "highest" | "expiring">("recent");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    const [cRes, lRes, clRes] = await Promise.all([
      supabase.from("coupons").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("locations").select("id, name, active").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("coupon_locations").select("coupon_id, location_id"),
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    setRows((cRes.data ?? []) as CouponRow[]);
    setLocations((lRes.data ?? []) as LocationRow[]);
    const map: Record<string, string[]> = {};
    (clRes.data ?? []).forEach((r: any) => {
      if (!map[r.coupon_id]) map[r.coupon_id] = [];
      map[r.coupon_id].push(r.location_id);
    });
    setCouponLocationMap(map);
    setLoading(false);
  };

  useEffect(() => {
    if (!clinicId) return;
    load();
    const ch = supabase
      .channel(`coupons-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (q && !r.code.toLowerCase().includes(q) && !(r.name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "active" && (!r.active || isExpired(r) || isExhausted(r) || isScheduled(r))) return false;
      if (filter === "scheduled" && !isScheduled(r)) return false;
      if (filter === "expired" && !isExpired(r)) return false;
      if (filter === "disabled" && r.active) return false;
      if (locationFilter !== "all") {
        const locs = couponLocationMap[r.id];
        if (locs && locs.length > 0 && !locs.includes(locationFilter)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "most_used") return (b.used_count ?? 0) - (a.used_count ?? 0);
      if (sortBy === "highest") return b.discount_value - a.discount_value;
      if (sortBy === "expiring") {
        const da = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const db = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [rows, search, filter, locationFilter, sortBy, couponLocationMap]);

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.active && !isExpired(r) && !isExhausted(r)).length;
    const totalRedemptions = rows.reduce((s, r) => s + (r.used_count ?? 0), 0);
    const totalDiscountCents = rows.reduce((s, r) => {
      if (r.discount_type === "fixed") return s + (r.used_count ?? 0) * r.discount_value;
      return s;
    }, 0);
    const topPromo = [...rows].sort((a, b) => (b.used_count ?? 0) - (a.used_count ?? 0))[0];
    return { active, totalRedemptions, totalDiscountCents, topPromo };
  }, [rows]);

  const openCreate = (template?: typeof TEMPLATES[number]) => {
    setEditing(null);
    const f = { ...empty, code: template?.code ?? genCode(), location_ids: locations.map((l) => l.id) };
    if (template) {
      f.name = template.name;
      f.discount_type = template.type;
      f.discount_value = template.type === "fixed" ? (template.value / 100).toString() : template.value.toString();
    }
    setForm(f);
    setActiveTab("basic");
    setComposerOpen(true);
  };

  const openEdit = (c: CouponRow) => {
    setEditing(c);
    setForm({
      name: c.name ?? "", code: c.code, description: c.description ?? "",
      discount_type: c.discount_type as "percent" | "fixed",
      discount_value: c.discount_type === "fixed" ? (c.discount_value / 100).toString() : c.discount_value.toString(),
      max_discount_cents: c.max_discount_cents ? (c.max_discount_cents / 100).toString() : "",
      min_purchase_cents: c.min_purchase_cents ? (c.min_purchase_cents / 100).toString() : "",
      stackable: c.stackable ?? false,
      usage_limit: c.usage_limit?.toString() ?? "",
      per_client_limit: c.per_client_limit?.toString() ?? "1",
      first_time_only: c.first_time_only ?? false,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      valid_days: c.valid_days ?? [...DAYS],
      valid_start_time: c.valid_start_time ?? "",
      valid_end_time: c.valid_end_time ?? "",
      applies_to_type: c.applies_to_type ?? "all",
      visible_to_clients: c.visible_to_clients ?? true,
      active: c.active, location_ids: couponLocationMap[c.id] ?? [],
    });
    setActiveTab("basic");
    setComposerOpen(true);
  };

  const closeComposer = () => { setComposerOpen(false); setEditing(null); };

  const handleSubmit = async (e: FormEvent, andAnother = false) => {
    e.preventDefault();
    if (!clinicId) return;
    const valueNum = parseFloat(form.discount_value);
    if (isNaN(valueNum) || valueNum <= 0) { toast.error("Discount value must be > 0"); return; }
    if (form.discount_type === "percent" && valueNum > 100) { toast.error("Percent can't exceed 100%"); return; }
    if (!form.code.trim()) { toast.error("Code is required"); return; }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(),
      name: form.name || null,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: form.discount_type === "fixed" ? Math.round(valueNum * 100) : valueNum,
      max_discount_cents: form.max_discount_cents ? Math.round(parseFloat(form.max_discount_cents) * 100) : null,
      min_purchase_cents: form.min_purchase_cents ? Math.round(parseFloat(form.min_purchase_cents) * 100) : null,
      stackable: form.stackable,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      per_client_limit: form.per_client_limit ? parseInt(form.per_client_limit) : null,
      first_time_only: form.first_time_only,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      valid_days: form.valid_days,
      valid_start_time: form.valid_start_time || null,
      valid_end_time: form.valid_end_time || null,
      applies_to_type: form.applies_to_type,
      visible_to_clients: form.visible_to_clients,
      active: form.active,
    };

    let couponId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("coupons").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from("coupons").insert({ ...payload, clinic_id: clinicId } as any).select("id").single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      couponId = data.id;
    }

    // Sync locations
    if (couponId) {
      await supabase.from("coupon_locations").delete().eq("coupon_id", couponId);
      if (form.location_ids.length > 0 && form.location_ids.length < locations.length) {
        await supabase.from("coupon_locations").insert(
          form.location_ids.map((lid) => ({ coupon_id: couponId, location_id: lid })) as any
        );
      }
    }

    toast.success(editing ? "Coupon updated" : "Coupon created");
    setSubmitting(false);
    if (andAnother) {
      setEditing(null);
      setForm({ ...empty, code: genCode(), location_ids: locations.map((l) => l.id) });
      setActiveTab("basic");
    } else {
      closeComposer();
    }
    await load();
  };

  const toggleActive = async (c: CouponRow) => {
    const { error } = await supabase.from("coupons").update({ active: !c.active } as any).eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success(c.active ? "Coupon disabled" : "Coupon activated");
  };

  const duplicateCoupon = async (c: CouponRow) => {
    if (!clinicId) return;
    const { error } = await supabase.from("coupons").insert({
      clinic_id: clinicId, code: c.code + "_COPY", name: (c.name ?? c.code) + " (copy)",
      description: c.description, discount_type: c.discount_type, discount_value: c.discount_value,
      max_discount_cents: c.max_discount_cents, min_purchase_cents: c.min_purchase_cents,
      stackable: c.stackable, usage_limit: c.usage_limit, per_client_limit: c.per_client_limit,
      first_time_only: c.first_time_only, starts_at: c.starts_at, expires_at: c.expires_at,
      valid_days: c.valid_days, applies_to_type: c.applies_to_type,
      visible_to_clients: c.visible_to_clients, active: false,
    } as any);
    if (error) toast.error(error.message);
    else toast.success("Coupon duplicated");
  };

  const handleDelete = async (c: CouponRow) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success("Coupon deleted");
  };

  const exportCSV = () => {
    const headers = ["Code", "Name", "Type", "Value", "Used", "Limit", "Expires", "Active"];
    const csvRows = [headers.join(",")];
    filtered.forEach((c) => {
      csvRows.push([
        c.code, `"${c.name ?? ""}"`, c.discount_type,
        c.discount_type === "fixed" ? (c.discount_value / 100).toFixed(2) : c.discount_value,
        c.used_count, c.usage_limit ?? "", c.expires_at ?? "", c.active,
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "coupons.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (c: CouponRow) => {
    if (!c.active) return <Badge variant="secondary">Disabled</Badge>;
    if (isExpired(c)) return <Badge variant="destructive">Expired</Badge>;
    if (isScheduled(c)) return <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">Scheduled</Badge>;
    if (isExhausted(c)) return <Badge variant="secondary">Exhausted</Badge>;
    return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Active</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Promotions engine
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Coupons</h1>
          <p className="max-w-[95vw] sm:max-w-2xl text-sm text-muted-foreground">
            Create promo codes, track redemptions, set usage caps, and let expiry windows do the marketing for you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} aria-label="Export coupons CSV">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={() => openCreate()} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New Coupon
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Active Coupons" value={metrics.active.toString()} icon={Ticket} accent="from-violet-500/20 to-indigo-500/10" />
        <MetricCard label="Total Redemptions" value={metrics.totalRedemptions.toString()} icon={TrendingUp} accent="from-emerald-500/20 to-teal-500/10" />
        <MetricCard label="Total Discount Given" value={metrics.totalDiscountCents > 0 ? `$${(metrics.totalDiscountCents / 100).toLocaleString()}` : "—"} icon={DollarSign} accent="from-amber-500/20 to-orange-500/10" />
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/10 blur-2xl" />
          <div className="relative space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
              <Sparkles className="h-4 w-4 text-foreground/80" />
            </div>
            <div>
              <div className="truncate text-2xl font-semibold tabular-nums">{metrics.topPromo?.code ?? "—"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Top Performing · {metrics.topPromo?.used_count ?? 0} uses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates strip */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Gift className="h-4 w-4 text-primary" /> Quick templates</div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.code} onClick={() => openCreate(t)}
              className="rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary">
              {t.code} <span className="ml-1 text-muted-foreground">· {t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-[95vw] sm:max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {locations.length >= 2 && (
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-card/40 px-3 text-xs text-foreground" aria-label="Filter by location">
              <option value="all">All Locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-lg border border-border/60 bg-card/40 px-3 text-xs text-foreground" aria-label="Sort by">
            <option value="recent">Recently created</option>
            <option value="most_used">Most used</option>
            <option value="highest">Highest discount</option>
            <option value="expiring">Expiring soon</option>
          </select>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
            {(["all", "active", "scheduled", "expired", "disabled"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                  filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/60 hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">Loading coupons…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No coupons {filter !== "all" ? `(${filter})` : "yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first promotion to drive bookings.</p>
          <Button onClick={() => openCreate()} className="mt-6"><Plus className="mr-2 h-4 w-4" /> New Coupon</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const usagePct = c.usage_limit ? Math.min(100, ((c.used_count ?? 0) / c.usage_limit) * 100) : 0;
            const locs = couponLocationMap[c.id];
            return (
              <article key={c.id}
                className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition hover:border-primary/40 hover:shadow-glow",
                  (!c.active || isExpired(c)) && "opacity-70")}>
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20">
                        {c.discount_type === "percent" ? <Percent className="h-5 w-5 text-primary" /> : <DollarSign className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-mono text-base font-semibold tracking-wider">{c.code}</h3>
                          <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success(`Copied ${c.code}`); }}
                            className="text-muted-foreground hover:text-primary" aria-label={`Copy code ${c.code}`}><Copy className="h-3.5 w-3.5" /></button>
                        </div>
                        {c.name && <p className="mt-0.5 text-xs text-muted-foreground">{c.name}</p>}
                        <p className="text-xs font-medium text-primary/80">{fmtDiscount(c)}</p>
                      </div>
                    </div>
                    {statusBadge(c)}
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {c.first_time_only && <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5"><Users className="h-3 w-3" /> First-time</span>}
                    {c.min_purchase_cents && c.min_purchase_cents > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5">Min ${(c.min_purchase_cents / 100)}</span>}
                    {locs && locs.length > 0 && locs.length < locations.length && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5"><MapPin className="h-3 w-3" /> {locs.length} loc{locs.length > 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {/* Usage bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{c.used_count ?? 0} {c.usage_limit ? `/ ${c.usage_limit}` : ""} redeemed</span>
                      {c.expires_at && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {c.usage_limit ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${usagePct}%` }} />
                      </div>
                    ) : <div className="text-xs text-muted-foreground">No usage cap</div>}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label="Edit coupon">
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => duplicateCoupon(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label="Duplicate coupon">
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                    <button onClick={() => toggleActive(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label={c.active ? "Disable" : "Enable"}>
                      {c.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />} {c.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => handleDelete(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:border-destructive/40 hover:text-destructive" aria-label="Delete coupon">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Composer Modal */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card px-4 sm:px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{editing ? "Edit Coupon" : "New Coupon"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{editing ? "Update promo terms and rules." : "Configure discount, limits, and validity."}</p>
              </div>
              <button onClick={closeComposer} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e)} className="px-4 sm:px-6 py-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="discount">Discount</TabsTrigger>
                  <TabsTrigger value="limits">Limits</TabsTrigger>
                  <TabsTrigger value="validity">Validity</TabsTrigger>
                  <TabsTrigger value="locations">Locations</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Coupon Name</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Promo 20% Off" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Coupon Code *</Label>
                    <div className="flex gap-2">
                      <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                        placeholder="WELCOME20" maxLength={20} required className="font-mono tracking-wider" />
                      <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: genCode() })}>Generate</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">4-20 chars, A-Z 0-9 only. Auto-uppercased.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Description (internal)</Label>
                    <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal notes…" rows={2} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Visible to clients</div>
                      <div className="text-xs text-muted-foreground">Show in client portal / booking widget</div>
                    </div>
                    <Switch checked={form.visible_to_clients} onCheckedChange={(v) => setForm({ ...form, visible_to_clients: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Active</div>
                      <div className="text-xs text-muted-foreground">Inactive codes are rejected at checkout</div>
                    </div>
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  </div>
                </TabsContent>

                <TabsContent value="discount" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(["percent", "fixed"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setForm({ ...form, discount_type: t })}
                          className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                            form.discount_type === t ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30")}>
                          {t === "percent" ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                          {t === "percent" ? "Percent off" : "Fixed amount off"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dval">Discount Value {form.discount_type === "percent" ? "(%)" : "($)"}</Label>
                    <Input id="dval" type="number" min="0" step={form.discount_type === "percent" ? "1" : "0.01"}
                      value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required />
                  </div>
                  {form.discount_type === "percent" && (
                    <div className="space-y-2">
                      <Label htmlFor="maxcap">Maximum discount cap ($)</Label>
                      <Input id="maxcap" type="number" min="0" step="0.01" value={form.max_discount_cents}
                        onChange={(e) => setForm({ ...form, max_discount_cents: e.target.value })} placeholder="No cap" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="minp">Minimum purchase amount ($)</Label>
                    <Input id="minp" type="number" min="0" step="0.01" value={form.min_purchase_cents}
                      onChange={(e) => setForm({ ...form, min_purchase_cents: e.target.value })} placeholder="No minimum" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Stackable with other discounts</div>
                      <div className="text-xs text-muted-foreground">Allow combining with other promotions</div>
                    </div>
                    <Switch checked={form.stackable} onCheckedChange={(v) => setForm({ ...form, stackable: v })} />
                  </div>
                </TabsContent>

                <TabsContent value="limits" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ulimit">Total Usage Limit</Label>
                      <Input id="ulimit" type="number" min="0" value={form.usage_limit}
                        onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pclimit">Per Client Limit</Label>
                      <Input id="pclimit" type="number" min="0" value={form.per_client_limit}
                        onChange={(e) => setForm({ ...form, per_client_limit: e.target.value })} placeholder="Unlimited" />
                    </div>
                  </div>
                  {editing && (
                    <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                      <div className="text-xs text-muted-foreground">Used {editing.used_count} / {editing.usage_limit ?? "∞"} times</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">First-time clients only</div>
                      <div className="text-xs text-muted-foreground">Only clients with no previous appointments</div>
                    </div>
                    <Switch checked={form.first_time_only} onCheckedChange={(v) => setForm({ ...form, first_time_only: v })} />
                  </div>
                </TabsContent>

                <TabsContent value="validity" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startsAt">Start Date</Label>
                      <Input id="startsAt" type="datetime-local" value={form.starts_at}
                        onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">End Date</Label>
                      <Input id="expiresAt" type="date" value={form.expires_at}
                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Leave blank for no expiration</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Days of week valid</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <button key={d} type="button"
                          onClick={() => setForm({ ...form, valid_days: form.valid_days.includes(d) ? form.valid_days.filter((x) => x !== d) : [...form.valid_days, d] })}
                          className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition",
                            form.valid_days.includes(d) ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vst">Valid from time</Label>
                      <Input id="vst" type="time" value={form.valid_start_time}
                        onChange={(e) => setForm({ ...form, valid_start_time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vet">Valid until time</Label>
                      <Input id="vet" type="time" value={form.valid_end_time}
                        onChange={(e) => setForm({ ...form, valid_end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Applies to</Label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "specific_services", "specific_categories", "retail", "memberships"].map((t) => (
                        <button key={t} type="button" onClick={() => setForm({ ...form, applies_to_type: t })}
                          className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition",
                            form.applies_to_type === t ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {t.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="locations" className="space-y-4">
                  {locations.length < 2 ? (
                    <p className="text-sm text-muted-foreground">Single location — coupon is available everywhere.</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Select which locations this coupon is valid at. Leave all selected for all locations.</p>
                      <div className="space-y-2">
                        {locations.map((l) => (
                          <label key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 cursor-pointer hover:border-primary/30">
                            <input type="checkbox" checked={form.location_ids.includes(l.id)}
                              onChange={(e) => setForm({ ...form, location_ids: e.target.checked ? [...form.location_ids, l.id] : form.location_ids.filter((x) => x !== l.id) })}
                              className="h-4 w-4 rounded border-border accent-primary" />
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{l.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={closeComposer}>Cancel</Button>
                {!editing && <Button type="button" variant="outline" onClick={(e) => handleSubmit(e as any, true)} disabled={submitting}>Save & Create Another</Button>}
                <Button type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {submitting ? "Saving…" : editing ? "Save Changes" : "Create Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Ticket; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl", accent)} />
      <div className="relative space-y-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
          <Icon className="h-4 w-4 text-foreground/80" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
