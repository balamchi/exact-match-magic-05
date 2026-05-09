import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Users, Globe, LogOut, Save, Mail, Shield, Trash2, Link2, Copy, ExternalLink,
  Palette, CalendarCheck, Bell, MessageSquare, Receipt, Plug, ClipboardList,
  Phone, Clock, Image, Settings2, Zap, ChevronRight,
} from "lucide-react";
import { useAuth, type ClinicRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const TIMEZONES = [
  "America/Toronto", "America/Vancouver", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "America/Denver", "Europe/London", "Europe/Paris",
  "Asia/Dubai", "Asia/Singapore", "Australia/Sydney",
];
const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "AED", "SGD"];
const INDUSTRIES = ["Aesthetic", "Beauty", "Dental", "Wellness", "Dermatology", "Med Spa", "Other"];
const ROLE_LABELS: Record<ClinicRole, string> = { owner: "Owner", admin: "Admin", provider: "Provider", front_desk: "Front desk" };

type SettingsTab = "profile" | "branding" | "booking" | "notifications" | "communication" | "tax" | "integrations" | "team" | "audit";

interface MemberRow { id: string; user_id: string; role: ClinicRole; created_at: string }
interface AuditRow { id: string; action: string; entity_type: string | null; details: any; created_at: string; user_id: string }

