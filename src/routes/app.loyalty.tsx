import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Gem,
  Star,
  Crown,
  Trophy,
  Edit3,
  Trash2,
  Minus,
  ArrowUpRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/loyalty")({
  component: LoyaltyPage,
});

type LoyaltyRow = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  points_balance: number;
  lifetime_points: number;
  tier: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type TierKey = "bronze" | "silver" | "gold" | "platinum";

const TIER_THRESHOLDS: Record<TierKey, number> = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 5000,
};

const TIER_META: Record<
  TierKey,
  { label: string; icon: typeof Star; ring: string; gradient: string }
> = {
  bronze: {
    label: "Bronze",
    icon: Star,
    ring: "text-amber-700 bg-amber-700/10 ring-amber-700/30",
    gradient: "from-amber-700/30 via-amber-700/5 to-transparent",
  },
  silver: {
    label: "Silver",
    icon: Award,
    ring: "text-slate-300 bg-slate-300/10 ring-slate-300/30",
    gradient: "from-slate-300/30 via-slate-300/5 to-transparent",
  },
  gold: {
    label: "Gold",
    icon: Crown,
    ring: "text-amber-300 bg-amber-300/10 ring-amber-300/30",
    gradient: "from-amber-300/30 via-amber-300/5 to-transparent",
  },
  platinum: {
    label: "Platinum",
    icon: Gem,
    ring: "text-violet-300 bg-violet-300/10 ring-violet-300/30",
    gradient: "from-violet-300/30 via-violet-300/5 to-transparent",
  },
};

