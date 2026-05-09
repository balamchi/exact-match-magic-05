import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Star, Search, Plus, Send, MessageCircle, ThumbsUp, AlertTriangle,
  Globe, Smartphone, Facebook, Instagram, MoreHorizontal, X, CheckCheck,
  Sparkles, Settings, Filter, Eye, EyeOff, Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/app/reviews/")({ component: ReviewsDashboard });

/* ── types ── */
interface Review {
  id: string;
  clinic_id: string;
  reviewer_name: string;
  rating: number;
  body: string | null;
  title: string | null;
  source: string;
  platform: string;
  responded: boolean;
  is_responded: boolean;
  is_published: boolean;
  client_id: string | null;
  appointment_id: string | null;
  request_id: string | null;
  external_url: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewResponse {
  id: string;
  review_id: string;
  clinic_id: string;
  response_text: string;
  responded_by: string | null;
  posted_to_external: boolean;
  created_at: string;
}

const PLATFORM_META: Record<string, { label: string; icon: typeof Star; color: string }> = {
  internal: { label: "Internal", icon: Smartphone, color: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
  google: { label: "Google", icon: Globe, color: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  yelp: { label: "Yelp", icon: Star, color: "text-rose-300 bg-rose-500/10 border-rose-500/30" },
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-300 bg-pink-500/10 border-pink-500/30" },
};

type TabFilter = "all" | "pending" | "internal" | "google";

function ReviewsDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [revRes, respRes] = await Promise.all([
      supabase.from("reviews").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("review_responses").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
    ]);
    setReviews((revRes.data ?? []) as Review[]);
    setResponses((respRes.data ?? []) as ReviewResponse[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase
      .channel(`reviews-dash-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `clinic_id=eq.${clinicId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "review_responses", filter: `clinic_id=eq.${clinicId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, load]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0], pendingReply: 0, recent: 0, responseRate: 0 };
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    const pendingReply = reviews.filter((r) => !r.is_responded && !r.responded).length;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recent = reviews.filter((r) => new Date(r.created_at).getTime() > sevenDaysAgo).length;
    const responded = reviews.filter((r) => r.is_responded || r.responded).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    return { avg: sum / total, total, dist, pendingReply, recent, responseRate };
  }, [reviews]);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let list = reviews;
    if (tab === "pending") list = list.filter((r) => !r.is_responded && !r.responded);
    else if (tab === "internal") list = list.filter((r) => (r.platform || r.source) === "internal" || (r.platform || r.source) === "in_app");
    else if (tab === "google") list = list.filter((r) => (r.platform || r.source) === "google");
    if (ratingFilter) list = list.filter((r) => r.rating === ratingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.reviewer_name.toLowerCase().includes(q) ||
        (r.body ?? "").toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, tab, ratingFilter, search]);

  const selected = useMemo(() => reviews.find((r) => r.id === selectedId) ?? filtered[0] ?? null, [reviews, selectedId, filtered]);
  const selectedResponses = useMemo(() => responses.filter((r) => r.review_id === selected?.id), [responses, selected]);

  /* ── Actions ── */
  async function togglePublished(id: string, val: boolean) {
    await supabase.from("reviews").update({ is_published: val }).eq("id", id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: val } : r)));
    toast.success(val ? "Review published" : "Review hidden");
  }

  async function submitReply() {
    if (!selected || !reply.trim() || !clinicId) return;
    setReplyLoading(true);
    const { error } = await supabase.from("review_responses").insert({
      review_id: selected.id,
      clinic_id: clinicId,
      response_text: reply.trim(),
    });
    if (error) { toast.error(error.message); setReplyLoading(false); return; }
    await supabase.from("reviews").update({ is_responded: true, responded: true }).eq("id", selected.id);
    setReviews((prev) => prev.map((r) => (r.id === selected.id ? { ...r, is_responded: true, responded: true } : r)));
    toast.success("Reply posted");
    setReply("");
    setReplyLoading(false);
    load();
  }

  const platform = (r: Review) => r.platform || r.source || "internal";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reputation</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Monitor public sentiment, reply to feedback, and request reviews from happy clients.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/reviews/settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" /> Settings
            </Button>
          </Link>
          <Button onClick={() => setShowCompose(true)} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" /> Log review
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Reviews" value={stats.total} icon={Star} change={`+${stats.recent}`} trend="up" sub="this week" />
        <StatCard label="Avg Rating" value={stats.avg ? stats.avg.toFixed(1) : "—"} icon={Star} sub={`${stats.total} reviews`} />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} icon={CheckCheck} sub={`${stats.pendingReply} pending`} />
        <StatCard label="Pending Replies" value={stats.pendingReply} icon={AlertTriangle} sub="awaiting response" />
      </section>

      {/* Rating breakdown */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-semibold">Rating breakdown</h2>
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.dist[star - 1];
            const pct = stats.total ? (count / stats.total) * 100 : 0;
            return (
              <button key={star} onClick={() => setRatingFilter(ratingFilter === star ? null : star)} className="flex w-full items-center gap-3">
                <div className="flex w-12 items-center gap-1 text-xs">
                  <span className="font-mono">{star}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn("h-full rounded-full transition-all", star >= 4 ? "bg-gradient-primary" : star === 3 ? "bg-amber-400" : "bg-rose-400")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={cn("w-10 text-right font-mono text-xs", ratingFilter === star ? "text-primary font-semibold" : "text-muted-foreground")}>{count}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            { id: "all", label: "All Reviews" },
            { id: "pending", label: `Pending · ${stats.pendingReply}` },
            { id: "internal", label: "Internal Only" },
            { id: "google", label: "Google" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setTab(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                tab === f.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviewer or content…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Two-pane: list + detail */}
      <section className="grid min-h-[520px] gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* List */}
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
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filtered.map((r) => {
                const p = platform(r);
                const meta = PLATFORM_META[p] ?? PLATFORM_META.internal;
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
                        {r.title && <p className="mt-0.5 text-xs font-medium text-foreground/80">{r.title}</p>}
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.body || "No comment"}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          <span>{new Date(r.posted_at || r.created_at).toLocaleDateString()}</span>
                          {!r.is_published && <span className="text-amber-400">Hidden</span>}
                          {(r.is_responded || r.responded) ? (
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
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", PLATFORM_META[platform(selected)]?.color)}>
                      {PLATFORM_META[platform(selected)]?.label ?? platform(selected)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("h-4 w-4", n <= selected.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">· {new Date(selected.posted_at || selected.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePublished(selected.id, !selected.is_published)}
                    className="rounded-lg border border-border bg-surface p-2 text-muted-foreground hover:text-foreground"
                    title={selected.is_published ? "Hide review" : "Show review"}
                  >
                    {selected.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {selected.title && <h4 className="mb-2 text-sm font-semibold">{selected.title}</h4>}
                <div className="rounded-xl border border-border bg-surface/40 p-4">
                  <p className="text-sm leading-relaxed">{selected.body || <span className="italic text-muted-foreground">No written comment</span>}</p>
                </div>

                {selected.external_url && (
                  <a href={selected.external_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Globe className="h-3 w-3" /> View original
                  </a>
                )}

                {selected.rating <= 3 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-300">Critical feedback</p>
                      <p className="mt-0.5 text-amber-200/80">Respond within 24 hours to recover the relationship.</p>
                    </div>
                  </div>
                )}

                {/* Existing responses */}
                {selectedResponses.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responses</h4>
                    {selectedResponses.map((resp) => (
                      <div key={resp.id} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <p className="text-sm">{resp.response_text}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{new Date(resp.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply */}
              <div className="border-t border-border bg-surface/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reply</label>
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
                    disabled={!reply.trim() || replyLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" /> {replyLoading ? "Posting…" : "Post reply"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showCompose && clinicId && <ComposeModal clinicId={clinicId} onClose={() => { setShowCompose(false); load(); }} />}
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [platformVal, setPlatformVal] = useState("google");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      clinic_id: clinicId,
      reviewer_name: name.trim(),
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
      source: platformVal,
      platform: platformVal,
      responded: false,
      is_responded: false,
      is_published: true,
      posted_at: new Date().toISOString(),
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
          <Field label="Platform">
            <select value={platformVal} onChange={(e) => setPlatformVal(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50">
              {Object.entries(PLATFORM_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Title (optional)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
