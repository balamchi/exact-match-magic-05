import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Star, Search, Plus, Send, MessageCircle, ThumbsUp, AlertTriangle,
  Globe, Smartphone, Facebook, MoreHorizontal, X, CheckCheck, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reviews")({ component: ReviewsPage });

interface Review {
  id: string;
  clinic_id: string;
  reviewer_name: string;
  rating: number;
  body: string | null;
  source: string;
  responded: boolean;
  created_at: string;
  updated_at: string;
}

const SOURCE_META: Record<string, { label: string; icon: typeof Star; color: string }> = {
  in_app: { label: "In-app", icon: Smartphone, color: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
  google: { label: "Google", icon: Globe, color: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  yelp: { label: "Yelp", icon: Star, color: "text-rose-300 bg-rose-500/10 border-rose-500/30" },
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  other: { label: "Other", icon: Globe, color: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
};

type Filter = "all" | "unresponded" | "negative" | "positive";

function ReviewsPage() {
  const { activeClinic } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`reviews-${activeClinic.clinic_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `clinic_id=eq.${activeClinic.clinic_id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeClinic]);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0], unresponded: 0, recent: 0 };
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    const unresponded = reviews.filter((r) => !r.responded).length;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recent = reviews.filter((r) => new Date(r.created_at).getTime() > sevenDaysAgo).length;
    return { avg: sum / total, total, dist, unresponded, recent };
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter === "unresponded") list = list.filter((r) => !r.responded);
    else if (filter === "negative") list = list.filter((r) => r.rating <= 3);
    else if (filter === "positive") list = list.filter((r) => r.rating >= 4);
    if (sourceFilter !== "all") list = list.filter((r) => r.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.reviewer_name.toLowerCase().includes(q) || (r.body ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [reviews, filter, sourceFilter, search]);

  const selected = useMemo(() => reviews.find((r) => r.id === selectedId) ?? filtered[0] ?? null, [reviews, selectedId, filtered]);

  async function markResponded(id: string, value: boolean) {
    await supabase.from("reviews").update({ responded: value }).eq("id", id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, responded: value } : r)));
  }

  async function submitReply() {
    if (!selected || !reply.trim()) return;
    await markResponded(selected.id, true);
    toast.success(`Reply posted to ${SOURCE_META[selected.source]?.label ?? selected.source}`);
    setReply("");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reputation</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Monitor public sentiment, reply to feedback, and request reviews from happy clients.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRequest(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface/70"
          >
            <Send className="h-4 w-4" /> Request review
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Log review
          </button>
        </div>
      </header>

      {/* Hero summary */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
          <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
          <div className="relative">
            <div className="flex items-baseline gap-3">
              <div className="font-display text-6xl font-semibold tracking-tight">{stats.avg ? stats.avg.toFixed(1) : "—"}</div>
              <div className="text-sm text-muted-foreground">/ 5.0</div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("h-5 w-5", n <= Math.round(stats.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Based on <span className="font-medium text-foreground">{stats.total}</span> reviews ·
              <span className="ml-1 text-emerald-400">+{stats.recent} this week</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Rating breakdown</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              {stats.unresponded} awaiting reply
            </div>
          </div>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.dist[star - 1];
              const pct = stats.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-12 items-center gap-1 text-xs">
                    <span className="font-mono">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className={cn("h-full rounded-full", star >= 4 ? "bg-gradient-primary" : star === 3 ? "bg-amber-400" : "bg-rose-400")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-10 text-right font-mono text-xs text-muted-foreground">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviewer or content…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: "all", label: "All" },
            { id: "unresponded", label: `Unresponded · ${stats.unresponded}` },
            { id: "negative", label: "Negative ≤3★" },
            { id: "positive", label: "Positive ≥4★" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                filter === f.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-border md:inline-block" />
          {["all", ...Object.keys(SOURCE_META)].map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                sourceFilter === s ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "All sources" : SOURCE_META[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-pane: list + detail */}
      <section className="grid min-h-[520px] gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card shadow-card">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <Star className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No reviews match these filters</p>
              <p className="text-xs text-muted-foreground">Try clearing filters or request reviews from recent clients.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const meta = SOURCE_META[r.source] ?? SOURCE_META.other;
                const Icon = meta.icon;
                const active = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-surface/50",
                        active && "bg-surface/70"
                      )}
                    >
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{r.reviewer_name}</span>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={cn("h-3 w-3", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                            ))}
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.body || "No comment"}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          {r.responded ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCheck className="h-3 w-3" /> Responded</span>
                          ) : (
                            <span className="text-amber-400">Awaiting reply</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Select a review to read and reply.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{selected.reviewer_name}</h3>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", SOURCE_META[selected.source]?.color)}>
                      {SOURCE_META[selected.source]?.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("h-4 w-4", n <= selected.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">· {new Date(selected.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => markResponded(selected.id, !selected.responded)}
                  className="rounded-lg border border-border bg-surface p-2 text-muted-foreground hover:text-foreground"
                  title={selected.responded ? "Mark as needs reply" : "Mark as responded"}
                >
                  {selected.responded ? <X className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="rounded-xl border border-border bg-surface/40 p-4">
                  <p className="text-sm leading-relaxed">{selected.body || <span className="italic text-muted-foreground">No written comment</span>}</p>
                </div>

                {selected.rating <= 3 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-300">Critical feedback</p>
                      <p className="mt-0.5 text-amber-200/80">Respond within 24 hours to recover the relationship and signal accountability publicly.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-surface/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reply publicly</label>
                  <button
                    onClick={() => setReply(generateSuggestion(selected))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:opacity-80"
                  >
                    <Sparkles className="h-3 w-3" /> Suggest reply
                  </button>
                </div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Thank ${selected.reviewer_name.split(" ")[0]} for the feedback…`}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm outline-none focus:border-primary/50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{reply.length} chars</span>
                  <button
                    onClick={submitReply}
                    disabled={!reply.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" /> Post reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showCompose && activeClinic && (
        <ComposeModal clinicId={activeClinic.clinic_id} onClose={() => setShowCompose(false)} />
      )}
      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}
    </div>
  );
}

function generateSuggestion(r: Review): string {
  const name = r.reviewer_name.split(" ")[0];
  if (r.rating >= 4) return `Thank you so much, ${name}! We're thrilled you had a great experience and look forward to seeing you again soon. 💜`;
  if (r.rating === 3) return `Hi ${name}, thank you for the honest feedback. We'd love to hear more about how we can improve — please reach out to our team directly.`;
  return `Hi ${name}, we're truly sorry your visit didn't meet expectations. This is not the standard we hold ourselves to. Please contact us so we can make this right.`;
}

function ComposeModal({ clinicId, onClose }: { clinicId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [source, setSource] = useState("google");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      clinic_id: clinicId,
      reviewer_name: name.trim(),
      rating,
      body: body.trim() || null,
      source,
      responded: false,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Review logged");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Log a review</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Manually add an external review for tracking.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Reviewer name">
            <input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          </Field>
          <Field label="Rating">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={cn("h-7 w-7 transition", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-300")} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Source">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50">
              {Object.entries(SOURCE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Comment (optional)">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-primary/50" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface/70">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save review"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RequestModal({ onClose }: { onClose: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Request reviews</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Send a one-tap review request to recent happy clients.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          {[
            { id: "completed_7", label: "Completed visit in last 7 days", est: 24, icon: ThumbsUp },
            { id: "rebook_30", label: "Repeat clients (≥3 visits)", est: 56, icon: Sparkles },
            { id: "high_value", label: "High-value clients (>$500 LTV)", est: 18, icon: Star },
          ].map((preset) => {
            const Icon = preset.icon;
            const selected = count === preset.est;
            return (
              <button
                key={preset.id}
                onClick={() => setCount(preset.est)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  selected ? "border-primary/50 bg-primary/10" : "border-border bg-surface/50 hover:bg-surface"
                )}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", selected ? "bg-gradient-primary text-primary-foreground" : "bg-surface text-muted-foreground")}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{preset.label}</p>
                  <p className="text-xs text-muted-foreground">~{preset.est} clients match</p>
                </div>
                {selected && <CheckCheck className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-surface/30 p-3 text-xs">
          <span className="text-muted-foreground">Channel</span>
          <div className="flex gap-1">
            <span className="rounded-md bg-primary/15 px-2 py-1 font-medium text-primary">Email</span>
            <span className="rounded-md border border-border px-2 py-1 text-muted-foreground">SMS</span>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface/70">Cancel</button>
          <button
            onClick={() => { toast.success(`Review request queued for ${count ?? 0} clients`); onClose(); }}
            disabled={!count}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send to {count ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
