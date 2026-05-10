import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Crown,
  Star,
  Flame,
  Edit3,
  Trash2,
  Pause,
  Play,
  Copy as CopyIcon,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { syncPlanToSquare } from "@/lib/square/plans.functions";
import { getSquarePaymentsConfig } from "@/lib/square/connection.functions";
import { SquareCardForm } from "@/components/square-card-form";
import {
  enrollMember,
  cancelMemberSubscription,
  pauseMemberSubscription,
  resumeMemberSubscription,
  retryFailedCharge,
  changeMemberPlan,
} from "@/lib/square/subscriptions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/memberships")({
  component: MembershipsPage,
});

type MembershipRow = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  benefits: string | null;
  monthly_price_cents: number;
  member_count: number;
  active: boolean;
  billing_cadence: string | null;
  trial_days: number | null;
  square_plan_id: string | null;
  square_plan_variation_id: string | null;
  square_synced_at: string | null;
  square_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);

const fmtMoneyDecimal = (cents: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format((cents ?? 0) / 100);

type Tier = {
  key: string;
  name: string;
  tagline: string;
  pricePerMonth: number;
  benefits: string;
  icon: typeof Crown;
  accent: string;
};

const TIERS: Tier[] = [
  {
    key: "essential",
    name: "Essential Glow",
    tagline: "Entry-level monthly perks",
    pricePerMonth: 4900,
    benefits:
      "10% off all services\nFree skin consult quarterly\nMember-only product pricing",
    icon: Star,
    accent: "from-sky-400/30 via-cyan-400/10 to-transparent",
  },
  {
    key: "radiance",
    name: "Radiance VIP",
    tagline: "Most popular monthly tier",
    pricePerMonth: 14900,
    benefits:
      "1 facial credit per month (rolls over 60d)\n15% off injectables\nPriority booking + birthday gift",
    icon: Crown,
    accent: "from-amber-400/30 via-rose-400/10 to-transparent",
  },
  {
    key: "platinum",
    name: "Platinum Concierge",
    tagline: "Premium tier with concierge",
    pricePerMonth: 39900,
    benefits:
      "2 treatment credits / mo\n20% off everything\nDedicated provider + same-day booking\nComplimentary annual aesthetic plan",
    icon: Flame,
    accent: "from-fuchsia-400/30 via-violet-400/10 to-transparent",
  },
];

function MembershipsPage() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [composer, setComposer] = useState<MembershipRow | "new" | null>(null);
  const [enrollFor, setEnrollFor] = useState<MembershipRow | null>(null);

  const load = async () => {
    if (!activeClinic) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("monthly_price_cents", { ascending: false });
    if (error) {
      toast.error("Couldn't load memberships");
    } else {
      setRows((data ?? []) as MembershipRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (!activeClinic) return;
    const ch = supabase
      .channel(`memberships-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memberships",
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
      if (filter === "active" && !r.active) return false;
      if (filter === "paused" && r.active) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.benefits ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  // KPIs
  const activePlans = rows.filter((r) => r.active);
  const totalMembers = rows.reduce(
    (s, r) => s + Number(r.member_count ?? 0),
    0
  );
  const mrrCents = rows
    .filter((r) => r.active)
    .reduce(
      (s, r) =>
        s + Number(r.monthly_price_cents ?? 0) * Number(r.member_count ?? 0),
      0
    );
  const arrCents = mrrCents * 12;
  const arpu = totalMembers > 0 ? mrrCents / totalMembers : 0;

  // Top plan by MRR contribution
  const topPlan = [...rows]
    .map((r) => ({
      ...r,
      contribution:
        Number(r.monthly_price_cents ?? 0) * Number(r.member_count ?? 0),
    }))
    .sort((a, b) => b.contribution - a.contribution)[0];

  const togglePause = async (row: MembershipRow) => {
    const { error } = await supabase
      .from("memberships")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) toast.error("Couldn't update plan");
    else toast.success(row.active ? "Plan paused" : "Plan reactivated");
  };

  const duplicate = async (row: MembershipRow) => {
    if (!activeClinic) return;
    const { error } = await supabase.from("memberships").insert({
      clinic_id: activeClinic.clinic_id,
      name: `${row.name} (copy)`,
      description: row.description,
      benefits: row.benefits,
      monthly_price_cents: row.monthly_price_cents,
      member_count: 0,
      active: false,
    });
    if (error) toast.error("Couldn't duplicate");
    else toast.success("Duplicated as draft");
  };

  const remove = async (row: MembershipRow) => {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("id", row.id);
    if (error) toast.error(error.message ?? "Couldn't delete");
    else toast.success("Plan deleted");
  };

  const seedTier = async (tier: Tier) => {
    if (!activeClinic) return;
    const { error } = await supabase.from("memberships").insert({
      clinic_id: activeClinic.clinic_id,
      name: tier.name,
      description: tier.tagline,
      benefits: tier.benefits,
      monthly_price_cents: tier.pricePerMonth,
      member_count: 0,
      active: true,
    });
    if (error) toast.error("Couldn't add tier");
    else toast.success(`${tier.name} added`);
  };

  const syncFn = useServerFn(syncPlanToSquare);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const syncToSquare = async (row: MembershipRow) => {
    setSyncingId(row.id);
    try {
      await syncFn({ data: { membership_id: row.id } });
      toast.success(`${row.name} synced to Square`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            Recurring revenue
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Memberships</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Build predictable monthly revenue with VIP tiers — track members,
            MRR contribution, and tier health in one place.
          </p>
        </div>
        <Button
          onClick={() => setComposer("new")}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New plan
        </Button>
      </header>

      {/* KPI strip */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Monthly Recurring Revenue"
          value={fmtMoneyDecimal(mrrCents)}
          sub={`${fmtMoneyDecimal(arrCents)} ARR`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Active members"
          value={totalMembers.toLocaleString()}
          sub={`across ${activePlans.length} live plan${activePlans.length === 1 ? "" : "s"}`}
          icon={<Users className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Avg revenue / member"
          value={fmtMoneyDecimal(arpu)}
          sub="ARPU per month"
          icon={<Wallet className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Top plan"
          value={topPlan?.name ?? "—"}
          sub={
            topPlan
              ? `${fmtMoneyDecimal(topPlan.contribution)} / mo`
              : "Add a plan to start"
          }
          icon={<Crown className="h-4 w-4" />}
          accent="rose"
        />
      </section>

      {/* Tier templates */}
      {rows.length === 0 && !loading && (
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">
              Start with a proven tier structure
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {TIERS.map((tier) => (
              <TierTemplate
                key={tier.key}
                tier={tier}
                onAdd={() => seedTier(tier)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Toolbar */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans, benefits…"
            className="h-10 pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-card/40 p-0.5">
          {(
            [
              { k: "all", label: "All" },
              { k: "active", label: "Active" },
              { k: "paused", label: "Paused" },
            ] as const
          ).map((o) => (
            <button
              key={o.k}
              onClick={() => setFilter(o.k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                filter === o.k
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Plan grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[260px] animate-pulse rounded-2xl border border-border/60 bg-card/30"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-16 text-center">
          <BadgeCheck className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No plans match your filter</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing search or switching to another view.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <PlanCard
              key={row.id}
              row={row}
              mrrTotal={mrrCents}
              onEdit={() => setComposer(row)}
              onTogglePause={() => togglePause(row)}
              onDuplicate={() => duplicate(row)}
              onDelete={() => remove(row)}
              onSync={() => syncToSquare(row)}
              onEnroll={() => setEnrollFor(row)}
              syncing={syncingId === row.id}
            />
          ))}
        </section>
      )}

      {activeClinic && <MembersPanel clinicId={activeClinic.clinic_id} />}
      {activeClinic && <ChargesPanel clinicId={activeClinic.clinic_id} />}

      {composer && (
        <ComposerModal
          row={composer === "new" ? null : composer}
          onClose={() => setComposer(null)}
        />
      )}

      {enrollFor && (
        <EnrollModal
          membership={enrollFor}
          onClose={() => setEnrollFor(null)}
        />
      )}
    </div>
  );
}

/* ─────────── KPI card ─────────── */
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
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full ring-1",
            ring
          )}
        >
          {icon}
        </span>
      </div>
      <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/* ─────────── Tier template card ─────────── */
function TierTemplate({ tier, onAdd }: { tier: Tier; onAdd: () => void }) {
  const Icon = tier.icon;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br p-4 transition hover:border-primary/40",
        tier.accent
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/60 ring-1 ring-border/60">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">{tier.name}</p>
          <p className="text-[11px] text-muted-foreground">{tier.tagline}</p>
        </div>
      </div>
      <p className="mb-3 text-xl font-semibold tracking-tight">
        {fmtMoney(tier.pricePerMonth)}
        <span className="text-xs font-normal text-muted-foreground">
          {" "}
          / mo
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onAdd}
        className="w-full border-border/60 bg-background/60"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add this tier
      </Button>
    </div>
  );
}

/* ─────────── Plan card ─────────── */
function PlanCard({
  row,
  mrrTotal,
  onEdit,
  onTogglePause,
  onDuplicate,
  onDelete,
  onSync,
  onEnroll,
  syncing,
}: {
  row: MembershipRow;
  mrrTotal: number;
  onEdit: () => void;
  onTogglePause: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSync: () => void;
  onEnroll: () => void;
  syncing: boolean;
}) {
  const planMrr =
    Number(row.monthly_price_cents ?? 0) * Number(row.member_count ?? 0);
  const share = mrrTotal > 0 ? Math.round((planMrr / mrrTotal) * 100) : 0;
  const benefitsList = (row.benefits ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/60 bg-card/50 p-5 transition hover:border-primary/40 hover:shadow-elegant",
        !row.active && "opacity-70"
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight">
              {row.name}
            </h3>
            {row.active ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-medium uppercase tracking-wider text-emerald-300"
              >
                Live
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-border/60 bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Paused
              </Badge>
            )}
            {row.square_plan_id && !row.square_sync_error && (
              <Badge
                variant="outline"
                className="border-sky-500/40 bg-sky-500/10 text-[10px] font-medium uppercase tracking-wider text-sky-300"
                title={row.square_synced_at ? `Synced ${new Date(row.square_synced_at).toLocaleString()}` : "Synced"}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Square
              </Badge>
            )}
            {row.square_sync_error && (
              <Badge
                variant="outline"
                className="border-rose-500/40 bg-rose-500/10 text-[10px] font-medium uppercase tracking-wider text-rose-300"
                title={row.square_sync_error}
              >
                <AlertTriangle className="mr-1 h-3 w-3" /> Sync error
              </Badge>
            )}
          </div>
          {row.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {row.description}
            </p>
          )}
        </div>
      </header>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {fmtMoney(row.monthly_price_cents)}
        </span>
        <span className="text-xs text-muted-foreground">/ member / mo</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-center">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Members
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">
            {row.member_count}
          </dd>
        </div>
        <div className="border-x border-border/60">
          <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            MRR
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">
            {fmtMoney(planMrr)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Share
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">
            {share}%
          </dd>
        </div>
      </dl>

      {benefitsList.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {benefitsList.slice(0, 3).map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-primary/70" />
              <span className="line-clamp-1">{b}</span>
            </li>
          ))}
          {benefitsList.length > 3 && (
            <li className="pl-3 text-[10.5px] text-muted-foreground">
              + {benefitsList.length - 3} more
            </li>
          )}
        </ul>
      )}

      <footer className="mt-4 flex items-center justify-between gap-1.5 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-8 px-2 text-xs"
          >
            <Edit3 className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEnroll}
            disabled={!row.square_plan_variation_id || !row.active}
            title={
              !row.square_plan_variation_id
                ? "Sync this plan to Square first"
                : !row.active
                  ? "Plan is paused"
                  : "Enroll a member"
            }
            className="h-8 px-2 text-xs"
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Enroll
          </Button>
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn
            label={row.active ? "Pause" : "Resume"}
            onClick={onTogglePause}
            icon={
              row.active ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )
            }
          />
          <IconBtn
            label={syncing ? "Syncing…" : row.square_plan_id ? "Re-sync to Square" : "Sync to Square"}
            onClick={onSync}
            icon={<RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />}
          />
          <IconBtn
            label="Duplicate"
            onClick={onDuplicate}
            icon={<CopyIcon className="h-3.5 w-3.5" />}
          />
          <IconBtn
            label="Delete"
            onClick={onDelete}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
          />
        </div>
      </footer>
    </article>
  );
}

function IconBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/50",
        danger && "hover:bg-rose-500/10 hover:text-rose-300"
      )}
    >
      {icon}
    </button>
  );
}

/* ─────────── Composer modal ─────────── */
const CADENCES = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"] as const;
const schema = z.object({
  name: z.string().min(1, "Name required").max(160),
  description: z.string().max(500).optional().nullable(),
  benefits: z.string().max(2000).optional().nullable(),
  monthly_price_cents: z.number().int().min(0),
  member_count: z.number().int().min(0),
  active: z.boolean(),
  billing_cadence: z.enum(CADENCES),
  trial_days: z.number().int().min(0).max(90),
});

function ComposerModal({
  row,
  onClose,
}: {
  row: MembershipRow | null;
  onClose: () => void;
}) {
  const { activeClinic } = useAuth();
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [benefits, setBenefits] = useState(row?.benefits ?? "");
  const [priceDollars, setPriceDollars] = useState(
    row ? (row.monthly_price_cents / 100).toString() : ""
  );
  const [memberCount, setMemberCount] = useState(
    row ? row.member_count.toString() : "0"
  );
  const [active, setActive] = useState(row?.active ?? true);
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>(
    ((row?.billing_cadence as (typeof CADENCES)[number]) ?? "MONTHLY")
  );
  const [trialDays, setTrialDays] = useState((row?.trial_days ?? 0).toString());
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeClinic) return;
    const parsed = schema.safeParse({
      name: name.trim(),
      description: description?.trim() || null,
      benefits: benefits?.trim() || null,
      monthly_price_cents: Math.round((parseFloat(priceDollars) || 0) * 100),
      member_count: parseInt(memberCount) || 0,
      active,
      billing_cadence: cadence,
      trial_days: parseInt(trialDays) || 0,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    if (row) {
      const { error } = await supabase
        .from("memberships")
        .update(parsed.data)
        .eq("id", row.id);
      setBusy(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Plan updated");
        onClose();
      }
    } else {
      const { error } = await supabase.from("memberships").insert({
        clinic_id: activeClinic.clinic_id,
        ...parsed.data,
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Plan created");
        onClose();
      }
    }
  };

  const previewMrr =
    (parseFloat(priceDollars) || 0) * (parseInt(memberCount) || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border/60 bg-card shadow-elegant"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {row ? "Edit plan" : "New plan"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
              {row?.name ?? "Membership tier"}
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
            <Label htmlFor="m-name">Plan name</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Radiance VIP"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Tagline</Label>
            <Input
              id="m-desc"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Most popular monthly tier"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-price">Monthly price (CAD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="m-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="pl-7"
                  placeholder="149.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-members">Current members</Label>
              <Input
                id="m-members"
                type="number"
                min="0"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-cadence">Billing cadence</Label>
              <select
                id="m-cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as (typeof CADENCES)[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] text-muted-foreground">
                How often Square will charge each member.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-trial">Trial days (free)</Label>
              <Input
                id="m-trial"
                type="number"
                min="0"
                max="90"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="text-[10.5px] text-muted-foreground">
                0–90 days before billing starts.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-benefits">Benefits (one per line)</Label>
            <Textarea
              id="m-benefits"
              value={benefits ?? ""}
              onChange={(e) => setBenefits(e.target.value)}
              rows={5}
              placeholder={"1 facial credit per month\n15% off injectables\nPriority booking + birthday gift"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div>
              <p className="text-xs font-medium">Plan is live</p>
              <p className="text-[11px] text-muted-foreground">
                Paused plans stay visible internally but accept no new members.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Projected MRR contribution
            </span>
            <span className="text-base font-semibold tabular-nums text-primary">
              {new Intl.NumberFormat("en-CA", {
                style: "currency",
                currency: "CAD",
              }).format(previewMrr)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                / mo
              </span>
            </span>
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
            {busy ? "Saving…" : row ? "Save changes" : "Create plan"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

/* ─────────── Members panel (enrolled subscriptions) ─────────── */
type SubRow = {
  id: string;
  status: string;
  started_at: string | null;
  next_billing_at: string | null;
  square_subscription_id: string | null;
  client_id: string;
  membership_id: string;
  clients: { first_name: string; last_name: string | null; email: string | null } | null;
  memberships: { name: string; monthly_price_cents: number } | null;
};

function MembersPanel({ clinicId }: { clinicId: string }) {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelFn = useServerFn(cancelMemberSubscription);
  const pauseFn = useServerFn(pauseMemberSubscription);
  const resumeFn = useServerFn(resumeMemberSubscription);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [changeFor, setChangeFor] = useState<SubRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("membership_subscriptions")
      .select(
        "id,status,started_at,next_billing_at,square_subscription_id,client_id,membership_id,clients(first_name,last_name,email),memberships(name,monthly_price_cents)",
      )
      .eq("clinic_id", clinicId)
      .order("started_at", { ascending: false });
    setRows((data ?? []) as unknown as SubRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`msubs-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_subscriptions", filter: `clinic_id=eq.${clinicId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this membership in Square? Member loses access at period end.")) return;
    setBusyId(id);
    try {
      await cancelFn({ data: { subscription_id: id } });
      toast.success("Membership canceled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const handlePause = async (id: string) => {
    setBusyId(id);
    try {
      await pauseFn({ data: { subscription_id: id } });
      toast.success("Membership paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pause failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleResume = async (id: string) => {
    setBusyId(id);
    try {
      await resumeFn({ data: { subscription_id: id } });
      toast.success("Membership resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Enrolled members
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">
            {rows.length} active subscription{rows.length === 1 ? "" : "s"}
          </h2>
        </div>
      </header>
      {loading ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No members enrolled yet. Sync a plan to Square, then click Enroll on a plan card.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => {
            const name = r.clients
              ? `${r.clients.first_name} ${r.clients.last_name ?? ""}`.trim()
              : "Unknown client";
            const statusColor =
              r.status === "active"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : r.status === "paused"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : r.status === "past_due"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : "border-border/60 bg-muted/30 text-muted-foreground";
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.memberships?.name ?? "—"} · {r.clients?.email ?? "no email"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  {r.next_billing_at
                    ? `Next charge ${new Date(r.next_billing_at).toLocaleDateString()}`
                    : `Started ${r.started_at ? new Date(r.started_at).toLocaleDateString() : "—"}`}
                </div>
                <Badge variant="outline" className={cn("text-[10px] uppercase", statusColor)}>
                  {r.status}
                </Badge>
                {r.status === "active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => handlePause(r.id)}
                    className="h-8 px-2 text-xs text-amber-300 hover:bg-amber-500/10"
                  >
                    <Pause className="mr-1 h-3.5 w-3.5" />
                    Pause
                  </Button>
                )}
                {r.status === "paused" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => handleResume(r.id)}
                    className="h-8 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Resume
                  </Button>
                )}
                {r.status !== "canceled" && r.status !== "expired" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => handleCancel(r.id)}
                    className="h-8 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    <Ban className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ─────────── Enroll modal ─────────── */
type ClientLite = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
};

function EnrollModal({
  membership,
  onClose,
}: {
  membership: MembershipRow;
  onClose: () => void;
}) {
  const enrollFn = useServerFn(enrollMember);
  const cfgFn = useServerFn(getSquarePaymentsConfig);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [cardSourceId, setCardSourceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentsCfg, setPaymentsCfg] = useState<{
    applicationId: string;
    locationId: string;
    environment: "sandbox" | "production";
  } | null>(null);
  const [cfgErr, setCfgErr] = useState<string | null>(null);

  useEffect(() => {
    cfgFn({ data: { clinic_id: membership.clinic_id } })
      .then((r) =>
        setPaymentsCfg({
          applicationId: r.applicationId,
          locationId: r.locationId,
          environment: r.environment as "sandbox" | "production",
        }),
      )
      .catch((e: unknown) =>
        setCfgErr(e instanceof Error ? e.message : "Failed to load Square config"),
      );
  }, [cfgFn, membership.clinic_id]);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id,first_name,last_name,email")
      .eq("clinic_id", membership.clinic_id)
      .order("first_name")
      .limit(500)
      .then(({ data }) => setClients((data ?? []) as ClientLite[]));
  }, [membership.clinic_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error("Pick a client");
    if (!cardSourceId.trim()) return toast.error("Card source token required");
    setBusy(true);
    try {
      await enrollFn({
        data: {
          membership_id: membership.id,
          client_id: clientId,
          card_source_id: cardSourceId.trim(),
        },
      });
      toast.success("Member enrolled in Square");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enroll failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border/60 bg-card shadow-elegant"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Enroll member
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
              {membership.name} — {fmtMoney(membership.monthly_price_cents)}/mo
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
            <Label htmlFor="e-search">Find client</Label>
            <Input
              id="e-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background/40">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No clients match
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {filtered.slice(0, 100).map((c) => {
                    const selected = c.id === clientId;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setClientId(c.id)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition",
                            selected ? "bg-primary/15" : "hover:bg-muted/40",
                          )}
                        >
                          <span className="truncate">
                            {c.first_name} {c.last_name ?? ""}
                          </span>
                          <span className="ml-3 truncate text-xs text-muted-foreground">
                            {c.email}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            {cfgErr && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                {cfgErr}
              </p>
            )}
            {!cfgErr && !paymentsCfg && (
              <p className="text-[10.5px] text-muted-foreground">Loading secure card field…</p>
            )}
            {paymentsCfg && (
              <SquareCardForm
                applicationId={paymentsCfg.applicationId}
                locationId={paymentsCfg.locationId}
                environment={paymentsCfg.environment}
                hasToken={!!cardSourceId}
                onToken={(t) => {
                  setCardSourceId(t);
                  toast.success("Card tokenized — ready to enroll");
                }}
              />
            )}
            {cardSourceId && (
              <p className="text-[10.5px] text-emerald-500">
                Card token ready ({cardSourceId.slice(0, 12)}…)
              </p>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !clientId || !cardSourceId.trim()}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
          >
            {busy ? "Enrolling…" : "Enroll member"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

/* ─────────── Charges history ─────────── */

type ChargeRow = {
  id: string;
  subscription_id: string;
  amount_cents: number;
  currency: string | null;
  status: string;
  charged_at: string | null;
  failure_reason: string | null;
  square_invoice_id: string | null;
  membership_subscriptions: {
    clients: { first_name: string; last_name: string | null } | null;
    memberships: { name: string } | null;
  } | null;
};

function ChargesPanel({ clinicId }: { clinicId: string }) {
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const retryFn = useServerFn(retryFailedCharge);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("membership_charges")
      .select(
        "id,subscription_id,amount_cents,currency,status,charged_at,failure_reason,square_invoice_id,membership_subscriptions(clients(first_name,last_name),memberships(name))",
      )
      .eq("clinic_id", clinicId)
      .order("charged_at", { ascending: false, nullsFirst: false })
      .limit(50);
    setRows((data ?? []) as unknown as ChargeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`mcharges-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_charges", filter: `clinic_id=eq.${clinicId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      await retryFn({ data: { charge_id: id } });
      toast.success("Charge succeeded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setBusyId(null);
    }
  };

  const fmtMoney = (cents: number, currency: string | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(
      cents / 100,
    );

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-card/40">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Recent charges
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">
            Last {rows.length} charge{rows.length === 1 ? "" : "s"}
          </h2>
        </div>
      </header>
      {loading ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No charges yet. Square will post invoices here as members are billed.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c) => {
            const cl = c.membership_subscriptions?.clients;
            const name = cl ? `${cl.first_name} ${cl.last_name ?? ""}`.trim() : "—";
            const planName = c.membership_subscriptions?.memberships?.name ?? "—";
            const statusColor =
              c.status === "paid"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : c.status === "failed"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : c.status === "refunded"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    : "border-border/60 bg-muted/30 text-muted-foreground";
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {planName}
                    {c.failure_reason ? ` · ${c.failure_reason}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  {c.charged_at ? new Date(c.charged_at).toLocaleString() : "—"}
                </div>
                <div className="w-24 text-right text-sm font-semibold tabular-nums">
                  {fmtMoney(c.amount_cents, c.currency)}
                </div>
                <Badge variant="outline" className={cn("text-[10px] uppercase", statusColor)}>
                  {c.status}
                </Badge>
                {c.status === "failed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => handleRetry(c.id)}
                    className="h-8 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
