import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Trash2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/ai")({ component: AiAssistantPage });

type Msg = { role: "user" | "assistant"; content: string };
type Assistant = Tables<"ai_assistants">;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  assistantConfig,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  assistantConfig?: { systemPrompt?: string; model?: string };
  onDelta: (delta: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      systemPrompt: assistantConfig?.systemPrompt || undefined,
      model: assistantConfig?.model || undefined,
    }),
    signal,
  });

  if (resp.status === 429 || resp.status === 402) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || "Rate limited");
  }
  if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
  onDone();
}

const PRESETS = [
  "Draft a SOAP note for a Botox forehead treatment",
  "Suggest post-care instructions for dermal filler lips",
  "Write a follow-up text for a no-show patient",
  "Compare neurotoxin dilution ratios for glabella",
];

function AiAssistantPage() {
  const { activeClinic } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("default");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!activeClinic) return;
    supabase
      .from("ai_assistants")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => setAssistants(data ?? []));
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userMsg: Msg = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      let assistantSoFar = "";
      const controller = new AbortController();
      abortRef.current = controller;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const selected = assistants.find((a) => a.id === selectedAssistant);
      try {
        await streamChat({
          messages: [...messages, userMsg],
          assistantConfig: selected
            ? { systemPrompt: selected.system_prompt ?? undefined, model: selected.model }
            : undefined,
          onDelta: upsert,
          onDone: () => setIsStreaming(false),
          signal: controller.signal,
        });

        // Increment call count
        if (selected) {
          supabase
            .from("ai_assistants")
            .update({ call_count: (selected.call_count ?? 0) + 1 })
            .eq("id", selected.id)
            .then();
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error(err);
        toast.error(err instanceof Error ? err.message : "AI request failed");
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, assistants, selectedAssistant],
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">AI Assistant</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAssistant}
            onChange={(e) => setSelectedAssistant(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
          >
            <option value="default">General assistant</option>
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                abortRef.current?.abort();
                setMessages([]);
                setIsStreaming(false);
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-card">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">How can I help?</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ask about treatment protocols, draft patient communications, generate SOAP notes, or get clinical insights.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <Sparkles className="mb-1 h-3.5 w-3.5 text-primary" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 rounded-xl p-3 ${
                  msg.role === "user" ? "bg-primary/5" : "bg-transparent"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary/15 text-primary"
                      : "bg-gradient-primary text-primary-foreground"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1 text-sm leading-relaxed">
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  {msg.role === "assistant" && i === messages.length - 1 && isStreaming && (
                    <span className="inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask anything about clinical protocols, patient comms, or treatment plans…"
          className="min-h-[48px] resize-none"
          rows={1}
          disabled={isStreaming}
        />
        <Button
          onClick={() => send(input)}
          disabled={!input.trim() || isStreaming}
          className="h-12 w-12 shrink-0 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
