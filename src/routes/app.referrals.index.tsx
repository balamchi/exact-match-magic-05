import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Share2, Plus, Search, TrendingUp, Users, Gift, Sparkles, Edit3,
  Trash2, X, ArrowRight, CheckCircle2, Clock, Calendar, XCircle,
  Mail, Copy, Megaphone, Settings, UserPlus, Award,
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
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/referrals/")({ component: ReferralsDashboard });

/* ── Types ── */
interface ReferralCode {
  id: string;
  clinic_id: string;
  client_id: string;
  code: string;
  is_active: boolean;
  times_used: number;
  total_rewards_earned_cents: number;
  created_at: string;
}

interface ReferralRow {
  id: string;
  clinic_id: string;
  referrer_name: string;
  referred_name: string;
  referred_email: string | null;
  referee_phone: string | null;
  status: string;
  reward_cents: number;
  referrer_client_id: string | null;
  referrer_code_id: string | null;
  referee_client_id: string | null;
  reward_unlocked_at: string | null;
  reward_redeemed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RewardRow {
  id: string;
  referral_id: string;
  clinic_id: string;
  recipient_client_id: string;
  reward_type: string;
  amount_cents: number;
  status: string;
  redeemed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface ClientMin {
  id: string;
  first_name: string;
  last_name: string | null;
}

type StatusKey = "pending" | "booked" | "converted" | "expired" | "invited" | "signed_up" | "first_appointment_completed" | "rewarded";
type TabKey = "active" | "top" | "rewards" | "codes";

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  invited: { label: "Invited", icon: Mail, color: "border-violet-400/30 bg-violet-400/10 text-violet-200" },
  signed_up: { label: "Signed Up", icon: UserPlus, color: "border-sky-400/30 bg-sky-400/10 text-sky-200" },
  booked: { label: "Booked", icon: Calendar, color: "border-sky-400/30 bg-sky-400/10 text-sky-200" },
  first_appointment_completed: { label: "1st Appt Done", icon: CheckCircle2, color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  converted: { label: "Converted", icon: CheckCircle2, color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  rewarded: { label: "Rewarded", icon: Award, color: "border-primary/30 bg-primary/10 text-primary" },
  expired: { label: "Expired", icon: XCircle, color: "border-border/60 bg-muted/40 text-muted-foreground" },
};

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(iso));

function ReferralsDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [clients, setClients] = useState<ClientMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("active");
  const [composer, setComposer] = useState<ReferralRow | "new" | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    const [refRes, codeRes, rewardRes, clientRes] = await Promise.all([
      supabase.from("referrals").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("referral_codes").select("*").eq("clinic_id", clinicId).order("times_used", { ascending: false }),
      supabase.from("referral_rewards").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("clients").select("id, first_name, last_name").eq("clinic_id", clinicId).order("first_name").limit(500),
    ]);
    setRows((refRes.data ?? []) as ReferralRow[]);
    setCodes((codeRes.data ?? []) as ReferralCode[]);
    setRewards((rewardRes.data ?? []) as RewardRow[]);
    setClients((clientRes.data ?? []) as ClientMin[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase
      .channel(`referrals-dash-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals", filter: `clinic_id=eq.${clinicId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_codes", filter: `clinic_id=eq.${clinicId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_rewards", filter: `clinic_id=eq.${clinicId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, load]);

  /* ── Stats ── */
  const totalReferrals = rows.length;
  const pendingRewards = rewards.filter((r) => r.status === "pending" || r.status === "available").length;
  const totalRewarded = rewards.filter((r) => r.status === "redeemed").reduce((s, r) => s + r.amount_cents, 0);
  const convertedCount = rows.filter((r) => ["converted", "rewarded", "first_appointment_completed"].includes(r.status)).length;
  const conversionRate = totalReferrals > 0 ? Math.round((convertedCount / totalReferrals) * 100) : 0;

  /* ── Top referrers ── */
  const topReferrers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; converted: number; rewards: number }>();
    rows.forEach((r) => {
      const key = r.referrer_name.trim();
      if (!key) return;
      const cur = map.get(key) ?? { name: key, count: 0, converted: 0, rewards: 0 };
      cur.count += 1;
      if (["converted", "rewarded", "first_appointment_completed"].includes(r.status)) {
        cur.converted += 1;
        cur.rewards += Number(r.reward_cents ?? 0);
      }
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.converted - a.converted || b.count - a.count);
  }, [rows]);

  /* ── Filtered ── */
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return r.referrer_name.toLowerCase().includes(q) || r.referred_name.toLowerCase().includes(q) || (r.referred_email ?? "").toLowerCase().includes(q);
    });
  }, [rows, query]);

  /* ── Actions ── */
  const advance = async (row: ReferralRow) => {
    const flow = ["pending", "invited", "signed_up", "booked", "first_appointment_completed", "converted", "rewarded"];
    const idx = flow.indexOf(row.status);
    if (idx === -1 || idx >= flow.length - 1) return;
    const next = flow[idx + 1];
    const { error } = await supabase.from("referrals").update({ status: next }).eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(`Marked as ${STATUS_META[next]?.label ?? next}`);
  };

  const remove = async (row: ReferralRow) => {
    if (!confirm(`Remove referral for ${row.referred_name}?`)) return;
    const { error } = await supabase.from("referrals").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Referral removed");
  };

  const generateCode = async (clientId: string) => {
    if (!clinicId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const base = (client.first_name + (client.last_name ? `-${client.last_name.charAt(0)}` : "")).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    const code = `${base}-${suffix}`;
    const { error } = await supabase.from("referral_codes").insert({
      clinic_id: clinicId,
      client_id: clientId,
      code,
    });
    if (error) {
      if (error.message.includes("duplicate")) toast.error("Client already has a referral code");
      else toast.error(error.message);
      return;
    }
    toast.success(`Code ${code} generated for ${client.first_name}`);
    load();
  };

  const copyCode = (code: string) => {
    const url = `${window.location.origin}/refer/${activeClinic?.clinic?.slug ?? clinicId}/${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Referral link copied"), () => toast.error("Couldn't copy"));
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5 text-primary" /> Word of mouth
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Referrals</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Turn happy clients into your best marketing channel. Track every referrer-referee pair from invite to conversion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/referrals/settings">
            <Button variant="outline" size="sm" className="gap-1.5"><Settings className="h-4 w-4" /> Settings</Button>
          </Link>
          <Button variant="outline" onClick={() => setShowGenerate(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Generate code
          </Button>
          <Button onClick={() => setComposer("new")} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" /> Log referral
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Referrals" value={totalReferrals} icon={Share2} sub={`${convertedCount} converted`} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} sub={`${convertedCount} of ${totalReferrals}`} />
        <StatCard label="Pending Rewards" value={pendingRewards} icon={Gift} sub="awaiting redemption" />
        <StatCard label="Total Rewarded" value={fmtMoney(totalRewarded)} icon={Award} sub="redeemed rewards" />
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: "active" as const, label: "Active Referrals" },
          { id: "top" as const, label: "Top Referrers" },
          { id: "rewards" as const, label: "Rewards Issued" },
          { id: "codes" as const, label: "Referral Codes" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              tab === t.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {(tab === "active" || tab === "codes") && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search referrer, referred, email…" className="pl-9" />
        </div>
      )}

      {/* Tab content */}
      {tab === "active" && (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/20 backdrop-blur">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />)}</div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Share2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Log your first referral to start tracking.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {filteredRows.map((row) => {
                const meta = STATUS_META[row.status] ?? STATUS_META.pending;
                const StatusIcon = meta.icon;
                return (
                  <li key={row.id} className="group flex flex-col gap-3 px-4 py-3.5 transition hover:bg-muted/20 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", meta.color)}>
                        <StatusIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{row.referrer_name}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground/90">{row.referred_name}</span>
                          <Badge variant="outline" className={cn("ml-1 text-[10px] uppercase tracking-wider", meta.color)}>{meta.label}</Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          {row.referred_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{row.referred_email}</span>}
                          <span>{fmtDate(row.created_at)}</span>
                          {Number(row.reward_cents) > 0 && <span className="text-emerald-300/80">{fmtMoney(row.reward_cents)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => advance(row)} className="h-8 text-xs">
                        Advance <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setComposer(row)} className="h-8 px-2"><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(row)} className="h-8 px-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "top" && (
        <section className="rounded-xl border border-border/60 bg-card/30 p-5">
          {topReferrers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No referrers yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topReferrers.slice(0, 8).map((r, i) => (
                <div key={r.name} className="rounded-lg border border-border/50 bg-background/40 p-3">
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
          )}
        </section>
      )}

      {tab === "rewards" && (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/20">
          {rewards.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No rewards issued yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {rewards.map((rw) => (
                <li key={rw.id} className="flex items-center gap-3 px-4 py-3">
                  <Award className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{fmtMoney(rw.amount_cents)} — {rw.reward_type}</p>
                    <p className="text-xs text-muted-foreground">{rw.notes || "Referral reward"} · {fmtDate(rw.created_at)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] uppercase", rw.status === "redeemed" ? "text-emerald-300" : "text-amber-300")}>{rw.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "codes" && (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/20">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">No referral codes yet.</p>
              <Button size="sm" onClick={() => setShowGenerate(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Generate code</Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {codes.map((c) => {
                const client = clients.find((cl) => cl.id === c.client_id);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">{c.code}</span>
                        {!c.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {client ? `${client.first_name} ${client.last_name ?? ""}`.trim() : "Unknown client"} · {c.times_used} uses · {fmtMoney(c.total_rewards_earned_cents)} earned
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyCode(c.code)} className="gap-1 text-xs">
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Generate code modal */}
      {showGenerate && clinicId && (
        <GenerateCodeModal
          clients={clients}
          existingCodes={codes}
          onGenerate={generateCode}
          onClose={() => setShowGenerate(false)}
        />
      )}

      {/* Compose/Edit modal */}
      {composer && clinicId && (
        <ComposerModal
          row={composer === "new" ? null : composer}
          clinicId={clinicId}
          onClose={() => { setComposer(null); load(); }}
        />
      )}
    </div>
  );
}

function GenerateCodeModal({ clients, existingCodes, onGenerate, onClose }: {
  clients: ClientMin[];
  existingCodes: ReferralCode[];
  onGenerate: (clientId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const existingClientIds = new Set(existingCodes.map((c) => c.client_id));
  const available = clients.filter((c) => !existingClientIds.has(c.id));
  const filtered = available.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-xl font-semibold">Generate referral code</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Pick a client to generate a unique referral code.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="mb-3" />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {available.length === 0 ? "All clients already have codes" : "No clients match"}
              </p>
            ) : filtered.slice(0, 20).map((c) => (
              <button
                key={c.id}
                onClick={() => { onGenerate(c.id); onClose(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface/50"
              >
                <UserPlus className="h-4 w-4 text-primary" />
                {c.first_name} {c.last_name ?? ""}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const referralSchema = z.object({
  referrer_name: z.string().trim().min(1).max(160),
  referred_name: z.string().trim().min(1).max(160),
  referred_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  status: z.string(),
  reward_cents: z.number().int().min(0).max(10_000_000),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function ComposerModal({ row, clinicId, onClose }: { row: ReferralRow | null; clinicId: string; onClose: () => void }) {
  const editing = !!row;
  const [referrerName, setReferrerName] = useState(row?.referrer_name ?? "");
  const [referredName, setReferredName] = useState(row?.referred_name ?? "");
  const [referredEmail, setReferredEmail] = useState(row?.referred_email ?? "");
  const [status, setStatus] = useState(row?.status ?? "pending");
  const [rewardDollars, setRewardDollars] = useState(row ? String(Math.round(Number(row.reward_cents ?? 0) / 100)) : "50");
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
      if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check inputs"); return; }
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
      toast.error(err?.message ?? "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border/40 px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit referral" : "Log referral"}</h2>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Referrer</Label><Input value={referrerName} onChange={(e) => setReferrerName(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Referred</Label><Input value={referredName} onChange={(e) => setReferredName(e.target.value)} required /></div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={referredEmail} onChange={(e) => setReferredEmail(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Reward ($)</Label>
            <Input type="number" min="0" value={rewardDollars} onChange={(e) => setRewardDollars(e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              {saving ? "Saving…" : editing ? "Save" : "Log referral"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
