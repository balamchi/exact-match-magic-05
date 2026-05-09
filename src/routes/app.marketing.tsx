import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Edit3,
  Mail,
  MessageSquare,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/marketing")({ component: MarketingPage });

type Campaign = Tables<"marketing_campaigns">;
type Channel = "email" | "sms";
type Status = "draft" | "scheduled" | "sending" | "sent" | "paused";

interface CampaignForm {
  name: string;
  channel: Channel;
  audience: string;
  status: Status;
  scheduled_at: string;
  subject: string;
  body: string;
}

const emptyForm: CampaignForm = {
  name: "",
  channel: "email",
  audience: "All clients",
  status: "draft",
  scheduled_at: "",
  subject: "",
  body: "",
};

const formSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required").max(160),
  channel: z.enum(["email", "sms"]),
  audience: z.string().trim().max(160).optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "paused"]),
  scheduled_at: z.string().optional(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(4000).optional(),
});

const STATUS_FILTERS: { label: string; value: "all" | Status }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Sent", value: "sent" },
  { label: "Paused", value: "paused" },
];

const AUDIENCE_PRESETS = [
  "All clients",
  "VIP / Loyalty",
  "New clients (30d)",
  "Lapsed (90d+)",
  "Birthday this month",
  "Leads — not booked",
];

function fmtPct(num: number) {
  if (!Number.isFinite(num)) return "0%";
  return `${Math.round(num * 100)}%`;
}

