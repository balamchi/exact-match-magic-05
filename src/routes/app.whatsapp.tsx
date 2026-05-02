import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  MessageSquare,
  Settings,
  Send,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  AlertCircle,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/whatsapp")({ component: WhatsAppPage });

type Template = {
  id: string;
  name: string;
  body: string;
  category: "appointment" | "marketing" | "followup" | "payment";
};

const DEFAULT_TEMPLATES: Template[] = [
  { id: "t1", name: "Appointment Reminder", body: "Hi {{first_name}}, your appointment at {{clinic_name}} is on {{date}} at {{time}}. Reply YES to confirm or call us to reschedule.", category: "appointment" },
  { id: "t2", name: "Post-Treatment Follow-Up", body: "Hi {{first_name}}, thank you for visiting {{clinic_name}} today! If you have any questions about your {{service}} treatment, don't hesitate to reach out. 💜", category: "followup" },
  { id: "t3", name: "Payment Reminder", body: "Hi {{first_name}}, this is a friendly reminder that your balance of {{amount}} is due. You can pay online at {{portal_link}} or call us. Thank you!", category: "payment" },
  { id: "t4", name: "Promo Blast", body: "🎉 {{first_name}}, we have a special offer just for you! Get {{discount}}% off {{service}} this month at {{clinic_name}}. Book now: {{booking_link}}", category: "marketing" },
  { id: "t5", name: "Rebook Nudge", body: "Hi {{first_name}}, it's been a while since your last visit! Ready to book your next {{service}} session? We'd love to see you. {{booking_link}}", category: "marketing" },
];

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  appointment: { label: "Appointment", color: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  marketing: { label: "Marketing", color: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30" },
  followup: { label: "Follow-Up", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  payment: { label: "Payment", color: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
};

const STATS = [
  { label: "Messages Sent", value: "0", icon: Send },
  { label: "Delivered", value: "0%", icon: CheckCircle2 },
  { label: "Read Rate", value: "0%", icon: Users },
  { label: "Avg Response", value: "—", icon: Clock },
];

function WhatsAppPage() {
  const [connected, setConnected] = useState(false);
  const [businessPhone, setBusinessPhone] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [activeTab, setActiveTab] = useState<"setup" | "templates" | "broadcast">("setup");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const tabs = [
    { id: "setup" as const, label: "Setup & Connection", icon: Settings },
    { id: "templates" as const, label: "Message Templates", icon: MessageSquare },
    { id: "broadcast" as const, label: "Broadcast", icon: Zap },
  ];

  const handleConnect = () => {
    if (!businessPhone.trim()) {
      toast.error("Enter your WhatsApp Business phone number");
      return;
    }
    setConnected(true);
    toast.success("WhatsApp Business connected!", { description: "You can now send and receive messages." });
  };

  const copyTemplate = (t: Template) => {
    navigator.clipboard.writeText(t.body);
    toast.success("Template copied to clipboard");
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const addTemplate = () => {
    const newT: Template = {
      id: `t${Date.now()}`,
      name: "New Template",
      body: "Hi {{first_name}}, ",
      category: "followup",
    };
    setTemplates((prev) => [...prev, newT]);
    setEditingTemplate(newT);
    setActiveTab("templates");
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
            <Phone className="h-3 w-3" /> WhatsApp Business
          </div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">WhatsApp</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connect WhatsApp Business API to send appointment reminders, follow-ups, and marketing broadcasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          )}>
            {connected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
              activeTab === t.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "setup" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold">Connect WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">
              To use WhatsApp messaging, you need a WhatsApp Business API account through Meta. 
              This connects your clinic's phone number for automated messaging.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Business Phone Number</label>
                <Input
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  disabled={connected}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">API Key (from Meta Business Suite)</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  disabled={connected}
                />
              </div>
              {!connected ? (
                <Button onClick={handleConnect} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  <Phone className="h-4 w-4" /> Connect WhatsApp
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConnected(false)} className="gap-2">
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold">How It Works</h2>
            <div className="space-y-3">
              {[
                { step: "1", title: "Create a Meta Business account", desc: "Sign up at business.facebook.com and verify your business." },
                { step: "2", title: "Set up WhatsApp Business API", desc: "Apply for API access through Meta's Cloud API or a BSP (Business Solution Provider)." },
                { step: "3", title: "Enter credentials here", desc: "Paste your phone number and permanent API token to connect." },
                { step: "4", title: "Create message templates", desc: "Templates must be approved by Meta before sending. Use our pre-built ones to get started fast." },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> WhatsApp Cloud API Documentation
            </a>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Message Templates</h2>
            <Button onClick={addTemplate} size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New Template
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => {
              const cat = CATEGORY_META[t.category] ?? CATEGORY_META.followup;
              return (
                <div key={t.id} className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary/30">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.name}</h3>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", cat.color)}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => copyTemplate(t)}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditingTemplate(t)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mb-1 inline h-3.5 w-3.5" /> WhatsApp requires all template messages to be
            pre-approved by Meta. After creating templates here, submit them in your Meta Business Suite for approval.
          </div>
        </div>
      )}

      {activeTab === "broadcast" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold">Send Broadcast</h2>
            <p className="text-sm text-muted-foreground">
              Send a WhatsApp message to a group of clients. Choose a pre-approved template to get started.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Select Template</label>
                <select className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm">
                  <option value="">Choose a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Audience</label>
                <select className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm">
                  <option value="all">All Clients with WhatsApp</option>
                  <option value="vip">VIP Clients Only</option>
                  <option value="inactive">Inactive (90+ days)</option>
                  <option value="upcoming">Upcoming Appointments</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Schedule</label>
                <select className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm">
                  <option value="now">Send Immediately</option>
                  <option value="1h">In 1 Hour</option>
                  <option value="tomorrow">Tomorrow 9am</option>
                  <option value="custom">Custom Date & Time</option>
                </select>
              </div>
              <Button
                disabled={!connected}
                className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Send className="h-4 w-4" /> {connected ? "Send Broadcast" : "Connect WhatsApp First"}
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold">Broadcast History</h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-medium">No broadcasts yet</h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Your broadcast history will appear here once you send your first WhatsApp campaign.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template edit modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-display text-xl font-semibold">Edit Template</h2>
              <button onClick={() => setEditingTemplate(null)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Template Name</label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as Template["category"] })}
                  className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm"
                >
                  <option value="appointment">Appointment</option>
                  <option value="marketing">Marketing</option>
                  <option value="followup">Follow-Up</option>
                  <option value="payment">Payment</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Message Body</label>
                <Textarea
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={5}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Use merge tags: {"{{first_name}}"}, {"{{clinic_name}}"}, {"{{date}}"}, {"{{time}}"}, {"{{service}}"}, {"{{amount}}"}, {"{{booking_link}}"}, {"{{portal_link}}"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)));
                  setEditingTemplate(null);
                  toast.success("Template updated");
                }}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
