import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Gift,
  Plus,
  Search,
  Wallet,
  Copy,
  Edit3,
  Trash2,
  X,
  Power,
  PowerOff,
  Mail,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GiftCardRedeem } from "@/components/gift-card-redeem";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/giftcards")({
  component: GiftCardsPage,
});

type GiftCardRow = {
  id: string;
  clinic_id: string;
  code: string;
  purchaser_name: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  initial_value_cents: number;
  balance_cents: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const VALUE_PRESETS = [
  { cents: 5000, label: "$50", hint: "Starter" },
  { cents: 10000, label: "$100", hint: "Popular" },
  { cents: 15000, label: "$150", hint: "Treat" },
  { cents: 25000, label: "$250", hint: "Premium" },
  { cents: 50000, label: "$500", hint: "VIP" },
  { cents: 100000, label: "$1,000", hint: "Concierge" },
];

const giftCardSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code is required")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, _ and - only"),
  purchaser_name: z.string().trim().max(120).optional().or(z.literal("")),
  recipient_name: z.string().trim().max(120).optional().or(z.literal("")),
  recipient_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  initial_value_cents: z.number().int().min(100, "Minimum $1.00"),
  balance_cents: z.number().int().min(0),
  expires_at: z.string().nullable(),
  active: z.boolean(),
});

type GiftCardFormState = {
  code: string;
  purchaser_name: string;
  recipient_name: string;
  recipient_email: string;
  initial_value: string;
  balance: string;
  expires_at: string;
  active: boolean;
};

const emptyForm: GiftCardFormState = {
  code: "",
  purchaser_name: "",
  recipient_name: "",
  recipient_email: "",
  initial_value: "100.00",
  balance: "100.00",
  expires_at: "",
  active: true,
};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) => {
    let out = "";
    for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };
  return `GC-${part(4)}-${part(4)}`;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);

const isExpired = (g: GiftCardRow) => !!g.expires_at && new Date(g.expires_at) < new Date();
const isDepleted = (g: GiftCardRow) => g.balance_cents <= 0;

function GiftCardsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<GiftCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "depleted" | "expired">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<GiftCardRow | null>(null);
  const [form, setForm] = useState<GiftCardFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        toast.error("Failed to load gift cards", { description: error.message });
      } else {
        setRows((data ?? []) as GiftCardRow[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`giftcards-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gift_cards", filter: `clinic_id=eq.${clinicId}` },
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
    return rows.filter((r) => {
      if (q) {
        const hay = [r.code, r.purchaser_name, r.recipient_name, r.recipient_email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "active" && (!r.active || isExpired(r) || isDepleted(r))) return false;
      if (filter === "depleted" && !isDepleted(r)) return false;
      if (filter === "expired" && !isExpired(r)) return false;
      return true;
    });
  }, [rows, search, filter]);

  const metrics = useMemo(() => {
    const outstanding = rows.reduce((sum, r) => sum + (r.active && !isExpired(r) ? r.balance_cents : 0), 0);
    const issued = rows.reduce((sum, r) => sum + r.initial_value_cents, 0);
    const redeemed = issued - rows.reduce((sum, r) => sum + r.balance_cents, 0);
    const active = rows.filter((r) => r.active && !isExpired(r) && !isDepleted(r)).length;
    return { outstanding, issued, redeemed, active };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: generateCode() });
    setComposerOpen(true);
  };

  const openEdit = (g: GiftCardRow) => {
    setEditing(g);
    setForm({
      code: g.code,
      purchaser_name: g.purchaser_name ?? "",
      recipient_name: g.recipient_name ?? "",
      recipient_email: g.recipient_email ?? "",
      initial_value: (g.initial_value_cents / 100).toFixed(2),
      balance: (g.balance_cents / 100).toFixed(2),
      expires_at: g.expires_at ? g.expires_at.slice(0, 10) : "",
      active: g.active,
    });
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const applyPreset = (cents: number) => {
    const value = (cents / 100).toFixed(2);
    setForm((prev) => ({
      ...prev,
      initial_value: value,
      balance: editing ? prev.balance : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const initial = Math.round(parseFloat(form.initial_value || "0") * 100);
    const balance = Math.round(parseFloat(form.balance || "0") * 100);

    const parsed = giftCardSchema.safeParse({
      code: form.code.toUpperCase(),
      purchaser_name: form.purchaser_name,
      recipient_name: form.recipient_name,
      recipient_email: form.recipient_email,
      initial_value_cents: isNaN(initial) ? 0 : initial,
      balance_cents: isNaN(balance) ? 0 : balance,
      expires_at: form.expires_at || null,
      active: form.active,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (parsed.data.balance_cents > parsed.data.initial_value_cents) {
      toast.error("Balance can't exceed initial value");
      return;
    }

    setSubmitting(true);
    const payload = {
      code: parsed.data.code,
      purchaser_name: parsed.data.purchaser_name || null,
      recipient_name: parsed.data.recipient_name || null,
      recipient_email: parsed.data.recipient_email || null,
      initial_value_cents: parsed.data.initial_value_cents,
      balance_cents: parsed.data.balance_cents,
      expires_at: parsed.data.expires_at,
      active: parsed.data.active,
    };

    if (editing) {
      const { error } = await supabase.from("gift_cards").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Failed to update gift card", { description: error.message });
      } else {
        toast.success("Gift card updated");
        closeComposer();
      }
    } else {
      const { error } = await supabase.from("gift_cards").insert({ ...payload, clinic_id: clinicId });
      if (error) {
        toast.error("Failed to issue gift card", { description: error.message });
      } else {
        toast.success("Gift card issued");
        closeComposer();
      }
    }
    setSubmitting(false);
  };

  const toggleActive = async (g: GiftCardRow) => {
    const { error } = await supabase.from("gift_cards").update({ active: !g.active }).eq("id", g.id);
    if (error) {
      toast.error("Failed to update", { description: error.message });
    } else {
      toast.success(g.active ? "Gift card paused" : "Gift card activated");
    }
  };

  const handleDelete = async (g: GiftCardRow) => {
    if (!confirm(`Void gift card ${g.code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("gift_cards").delete().eq("id", g.id);
    if (error) {
      toast.error("Failed to delete", { description: error.message });
    } else {
      toast.success("Gift card voided");
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Wallet className="h-3.5 w-3.5" />
            Stored value
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Gift Cards</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Sell stored-value cards, track outstanding liability, and let recipients redeem against any service —
            balances update live across every till.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Issue gift card
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Outstanding balance"
          value={money(metrics.outstanding)}
          icon={Wallet}
          accent="from-violet-500/20 to-indigo-500/10"
        />
        <MetricCard
          label="Total issued"
          value={money(metrics.issued)}
          icon={Gift}
          accent="from-rose-500/20 to-pink-500/10"
        />
        <MetricCard
          label="Total redeemed"
          value={money(metrics.redeemed)}
          icon={TrendingUp}
          accent="from-emerald-500/20 to-teal-500/10"
        />
        <MetricCard
          label="Live cards"
          value={metrics.active.toString()}
          icon={Sparkles}
          accent="from-amber-500/20 to-orange-500/10"
        />
      </div>

      {/* Quick redeem */}
      <GiftCardRedeem />

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, purchaser, recipient…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
          {(["all", "active", "depleted", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
          Loading gift cards…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No gift cards {filter !== "all" ? `(${filter})` : "yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Issue your first gift card — perfect for promos, refunds, or holiday campaigns.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Issue gift card
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => {
            const expired = isExpired(g);
            const depleted = isDepleted(g);
            const inactive = !g.active || expired || depleted;
            const usedPct =
              g.initial_value_cents > 0
                ? ((g.initial_value_cents - g.balance_cents) / g.initial_value_cents) * 100
                : 0;

            return (
              <article
                key={g.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/60 to-primary/5 p-5 backdrop-blur transition",
                  "hover:border-primary/40 hover:shadow-glow",
                  inactive && "opacity-70",
                )}
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-2xl" />
                <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-gradient-to-tr from-rose-500/20 to-transparent blur-2xl" />

                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-mono text-sm font-semibold tracking-wider">{g.code}</h3>
                          <button
                            onClick={() => copyCode(g.code)}
                            className="text-muted-foreground hover:text-primary"
                            title="Copy code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Issued {new Date(g.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {expired ? (
                      <Badge variant="destructive" className="shrink-0">Expired</Badge>
                    ) : depleted ? (
                      <Badge variant="secondary" className="shrink-0">Depleted</Badge>
                    ) : g.active ? (
                      <Badge className="shrink-0">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Paused</Badge>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Balance</div>
                        <div className="text-2xl font-semibold tabular-nums text-foreground">
                          {money(g.balance_cents)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">of</div>
                        <div className="text-sm font-medium tabular-nums text-muted-foreground">
                          {money(g.initial_value_cents)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{usedPct.toFixed(0)}% redeemed</div>
                  </div>

                  {/* Recipient */}
                  {(g.recipient_name || g.recipient_email || g.purchaser_name) && (
                    <div className="space-y-1.5 text-xs">
                      {g.purchaser_name && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3 w-3" />
                          From {g.purchaser_name}
                        </div>
                      )}
                      {g.recipient_name && (
                        <div className="flex items-center gap-1.5 text-foreground/80">
                          <Gift className="h-3 w-3" />
                          To {g.recipient_name}
                        </div>
                      )}
                      {g.recipient_email && (
                        <a href={`mailto:${g.recipient_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                          <Mail className="h-3 w-3" />
                          {g.recipient_email}
                        </a>
                      )}
                      {g.expires_at && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Expires {new Date(g.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => openEdit(g)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(g)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                    >
                      {g.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {g.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:border-destructive/40 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Composer */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/60 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{editing ? "Edit gift card" : "Issue gift card"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing ? "Update balance, recipient, or status." : "Create a stored-value card with optional recipient."}
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
              {/* Value presets */}
              {!editing && (
                <div className="space-y-2">
                  <Label>Quick values</Label>
                  <div className="flex flex-wrap gap-2">
                    {VALUE_PRESETS.map((p) => (
                      <button
                        key={p.cents}
                        type="button"
                        onClick={() => applyPreset(p.cents)}
                        className="group rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary"
                      >
                        {p.label}
                        <span className="ml-1.5 text-muted-foreground/60 group-hover:text-primary/60">· {p.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Card code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="GC-A1B2-C3D4"
                    maxLength={40}
                    required
                    className="font-mono tracking-wider"
                  />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: generateCode() })}>
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="initial">Initial value ($) *</Label>
                  <Input
                    id="initial"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.initial_value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        initial_value: v,
                        balance: editing ? prev.balance : v,
                      }));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Current balance ($)</Label>
                  <Input
                    id="balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchaser">Purchaser name</Label>
                  <Input
                    id="purchaser"
                    value={form.purchaser_name}
                    onChange={(e) => setForm({ ...form, purchaser_name: e.target.value })}
                    placeholder="Optional"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient name</Label>
                  <Input
                    id="recipient"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    placeholder="Optional"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.recipient_email}
                    onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                    placeholder="recipient@example.com"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires on</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
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
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">
                    Inactive cards cannot be redeemed at the till or by the validator above.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={closeComposer}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editing ? "Save changes" : "Issue card"}
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
  icon: typeof Gift;
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