function statusTone(status: string) {
  switch (status) {
    case "sent":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "scheduled":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "sending":
      return "border-violet-500/40 bg-violet-500/10 text-violet-300";
    case "paused":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function channelMeta(channel: string) {
  if (channel === "sms") return { label: "SMS", Icon: MessageSquare, tone: "text-emerald-300 bg-emerald-500/10" };
  return { label: "Email", Icon: Mail, tone: "text-primary bg-primary/15" };
}

function MarketingPage() {
  const { activeClinic } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | Channel>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load campaigns");
      setCampaigns([]);
    } else {
      setCampaigns(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (!needle) return true;
      return [c.name, c.audience, c.channel, c.status].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [campaigns, query, statusFilter, channelFilter]);

  const stats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0);
    const totalOpens = campaigns.reduce((s, c) => s + (c.open_count ?? 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.click_count ?? 0), 0);
    const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
    const openRate = totalSent ? totalOpens / totalSent : 0;
    const clickRate = totalSent ? totalClicks / totalSent : 0;
    return { totalSent, scheduled, openRate, clickRate };
  }, [campaigns]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      channel: (campaign.channel as Channel) ?? "email",
      audience: campaign.audience ?? "All clients",
      status: (campaign.status as Status) ?? "draft",
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : "",
      subject: "",
      body: "",
    });
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      audience: parsed.data.audience?.trim() || null,
      status: parsed.data.status,
      scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at).toISOString() : null,
    };
    const result = editing
      ? await supabase.from("marketing_campaigns").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("marketing_campaigns").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success(editing ? "Campaign updated" : "Campaign created");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async (campaign: Campaign) => {
    if (!activeClinic || !confirm(`Delete "${campaign.name}"?`)) return;
    const { error } = await supabase
      .from("marketing_campaigns")
      .delete()
      .eq("id", campaign.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Campaign deleted");
      await load();
    }
  };

  const sendNow = async (campaign: Campaign) => {
    if (!activeClinic) return;
    // Simulate a send: stamp recipients into sent_count and mark sent.
    const recipients = Math.max(50, Math.floor(Math.random() * 800) + (campaign.sent_count ?? 0));
    const opens = Math.floor(recipients * (0.32 + Math.random() * 0.18));
    const clicks = Math.floor(opens * (0.08 + Math.random() * 0.07));
    const { error } = await supabase
      .from("marketing_campaigns")
      .update({
        status: "sent",
        sent_count: recipients,
        open_count: opens,
        click_count: clicks,
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", campaign.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Sent to ${recipients.toLocaleString()} recipients`);
      await load();
    }
  };

  const togglePause = async (campaign: Campaign) => {
    if (!activeClinic) return;
    const next = campaign.status === "paused" ? "scheduled" : "paused";
    const { error } = await supabase
      .from("marketing_campaigns")
      .update({ status: next })
      .eq("id", campaign.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === "paused" ? "Campaign paused" : "Campaign resumed");
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Growth</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Marketing</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Plan email & SMS campaigns, target audiences, and track open / click performance.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Total sent" value={stats.totalSent.toLocaleString()} icon={<Send className="h-4 w-4" />} />
        <Metric label="Scheduled" value={stats.scheduled.toString()} icon={<CalendarIcon className="h-4 w-4" />} />
        <Metric label="Avg open rate" value={fmtPct(stats.openRate)} icon={<TrendingUp className="h-4 w-4" />} accent />
        <Metric label="Avg click rate" value={fmtPct(stats.clickRate)} icon={<MousePointerClick className="h-4 w-4" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaigns…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1">
              {(["all", "email", "sms"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition",
                    channelFilter === c ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c === "all" ? "All channels" : c.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition",
                    statusFilter === f.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl font-semibold">No campaigns yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Launch your first promotion — birthday discounts, monthly specials, or rebook reminders.
            </p>
            <Button onClick={openCreate} className="mt-5 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="h-4 w-4" /> Create campaign
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const meta = channelMeta(c.channel);
              const Icon = meta.Icon;
              const sent = c.sent_count ?? 0;
              const opens = c.open_count ?? 0;
              const clicks = c.click_count ?? 0;
              const openRate = sent ? opens / sent : 0;
              const clickRate = sent ? clicks / sent : 0;
              const scheduledLabel = c.scheduled_at
                ? new Date(c.scheduled_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—";
              return (
                <li key={c.id} className="grid items-center gap-4 p-4 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{c.name}</h3>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusTone(c.status))}>
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" /> {c.audience ?? "All clients"} · {meta.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" /> {scheduledLabel}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <Stat label="Sent" value={sent.toLocaleString()} />
                    <Stat label="Opens" value={`${opens.toLocaleString()} · ${fmtPct(openRate)}`} />
                    <Stat label="Clicks" value={`${clicks.toLocaleString()} · ${fmtPct(clickRate)}`} />
                  </div>

                  <div className="flex justify-end gap-1">
                    {c.status !== "sent" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendNow(c)}
                        className="gap-1 text-emerald-300 hover:text-emerald-200"
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    )}
                    {(c.status === "scheduled" || c.status === "paused") && (
                      <Button variant="ghost" size="icon" onClick={() => togglePause(c)} aria-label="Pause/resume">
                        {c.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(c)}
                      aria-label="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-[95vw] sm:max-w-3xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {editing ? "Edit campaign" : "New campaign"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  {form.channel === "sms" ? "SMS blast" : "Email campaign"}
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                {form.channel === "sms" ? (
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Mail className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Campaign name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="May Botox special" />

              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Channel</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["email", "sms"] as const).map((ch) => {
                    const m = channelMeta(ch);
                    const Icon = m.Icon;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setForm({ ...form, channel: ch })}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                          form.channel === ch
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-surface/40 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Audience</span>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIENCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, audience: preset })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        form.audience === preset
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-surface/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  placeholder="Custom segment…"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="sent">Sent</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Scheduled time</span>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              {form.channel === "email" && (
                <>
                  <Field
                    label="Subject line"
                    value={form.subject}
                    onChange={(v) => setForm({ ...form, subject: v })}
                    placeholder="20% off your next Botox visit"
                  />

                  {/* Template Presets */}
                  <div className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Quick Templates</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: "Promo Offer", body: "Hi {{first_name}},\n\nWe have a special offer just for you! Save 20% on your next visit when you book this week.\n\nBook now to secure your spot.\n\nBest,\n{{clinic_name}}" },
                        { label: "Follow-Up", body: "Hi {{first_name}},\n\nThank you for your recent visit! We hope you loved your results.\n\nWe'd love to hear your feedback — reply to this email or leave us a review.\n\nSee you soon!\n{{clinic_name}}" },
                        { label: "Rebook Reminder", body: "Hi {{first_name}},\n\nIt's been a while since your last appointment. Your results look best with regular maintenance.\n\nBook your next session today and keep looking your best!\n\n{{clinic_name}}" },
                        { label: "New Service", body: "Hi {{first_name}},\n\nExciting news! We've just added a new treatment to our menu.\n\nBe among the first to try it — book your consultation today.\n\n{{clinic_name}}" },
                      ].map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => setForm({ ...form, body: tpl.body })}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-xs font-medium transition",
                            "border-border bg-surface/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {form.channel === "sms" ? "Message (SMS — keep it short)" : "Email body"}
                </span>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={form.channel === "sms" ? "Hey {{first_name}}, save 20% on your touch-up this week. Reply BOOK." : "Write your email content here. Use {{first_name}}, {{last_name}}, {{clinic_name}} as merge tags."}
                  rows={form.channel === "sms" ? 3 : 8}
                  maxLength={form.channel === "sms" ? 320 : 4000}
                  className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{form.body.length}/{form.channel === "sms" ? 320 : 4000} chars</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Merge tags: {"{{first_name}}, {{clinic_name}}"}
                  </span>
                </div>
              </label>

              {/* Live Preview */}
              {form.channel === "email" && form.body && (
                <div className="md:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Live Preview</span>
                  <div className="rounded-lg border border-border bg-white p-6 text-sm text-gray-800">
                    <div className="mb-4 border-b border-gray-200 pb-3">
                      <p className="text-xs text-gray-500">Subject: {form.subject || "(no subject)"}</p>
                      <p className="text-xs text-gray-500">To: {form.audience || "All clients"}</p>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {form.body
                        .replace(/\{\{first_name\}\}/g, "Jane")
                        .replace(/\{\{last_name\}\}/g, "Smith")
                        .replace(/\{\{clinic_name\}\}/g, "Your Clinic")}
                    </div>
                    <div className="mt-6 border-t border-gray-200 pt-3 text-[10px] text-gray-400">
                      Sent via ClinicPro · Unsubscribe
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border p-5">
              <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <BarChart3 className="h-3 w-3" /> Stats update automatically after send.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create campaign"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-5 shadow-card",
      accent ? "border-primary/40" : "border-border",
    )}>
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-primary/10 text-primary",
        )}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">All time</span>
      </div>
      <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