const tierFromLifetime = (lifetime: number): TierKey => {
  if (lifetime >= TIER_THRESHOLDS.platinum) return "platinum";
  if (lifetime >= TIER_THRESHOLDS.gold) return "gold";
  if (lifetime >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
};

const nextTierProgress = (lifetime: number) => {
  const order: TierKey[] = ["bronze", "silver", "gold", "platinum"];
  const current = tierFromLifetime(lifetime);
  const idx = order.indexOf(current);
  if (idx === order.length - 1) {
    return { next: null as TierKey | null, pct: 100, remaining: 0 };
  }
  const next = order[idx + 1];
  const lo = TIER_THRESHOLDS[current];
  const hi = TIER_THRESHOLDS[next];
  const pct = Math.min(100, Math.round(((lifetime - lo) / (hi - lo)) * 100));
  return { next, pct, remaining: Math.max(0, hi - lifetime) };
};

function LoyaltyPage() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<LoyaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | TierKey>("all");
  const [composer, setComposer] = useState<LoyaltyRow | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<LoyaltyRow | null>(null);

  const load = async () => {
    if (!activeClinic) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("lifetime_points", { ascending: false });
    if (error) toast.error("Couldn't load loyalty accounts");
    else setRows((data ?? []) as LoyaltyRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (!activeClinic) return;
    const ch = supabase
      .channel(`loyalty-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loyalty_accounts",
          filter: `clinic_id=eq.${activeClinic.clinic_id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const tier = (r.tier as TierKey) || tierFromLifetime(r.lifetime_points);
      if (tierFilter !== "all" && tier !== tierFilter) return false;
      if (!q) return true;
      return (
        r.client_name.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, tierFilter]);

  const totalMembers = rows.length;
  const totalPoints = rows.reduce((s, r) => s + Number(r.points_balance ?? 0), 0);
  const totalLifetime = rows.reduce((s, r) => s + Number(r.lifetime_points ?? 0), 0);
  const tierCounts = rows.reduce(
    (acc, r) => {
      const t = (r.tier as TierKey) || tierFromLifetime(r.lifetime_points);
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    { bronze: 0, silver: 0, gold: 0, platinum: 0 } as Record<TierKey, number>
  );
  const eliteCount = tierCounts.gold + tierCounts.platinum;
  const elitePct = totalMembers > 0 ? Math.round((eliteCount / totalMembers) * 100) : 0;
  const topMember = rows[0];

  const remove = async (row: LoyaltyRow) => {
    if (!confirm(`Remove ${row.client_name} from loyalty?`)) return;
    const { error } = await supabase.from("loyalty_accounts").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Account removed");
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Retention engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Loyalty</h1>
          <p className="max-w-[95vw] sm:max-w-xl text-sm text-muted-foreground">
            Reward repeat clients with points and tier perks. Tiers auto-adjust
            from lifetime points — no manual upkeep.
          </p>
        </div>
        <Button
          onClick={() => setComposer("new")}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Enroll member
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active members"
          value={totalMembers.toLocaleString()}
          sub={`${eliteCount} elite (${elitePct}%)`}
          icon={<Users className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Outstanding points"
          value={totalPoints.toLocaleString()}
          sub="Redeemable balance"
          icon={<Sparkles className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Lifetime earned"
          value={totalLifetime.toLocaleString()}
          sub="Cumulative across all members"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Top member"
          value={topMember?.client_name ?? "—"}
          sub={topMember ? `${topMember.lifetime_points.toLocaleString()} lifetime pts` : "Enroll your first member"}
          icon={<Crown className="h-4 w-4" />}
          accent="rose"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(TIER_META) as TierKey[]).map((t) => {
          const meta = TIER_META[t];
          const count = tierCounts[t];
          const Icon = meta.icon;
          const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
          return (
            <button
              key={t}
              onClick={() => setTierFilter(tierFilter === t ? "all" : t)}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition",
                meta.gradient,
                tierFilter === t
                  ? "border-primary/60 ring-1 ring-primary/40"
                  : "border-border/60 hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full ring-1", meta.ring)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {pct}%
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{count}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {meta.label} ·{" "}
                <span className="tabular-nums">{TIER_THRESHOLDS[t].toLocaleString()}+ pts</span>
              </p>
            </button>
          );
        })}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, notes…"
            className="h-10 pl-9"
          />
        </div>
        {tierFilter !== "all" && (
          <Button size="sm" variant="ghost" onClick={() => setTierFilter("all")} className="h-9 text-xs">
            Clear tier filter
            <X className="ml-1 h-3 w-3" />
          </Button>
        )}
      </section>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-border/60 bg-card/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 px-4 sm:px-6 py-16 text-center">
          <Trophy className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {rows.length === 0 ? "No loyalty members yet" : "No members match your filter"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length === 0
              ? "Enroll your first repeat client to start earning loyalty."
              : "Try clearing search or tier filter."}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <div className="grid grid-cols-12 gap-3 border-b border-border/60 bg-muted/20 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Member</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-2 text-right">Lifetime</div>
            <div className="col-span-3">Tier progress</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-border/60">
            {filtered.map((r) => (
              <MemberRow
                key={r.id}
                row={r}
                onAdjust={() => setAdjusting(r)}
                onEdit={() => setComposer(r)}
                onDelete={() => remove(r)}
              />
            ))}
          </ul>
        </section>
      )}

      {composer && (
        <ComposerModal row={composer === "new" ? null : composer} onClose={() => setComposer(null)} />
      )}
      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: "emerald" | "violet" | "amber" | "rose";
}) {
  const ring = {
    emerald: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
    violet: "text-violet-300 bg-violet-500/10 ring-violet-500/20",
    amber: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
    rose: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
  }[accent];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full ring-1", ring)}>
          {icon}
        </span>
      </div>
      <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MemberRow({
  row,
  onAdjust,
  onEdit,
  onDelete,
}: {
  row: LoyaltyRow;
  onAdjust: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tier = (row.tier as TierKey) || tierFromLifetime(row.lifetime_points);
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const { next, pct, remaining } = nextTierProgress(row.lifetime_points);
  const initials = row.client_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="grid grid-cols-12 items-center gap-3 px-4 py-3 transition hover:bg-muted/10">
      <div className="col-span-4 flex min-w-0 items-center gap-3">
        <span className={cn("inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1", meta.ring)}>
          {initials || <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.client_name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[9.5px] font-medium uppercase tracking-wider",
                tier === "platinum" && "border-violet-300/40 bg-violet-300/10 text-violet-300",
                tier === "gold" && "border-amber-300/40 bg-amber-300/10 text-amber-300",
                tier === "silver" && "border-slate-300/40 bg-slate-300/10 text-slate-300",
                tier === "bronze" && "border-amber-700/40 bg-amber-700/10 text-amber-700"
              )}
            >
              {meta.label}
            </Badge>
            {row.notes && (
              <span className="truncate text-[10.5px] text-muted-foreground">{row.notes}</span>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-2 text-right">
        <p className="text-sm font-semibold tabular-nums">{row.points_balance.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">redeemable</p>
      </div>

      <div className="col-span-2 text-right">
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {row.lifetime_points.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">earned all-time</p>
      </div>

      <div className="col-span-3">
        {next ? (
          <>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {remaining.toLocaleString()} → {TIER_META[next].label}
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-violet-300">
            <Gem className="h-3 w-3" />
            Top tier reached
          </div>
        )}
      </div>

      <div className="col-span-1 flex items-center justify-end gap-0.5">
        <button
          type="button"
          title="Adjust points"
          onClick={onAdjust}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Edit"
          onClick={onEdit}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/50"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Remove"
          onClick={onDelete}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

const composerSchema = z.object({
  client_name: z.string().min(1, "Member name required").max(160),
  points_balance: z.number().int().min(0),
  lifetime_points: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});

function ComposerModal({ row, onClose }: { row: LoyaltyRow | null; onClose: () => void }) {
  const { activeClinic } = useAuth();
  const [name, setName] = useState(row?.client_name ?? "");
  const [balance, setBalance] = useState(row ? row.points_balance.toString() : "0");
  const [lifetime, setLifetime] = useState(row ? row.lifetime_points.toString() : "0");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = composerSchema.safeParse({
      client_name: name.trim(),
      points_balance: parseInt(balance) || 0,
      lifetime_points: parseInt(lifetime) || 0,
      notes: notes?.trim() || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const tier = tierFromLifetime(parsed.data.lifetime_points);
    setBusy(true);
    if (row) {
      const { error } = await supabase
        .from("loyalty_accounts")
        .update({ ...parsed.data, tier })
        .eq("id", row.id);
      setBusy(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Member updated");
        onClose();
      }
    } else {
      const { error } = await supabase.from("loyalty_accounts").insert({
        clinic_id: activeClinic.clinic_id,
        ...parsed.data,
        tier,
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Member enrolled");
        onClose();
      }
    }
  };

  const previewTier = tierFromLifetime(parseInt(lifetime) || 0);
  const meta = TIER_META[previewTier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[95vw] sm:max-w-lg rounded-2xl border border-border/60 bg-card shadow-elegant"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {row ? "Edit member" : "Enroll member"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
              {row?.client_name ?? "Loyalty account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="l-name">Member name</Label>
            <Input
              id="l-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-bal">Points balance</Label>
              <Input
                id="l-bal"
                type="number"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-life">Lifetime points</Label>
              <Input
                id="l-life"
                type="number"
                min="0"
                value={lifetime}
                onChange={(e) => setLifetime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="l-notes">Notes</Label>
            <Textarea
              id="l-notes"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Birthday Mar 14 · prefers evening appts"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="text-xs text-muted-foreground">Tier (auto from lifetime)</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium uppercase tracking-wider", meta.ring)}
            >
              {meta.label}
            </Badge>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
          >
            {busy ? "Saving…" : row ? "Save changes" : "Enroll member"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function AdjustModal({ row, onClose }: { row: LoyaltyRow; onClose: () => void }) {
  const [delta, setDelta] = useState("100");
  const [mode, setMode] = useState<"earn" | "redeem">("earn");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const amt = Math.abs(parseInt(delta) || 0);
    if (amt <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setBusy(true);
    let newBalance = row.points_balance;
    let newLifetime = row.lifetime_points;
    if (mode === "earn") {
      newBalance += amt;
      newLifetime += amt;
    } else {
      if (amt > row.points_balance) {
        setBusy(false);
        toast.error("Not enough balance to redeem");
        return;
      }
      newBalance -= amt;
    }
    const tier = tierFromLifetime(newLifetime);
    const { error } = await supabase
      .from("loyalty_accounts")
      .update({ points_balance: newBalance, lifetime_points: newLifetime, tier })
      .eq("id", row.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${mode === "earn" ? "Earned" : "Redeemed"} ${amt} pts`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[95vw] sm:max-w-md rounded-2xl border border-border/60 bg-card shadow-elegant"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Adjust points
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{row.client_name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Current balance: {row.points_balance.toLocaleString()} pts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="inline-flex w-full rounded-lg border border-border/60 bg-background/40 p-0.5">
            <button
              onClick={() => setMode("earn")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-medium transition",
                mode === "earn"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Earn
            </button>
            <button
              onClick={() => setMode("redeem")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-medium transition",
                mode === "redeem"
                  ? "bg-rose-500/15 text-rose-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Minus className="mr-1 inline h-3.5 w-3.5" />
              Redeem
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-amt">Amount</Label>
            <Input
              id="adj-amt"
              type="number"
              min="1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[50, 100, 250, 500, 1000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDelta(v.toString())}
                className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={apply}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
          >
            {busy ? "Applying…" : `${mode === "earn" ? "Add" : "Redeem"} ${Math.abs(parseInt(delta) || 0)} pts`}
          </Button>
        </footer>
      </div>
    </div>
  );
}
