import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Phone, Send, Search, Star, Clock, Archive, MoreHorizontal, X,
  Check, CheckCheck, AlertCircle, Sparkles, MessageCircle, Zap, ExternalLink,
  CheckCircle2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/whatsapp")({ component: WhatsAppPage });

interface Conversation {
  id: string; clinic_id: string; client_id: string | null;
  channel: "whatsapp"; contact_name: string; contact_handle: string;
  status: "open" | "closed" | "snoozed" | "spam";
  unread_count: number; is_pinned: boolean; is_starred: boolean;
  last_message_text: string | null; last_message_at: string;
  last_message_direction: "inbound" | "outbound" | null;
}
interface Message {
  id: string; conversation_id: string;
  direction: "inbound" | "outbound";
  body: string; status: string; sent_by_name: string | null; created_at: string;
}
interface Template { id: string; name: string; body: string; category: string }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now"; if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function WhatsAppPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!clinicId) return;
    let q = supabase.from("conversations").select("*")
      .eq("clinic_id", clinicId).eq("channel", "whatsapp")
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false }).limit(200);
    if (search.trim()) {
      const s = search.trim().replace(/[%,]/g, "");
      q = q.or(`contact_name.ilike.%${s}%,contact_handle.ilike.%${s}%`);
    }
    const { data } = await q;
    setConversations((data ?? []) as Conversation[]);
    setLoading(false);
  }, [clinicId, search]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase.from("messages").select("*")
      .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200);
    setMessages((data ?? []) as Message[]);
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", convId);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (!clinicId) return;
    supabase.from("message_templates").select("id,name,body,category")
      .eq("clinic_id", clinicId).eq("is_active", true).limit(30)
      .then(({ data }) => setTemplates((data ?? []) as Template[]));
  }, [clinicId]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!clinicId) return;
    const ch = supabase.channel(`wa-${clinicId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `clinic_id=eq.${clinicId}` },
        () => loadConversations())
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `clinic_id=eq.${clinicId}` },
        (p: any) => { if (selectedId && p.new?.conversation_id === selectedId) loadMessages(selectedId); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clinicId, selectedId, loadConversations, loadMessages]);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);

  const handleSend = async () => {
    if (!selected || !reply.trim() || !clinicId) return;
    setSending(true);
    const body = reply.trim();
    setReply("");
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: selected.id, clinic_id: clinicId,
      direction: "outbound", channel: "whatsapp",
      body, status: "queued", sent_by_name: "You",
    }).select().single();
    if (error || !data) {
      toast.error("Failed to send", { description: error?.message });
      setSending(false); return;
    }
    await supabase.from("messages").update({ status: "sent" }).eq("id", data.id);
    toast.success("Message queued", { description: "WhatsApp Business API delivery coming soon." });
    loadMessages(selected.id);
    setSending(false);
  };

  const stats = useMemo(() => ({
    total: conversations.length,
    open: conversations.filter((c) => c.status === "open").length,
    unread: conversations.reduce((s, c) => s + (c.unread_count || 0), 0),
  }), [conversations]);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 sm:-my-8 flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-glow">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">WhatsApp Business<span className="ml-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary">Beta</span></h1>
            <p className="text-[11px] text-muted-foreground">
              {stats.open} open · {stats.unread} unread · {stats.total} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">
            <AlertCircle className="h-3 w-3" /> API integration pending
          </span>
          <Button size="sm" variant="ghost" onClick={() => loadConversations()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-4 pt-3 sm:px-6">
        <ComingSoonBanner
          title="WhatsApp Business API — coming in Phase 4"
          description="Compose and view conversations now; outbound delivery activates once your WABA number is approved. We'll queue messages and send them automatically when live."
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
        <div className="bg-surface px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conversations</div>
          <div className="font-mono text-lg font-bold">{stats.total}</div>
        </div>
        <div className="bg-surface px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open</div>
          <div className="font-mono text-lg font-bold text-emerald-300">{stats.open}</div>
        </div>
        <div className="bg-surface px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Unread</div>
          <div className="font-mono text-lg font-bold text-primary">{stats.unread}</div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
        {/* List */}
        <div className={cn("flex min-h-0 flex-col border-border bg-surface lg:border-r", selectedId && "hidden lg:flex")}>
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search WhatsApp..." className="h-9 ps-8 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-emerald-500/40" />
                <p className="text-sm font-semibold">No WhatsApp conversations yet</p>
                <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                  Once your WhatsApp Business API is connected, conversations from clients will appear here.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-4 gap-1.5">
                  <Link to="/app/inbox"><ExternalLink className="h-3 w-3" /> View all channels</Link>
                </Button>
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === selectedId;
                const unread = c.unread_count > 0;
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border/50 px-3 py-3 text-start transition",
                      isActive ? "bg-emerald-500/10" : "hover:bg-sidebar-accent/40"
                    )}>
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-xs font-bold">
                        {initials(c.contact_name)}
                      </div>
                      <div className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-surface">
                        <MessageCircle className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-sm", unread ? "font-bold" : "font-medium")}>{c.contact_name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={cn("line-clamp-1 flex-1 text-xs", unread ? "text-foreground/80" : "text-muted-foreground")}>
                          {c.last_message_direction === "outbound" && "You: "}{c.last_message_text || "—"}
                        </p>
                        {unread && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">{c.unread_count}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn("flex min-h-0 flex-col bg-background", !selectedId && "hidden lg:flex")}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageCircle className="mb-3 h-12 w-12 text-emerald-500/30" />
              <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-surface/50 px-4 py-3">
                <button onClick={() => setSelectedId(null)} className="rounded-md p-1 hover:bg-sidebar-accent/40 lg:hidden">
                  <X className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-base font-semibold">{selected.contact_name}</h2>
                  <p className="truncate text-[11px] text-muted-foreground">{selected.contact_handle}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {selected.client_id && (
                      <DropdownMenuItem asChild>
                        <Link to="/app/clients/$clientId" params={{ clientId: selected.client_id }}>
                          <ExternalLink className="me-2 h-4 w-4" />View client
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/app/inbox"><ExternalLink className="me-2 h-4 w-4" />Open in unified inbox</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No messages yet.</div>
                ) : messages.map((m) => {
                  const out = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex", out ? "justify-end" : "justify-start")}>
                      <div className="max-w-[78%] space-y-1">
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                          out ? "bg-emerald-600 text-white" : "bg-sidebar-accent/60"
                        )}>{m.body}</div>
                        <div className={cn("flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground", out ? "justify-end" : "justify-start")}>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {out && m.status === "sent" && <Check className="h-2.5 w-2.5" />}
                          {out && m.status === "delivered" && <CheckCheck className="h-2.5 w-2.5" />}
                          {out && m.status === "read" && <CheckCheck className="h-2.5 w-2.5 text-sky-400" />}
                          {out && m.status === "queued" && <Clock className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

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
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                    placeholder="WhatsApp message... (⌘↵ to send)" rows={2} className="min-h-[44px] resize-none text-sm" />
                  <Button onClick={handleSend} disabled={sending || !reply.trim()}
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
