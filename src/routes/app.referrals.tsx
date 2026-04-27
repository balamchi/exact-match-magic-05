import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Share2,
  Plus,
  Search,
  TrendingUp,
  Users,
  Gift,
  Sparkles,
  Edit3,
  Trash2,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  XCircle,
  Mail,
  Copy,
  Megaphone,
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

export const Route = createFileRoute("/app/referrals")({
  component: ReferralsPage,
});

type ReferralRow = {
  id: string;
  clinic_id: string;
  referrer_name: string;
  referred_name: string;
  referred_email: string | null;
  status: string;
  reward_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StatusKey = "pending" | "booked" | "converted" | "expired";

const STATUS_META: Record<StatusKey, {
  label: string;
  icon: typeof Clock;
  badge: string;
  dot: string;
  gradient: string;
  ring: string;
}> = {
  pending: {
    label: "Pending",
    icon: Clock,
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    dot: "bg-amber-400",
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    ring: "ring-amber-400/30 text-amber-200",
  },
  booked: {
    label: "Booked",
    icon: Calendar,
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    dot: "bg-sky-400",
    gradient: "from-sky-500/10 via-sky-500/5 to-transparent",
    ring: "ring-sky-400/30 text-sky-200",
  },
  converted: {
    label: "Converted",
    icon: CheckCircle2,
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    dot: "bg-emerald-400",
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-400/30 text-emerald-200",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    badge: "border-border/60 bg-muted/40 text-muted-foreground",
    dot: "bg-muted-foreground",
    gradient: "from-muted/20 via-muted/10 to-transparent",
    ring: "ring-border/60 text-muted-foreground",
  },
};

const STATUS_FLOW: StatusKey[] = ["pending", "booked", "converted"];

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(iso));

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
};

