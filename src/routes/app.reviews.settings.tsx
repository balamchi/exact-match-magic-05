import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/reviews/settings")({ component: ReviewSettings });

interface Settings {
  id?: string;
  is_enabled: boolean;
  trigger_hours_after_appointment: number;
  smart_filter_enabled: boolean;
  google_business_url: string;
  internal_thank_you_message: string;
  negative_feedback_alert_email: string;
}

const defaults: Settings = {
  is_enabled: false,
  trigger_hours_after_appointment: 24,
  smart_filter_enabled: true,
  google_business_url: "",
  internal_thank_you_message: "Thank you for your feedback!",
  negative_feedback_alert_email: "",
};

function ReviewSettings() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("review_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (data) {
        setSettings({
          id: data.id,
          is_enabled: data.is_enabled,
          trigger_hours_after_appointment: data.trigger_hours_after_appointment,
          smart_filter_enabled: data.smart_filter_enabled,
          google_business_url: data.google_business_url ?? "",
          internal_thank_you_message: data.internal_thank_you_message ?? "",
          negative_feedback_alert_email: data.negative_feedback_alert_email ?? "",
        });
      }
      setLoading(false);
    })();
  }, [clinicId]);

  async function save() {
    if (!clinicId) return;
    setSaving(true);
    const payload = {
      clinic_id: clinicId,
      is_enabled: settings.is_enabled,
      trigger_hours_after_appointment: settings.trigger_hours_after_appointment,
      smart_filter_enabled: settings.smart_filter_enabled,
      google_business_url: settings.google_business_url || null,
      internal_thank_you_message: settings.internal_thank_you_message || null,
      negative_feedback_alert_email: settings.negative_feedback_alert_email || null,
    };

    if (settings.id) {
      const { error } = await supabase.from("review_settings").update(payload).eq("id", settings.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("review_settings").insert(payload).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setSettings((s) => ({ ...s, id: data.id }));
    }
    toast.success("Review settings saved");
    setSaving(false);
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/app/reviews">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Settings</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Review Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <p className="text-sm font-semibold">Auto review requests</p>
            <p className="text-xs text-muted-foreground">Automatically send review requests after appointments.</p>
          </div>
          <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, is_enabled: v }))} />
        </div>

        {/* Trigger timing */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <div>
            <Label>Send request after appointment</Label>
            <Select
              value={String(settings.trigger_hours_after_appointment)}
              onValueChange={(v) => setSettings((s) => ({ ...s, trigger_hours_after_appointment: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Smart filter */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <p className="text-sm font-semibold">Smart filter</p>
            <p className="text-xs text-muted-foreground">Route 4-5★ reviews to Google; capture 1-3★ internally for improvement.</p>
          </div>
          <Switch checked={settings.smart_filter_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, smart_filter_enabled: v }))} />
        </div>

        {/* Google Business URL */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
          <Label>Google Business review URL</Label>
          <Input
            value={settings.google_business_url}
            onChange={(e) => setSettings((s) => ({ ...s, google_business_url: e.target.value }))}
            placeholder="https://g.page/r/your-clinic/review"
          />
          <p className="text-xs text-muted-foreground">Clients giving 4-5★ will be directed here to leave a public Google review.</p>
        </div>

        {/* Thank you message */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
          <Label>Thank you message</Label>
          <Textarea
            value={settings.internal_thank_you_message}
            onChange={(e) => setSettings((s) => ({ ...s, internal_thank_you_message: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Negative feedback email */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
          <Label>Negative feedback alert email</Label>
          <Input
            type="email"
            value={settings.negative_feedback_alert_email}
            onChange={(e) => setSettings((s) => ({ ...s, negative_feedback_alert_email: e.target.value }))}
            placeholder="manager@clinic.com"
          />
          <p className="text-xs text-muted-foreground">Receive instant alerts when a 1-3★ review is submitted.</p>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
