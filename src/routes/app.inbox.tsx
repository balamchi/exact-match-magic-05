import { createFileRoute, Link } from "@tanstack/react-router";
import { PhaseInlineNotice } from "@/components/beta-badge";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Inbox as InboxIcon, MessageSquare, Mail, Phone, Globe, Instagram, Facebook,
  Search, Filter, Star, Pin, Archive, Clock, MoreHorizontal, Send, Paperclip,
  Check, CheckCheck, AlertCircle, X, ChevronRight, User as UserIcon,
  CornerDownLeft, RefreshCw, Sparkles, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/inbox")({ component: InboxPage });

type Channel = "sms" | "whatsapp" | "email" | "web" | "instagram" | "facebook";
type ConvStatus = "open" | "closed" | "snoozed" | "spam";
type MsgDirection = "inbound" | "outbound";
type MsgStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";

interface Conversation {
  id: string;
  clinic_id: string;
  client_id: string | null;
  channel: Channel;
  contact_name: string;
  contact_handle: string;
  contact_avatar_url: string | null;
  status: ConvStatus;
  unread_count: number;
  is_pinned: boolean;
  is_starred: boolean;
  last_message_text: string | null;
  last_message_at: string;
  last_message_direction: MsgDirection | null;
  tags: string[] | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: MsgDirection;
  channel: Channel;
  body: string;
  media_urls: string[] | null;
  status: MsgStatus;
  failure_reason: string | null;
  sent_by_name: string | null;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  category: string;
}