function ReferralsPage() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [composer, setComposer] = useState<ReferralRow | "new" | null>(null);

  const load = async () => {
    if (!activeClinic) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Couldn't load referrals");
    else setRows((data ?? []) as ReferralRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (!activeClinic) return;
    const ch = supabase
      .channel(`referrals-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
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
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.referrer_name.toLowerCase().includes(q) ||
        r.referred_name.toLowerCase().includes(q) ||
        (r.referred_email ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const totalReferrals = rows.length;
  const statusCounts = rows.reduce(
    (acc, r) => {
      const k = (r.status as StatusKey) || "pending";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    { pending: 0, booked: 0, converted: 0, expired: 0 } as Record<StatusKey, number>
  );
  const conversionRate =
    totalReferrals > 0 ? Math.round((statusCounts.converted / totalReferrals) * 100) : 0;
  const rewardsOwed = rows
    .filter((r) => r.status === "converted")
    .reduce((s, r) => s + Number(r.reward_cents ?? 0), 0);
  const pipelineValue = rows
    .filter((r) => r.status === "pending" || r.status === "booked")
    .reduce((s, r) => s + Number(r.reward_cents ?? 0), 0);

  const topReferrers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; converted: number; rewards: number }>();
    rows.forEach((r) => {
      const key = r.referrer_name.trim();
      if (!key) return;
      const cur = map.get(key) ?? { name: key, count: 0, converted: 0, rewards: 0 };
      cur.count += 1;
      if (r.status === "converted") {
        cur.converted += 1;
        cur.rewards += Number(r.reward_cents ?? 0);
      }
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.converted - a.converted || b.count - a.count)
      .slice(0, 4);
  }, [rows]);

  const advance = async (row: ReferralRow) => {
    const idx = STATUS_FLOW.indexOf(row.status as StatusKey);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    const { error } = await supabase
      .from("referrals")
      .update({ status: next })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else
      toast.success(
        next === "converted"
          ? `${row.referred_name} converted — reward owed`
          : `Marked as ${STATUS_META[next].label.toLowerCase()}`
      );
  };

  const expire = async (row: ReferralRow) => {
    const { error } = await supabase
      .from("referrals")
      .update({ status: "expired" })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Referral expired");
  };

  const remove = async (row: ReferralRow) => {
    if (!confirm(`Remove referral for ${row.referred_name}?`)) return;
    const { error } = await supabase.from("referrals").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Referral removed");
  };

  const copyLink = () => {
    if (!activeClinic) return;
    const url = `${window.location.origin}/book/${activeClinic.clinic?.slug ?? activeClinic.clinic_id}?ref=share`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Referral link copied"),
      () => toast.error("Couldn't copy — try manually")
    );
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
            Word of mouth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Referrals</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Turn happy clients into your best marketing channel. Track every
            referrer-referee pair from invite to conversion — and the rewards
            you owe along the way.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copyLink}
            className="border-border/60 bg-card/30 backdrop-blur"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            Copy referral link
          </Button>
          <Button
            onClick={() => setComposer("new")}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Log referral
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total referrals"
          value={totalReferrals.toLocaleString()}
          sub={`${statusCounts.pending + statusCounts.booked} in pipeline`}
          icon={<Share2 className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Conversion rate"
          value={`${conversionRate}%`}
          sub={`${statusCounts.converted} converted`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Rewards owed"
          value={fmtMoney(rewardsOwed)}
          sub="From converted referrals"
          icon={<Gift className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Pipeline value"
          value={fmtMoney(pipelineValue)}
          sub="Potential payouts"
          icon={<Sparkles className="h-4 w-4" />}
          accent="rose"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(STATUS_META) as StatusKey[]).map((s) => {
          const meta = STATUS_META[s];
          const count = statusCounts[s];
          const Icon = meta.icon;
          const pct = totalReferrals > 0 ? Math.round((count / totalReferrals) * 100) : 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition",
                meta.gradient,
                statusFilter === s
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
              <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
            </button>
          );
        })}
      </section>

      {topReferrers.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card/30 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Top advocates</h2>
              <p className="text-xs text-muted-foreground">Clients sending the most successful referrals</p>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] uppercase tracking-wider text-primary">
              <Users className="mr-1 h-3 w-3" />
              Leaderboard
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {topReferrers.map((r, i) => (
              <div
                key={r.name}
                className="rounded-lg border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#{i + 1}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold tabular-nums">{r.converted}</span>
                  <span className="text-xs text-muted-foreground">/ {r.count} converted</span>
                </div>
                <p className="mt-0.5 text-xs text-emerald-300/80">{fmtMoney(r.rewards)} earned</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search referrer, referred, email…"
            className="h-10 pl-9"
          />
        </div>
        {statusFilter !== "all" && (
          <Button size="sm" variant="ghost" onClick={() => setStatusFilter("all")} className="h-9 text-xs">
            Clear status filter
            <X className="ml-1 h-3 w-3" />
          </Button>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card/20 backdrop-blur">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">No referrals yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query || statusFilter !== "all"
                  ? "Try clearing your filters"
                  : "Log your first referral to start tracking your viral loop"}
              </p>
            </div>
            {!query && statusFilter === "all" && (
              <Button size="sm" onClick={() => setComposer("new")} className="mt-2">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Log referral
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((row) => {
              const status = (row.status as StatusKey) || "pending";
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              const canAdvance = STATUS_FLOW.indexOf(status) >= 0 && STATUS_FLOW.indexOf(status) < STATUS_FLOW.length - 1;
              const nextStatus = canAdvance ? STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] : null;
              return (
                <li
                  key={row.id}
                  className="group flex flex-col gap-3 px-4 py-3.5 transition hover:bg-muted/20 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1", meta.ring)}>
                      <StatusIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{row.referrer_name}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium text-foreground/90">{row.referred_name}</span>
                        <Badge variant="outline" className={cn("ml-1 text-[10px] uppercase tracking-wider", meta.badge)}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {row.referred_email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {row.referred_email}
                          </span>
                        )}
                        <span>{fmtRelative(row.created_at)}</span>
                        {Number(row.reward_cents ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-emerald-300/80">
                            <Gift className="h-3 w-3" />
                            {fmtMoney(Number(row.reward_cents))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canAdvance && nextStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advance(row)}
                        className="h-8 border-primary/40 bg-primary/5 text-xs text-primary hover:bg-primary/10"
                      >
                        Mark {STATUS_META[nextStatus].label.toLowerCase()}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    {status !== "expired" && status !== "converted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => expire(row)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Mark expired"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setComposer(row)}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(row)}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {composer && activeClinic && (
        <ComposerModal
          row={composer === "new" ? null : composer}
          clinicId={activeClinic.clinic_id}
          onClose={() => setComposer(null)}
        />
      )}
    </div>
  );
}

const KPI_ACCENTS = {
  violet: "from-violet-500/20 via-violet-500/5 ring-violet-400/30 text-violet-300",
  emerald: "from-emerald-500/20 via-emerald-500/5 ring-emerald-400/30 text-emerald-300",
  amber: "from-amber-500/20 via-amber-500/5 ring-amber-400/30 text-amber-300",
  rose: "from-rose-500/20 via-rose-500/5 ring-rose-400/30 text-rose-300",
} as const;

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
  accent: keyof typeof KPI_ACCENTS;
}) {
  const tone = KPI_ACCENTS[accent];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br to-transparent p-4", tone.split(" ").slice(0, 2).join(" "))}>
      <div className="flex items-start justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/40 ring-1", tone.split(" ").slice(2).join(" "))}>
          {icon}
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

const referralSchema = z.object({
  referrer_name: z.string().trim().min(1, "Referrer name is required").max(160),
  referred_name: z.string().trim().min(1, "Referred name is required").max(160),
  referred_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  status: z.enum(["pending", "booked", "converted", "expired"]),
  reward_cents: z.number().int().min(0).max(10_000_000),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const REWARD_PRESETS = [25, 50, 100, 200];

function ComposerModal({
  row,
  clinicId,
  onClose,
}: {
  row: ReferralRow | null;
  clinicId: string;
  onClose: () => void;
}) {
  const editing = !!row;
  const [referrerName, setReferrerName] = useState(row?.referrer_name ?? "");
  const [referredName, setReferredName] = useState(row?.referred_name ?? "");
  const [referredEmail, setReferredEmail] = useState(row?.referred_email ?? "");
  const [status, setStatus] = useState<StatusKey>((row?.status as StatusKey) ?? "pending");
  const [rewardDollars, setRewardDollars] = useState(
    row ? String(Math.round(Number(row.reward_cents ?? 0) / 100)) : "50"
  );
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = referralSchema.safeParse({
        referrer_name: referrerName,
        referred_name: referredName,
        referred_email: referredEmail || "",
        status,
        reward_cents: Math.round((Number(rewardDollars) || 0) * 100),
        notes: notes || "",
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check your inputs");
        return;
      }
      const payload = {
        clinic_id: clinicId,
        referrer_name: parsed.data.referrer_name,
        referred_name: parsed.data.referred_name,
        referred_email: parsed.data.referred_email || null,
        status: parsed.data.status,
        reward_cents: parsed.data.reward_cents,
        notes: parsed.data.notes || null,
      };
      if (editing && row) {
        const { error } = await supabase.from("referrals").update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Referral updated");
      } else {
        const { error } = await supabase.from("referrals").insert(payload);
        if (error) throw error;
        toast.success("Referral logged");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't save referral");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border/40 px-5 py-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {editing ? "Edit referral" : "New referral"}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {editing ? row?.referred_name : "Log a referral"}
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="referrer">Referrer</Label>
              <Input
                id="referrer"
                value={referrerName}
                onChange={(e) => setReferrerName(e.target.value)}
                placeholder="Existing client name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referred">Referred</Label>
              <Input
                id="referred"
                value={referredName}
                onChange={(e) => setReferredName(e.target.value)}
                placeholder="New prospect name"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Referred email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={referredEmail}
              onChange={(e) => setReferredEmail(e.target.value)}
              placeholder="hello@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(Object.keys(STATUS_META) as StatusKey[]).map((s) => {
                const meta = STATUS_META[s];
                const active = status === s;
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition",
                      active
                        ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reward">Reward amount (CAD)</Label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="reward"
                  type="number"
                  min="0"
                  step="1"
                  value={rewardDollars}
                  onChange={(e) => setRewardDollars(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REWARD_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRewardDollars(String(amt))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
                    Number(rewardDollars) === amt
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Treatment of interest, source, follow-up details…"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Log referral"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
