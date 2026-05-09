import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Gift, Plus, Search, Wallet, Copy, Edit3, Trash2, X, Power, PowerOff,
  Mail, User, Calendar, Sparkles, TrendingUp, MapPin, Download,
  CreditCard, Send, Clock, Eye, RefreshCcw, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
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
import { useServerFn } from "@tanstack/react-start";
import { sendGiftCardEmail } from "@/lib/email/giftcard.functions";

export const Route = createFileRoute("/app/giftcards")({ component: GiftCardsPage });

type GiftCardRow = {
  id: string; clinic_id: string; code: string;
  purchaser_name: string | null; recipient_name: string | null;
  recipient_email: string | null; initial_value_cents: number;
  balance_cents: number; expires_at: string | null; active: boolean;
  design_template: string | null; personal_message: string | null;
  sender_name: string | null; sender_email: string | null;
  delivery_method: string | null; scheduled_delivery_at: string | null;
  delivered_at: string | null; status: string | null;
  created_at: string; updated_at: string;
};
type GCTransaction = {
  id: string; gift_card_id: string; amount_cents: number;
  transaction_type: string; notes: string | null; created_at: string;
};
type LocationRow = { id: string; name: string; active: boolean };

const DESIGNS = [
  { id: "classic", label: "Classic Gold", gradient: "from-amber-900/60 via-yellow-700/40 to-amber-800/60" },
  { id: "botanical", label: "Botanical", gradient: "from-emerald-900/60 via-green-700/40 to-teal-800/60" },
  { id: "spa", label: "Spa Zen", gradient: "from-slate-800/60 via-stone-700/40 to-slate-900/60" },
  { id: "birthday", label: "Birthday", gradient: "from-pink-800/60 via-rose-600/40 to-fuchsia-800/60" },
  { id: "holiday", label: "Holiday", gradient: "from-red-900/60 via-red-700/40 to-green-900/60" },
  { id: "custom", label: "Custom", gradient: "from-violet-900/60 via-purple-700/40 to-indigo-800/60" },
];
const VALUE_PRESETS = [5000, 10000, 20000, 50000, 100000];

const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const isExpired = (g: GiftCardRow) => !!g.expires_at && new Date(g.expires_at) < new Date();
const isDepleted = (g: GiftCardRow) => g.balance_cents <= 0;

const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const p = (n: number) => { let o = ""; for (let i = 0; i < n; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };
  return `GC-${p(4)}-${p(4)}`;
};

type FormState = {
  code: string; design_template: string;
  initial_value: string; balance: string;
  recipient_name: string; recipient_email: string;
  sender_name: string; personal_message: string;
  delivery_method: string; scheduled_delivery_at: string;
  expires_type: string; expires_at: string;
  active: boolean; location_ids: string[];
};

const emptyForm: FormState = {
  code: "", design_template: "classic",
  initial_value: "100.00", balance: "100.00",
  recipient_name: "", recipient_email: "",
  sender_name: "", personal_message: "",
  delivery_method: "email", scheduled_delivery_at: "",
  expires_type: "never", expires_at: "",
  active: true, location_ids: [],
};

function GiftCardsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const sendEmail = useServerFn(sendGiftCardEmail);
  const [rows, setRows] = useState<GiftCardRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [gcLocationMap, setGcLocationMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "depleted" | "expired" | "refunded">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<GiftCardRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [detailCard, setDetailCard] = useState<GiftCardRow | null>(null);
  const [transactions, setTransactions] = useState<GCTransaction[]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    const [gRes, lRes, glRes] = await Promise.all([
      supabase.from("gift_cards").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("locations").select("id, name, active").eq("clinic_id", clinicId).eq("active", true),
      supabase.from("gift_card_locations").select("gift_card_id, location_id"),
    ]);
    if (gRes.error) toast.error(gRes.error.message);
    setRows((gRes.data ?? []) as GiftCardRow[]);
    setLocations((lRes.data ?? []) as LocationRow[]);
    const map: Record<string, string[]> = {};
    (glRes.data ?? []).forEach((r: any) => {
      if (!map[r.gift_card_id]) map[r.gift_card_id] = [];
      map[r.gift_card_id].push(r.location_id);
    });
    setGcLocationMap(map);
    setLoading(false);
  };

  useEffect(() => {
    if (!clinicId) return;
    load();
    const ch = supabase.channel(`gc-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gift_cards", filter: `clinic_id=eq.${clinicId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = [r.code, r.purchaser_name, r.recipient_name, r.recipient_email].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "active" && (!r.active || isExpired(r) || isDepleted(r))) return false;
      if (filter === "depleted" && !isDepleted(r)) return false;
      if (filter === "expired" && !isExpired(r)) return false;
      if (filter === "refunded" && r.status !== "refunded") return false;
      if (locationFilter !== "all") {
        const locs = gcLocationMap[r.id];
        if (locs && locs.length > 0 && !locs.includes(locationFilter)) return false;
      }
      return true;
    });
  }, [rows, search, filter, locationFilter, gcLocationMap]);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const soldThisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart);
    const totalSoldMonth = soldThisMonth.reduce((s, r) => s + r.initial_value_cents, 0);
    const outstanding = rows.reduce((s, r) => s + (r.active && !isExpired(r) ? r.balance_cents : 0), 0);
    const activeCards = rows.filter((r) => r.active && !isExpired(r) && !isDepleted(r)).length;
    const redeemed = rows.reduce((s, r) => s + (r.initial_value_cents - r.balance_cents), 0);
    return { totalSoldMonth, outstanding, activeCards, redeemed };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: genCode(), location_ids: locations.map((l) => l.id) });
    setActiveTab("design");
    setComposerOpen(true);
  };

  const openEdit = (g: GiftCardRow) => {
    setEditing(g);
    setForm({
      code: g.code, design_template: g.design_template ?? "classic",
      initial_value: (g.initial_value_cents / 100).toFixed(2),
      balance: (g.balance_cents / 100).toFixed(2),
      recipient_name: g.recipient_name ?? "", recipient_email: g.recipient_email ?? "",
      sender_name: g.sender_name ?? "", personal_message: g.personal_message ?? "",
      delivery_method: g.delivery_method ?? "email",
      scheduled_delivery_at: g.scheduled_delivery_at ? g.scheduled_delivery_at.slice(0, 16) : "",
      expires_type: g.expires_at ? "custom" : "never",
      expires_at: g.expires_at ? g.expires_at.slice(0, 10) : "",
      active: g.active, location_ids: gcLocationMap[g.id] ?? [],
    });
    setActiveTab("design");
    setComposerOpen(true);
  };

  const closeComposer = () => { setComposerOpen(false); setEditing(null); };

  const openDetail = async (g: GiftCardRow) => {
    setDetailCard(g);
    const { data } = await supabase.from("gift_card_transactions").select("*").eq("gift_card_id", g.id).order("created_at", { ascending: false });
    setTransactions((data ?? []) as GCTransaction[]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    const initial = Math.round(parseFloat(form.initial_value || "0") * 100);
    const balance = editing ? Math.round(parseFloat(form.balance || "0") * 100) : initial;
    if (initial < 100) { toast.error("Minimum value is $1.00"); return; }

    setSubmitting(true);
    let expiresAt: string | null = null;
    if (form.expires_type === "1year") expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
    else if (form.expires_type === "2year") expiresAt = new Date(Date.now() + 730 * 86400000).toISOString();
    else if (form.expires_type === "custom") expiresAt = form.expires_at || null;

    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(), design_template: form.design_template,
      initial_value_cents: initial, balance_cents: balance,
      recipient_name: form.recipient_name || null, recipient_email: form.recipient_email || null,
      sender_name: form.sender_name || null, personal_message: form.personal_message || null,
      delivery_method: form.delivery_method,
      scheduled_delivery_at: form.delivery_method === "scheduled" && form.scheduled_delivery_at ? form.scheduled_delivery_at : null,
      expires_at: expiresAt, active: form.active,
    };

    let gcId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("gift_cards").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from("gift_cards").insert({ ...payload, clinic_id: clinicId } as any).select("id").single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      gcId = data.id;
    }

    if (gcId) {
      await supabase.from("gift_card_locations").delete().eq("gift_card_id", gcId);
      if (form.location_ids.length > 0 && form.location_ids.length < locations.length) {
        await supabase.from("gift_card_locations").insert(
          form.location_ids.map((lid) => ({ gift_card_id: gcId, location_id: lid })) as any
        );
      }
    }

    // Auto-send delivery email when issuing a new card with email delivery
    if (!editing && gcId && form.delivery_method === "email" && form.recipient_email) {
      try {
        await sendEmail({ data: { giftCardId: gcId } });
        toast.success("Gift card issued and email sent");
      } catch (e: any) {
        toast.success("Gift card issued");
        toast.error(`Email send failed: ${e?.message ?? "unknown"}`);
      }
    } else {
      toast.success(editing ? "Gift card updated" : "Gift card issued");
    }
    setSubmitting(false);
    closeComposer();
    await load();
  };

  const adjustBalance = async () => {
    if (!detailCard) return;
    const cents = Math.round(parseFloat(adjustAmount || "0") * 100);
    if (cents === 0) { toast.error("Enter an amount"); return; }
    const newBalance = detailCard.balance_cents + cents;
    if (newBalance < 0) { toast.error("Balance can't go negative"); return; }

    const { error: ue } = await supabase.from("gift_cards").update({ balance_cents: newBalance } as any).eq("id", detailCard.id);
    if (ue) { toast.error(ue.message); return; }
    await supabase.from("gift_card_transactions").insert({
      gift_card_id: detailCard.id, amount_cents: cents,
      transaction_type: cents > 0 ? "adjustment_credit" : "adjustment_debit",
      notes: adjustReason || null,
    } as any);
    toast.success("Balance adjusted");
    setAdjustAmount(""); setAdjustReason("");
    await load();
    openDetail({ ...detailCard, balance_cents: newBalance });
  };

  const toggleActive = async (g: GiftCardRow) => {
    const { error } = await supabase.from("gift_cards").update({ active: !g.active } as any).eq("id", g.id);
    if (error) toast.error(error.message);
    else toast.success(g.active ? "Gift card paused" : "Gift card activated");
  };

  const handleDelete = async (g: GiftCardRow) => {
    if (!confirm(`Void gift card ${g.code}?`)) return;
    const { error } = await supabase.from("gift_cards").delete().eq("id", g.id);
    if (error) toast.error(error.message);
    else toast.success("Gift card voided");
  };

  const exportCSV = () => {
    const headers = ["Code", "Recipient", "Initial", "Balance", "Expires", "Status"];
    const csvRows = [headers.join(",")];
    filtered.forEach((g) => {
      csvRows.push([g.code, `"${g.recipient_name ?? ""}"`, (g.initial_value_cents / 100).toFixed(2), (g.balance_cents / 100).toFixed(2), g.expires_at ?? "", g.active ? "active" : "inactive"].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "gift-cards.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const designGradient = (id: string | null) => DESIGNS.find((d) => d.id === (id ?? "classic"))?.gradient ?? DESIGNS[0].gradient;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Wallet className="h-3.5 w-3.5" /> Stored value
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Gift Cards</h1>
          <p className="max-w-[95vw] sm:max-w-2xl text-sm text-muted-foreground">
            Issue stored-value cards, track balances, and let recipients redeem against any service.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} aria-label="Export gift cards CSV"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Issue Gift Card
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Sold This Month" value={money(metrics.totalSoldMonth)} icon={CreditCard} accent="from-violet-500/20 to-indigo-500/10" />
        <MetricCard label="Active Cards" value={metrics.activeCards.toString()} icon={Gift} accent="from-rose-500/20 to-pink-500/10" />
        <MetricCard label="Outstanding Balance" value={money(metrics.outstanding)} icon={Wallet} accent="from-amber-500/20 to-orange-500/10" />
        <MetricCard label="Redeemed Total" value={money(metrics.redeemed)} icon={TrendingUp} accent="from-emerald-500/20 to-teal-500/10" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, recipient, purchaser…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {locations.length >= 2 && (
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-card/40 px-3 text-xs text-foreground" aria-label="Filter by location">
              <option value="all">All Locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
            {(["all", "active", "depleted", "expired", "refunded"] as const).map((f) => (
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
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">Loading gift cards…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No gift cards {filter !== "all" ? `(${filter})` : "yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Issue your first to start a new revenue stream.</p>
          <Button onClick={openCreate} className="mt-6"><Plus className="mr-2 h-4 w-4" /> Issue Gift Card</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => {
            const expired = isExpired(g);
            const depleted = isDepleted(g);
            const usedPct = g.initial_value_cents > 0 ? ((g.initial_value_cents - g.balance_cents) / g.initial_value_cents) * 100 : 0;
            const locs = gcLocationMap[g.id];
            return (
              <article key={g.id}
                className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-glow",
                  (!g.active || expired) && "opacity-70")}>
                {/* Design header */}
                <div className={cn("h-16 bg-gradient-to-r", designGradient(g.design_template))}>
                  <div className="flex h-full items-center justify-between px-5">
                    <span className="font-mono text-sm font-semibold tracking-wider text-white/90">{g.code}</span>
                    <button onClick={() => { navigator.clipboard.writeText(g.code); toast.success(`Copied ${g.code}`); }}
                      className="text-white/60 hover:text-white" aria-label={`Copy code ${g.code}`}><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      {g.recipient_name && <p className="text-sm font-medium">To: {g.recipient_name}</p>}
                      {g.sender_name && <p className="text-xs text-muted-foreground">From: {g.sender_name}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued {new Date(g.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {expired ? <Badge variant="destructive">Expired</Badge>
                      : depleted ? <Badge variant="secondary">Depleted</Badge>
                      : g.active ? <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Active</Badge>
                      : <Badge variant="secondary">Paused</Badge>}
                  </div>

                  {/* Balance */}
                  <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Balance</div>
                        <div className="text-2xl font-semibold tabular-nums">{money(g.balance_cents)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">of</div>
                        <div className="text-sm font-medium tabular-nums text-muted-foreground">{money(g.initial_value_cents)}</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${usedPct}%` }} />
                    </div>
                  </div>

                  {locs && locs.length > 0 && locs.length < locations.length && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground rounded-full border border-border/40 px-2 py-0.5">
                      <MapPin className="h-3 w-3" /> {locs.length} location{locs.length > 1 ? "s" : ""}
                    </span>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openDetail(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label="View details">
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                    <button onClick={() => openEdit(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label="Edit">
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => toggleActive(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary" aria-label={g.active ? "Pause" : "Activate"}>
                      {g.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />} {g.active ? "Pause" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:border-destructive/40 hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {detailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Gift Card Details</h2>
                <p className="font-mono text-sm text-muted-foreground">{detailCard.code}</p>
              </div>
              <button onClick={() => setDetailCard(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className={cn("rounded-xl p-4 bg-gradient-to-r text-white", designGradient(detailCard.design_template))}>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">{money(detailCard.balance_cents)}</div>
                  <div className="text-sm opacity-75">of {money(detailCard.initial_value_cents)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Recipient:</span> <span className="font-medium">{detailCard.recipient_name ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Sender:</span> <span className="font-medium">{detailCard.sender_name ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Expires:</span> <span className="font-medium">{detailCard.expires_at ? new Date(detailCard.expires_at).toLocaleDateString() : "Never"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{detailCard.active ? "Active" : "Paused"}</span></div>
              </div>

              {/* Adjust balance */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
                <h3 className="text-sm font-medium">Adjust Balance</h3>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="+50 or -25" className="flex-1" />
                  <Button variant="outline" onClick={adjustBalance} disabled={!adjustAmount}>Apply</Button>
                </div>
                <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason (optional, audit logged)" />
              </div>

              {/* Transaction history */}
              <div>
                <h3 className="mb-3 text-sm font-medium">Transaction History</h3>
                {transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium capitalize">{t.transaction_type.replace(/_/g, " ")}</div>
                          {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                          <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <div className={cn("font-mono font-semibold", t.amount_cents >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {t.amount_cents >= 0 ? "+" : ""}{money(t.amount_cents)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  if (!detailCard.recipient_email) { toast.error("No email on file"); return; }
                  try {
                    await sendEmail({ data: { giftCardId: detailCard.id } });
                    toast.success("Resend queued");
                    await load();
                  } catch (e: any) {
                    toast.error(`Send failed: ${e?.message ?? "unknown"}`);
                  }
                }} className="flex-1">
                  <Send className="mr-2 h-4 w-4" /> Resend
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer Modal */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{editing ? "Edit Gift Card" : "Issue Gift Card"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{editing ? "Update card details." : "Create a new stored-value card."}</p>
              </div>
              <button onClick={closeComposer} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full grid grid-cols-4">
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="delivery">Delivery</TabsTrigger>
                  <TabsTrigger value="locations">Locations</TabsTrigger>
                </TabsList>

                <TabsContent value="design" className="space-y-4">
                  <Label>Choose a design</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {DESIGNS.map((d) => (
                      <button key={d.id} type="button" onClick={() => setForm({ ...form, design_template: d.id })}
                        className={cn("rounded-xl border-2 p-1 transition", form.design_template === d.id ? "border-primary" : "border-transparent hover:border-primary/30")}>
                        <div className={cn("h-20 rounded-lg bg-gradient-to-r flex items-center justify-center", d.gradient)}>
                          <span className="text-white/90 text-xs font-medium">{d.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Live preview */}
                  <div className={cn("rounded-xl p-5 bg-gradient-to-r text-white", designGradient(form.design_template))}>
                    <div className="text-center space-y-1">
                      <Gift className="mx-auto h-6 w-6 opacity-80" />
                      <div className="text-2xl font-bold">{form.initial_value ? `$${parseFloat(form.initial_value).toFixed(0)}` : "$0"}</div>
                      {form.recipient_name && <div className="text-sm opacity-75">For {form.recipient_name}</div>}
                      {form.personal_message && <div className="text-xs opacity-60 italic">"{form.personal_message}"</div>}
                      <div className="font-mono text-xs opacity-50">{form.code}</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex flex-wrap gap-2">
                      {VALUE_PRESETS.map((v) => (
                        <button key={v} type="button" onClick={() => setForm({ ...form, initial_value: (v / 100).toFixed(2), balance: editing ? form.balance : (v / 100).toFixed(2) })}
                          className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition",
                            parseFloat(form.initial_value) === v / 100 ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30")}>
                          {money(v)}
                        </button>
                      ))}
                    </div>
                    <Input type="number" min="25" max="10000" step="0.01" value={form.initial_value}
                      onChange={(e) => setForm({ ...form, initial_value: e.target.value, balance: editing ? form.balance : e.target.value })} placeholder="Custom amount" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gc-code">Card Code</Label>
                    <div className="flex gap-2">
                      <Input id="gc-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono" />
                      <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: genCode() })}>Generate</Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="rname">Recipient Name</Label>
                      <Input id="rname" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="remail">Recipient Email</Label>
                      <Input id="remail" type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sname">Sender Name</Label>
                    <Input id="sname" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pmsg">Personal Message</Label>
                    <Textarea id="pmsg" value={form.personal_message} onChange={(e) => setForm({ ...form, personal_message: e.target.value })} maxLength={500} rows={3} placeholder="A personal note shown on the card…" />
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Delivery Method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: "email", label: "Email Now", icon: Mail }, { id: "scheduled", label: "Email Later", icon: Clock }, { id: "print", label: "Print", icon: CreditCard }, { id: "sms", label: "SMS Link", icon: Send }].map((d) => (
                        <button key={d.id} type="button" onClick={() => setForm({ ...form, delivery_method: d.id })}
                          className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                            form.delivery_method === d.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30")}>
                          <d.icon className="h-4 w-4" /> {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.delivery_method === "scheduled" && (
                    <div className="space-y-2">
                      <Label htmlFor="schedAt">Delivery Date</Label>
                      <Input id="schedAt" type="datetime-local" value={form.scheduled_delivery_at}
                        onChange={(e) => setForm({ ...form, scheduled_delivery_at: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Expiry</Label>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: "never", label: "Never" }, { id: "1year", label: "1 Year" }, { id: "2year", label: "2 Years" }, { id: "custom", label: "Custom" }].map((e) => (
                        <button key={e.id} type="button" onClick={() => setForm({ ...form, expires_type: e.id })}
                          className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                            form.expires_type === e.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>
                          {e.label}
                        </button>
                      ))}
                    </div>
                    {form.expires_type === "custom" && (
                      <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="locations" className="space-y-4">
                  {locations.length < 2 ? (
                    <p className="text-sm text-muted-foreground">Single location — redeemable everywhere.</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Select where this gift card can be redeemed.</p>
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
                  {submitting ? "Saving…" : editing ? "Save Changes" : "Issue Gift Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Gift; accent: string }) {
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
