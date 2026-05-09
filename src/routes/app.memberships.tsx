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
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { syncPlanToSquare } from "@/lib/square/plans.functions";
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
              syncing={syncingId === row.id}
            />
          ))}
        </section>
      )}

      {composer && (
        <ComposerModal
          row={composer === "new" ? null : composer}
          onClose={() => setComposer(null)}
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
}: {
  row: MembershipRow;
  mrrTotal: number;
  onEdit: () => void;
  onTogglePause: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
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
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-8 px-2 text-xs"
        >
          <Edit3 className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
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
const schema = z.object({
  name: z.string().min(1, "Name required").max(160),
  description: z.string().max(500).optional().nullable(),
  benefits: z.string().max(2000).optional().nullable(),
  monthly_price_cents: z.number().int().min(0),
  member_count: z.number().int().min(0),
  active: z.boolean(),
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