function SettingsPage() {
  const { activeClinic, user, memberships, refreshMemberships, signOut } = useAuth();
  const isOwnerOrAdmin = activeClinic?.role === "owner" || activeClinic?.role === "admin";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Clinic data
  const [clinicData, setClinicData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (!activeClinic) return;
    supabase.from("clinics").select("*").eq("id", activeClinic.clinic_id).maybeSingle().then(({ data }) => {
      if (data) setClinicData(data);
    });
    loadMembers(activeClinic.clinic_id);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (activeTab === "audit" && activeClinic && isOwnerOrAdmin) {
      setLoadingAudit(true);
      supabase.from("audit_log").select("*").eq("clinic_id", activeClinic.clinic_id).order("created_at", { ascending: false }).limit(50).then(({ data }) => {
        setAuditLog((data ?? []) as AuditRow[]);
        setLoadingAudit(false);
      });
    }
  }, [activeTab, activeClinic?.clinic_id]);

  const loadMembers = async (clinicId: string) => {
    setLoadingMembers(true);
    const { data } = await supabase.from("clinic_members").select("id, user_id, role, created_at").eq("clinic_id", clinicId).order("created_at", { ascending: true });
    setMembers((data ?? []) as MemberRow[]);
    setLoadingMembers(false);
  };

  const updateField = (field: string, value: any) => setClinicData((prev: any) => prev ? { ...prev, [field]: value } : prev);
  const updateJsonField = (field: string, key: string, value: any) => {
    setClinicData((prev: any) => {
      if (!prev) return prev;
      const obj = prev[field] ?? {};
      return { ...prev, [field]: { ...obj, [key]: value } };
    });
  };

  const saveClinic = async () => {
    if (!activeClinic || !clinicData) return;
    setSaving(true);
    const { error } = await supabase.from("clinics").update({
      name: clinicData.name,
      timezone: clinicData.timezone,
      currency: clinicData.currency,
      phone: clinicData.phone,
      email: clinicData.email,
      reply_email: clinicData.reply_email,
      contact_phone: clinicData.contact_phone,
      website: clinicData.website,
      bio: clinicData.bio,
      operating_hours: clinicData.operating_hours,
      logo_url: clinicData.logo_url,
      logo_dark_url: clinicData.logo_dark_url,
      primary_color: clinicData.primary_color,
      accent_color: clinicData.accent_color,
      booking_rules: clinicData.booking_rules,
      notification_settings: clinicData.notification_settings,
      communication_settings: clinicData.communication_settings,
      tax_currency_settings: clinicData.tax_currency_settings,
      deposit_amount_cents: clinicData.deposit_amount_cents,
    }).eq("id", activeClinic.clinic_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    await refreshMemberships();
  };

  const updateRole = async (memberId: string, role: ClinicRole) => {
    const { error } = await supabase.from("clinic_members").update({ role }).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    if (activeClinic) loadMembers(activeClinic.clinic_id);
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("clinic_members").delete().eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success("Member removed");
    if (activeClinic) loadMembers(activeClinic.clinic_id);
  };

  if (!activeClinic) return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">No clinic selected.</div>;
  if (!clinicData) return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-96 rounded-2xl" /></div>;

  const bookingRules = clinicData.booking_rules ?? {};
  const notifSettings = clinicData.notification_settings ?? {};
  const commSettings = clinicData.communication_settings ?? {};
  const taxSettings = clinicData.tax_currency_settings ?? {};

  const NAV_ITEMS: { id: SettingsTab; label: string; icon: typeof Building2; adminOnly?: boolean }[] = [
    { id: "profile", label: "Profile", icon: Building2 },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "booking", label: "Booking Rules", icon: CalendarCheck },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "communication", label: "Communication", icon: MessageSquare },
    { id: "tax", label: "Tax & Currency", icon: Receipt },
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "team", label: "Team", icon: Users },
    { id: "audit", label: "Audit Log", icon: ClipboardList, adminOnly: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your clinic configuration and preferences.</p>
        </div>
        <div className="flex gap-2">
          {isOwnerOrAdmin && (
            <Button onClick={saveClinic} disabled={saving} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
            </Button>
          )}
          <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar Nav */}
        <nav className="space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isOwnerOrAdmin).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-border mt-2">
            <Link to="/app/locations" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Globe className="h-4 w-4" /> Locations <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </Link>
            <Link to="/app/api-settings" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Zap className="h-4 w-4" /> API & Webhooks <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </Link>
            <Link to="/app/settings/billing" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Receipt className="h-4 w-4" /> Billing <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {activeTab === "profile" && (
            <SettingsSection title="Clinic Profile" description="Public name, contact, and operating details.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Clinic name" className="md:col-span-2">
                  <Input value={clinicData.name ?? ""} onChange={(e) => updateField("name", e.target.value)} disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Slug">
                  <Input value={clinicData.slug ?? ""} disabled />
                  <p className="text-[10px] text-muted-foreground mt-1">URL identifier — cannot be changed here.</p>
                </FormField>
                <FormField label="Phone">
                  <Input value={clinicData.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="+1 (555) 000-0000" disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Email">
                  <Input value={clinicData.email ?? ""} onChange={(e) => updateField("email", e.target.value)} placeholder="hello@clinic.com" disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Website">
                  <Input value={clinicData.website ?? ""} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Timezone" className="md:col-span-2">
                  <Select value={clinicData.timezone ?? "America/Toronto"} onValueChange={(v) => updateField("timezone", v)} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Reply email" className="md:col-span-2">
                  <Input value={clinicData.reply_email ?? ""} onChange={(e) => updateField("reply_email", e.target.value)} placeholder="hello@yourclinic.com" disabled={!isOwnerOrAdmin} />
                  <p className="text-[10px] text-muted-foreground mt-1">When clients reply to messages from your clinic, replies are delivered here. Without this, replies will bounce.</p>
                </FormField>
                <FormField label="Contact phone (public)" className="md:col-span-2">
                  <Input value={clinicData.contact_phone ?? ""} onChange={(e) => updateField("contact_phone", e.target.value)} placeholder="+1 (416) 555-0100" disabled={!isOwnerOrAdmin} />
                  <p className="text-[10px] text-muted-foreground mt-1">Phone number shown to clients in outgoing messages and emails.</p>
                </FormField>
                <FormField label="About / Bio" className="md:col-span-2">
                  <Textarea value={clinicData.bio ?? ""} onChange={(e) => updateField("bio", e.target.value)} placeholder="Tell clients about your clinic..." rows={3} disabled={!isOwnerOrAdmin} />
                </FormField>
              </div>
            </SettingsSection>
          )}

          {activeTab === "branding" && (
            <SettingsSection title="Branding" description="Logo, colors, and visual identity.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Logo URL (light)">
                  <Input value={clinicData.logo_url ?? ""} onChange={(e) => updateField("logo_url", e.target.value)} placeholder="https://..." disabled={!isOwnerOrAdmin} />
                  {clinicData.logo_url && <img src={clinicData.logo_url} alt="Logo" className="mt-2 h-12 rounded border border-border bg-white p-1" />}
                </FormField>
                <FormField label="Logo URL (dark)">
                  <Input value={clinicData.logo_dark_url ?? ""} onChange={(e) => updateField("logo_dark_url", e.target.value)} placeholder="https://..." disabled={!isOwnerOrAdmin} />
                  {clinicData.logo_dark_url && <img src={clinicData.logo_dark_url} alt="Logo dark" className="mt-2 h-12 rounded border border-border p-1" />}
                </FormField>
                <FormField label="Primary color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={clinicData.primary_color ?? "#9333EA"} onChange={(e) => updateField("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border border-border cursor-pointer" disabled={!isOwnerOrAdmin} />
                    <Input value={clinicData.primary_color ?? "#9333EA"} onChange={(e) => updateField("primary_color", e.target.value)} className="flex-1" disabled={!isOwnerOrAdmin} />
                  </div>
                </FormField>
                <FormField label="Accent color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={clinicData.accent_color ?? "#D946EF"} onChange={(e) => updateField("accent_color", e.target.value)} className="h-10 w-10 rounded-lg border border-border cursor-pointer" disabled={!isOwnerOrAdmin} />
                    <Input value={clinicData.accent_color ?? "#D946EF"} onChange={(e) => updateField("accent_color", e.target.value)} className="flex-1" disabled={!isOwnerOrAdmin} />
                  </div>
                </FormField>
              </div>
            </SettingsSection>
          )}

          {activeTab === "booking" && (
            <SettingsSection title="Booking Rules" description="Control how clients can book appointments online.">
              <div className="space-y-5">
                <ToggleRow label="Allow online booking" description="Let clients book from your public booking page." checked={bookingRules.allow_online_booking ?? true} onChange={(v) => updateJsonField("booking_rules", "allow_online_booking", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Allow same-day bookings" description="Permit clients to book for today." checked={bookingRules.allow_same_day ?? true} onChange={(v) => updateJsonField("booking_rules", "allow_same_day", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Auto-confirm bookings" description="Automatically confirm online bookings without manual approval." checked={bookingRules.auto_confirm ?? false} onChange={(v) => updateJsonField("booking_rules", "auto_confirm", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Require deposit" description="Collect a deposit when booking online." checked={bookingRules.require_deposit ?? false} onChange={(v) => updateJsonField("booking_rules", "require_deposit", v)} disabled={!isOwnerOrAdmin} />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Cancellation window (hours)">
                    <Input type="number" value={bookingRules.cancellation_window_hours ?? 24} onChange={(e) => updateJsonField("booking_rules", "cancellation_window_hours", parseInt(e.target.value) || 24)} disabled={!isOwnerOrAdmin} />
                  </FormField>
                  <FormField label="Lead time required (hours)">
                    <Input type="number" value={bookingRules.lead_time_hours ?? 1} onChange={(e) => updateJsonField("booking_rules", "lead_time_hours", parseInt(e.target.value) || 1)} disabled={!isOwnerOrAdmin} />
                  </FormField>
                  <FormField label="Max advance booking (days)">
                    <Input type="number" value={bookingRules.max_advance_days ?? 90} onChange={(e) => updateJsonField("booking_rules", "max_advance_days", parseInt(e.target.value) || 90)} disabled={!isOwnerOrAdmin} />
                  </FormField>
                  <FormField label="Block client after X no-shows">
                    <Input type="number" value={bookingRules.block_after_noshows ?? 3} onChange={(e) => updateJsonField("booking_rules", "block_after_noshows", parseInt(e.target.value) || 3)} disabled={!isOwnerOrAdmin} />
                  </FormField>
                  <FormField label="Default deposit amount (cents)">
                    <Input type="number" value={clinicData.deposit_amount_cents ?? 5000} onChange={(e) => updateField("deposit_amount_cents", parseInt(e.target.value) || 5000)} disabled={!isOwnerOrAdmin} />
                  </FormField>
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === "notifications" && (
            <SettingsSection title="Notifications" description="Control what alerts you receive and how.">
              <div className="space-y-5">
                <ToggleRow label="New booking alerts" description="Get notified when a client books an appointment." checked={notifSettings.new_booking ?? true} onChange={(v) => updateJsonField("notification_settings", "new_booking", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Cancellation alerts" description="Notified when a booking is cancelled." checked={notifSettings.cancellation ?? true} onChange={(v) => updateJsonField("notification_settings", "cancellation", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Low inventory alerts" description="Alert when items fall below reorder threshold." checked={notifSettings.low_inventory ?? true} onChange={(v) => updateJsonField("notification_settings", "low_inventory", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Failed payment alerts" description="Notified when a payment fails." checked={notifSettings.failed_payment ?? true} onChange={(v) => updateJsonField("notification_settings", "failed_payment", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Daily digest email" description="Receive a daily summary of clinic activity." checked={notifSettings.daily_digest ?? false} onChange={(v) => updateJsonField("notification_settings", "daily_digest", v)} disabled={!isOwnerOrAdmin} />
                <ToggleRow label="Birthday alerts" description="Reminder before client birthdays." checked={notifSettings.birthdays ?? true} onChange={(v) => updateJsonField("notification_settings", "birthdays", v)} disabled={!isOwnerOrAdmin} />
              </div>
            </SettingsSection>
          )}

          {activeTab === "communication" && (
            <SettingsSection title="Communication" description="Configure SMS, email, and messaging preferences.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="SMS sender name">
                  <Input value={commSettings.sms_sender ?? ""} onChange={(e) => updateJsonField("communication_settings", "sms_sender", e.target.value)} placeholder={clinicData.name} disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Default email sender name">
                  <Input value={commSettings.email_sender_name ?? ""} onChange={(e) => updateJsonField("communication_settings", "email_sender_name", e.target.value)} placeholder={clinicData.name} disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Reply-to email">
                  <Input value={commSettings.reply_to ?? ""} onChange={(e) => updateJsonField("communication_settings", "reply_to", e.target.value)} placeholder="hello@clinic.com" disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="SMS opt-out keyword">
                  <Input value={commSettings.sms_optout ?? "STOP"} onChange={(e) => updateJsonField("communication_settings", "sms_optout", e.target.value)} disabled={!isOwnerOrAdmin} />
                </FormField>
              </div>
              <div className="mt-4">
                <ToggleRow label="Auto-reply during off-hours" description="Send an automatic response outside operating hours." checked={commSettings.auto_reply ?? false} onChange={(v) => updateJsonField("communication_settings", "auto_reply", v)} disabled={!isOwnerOrAdmin} />
              </div>
              {commSettings.auto_reply && (
                <FormField label="Auto-reply message" className="mt-4">
                  <Textarea value={commSettings.auto_reply_message ?? ""} onChange={(e) => updateJsonField("communication_settings", "auto_reply_message", e.target.value)} rows={2} placeholder="Thanks for reaching out! We'll get back to you during business hours." disabled={!isOwnerOrAdmin} />
                </FormField>
              )}
            </SettingsSection>
          )}

          {activeTab === "tax" && (
            <SettingsSection title="Tax & Currency" description="Tax rates, currency display, and formatting preferences.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Currency">
                  <Select value={clinicData.currency ?? "CAD"} onValueChange={(v) => updateField("currency", v)} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Tax label">
                  <Input value={taxSettings.tax_label ?? "HST"} onChange={(e) => updateJsonField("tax_currency_settings", "tax_label", e.target.value)} disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Default tax rate (%)">
                  <Input type="number" step="0.01" value={(taxSettings.tax_rate ?? 0.13) * 100} onChange={(e) => updateJsonField("tax_currency_settings", "tax_rate", (parseFloat(e.target.value) || 0) / 100)} disabled={!isOwnerOrAdmin} />
                </FormField>
                <FormField label="Date format">
                  <Select value={taxSettings.date_format ?? "MM/DD/YYYY"} onValueChange={(v) => updateJsonField("tax_currency_settings", "date_format", v)} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Time format">
                  <Select value={taxSettings.time_format ?? "12h"} onValueChange={(v) => updateJsonField("tax_currency_settings", "time_format", v)} disabled={!isOwnerOrAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="mt-4">
                <ToggleRow label="Tax-inclusive pricing" description="Display prices with tax included." checked={taxSettings.tax_inclusive ?? false} onChange={(v) => updateJsonField("tax_currency_settings", "tax_inclusive", v)} disabled={!isOwnerOrAdmin} />
              </div>
            </SettingsSection>
          )}

          {activeTab === "integrations" && (
            <SettingsSection title="Integrations" description="Connect third-party services to your clinic.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <IntegrationCard name="Twilio SMS" description="Send SMS reminders and notifications." status="not_connected" />
                <IntegrationCard name="Lovable AI" description="AI-powered insights and automation." status="connected" />
                <IntegrationCard name="Google Calendar" description="Sync appointments with Google Calendar." status="not_connected" />
                <IntegrationCard name="QuickBooks" description="Sync invoices and payments." status="not_connected" />
                <IntegrationCard name="Stripe Connect" description="Accept client payments online." status="not_connected" />
                <IntegrationCard name="Zapier" description="Connect with 5,000+ apps." status="not_connected" />
              </div>
            </SettingsSection>
          )}

          {activeTab === "team" && (
            <SettingsSection title="Team Members" description={`${members.length} member${members.length !== 1 ? "s" : ""} in ${clinicData.name}`}>
              {isOwnerOrAdmin && (
                <div className="mb-4">
                  <Button variant="outline" disabled title="Email invites coming soon"><Mail className="mr-2 h-4 w-4" /> Invite member</Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">User ID</th>
                      <th className="py-2 pr-4 font-medium">Joined</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembers && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
                    {!loadingMembers && members.map((m) => {
                      const isSelf = m.user_id === user?.id;
                      return (
                        <tr key={m.id} className="border-b border-border/40 last:border-0">
                          <td className="py-3 pr-4 font-mono text-xs">{m.user_id.slice(0, 8)}…{isSelf && <Badge variant="outline" className="ml-2">You</Badge>}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                          <td className="py-3 pr-4">
                            {isOwnerOrAdmin && !isSelf ? (
                              <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as ClinicRole)}>
                                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(ROLE_LABELS) as ClinicRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="capitalize">{ROLE_LABELS[m.role]}</Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {isOwnerOrAdmin && !isSelf && m.role !== "owner" && (
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeMember(m.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SettingsSection>
          )}

          {activeTab === "audit" && (
            <SettingsSection title="Audit Log" description="Recent actions and changes across the clinic.">
              {loadingAudit ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : auditLog.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No audit entries yet. Actions will be logged as you use the app.</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-3">
                      <div>
                        <p className="text-sm font-medium">{entry.action}</p>
                        <p className="text-[11px] text-muted-foreground">{entry.entity_type && `${entry.entity_type} · `}{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{entry.user_id.slice(0, 8)}…</span>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>
          )}
        </div>
      </div>

      {/* Public booking link */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Public booking link</h2>
            <p className="text-xs text-muted-foreground">Share this URL so clients can request appointments online.</p>
          </div>
        </header>
        {(() => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const url = `${origin}/book/${clinicData.slug}`;
          return (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">{url}</code>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Preview</a>
                </Button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Clinic switcher */}
      {memberships.length > 1 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Your clinics</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <div key={m.clinic_id} className={cn("rounded-xl border p-4", m.clinic_id === activeClinic.clinic_id ? "border-primary/40 bg-primary/5" : "border-border")}>
                <div className="font-medium">{m.clinic.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.clinic.slug}</div>
                <Badge variant="secondary" className="mt-2 capitalize">{ROLE_LABELS[m.role]}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ——— Reusable settings sub-components ——— */

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground mb-5">{description}</p>
      {children}
    </div>
  );
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function IntegrationCard({ name, description, status }: { name: string; description: string; status: "connected" | "not_connected" | "error" }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        <Badge variant={status === "connected" ? "default" : "secondary"} className={cn("text-[10px]", status === "connected" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30")}>
          {status === "connected" ? "Connected" : "Not connected"}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{description}</p>
      <Button variant="outline" size="sm" disabled={status === "connected"} className="w-full">
        {status === "connected" ? "Manage" : "Connect"}
      </Button>
    </div>
  );
}
