import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Ticket,
  Plus,
  Search,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  Edit3,
  Trash2,
  X,
  Power,
  PowerOff,
  TrendingUp,
  Sparkles,
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
import { CouponValidator } from "@/components/coupon-validator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/coupons")({
  component: CouponsPage,
});

type CouponRow = {
  id: string;
  clinic_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const DISCOUNT_PRESETS = [
  { type: "percent" as const, value: 10, label: "10% off", hint: "Soft discount" },
  { type: "percent" as const, value: 20, label: "20% off", hint: "Mid-tier promo" },
  { type: "percent" as const, value: 30, label: "30% off", hint: "Aggressive" },
  { type: "fixed" as const, value: 5000, label: "$50 off", hint: "Voucher style" },
  { type: "fixed" as const, value: 10000, label: "$100 off", hint: "Bigger ticket" },
];

const couponSchema = z.object({
  code: z.string().trim().min(2, "Code is required").max(40).regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, _ and - only"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().min(0.01, "Must be greater than 0"),
  usage_limit: z.number().int().min(0).nullable(),
  expires_at: z.string().nullable(),
  active: z.boolean(),
});

type CouponFormState = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  usage_limit: string;
  expires_at: string;
  active: boolean;
};

const emptyForm: CouponFormState = {
  code: "",
  discount_type: "percent",
  discount_value: "10",
  usage_limit: "",
  expires_at: "",
  active: true,
};

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const formatDiscount = (c: CouponRow) =>
  c.discount_type === "percent"
    ? `${c.discount_value}% off`
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(c.discount_value / 100) + " off";

const isExpired = (c: CouponRow) => !!c.expires_at && new Date(c.expires_at) < new Date();
const isExhausted = (c: CouponRow) => c.usage_limit !== null && c.used_count >= c.usage_limit;

function CouponsPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "exhausted">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        toast.error("Failed to load coupons", { description: error.message });
      } else {
        setRows((data ?? []) as CouponRow[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`coupons-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons", filter: `clinic_id=eq.${clinicId}` },
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
      if (q && !r.code.toLowerCase().includes(q)) return false;
      if (filter === "active" && (!r.active || isExpired(r) || isExhausted(r))) return false;
      if (filter === "expired" && !isExpired(r)) return false;
      if (filter === "exhausted" && !isExhausted(r)) return false;
      return true;
    });
  }, [rows, search, filter]);

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.active && !isExpired(r) && !isExhausted(r)).length;
    const totalRedemptions = rows.reduce((sum, r) => sum + (r.used_count ?? 0), 0);
    const expiringSoon = rows.filter((r) => {
      if (!r.expires_at) return false;
      const days = (new Date(r.expires_at).getTime() - Date.now()) / 86_400_000;
      return days > 0 && days <= 7;
    }).length;
    const topPromo = [...rows].sort((a, b) => (b.used_count ?? 0) - (a.used_count ?? 0))[0];
    return { active, totalRedemptions, expiringSoon, topPromo };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: generateCode() });
    setComposerOpen(true);
  };

  const openEdit = (c: CouponRow) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type as "percent" | "fixed",
      discount_value:
        c.discount_type === "fixed" ? (c.discount_value / 100).toString() : c.discount_value.toString(),
      usage_limit: c.usage_limit?.toString() ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      active: c.active,
    });
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const applyPreset = (preset: (typeof DISCOUNT_PRESETS)[number]) => {
    setForm((prev) => ({
      ...prev,
      discount_type: preset.type,
      discount_value: preset.type === "fixed" ? (preset.value / 100).toString() : preset.value.toString(),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const valueNum = parseFloat(form.discount_value);
    const parsed = couponSchema.safeParse({
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: isNaN(valueNum) ? 0 : valueNum,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      expires_at: form.expires_at || null,
      active: form.active,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (parsed.data.discount_type === "percent" && parsed.data.discount_value > 100) {
      toast.error("Percent discount can't exceed 100%");
      return;
    }

    setSubmitting(true);
    const payload = {
      code: parsed.data.code,
      discount_type: parsed.data.discount_type,
      discount_value:
        parsed.data.discount_type === "fixed"
          ? Math.round(parsed.data.discount_value * 100)
          : parsed.data.discount_value,
      usage_limit: parsed.data.usage_limit,
      expires_at: parsed.data.expires_at,
      active: parsed.data.active,
    };

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Failed to update coupon", { description: error.message });
      } else {
        toast.success("Coupon updated");
        closeComposer();
      }
    } else {
      const { error } = await supabase.from("coupons").insert({ ...payload, clinic_id: clinicId });
      if (error) {
        toast.error("Failed to create coupon", { description: error.message });
      } else {
        toast.success("Coupon created");
        closeComposer();
      }
    }
    setSubmitting(false);
  };

  const toggleActive = async (c: CouponRow) => {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) {
      toast.error("Failed to update", { description: error.message });
    } else {
      toast.success(c.active ? "Coupon paused" : "Coupon activated");
    }
  };

  const handleDelete = async (c: CouponRow) => {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) {
      toast.error("Failed to delete", { description: error.message });
    } else {
      toast.success("Coupon deleted");
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
            <Sparkles className="h-3.5 w-3.5" />
            Promotions engine
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Coupons</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Spin up promo codes in seconds. Track redemptions, cap usage, and let expiry windows do the marketing
            work for you.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          New coupon
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active codes"
          value={metrics.active.toString()}
          icon={Ticket}
          accent="from-violet-500/20 to-indigo-500/10"
        />
        <MetricCard
          label="Total redemptions"
          value={metrics.totalRedemptions.toString()}
          icon={TrendingUp}
          accent="from-emerald-500/20 to-teal-500/10"
        />
        <MetricCard
          label="Expiring in 7 days"
          value={metrics.expiringSoon.toString()}
          icon={Clock}
          accent="from-amber-500/20 to-orange-500/10"
        />
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/10 blur-2xl" />
          <div className="relative space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
              <Sparkles className="h-4.5 w-4.5 text-foreground/80" />
            </div>
            <div>
              <div className="truncate text-2xl font-semibold tabular-nums">
                {metrics.topPromo?.code ?? "—"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Top promo · {metrics.topPromo?.used_count ?? 0} uses
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick validator */}
      <CouponValidator />

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
          {(["all", "active", "expired", "exhausted"] as const).map((f) => (
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
          Loading coupons…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No coupons {filter !== "all" ? `(${filter})` : "yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first promo to drive bookings, win-back, or referrals.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            New coupon
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const expired = isExpired(c);
            const exhausted = isExhausted(c);
            const inactive = !c.active || expired || exhausted;
            const usagePct = c.usage_limit ? Math.min(100, ((c.used_count ?? 0) / c.usage_limit) * 100) : 0;

            return (
              <article
                key={c.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition",
                  "hover:border-primary/40 hover:shadow-glow",
                  inactive && "opacity-70",
                )}
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20">
                        {c.discount_type === "percent" ? (
                          <Percent className="h-5 w-5 text-primary" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-mono text-base font-semibold tracking-wider">{c.code}</h3>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="text-muted-foreground hover:text-primary"
                            title="Copy code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDiscount(c)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {expired ? (
                        <Badge variant="destructive" className="shrink-0">
                          Expired
                        </Badge>
                      ) : exhausted ? (
                        <Badge variant="secondary" className="shrink-0">
                          Exhausted
                        </Badge>
                      ) : c.active ? (
                        <Badge className="shrink-0">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {c.used_count ?? 0} {c.usage_limit ? `/ ${c.usage_limit}` : ""} redeemed
                      </span>
                      {c.expires_at && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.expires_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {c.usage_limit ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/70">No usage cap</div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                    >
                      {c.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {c.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
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
                <h2 className="text-lg font-semibold">{editing ? "Edit coupon" : "New coupon"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing ? "Update promo terms and usage rules." : "Configure a discount, usage cap, and expiry."}
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
              {/* Quick presets */}
              <div className="space-y-2">
                <Label>Quick presets</Label>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="group rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:text-primary"
                    >
                      {p.label}
                      <span className="ml-1.5 text-muted-foreground/60 group-hover:text-primary/60">· {p.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Promo code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME20"
                    maxLength={40}
                    required
                    className="font-mono tracking-wider"
                  />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: generateCode() })}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Letters, numbers, dashes, underscores. Auto-uppercased.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Discount type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, discount_type: "percent" })}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                        form.discount_type === "percent"
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      <Percent className="h-4 w-4" />
                      Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, discount_type: "fixed" })}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                        form.discount_type === "fixed"
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      <DollarSign className="h-4 w-4" />
                      Fixed
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    Discount value {form.discount_type === "percent" ? "(%)" : "($)"}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step={form.discount_type === "percent" ? "1" : "0.01"}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="limit">Usage limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="0"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder="Unlimited"
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
                    Inactive codes will be rejected at checkout and the validator above.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" onClick={closeComposer}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editing ? "Save changes" : "Create coupon"}
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
  icon: typeof Ticket;
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