const CHANNEL_ICONS: Record<Channel, typeof Mail> = {
  sms: MessageSquare, whatsapp: Phone, email: Mail,
  web: Globe, instagram: Instagram, facebook: Facebook,
};
const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "SMS", whatsapp: "WhatsApp", email: "Email",
  web: "Web", instagram: "Instagram", facebook: "Facebook",
};
const CHANNEL_TINT: Record<Channel, string> = {
  sms: "text-sky-300 bg-sky-500/10",
  whatsapp: "text-emerald-300 bg-emerald-500/10",
  email: "text-violet-300 bg-violet-500/10",
  web: "text-amber-300 bg-amber-500/10",
  instagram: "text-fuchsia-300 bg-fuchsia-500/10",
  facebook: "text-blue-300 bg-blue-500/10",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function InboxPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConvStatus | "all">("open");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [client, setClient] = useState<any | null>(null);
  const [clinicReplyEmail, setClinicReplyEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    supabase.from("clinics").select("reply_email").eq("id", clinicId).maybeSingle()
      .then(({ data }) => setClinicReplyEmail((data as any)?.reply_email ?? null));
  }, [clinicId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadConversations = useCallback(async () => {
    if (!clinicId) return;
    let q = supabase
      .from("conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (channelFilter !== "all") q = q.eq("channel", channelFilter);
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim().replace(/[%,]/g, "");
      q = q.or(`contact_name.ilike.%${s}%,contact_handle.ilike.%${s}%,last_message_text.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) {
      console.error(error);
    } else {
      setConversations((data ?? []) as Conversation[]);
    }
    setLoading(false);
  }, [clinicId, statusFilter, channelFilter, debouncedSearch]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data ?? []) as Message[]);
    // Mark as read
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", convId);
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("message_templates")
      .select("id,name,body,category")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("use_count", { ascending: false })
      .limit(50);
    setTemplates((data ?? []) as Template[]);
  }, [clinicId]);

  // Initial load + filter changes
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // When conversation selected
  useEffect(() => {
    if (!selectedId) { setMessages([]); setClient(null); return; }
    loadMessages(selectedId);
    const conv = conversations.find((c) => c.id === selectedId);
    if (conv?.client_id) {
      supabase.from("clients")
        .select("id, first_name, last_name, email, phone, date_of_birth, vip_status, total_visits, lifetime_value_cents")
        .eq("id", conv.client_id).maybeSingle()
        .then(({ data }) => setClient(data));
    } else {
      setClient(null);
    }
  }, [selectedId, loadMessages, conversations]);

  // Auto-scroll messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel(`inbox-${clinicId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `clinic_id=eq.${clinicId}` },
        () => { loadConversations(); })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `clinic_id=eq.${clinicId}` },
        (payload: any) => {
          if (selectedId && payload.new?.conversation_id === selectedId) loadMessages(selectedId);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, selectedId, loadConversations, loadMessages]);

  // Seed sample data once
  useEffect(() => {
    if (!clinicId || loading) return;
    if (conversations.length > 0) return;
    const key = `inbox-seeded-${clinicId}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    (async () => {
      const { data: someClients } = await supabase
        .from("clients")
        .select("id, first_name, last_name, phone, email")
        .eq("clinic_id", clinicId)
        .limit(3);
      if (!someClients || someClients.length === 0) return;
      for (const c of someClients) {
        const handle = c.phone || c.email;
        if (!handle) continue;
        const channel: Channel = c.phone ? "sms" : "email";
        const { data: conv } = await supabase
          .from("conversations")
          .insert({
            clinic_id: clinicId,
            client_id: c.id,
            channel,
            contact_name: `${c.first_name} ${c.last_name ?? ""}`.trim(),
            contact_handle: handle,
            status: "open",
          })
          .select().single();
        if (!conv) continue;
        const baseTime = Date.now() - 1000 * 60 * 30;
        await supabase.from("messages").insert([
          {
            conversation_id: conv.id, clinic_id: clinicId,
            direction: "inbound", channel,
            body: `Hi! I'd like to book an appointment for next week. What times do you have available?`,
            status: "received",
            created_at: new Date(baseTime).toISOString(),
          },
          {
            conversation_id: conv.id, clinic_id: clinicId,
            direction: "outbound", channel,
            body: `Hi ${c.first_name}! We have openings on Tuesday at 2pm or Thursday at 10am. Which works better for you?`,
            status: "delivered", sent_by_name: "Reception",
            created_at: new Date(baseTime + 5 * 60000).toISOString(),
          },
        ]);
      }
      localStorage.setItem(key, "true");
      loadConversations();
    })();
  }, [clinicId, conversations.length, loading, loadConversations]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const handleSend = async () => {
    if (!selected || !reply.trim() || !clinicId) return;
    setSending(true);
    const body = reply.trim();
    setReply("");
    const tempId = "temp-" + Date.now();
    const tempMsg: Message = {
      id: tempId, conversation_id: selected.id,
      direction: "outbound", channel: selected.channel,
      body, media_urls: null, status: "queued", failure_reason: null,
      sent_by_name: "You", created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempMsg]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selected.id,
        clinic_id: clinicId,
        direction: "outbound",
        channel: selected.channel,
        body,
        status: "queued",
        sent_by_name: "You",
      })
      .select().single();

    if (error || !data) {
      toast.error("Failed to send", { description: error?.message });
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setSending(false);
      return;
    }
    // Channel-specific dispatch
    try {
      if (selected.channel === "email" && selected.contact_handle) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: clinic } = await supabase
          .from("clinics").select("name, reply_email, contact_phone")
          .eq("id", clinicId).maybeSingle();
        const sendRes = await fetch("/lovable/email/transactional/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            templateName: "direct-message",
            recipientEmail: selected.contact_handle,
            idempotencyKey: `msg-${data.id}`,
            replyTo: (clinic as any)?.reply_email ?? null,
            templateData: {
              firstName: selected.contact_name?.split(" ")[0] ?? "there",
              messageBody: body,
              clinicName: (clinic as any)?.name ?? "Your Clinic",
              replyTo: (clinic as any)?.reply_email ?? null,
              clinicPhone: (clinic as any)?.contact_phone ?? null,
            },
          }),
        });
        if (sendRes.ok) {
          fetch("/lovable/email/queue/process", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => {});
          await supabase.from("messages").update({ status: "sent" }).eq("id", data.id);
          toast.success("Email sent");
        } else {
          const errText = await sendRes.text();
          console.error("[Inbox] Email send failed:", errText);
          await supabase.from("messages").update({ status: "failed", failure_reason: errText.slice(0, 200) }).eq("id", data.id);
          toast.error("Email failed", { description: "Check console for details" });
        }
      } else {
        await supabase.from("messages").update({ status: "sent" }).eq("id", data.id);
        toast.info(`${selected.channel.toUpperCase()} dispatch coming in Phase 4. Message saved.`);
      }
    } catch (dispatchErr: any) {
      console.error("[Inbox] Dispatch error:", dispatchErr);
      await supabase.from("messages").update({ status: "failed", failure_reason: String(dispatchErr).slice(0, 200) }).eq("id", data.id);
      toast.error("Send failed");
    }
    loadMessages(selected.id);
    setSending(false);
  };

  const updateConversation = async (patch: Partial<Conversation>) => {
    if (!selected) return;
    const { error } = await supabase.from("conversations").update(patch).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    loadConversations();
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 sm:-my-8 flex h-[calc(100vh-4rem)] flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 shadow-glow">
            <InboxIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-[11px] text-muted-foreground">
              {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"} · {conversations.length} conversations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => loadConversations()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" asChild variant="outline">
            <Link to="/app/communication/templates"><Sparkles className="me-1.5 h-3.5 w-3.5" />Templates</Link>
          </Button>
        </div>
      </div>

      {!clinicReplyEmail && (
        <div className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-amber-200 sm:px-6">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1 text-xs leading-relaxed">
            <p className="font-medium">Email replies will bounce</p>
            <p className="text-amber-200/80">
              Set your reply email in <Link to="/app/settings" className="underline underline-offset-2">Settings</Link> so client responses can reach you. Currently replies go to <code className="font-mono">noreply@notify.clinicpro.io</code> which doesn't exist.
            </p>
          </div>
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_1fr_300px]">
        {/* Conversation list */}
        <div className={cn(
          "flex min-h-0 flex-col border-border bg-surface lg:border-r",
          selectedId && "hidden lg:flex"
        )}>
          {/* Search + filters */}
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="h-9 ps-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["open", "snoozed", "closed", "all"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-sidebar-accent/40 text-muted-foreground hover:text-foreground"
                  )}>{s}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all", "sms", "whatsapp", "email", "web"] as const).map((c) => (
                <button key={c} onClick={() => setChannelFilter(c)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition",
                    channelFilter === c
                      ? "border border-primary/40 bg-primary/15 text-primary"
                      : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                  )}>{c === "all" ? "All channels" : CHANNEL_LABEL[c]}</button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 sm:p-6 text-center">
                <InboxIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No conversations</p>
                <p className="text-xs text-muted-foreground">
                  Messages from clients will appear here.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const Icon = CHANNEL_ICONS[c.channel];
                const isActive = c.id === selectedId;
                const unread = c.unread_count > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border/50 px-3 py-3 text-start transition",
                      isActive ? "bg-primary/10" : "hover:bg-sidebar-accent/40"
                    )}
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-500/30 text-xs font-bold text-foreground">
                        {initials(c.contact_name)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface",
                        CHANNEL_TINT[c.channel]
                      )}>
                        <Icon className="h-2.5 w-2.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn(
                          "truncate text-sm",
                          unread ? "font-bold text-foreground" : "font-medium text-foreground/90"
                        )}>
                          {c.is_pinned && <Pin className="me-1 inline h-2.5 w-2.5 text-amber-400" />}
                          {c.contact_name}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(c.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={cn(
                          "line-clamp-1 flex-1 text-xs",
                          unread ? "text-foreground/80" : "text-muted-foreground"
                        )}>
                          {c.last_message_direction === "outbound" && "You: "}
                          {c.last_message_text || "—"}
                        </p>
                        {unread && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation thread */}
        <div className={cn(
          "flex min-h-0 flex-col bg-background",
          !selectedId && "hidden lg:flex"
        )}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground">Choose a conversation from the list to view messages.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-border bg-surface/50 px-4 py-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded-md p-1 hover:bg-sidebar-accent/40 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-display text-base font-semibold">{selected.contact_name}</h2>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", CHANNEL_TINT[selected.channel])}>
                      {CHANNEL_LABEL[selected.channel]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{selected.contact_handle}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => updateConversation({ is_starred: !selected.is_starred })} title="Star">
                    <Star className={cn("h-4 w-4", selected.is_starred && "fill-amber-400 text-amber-400")} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateConversation({ status: selected.status === "snoozed" ? "open" : "snoozed" })} title="Snooze">
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateConversation({ status: "closed" })} title="Close">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => updateConversation({ is_pinned: !selected.is_pinned })}>
                        <Pin className="me-2 h-4 w-4" />{selected.is_pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateConversation({ status: "open" })}>
                        <CornerDownLeft className="me-2 h-4 w-4" />Reopen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateConversation({ status: "spam" })} className="text-destructive">
                        <AlertCircle className="me-2 h-4 w-4" />Mark as spam
                      </DropdownMenuItem>
                      {selected.client_id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/app/clients/$clientId" params={{ clientId: selected.client_id }}>
                              <ExternalLink className="me-2 h-4 w-4" />View client
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No messages yet.</div>
                ) : messages.map((m) => {
                  const out = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex", out ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[78%] space-y-1", out && "items-end")}>
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm",
                          out
                            ? "bg-gradient-to-br from-primary to-fuchsia-600 text-primary-foreground"
                            : "bg-sidebar-accent/60 text-foreground",
                          m.status === "failed" && "border border-destructive"
                        )}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground",
                          out ? "justify-end" : "justify-start"
                        )}>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {out && (
                            <>
                              {m.status === "queued" && <Clock className="h-2.5 w-2.5" />}
                              {m.status === "sent" && <Check className="h-2.5 w-2.5" />}
                              {m.status === "delivered" && <CheckCheck className="h-2.5 w-2.5" />}
                              {m.status === "read" && <CheckCheck className="h-2.5 w-2.5 text-sky-400" />}
                              {m.status === "failed" && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
                            </>
                          )}
                          {m.sent_by_name && out && <span>· {m.sent_by_name}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-border bg-surface/50 p-3">
                {showTemplates && templates.length > 0 && (
                  <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface p-1">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => { setReply(t.body); setShowTemplates(false); }}
                        className="block w-full rounded-md p-2 text-start text-xs hover:bg-sidebar-accent/50">
                        <div className="font-semibold">{t.name}</div>
                        <div className="line-clamp-1 text-muted-foreground">{t.body}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowTemplates((v) => !v)} title="Templates">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault(); handleSend();
                      }
                    }}
                    placeholder={`Reply via ${CHANNEL_LABEL[selected.channel]}... (⌘↵ to send)`}
                    rows={2}
                    className="min-h-[44px] resize-none text-sm"
                  />
                  <Button onClick={handleSend} disabled={sending || !reply.trim() || selected.channel === "sms" || selected.channel === "whatsapp"}
                    className="gap-1.5 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground hover:opacity-90"
                    aria-label="Send reply">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {(selected.channel === "sms" || selected.channel === "whatsapp") && (
                  <div className="mt-2">
                    <PhaseInlineNotice>
                      {selected.channel === "sms" ? "SMS" : "WhatsApp"} sending activates in Phase 4. You can read incoming messages today; outbound replies are disabled until carrier integration goes live.
                    </PhaseInlineNotice>
                  </div>
                )}
                {selected.channel === "sms" && (
                  <p className="mt-1 text-end text-[10px] text-muted-foreground">
                    {reply.length} / 160 chars · {Math.ceil(reply.length / 160) || 1} SMS
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Client context panel */}
        <div className="hidden min-h-0 flex-col overflow-y-auto border-s border-border bg-surface lg:flex">
          {!selected ? (
            <div className="flex h-full items-center justify-center p-4 sm:p-6 text-center">
              <p className="text-xs text-muted-foreground">Select a conversation to see details.</p>
            </div>
          ) : client ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-primary-foreground">
                  {initials(`${client.first_name} ${client.last_name ?? ""}`)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-semibold">{client.first_name} {client.last_name}</div>
                  {client.vip_status && <span className="text-[10px] font-bold uppercase text-amber-400">VIP</span>}
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3" /> {client.email}</div>}
                {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {client.phone}</div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Visits</div>
                  <div className="font-mono text-lg font-bold">{client.total_visits ?? 0}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">LTV</div>
                  <div className="font-mono text-lg font-bold">${((client.lifetime_value_cents ?? 0) / 100).toFixed(0)}</div>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link to="/app/clients/$clientId" params={{ clientId: client.id }}>
                  View Profile <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Not a client yet</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This contact isn't linked to a client record.
              </p>
              <div className="rounded-lg border border-border bg-background p-3 text-xs">
                <div className="font-medium">{selected.contact_name}</div>
                <div className="text-muted-foreground">{selected.contact_handle}</div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/app/clients">Convert to client</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
