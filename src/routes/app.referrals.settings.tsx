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

export const Route = createFileRoute("/app/referrals/settings")({ component: ReferralSettingsPage });

interface Settings {
  id?: string;
  is_enabled: boolean;
  reward_type: string;
  reward_value: number;
  reward_description: string;
  referee_reward_enabled: boolean;
  referee_reward_type: string;
  referee_reward_value: number;
  terms_text: string;
}

const defaults: Settings = {
  is_enabled: false,
  reward_type: "credit",
  reward_value: 25,
  reward_description: "$25 credit toward your next visit",
  referee_reward_enabled: true,
  referee_reward_type: "credit",
  referee_reward_value: 15,
  terms_text: "Reward is applied after the referred client completes their first appointment.",
};

function ReferralSettingsPage() {
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
        .from("referral_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (data) {
        setSettings({
          id: data.id,
          is_enabled: data.is_enabled,
          reward_type: data.reward_type,
          reward_value: Number(data.reward_value),
          reward_description: data.reward_description ?? "",
          referee_reward_enabled: data.referee_reward_enabled,
          referee_reward_type: data.referee_reward_type,
          referee_reward_value: Number(data.referee_reward_value),
          terms_text: data.terms_text ?? "",
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
      reward_type: settings.reward_type,
      reward_value: settings.reward_value,
      reward_description: settings.reward_description || null,
      referee_reward_enabled: settings.referee_reward_enabled,
      referee_reward_type: settings.referee_reward_type,
      referee_reward_value: settings.referee_reward_value,
      terms_text: settings.terms_text || null,
    };

    if (settings.id) {
      const { error } = await supabase.from("referral_settings").update(payload).eq("id", settings.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("referral_settings").insert(payload).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setSettings((s) => ({ ...s, id: data.id }));
    }
    toast.success("Referral settings saved");
    setSaving(false);
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/app/referrals">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Settings</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Referral Program</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Enable */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <p className="text-sm font-semibold">Enable referral program</p>
            <p className="text-xs text-muted-foreground">Allow clients to refer others and earn rewards.</p>
          </div>
          <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, is_enabled: v }))} />
        </div>

        {/* Referrer reward */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <h3 className="text-sm font-semibold">Referrer reward</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Reward type</Label>
              <Select value={settings.reward_type} onValueChange={(v) => setSettings((s) => ({ ...s, reward_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit ($)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="free_service">Free service</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input type="number" min="0" value={settings.reward_value} onChange={(e) => setSettings((s) => ({ ...s, reward_value: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={settings.reward_description} onChange={(e) => setSettings((s) => ({ ...s, reward_description: e.target.value }))} />
          </div>
        </div>

        {/* Referee reward */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Referee reward</h3>
            <Switch checked={settings.referee_reward_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, referee_reward_enabled: v }))} />
          </div>
          {settings.referee_reward_enabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={settings.referee_reward_type} onValueChange={(v) => setSettings((s) => ({ ...s, referee_reward_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="free_service">Free service</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input type="number" min="0" value={settings.referee_reward_value} onChange={(e) => setSettings((s) => ({ ...s, referee_reward_value: Number(e.target.value) }))} />
              </div>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-2">
          <Label>Terms & conditions</Label>
          <Textarea value={settings.terms_text} onChange={(e) => setSettings((s) => ({ ...s, terms_text: e.target.value }))} rows={4} />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
