import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Inbox as InboxIcon,
  MessageSquare,
  Mail,
  Globe,
  Phone,
  Search,
  Send,
  CheckCircle2,
  Circle,
  Archive,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/inbox")({ component: InboxPage });

type Message = Tables<"inbox_messages">;
type ChannelFilter = "all" | "sms" | "email" | "web" | "whatsapp";
type StatusFilter = "open" | "closed" | "snoozed" | "all";

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail; tint: string }> = {
  sms: { label: "SMS", icon: MessageSquare, tint: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  email: { label: "Email", icon: Mail, tint: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
  web: { label: "Web", icon: Globe, tint: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  whatsapp: { label: "WhatsApp", icon: Phone, tint: "text-teal-300 bg-teal-500/10 border-teal-500/30" },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function InboxPage() {
  const { activeClinic } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const loadAll = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inbox_messages")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("last_message_at", { ascending: false });
    if (error) toast.error("Could not load inbox");
    setMessages(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (channel !== "all" && m.channel !== channel) return false;
      if (status !== "all" && m.status !== status) return false;
      if (!needle) return true;
      return [m.contact_name, m.contact_handle, m.preview, m.channel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [messages, query, channel, status]);

  const active = useMemo(
    () => filtered.find((m) => m.id === activeId) ?? filtered[0] ?? null,
    [filtered, activeId]
  );

  // Auto-mark read when opened
  useEffect(() => {
    if (!active || !active.unread || !activeClinic) return;
    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from("inbox_messages")
        .update({ unread: false })
        .eq("id", active.id)
        .eq("clinic_id", activeClinic.clinic_id);
      if (!error && !cancelled) {
        setMessages((prev) => prev.map((m) => (m.id === active.id ? { ...m, unread: false } : m)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.id, activeClinic?.clinic_id]);

  const totals = useMemo(() => {
    return {
      unread: messages.filter((m) => m.unread && m.status === "open").length,
      open: messages.filter((m) => m.status === "open").length,
      closed: messages.filter((m) => m.status === "closed").length,
      total: messages.length,
    };
  }, [messages]);

  const sendReply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic || !active || !reply.trim()) return;
    setSending(true);
    const preview = `You: ${reply.trim()}`.slice(0, 280);
    const { error } = await supabase
      .from("inbox_messages")
      .update({
        preview,
        last_message_at: new Date().toISOString(),
        unread: false,
        status: "open",
      })
      .eq("id", active.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Reply sent");
      setReply("");
      await loadAll();
    }
    setSending(false);
  };

  const setConversationStatus = async (m: Message, next: "open" | "closed" | "snoozed") => {
    if (!activeClinic) return;
    const { error } = await supabase
      .from("inbox_messages")
      .update({ status: next })
      .eq("id", m.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked ${next}`);
      await loadAll();
    }
  };

  const toggleUnread = async (m: Message) => {
    if (!activeClinic) return;
    const { error } = await supabase
      .from("inbox_messages")
      .update({ unread: !m.unread })
      .eq("id", m.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else
      setMessages((prev) =>
        prev.map((row) => (row.id === m.id ? { ...row, unread: !m.unread } : row))
      );
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Conversations</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Unified inbox for SMS, email, web, and WhatsApp from your clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <KpiPill label="Unread" value={totals.unread} accent />
          <KpiPill label="Open" value={totals.open} />
          <Button
            onClick={() => setComposeOpen(true)}
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card shadow-card lg:grid-cols-[360px_1fr]">
        {/* Left rail */}
        <aside className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["open", "all", "closed", "snoozed"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition",
                    status === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "sms", "email", "web", "whatsapp"] as ChannelFilter[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition",
                    channel === c
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[640px] flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyList />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setActiveId(m.id)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface/60",
                        active?.id === m.id && "bg-primary/10"
                      )}
                    >
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                          {initials(m.contact_name) || "?"}
                        </div>
                        {m.unread && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              m.unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                            )}
                          >
                            {m.contact_name}
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {formatRelative(m.last_message_at)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <ChannelChip channel={m.channel} compact />
                          <p className="truncate text-xs text-muted-foreground">
                            {m.preview ?? "No preview"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right pane: thread */}
        <section className="flex min-h-[640px] flex-col">
          {!active ? (
            <EmptyThread />
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow">
                    {initials(active.contact_name) || "?"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold tracking-tight">
                      {active.contact_name}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <ChannelChip channel={active.channel} />
                      {active.contact_handle && <span>· {active.contact_handle}</span>}
                      <span>· last message {formatRelative(active.last_message_at)} ago</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUnread(active)}
                    className="gap-1.5"
                  >
                    {active.unread ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Mark read
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4" /> Mark unread
                      </>
                    )}
                  </Button>
                  {active.status !== "closed" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConversationStatus(active, "closed")}
                      className="gap-1.5"
                    >
                      <Archive className="h-4 w-4" /> Close
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConversationStatus(active, "open")}
                      className="gap-1.5"
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </header>

              {/* Thread body — single message preview */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-surface p-6">
                <div className="mx-auto max-w-2xl">
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{active.contact_name}</span>
                      <span>{new Date(active.last_message_at).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {active.preview ?? "No content captured for this conversation yet."}
                    </p>
                  </div>
                  {active.status === "closed" && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] text-muted-foreground">
                      <Archive className="h-3 w-3" /> This conversation is closed.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick reply templates */}
              <div className="border-t border-border px-4 pt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Quick Replies</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Thanks for your message! We'll get back to you shortly.",
                    "Your appointment is confirmed. See you then! ✅",
                    "Would you like to reschedule? Reply with your preferred date/time.",
                    "Thank you for choosing us! Don't forget to leave a review. ⭐",
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setReply(tpl)}
                      className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      {tpl.slice(0, 40)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Composer */}
              <form onSubmit={sendReply} className="border-t border-border p-4">
                <div className="rounded-xl border border-input bg-surface focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={`Reply via ${CHANNEL_META[active.channel]?.label ?? active.channel}…`}
                    rows={3}
                    className="w-full resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">
                      {reply.length}/500
                    </span>
                    <Button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      size="sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sending ? "Sending…" : "Send reply"}
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </section>
      </section>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onCreated={async (id) => {
            setComposeOpen(false);
            await loadAll();
            setActiveId(id);
          }}
        />
      )}
    </div>
  );
}

function ChannelChip({ channel, compact = false }: { channel: string; compact?: boolean }) {
  const meta = CHANNEL_META[channel] ?? {
    label: channel,
    icon: MessageSquare,
    tint: "text-muted-foreground bg-muted border-border",
  };
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        meta.tint
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {!compact && meta.label}
    </span>
  );
}

function KpiPill({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
        accent
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground"
      )}
    >
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon className="h-5 w-5" />
      </div>
      <h3 className="font-medium">No conversations</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Try a different filter, or start a new conversation.
      </p>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <InboxIcon className="h-7 w-7" />
      </div>
      <h2 className="font-display text-xl font-semibold">Select a conversation</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pick any thread from the list to read messages, mark them complete, or send a reply.
      </p>
    </div>
  );
}

function ComposeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { activeClinic } = useAuth();
  const [contactName, setContactName] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [channel, setChannel] = useState<string>("sms");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic || !contactName.trim() || !body.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("inbox_messages")
      .insert({
        clinic_id: activeClinic.clinic_id,
        contact_name: contactName.trim(),
        contact_handle: contactHandle.trim() || null,
        channel,
        preview: `You: ${body.trim()}`.slice(0, 280),
        status: "open",
        unread: false,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) toast.error(error?.message ?? "Could not start conversation");
    else {
      toast.success("Conversation started");
      onCreated(data.id);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
      >
        <header className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-xl font-semibold">New conversation</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Send the first outbound message and track replies in this thread.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Contact name" required>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jordan Lee"
                className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
            <Field label="Phone or email">
              <input
                value={contactHandle}
                onChange={(e) => setContactHandle(e.target.value)}
                placeholder="+1 555 0100 or jordan@…"
                className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </Field>
          </div>

          <Field label="Channel">
            <div className="flex flex-wrap gap-1.5">
              {(["sms", "email", "web", "whatsapp"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                    channel === c
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="First message" required>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface/60 p-3 text-[11px] text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              This logs the conversation in your inbox. Carrier delivery happens via your connected
              SMS/email provider.
            </p>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !contactName.trim() || !body.trim()}
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Send className="h-4 w-4" /> {saving ? "Sending…" : "Send"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
