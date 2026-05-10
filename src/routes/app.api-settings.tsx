import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Key, Copy, Eye, EyeOff, Plus, Trash2, Globe, Webhook,
  Shield, Clock, CheckCircle2, XCircle, RefreshCw, Code,
} from "lucide-react";
import { toast } from "sonner";
import { Phase4Badge, ComingSoonBanner } from "@/components/beta-badge";

export const Route = createFileRoute("/app/api-settings")({
  component: ApiSettingsPage,
});

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string | null;
  active: boolean;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered: string | null;
  failCount: number;
}

const MOCK_KEYS: ApiKey[] = [
  { id: "1", name: "Production App", prefix: "cp_live_a8f3…", created: "2026-03-15", lastUsed: "2026-05-01", active: true },
  { id: "2", name: "Staging", prefix: "cp_test_x91k…", created: "2026-04-20", lastUsed: "2026-04-28", active: true },
];

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  { id: "1", url: "https://example.com/webhooks/clinicpro", events: ["appointment.created", "appointment.completed", "client.created"], active: true, lastTriggered: "2 hours ago", failCount: 0 },
  { id: "2", url: "https://zapier.com/hooks/catch/1234", events: ["invoice.paid"], active: false, lastTriggered: "5 days ago", failCount: 3 },
];

const ALL_EVENTS = [
  "appointment.created", "appointment.updated", "appointment.completed", "appointment.canceled",
  "client.created", "client.updated",
  "invoice.created", "invoice.paid",
  "payment.received",
  "lead.created", "lead.converted",
];

function ApiSettingsPage() {
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [webhooks, setWebhooks] = useState(MOCK_WEBHOOKS);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const k: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      prefix: `cp_live_${Math.random().toString(36).slice(2, 6)}…`,
      created: new Date().toISOString().slice(0, 10),
      lastUsed: null,
      active: true,
    };
    setKeys((p) => [...p, k]);
    setNewKeyName("");
    toast.success("API key created");
  };

  const revokeKey = (id: string) => {
    setKeys((p) => p.filter((k) => k.id !== id));
    toast.success("API key revoked");
  };

  return (
    <div className="space-y-8">
      <ComingSoonBanner
        title="Public API & Webhooks — coming in Phase 4"
        description="Keys you create here are illustrative. Live API access and webhook delivery activate when Phase 4 ships."
      />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          API & Webhooks
          <Phase4Badge />
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys and webhook endpoints for third-party integrations
        </p>
      </div>

      {/* API Reference */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            API Reference
          </CardTitle>
          <CardDescription>RESTful API with JSON responses. Base URL: <code className="text-primary">https://api.clinicpro.io/v1</code></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {[
              { method: "GET", path: "/appointments", desc: "List appointments" },
              { method: "POST", path: "/appointments", desc: "Create appointment" },
              { method: "GET", path: "/clients", desc: "List clients" },
              { method: "POST", path: "/clients", desc: "Create client" },
              { method: "GET", path: "/services", desc: "List services" },
              { method: "GET", path: "/invoices", desc: "List invoices" },
            ].map((e) => (
              <div key={e.path + e.method} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Badge variant="outline" className={e.method === "GET" ? "text-emerald-400 border-emerald-400/30" : "text-blue-400 border-blue-400/30"}>
                  {e.method}
                </Badge>
                <code className="text-xs">{e.path}</code>
                <span className="text-xs text-muted-foreground ml-auto">{e.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Include your API key in the <code>Authorization: Bearer cp_live_…</code> header. Rate limit: 100 req/min.
          </p>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Keys
          </CardTitle>
          <CardDescription>Create and manage API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. 'Production')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="max-w-xs"
            />
            <Button onClick={createKey} disabled={!newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Create Key
            </Button>
          </div>

          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/30">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{k.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <code>{showKey === k.id ? `cp_live_${k.id.slice(0, 32)}` : k.prefix}</code>
                    <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="hover:text-foreground">
                      {showKey === k.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(`cp_live_${k.id}`); toast.success("Copied"); }} className="hover:text-foreground">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0">
                  <p>Created {k.created}</p>
                  <p>{k.lastUsed ? `Last used ${k.lastUsed}` : "Never used"}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeKey(k.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>Receive real-time notifications when events happen in your clinic</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Endpoint
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={wh.active} onCheckedChange={(v) => setWebhooks((p) => p.map((w) => (w.id === wh.id ? { ...w, active: v } : w)))} />
                    <Label className="text-sm font-medium">{wh.active ? "Active" : "Paused"}</Label>
                  </div>
                  {wh.failCount > 0 && (
                    <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px]">
                      {wh.failCount} failures
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {wh.lastTriggered ? `Last triggered ${wh.lastTriggered}` : "Never triggered"}
                </div>
              </div>
              <code className="text-sm block truncate text-muted-foreground">{wh.url}</code>
              <div className="flex flex-wrap gap-1.5">
                {wh.events.map((e) => (
                  <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Test
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Available Events */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Available Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_EVENTS.map((e) => (
              <div key={e} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <code className="text-xs">{e}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
