import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Building2, Users, Globe, LogOut, Save, Mail, Shield, Trash2, Link2, Copy, ExternalLink,
  Palette, CalendarCheck, Bell, MessageSquare, Receipt, Plug, ClipboardList,
  Phone, Clock, Image, Settings2, Zap, ChevronRight,
  Check, X as XIcon,
} from "lucide-react";
import { useAuth, type ClinicRole } from "@/lib/auth-context";
import { ROLE_PERMISSIONS, ROLE_LABELS as PERM_ROLE_LABELS, ROLE_DESCRIPTIONS, PERMISSION_MODULES, hasPermission, type PermissionKey } from "@/lib/permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { inviteUserToClinic } from "@/server/users.functions";
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
import { SquareConnectionCard } from "@/components/square-connection-card";
import { KioskUrlCard } from "@/components/kiosk-url-card";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const TIMEZONES = [
  "America/Toronto", "America/Vancouver", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "America/Denver", "Europe/London", "Europe/Paris",
  "Asia/Dubai", "Asia/Singapore", "Australia/Sydney",
];
const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "AED", "SGD"];
const INDUSTRIES = ["Aesthetic", "Beauty", "Dental", "Wellness", "Dermatology", "Med Spa", "Other"];
const ROLE_LABELS: Record<ClinicRole, string> = { owner: "Owner", admin: "Admin", senior_admin: "Senior Admin", junior_admin: "Junior Admin", manager: "Manager", provider: "Provider", front_desk: "Front desk" };

type SettingsTab = "profile" | "branding" | "booking" | "notifications" | "communication" | "tax" | "integrations" | "users" | "permissions" | "audit";

interface MemberRow { id: string; user_id: string; role: ClinicRole; created_at: string }
interface AuditRow { id: string; action: string; entity_type: string | null; details: any; created_at: string; user_id: string }
interface SeedActivityRow { id: string; action: string; resource: string | null; result: any; status: string; error_message: string | null; created_at: string; user_id: string | null }

function SettingsPage() {
  const { activeClinic, user, memberships, refreshMemberships, signOut } = useAuth();
  const canWriteSettings = hasPermission(activeClinic?.role, "clinic.settings.write");
  const canReadAudit = hasPermission(activeClinic?.role, "audit.read");
  // Alias kept so the 50+ existing JSX usages of `isOwnerOrAdmin` (disabled props on
  // inputs/toggles for Profile/Branding/Booking/etc) Just Work without modification.
  const isOwnerOrAdmin = canWriteSettings;
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window === "undefined") return "profile";
    const raw = new URLSearchParams(window.location.search).get("tab");
    const t = (raw === "team" ? "users" : raw) as SettingsTab | null;
    return t && ["profile","branding","booking","notifications","communication","tax","integrations","users","permissions","audit"].includes(t) ? t : "profile";
  });

  // Clinic data
  const [clinicData, setClinicData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [seedActivity, setSeedActivity] = useState<SeedActivityRow[]>([]);
  const [loadingSeedActivity, setLoadingSeedActivity] = useState(false);

  useEffect(() => {
    if (!activeClinic) return;
    supabase.from("clinics").select("*").eq("id", activeClinic.clinic_id).maybeSingle().then(({ data }) => {
      if (data) setClinicData(data);
    });
    loadMembers(activeClinic.clinic_id);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (activeTab === "audit" && activeClinic && canReadAudit) {
      setLoadingAudit(true);
      supabase.from("audit_log").select("*").eq("clinic_id", activeClinic.clinic_id).order("created_at", { ascending: false }).limit(50).then(({ data }) => {
        setAuditLog((data ?? []) as AuditRow[]);
        setLoadingAudit(false);
      });
    }
  }, [activeTab, activeClinic?.clinic_id]);

  const canViewSeedLog = hasPermission(activeClinic?.role, "seed.view_log");

  useEffect(() => {
    if (activeTab === "audit" && activeClinic && canViewSeedLog) {
      setLoadingSeedActivity(true);
      (supabase as any)
        .from("seed_activity_log")
        .select("id, action, resource, result, status, error_message, created_at, user_id")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("created_at", { ascending: false })
        .limit(25)
        .then(({ data }: { data: SeedActivityRow[] | null }) => {
          setSeedActivity((data ?? []) as SeedActivityRow[]);
          setLoadingSeedActivity(false);
        });
    }
  }, [activeTab, activeClinic?.clinic_id, canViewSeedLog]);

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

  // Invite member dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClinicRole>("front_desk");
  const [inviting, setInviting] = useState(false);

  const submitInvite = async () => {
    if (!activeClinic) return;
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      const result = await inviteUserToClinic({
        data: { clinicId: activeClinic.clinic_id, email, role: inviteRole },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("front_desk");
      loadMembers(activeClinic.clinic_id);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  // Remove member confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!confirmRemoveId) return;
    await removeMember(confirmRemoveId);
    setConfirmRemoveId(null);
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
    { id: "users", label: "Users", icon: Users },
    { id: "permissions", label: "Permissions", icon: Shield },
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
          {NAV_ITEMS.filter((item) => !item.adminOnly || canReadAudit).map((item) => {
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
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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
            <div className="space-y-6">
              <SettingsSection
                title="Payment Integration"
                description="Connect Square to power membership recurring billing, plans, and invoices."
              >
                <SquareConnectionCard clinicId={activeClinic!.clinic_id} />
              </SettingsSection>
              <SettingsSection title="Other Integrations" description="Connect third-party services to your clinic.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <IntegrationCard name="Twilio SMS" description="Send SMS reminders and notifications." status="not_connected" />
                  <IntegrationCard name="Lovable AI" description="AI-powered insights and automation." status="connected" />
                  <IntegrationCard name="Google Calendar" description="Sync appointments with Google Calendar." status="not_connected" />
                  <IntegrationCard name="QuickBooks" description="Sync invoices and payments." status="not_connected" />
                  <IntegrationCard name="Zapier" description="Connect with 5,000+ apps." status="not_connected" />
                </div>
              </SettingsSection>
            </div>
          )}

          {activeTab === "users" && (
            <SettingsSection title="Users" description={`${members.length} user${members.length !== 1 ? "s" : ""} in ${clinicData.name}`}>
              {isOwnerOrAdmin && (
                <div className="mb-4">
                  <Button variant="outline" onClick={() => setInviteOpen(true)}><Mail className="mr-2 h-4 w-4" /> Invite member</Button>
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
                    {loadingMembers && <tr><td colSpan={4} className="py-4 sm:py-6 text-center text-muted-foreground">Loading…</td></tr>}
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
                                  {(Object.keys(ROLE_LABELS) as ClinicRole[])
                                    .filter((r) => r !== "admin" || m.role === "admin")
                                    .map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="capitalize">{ROLE_LABELS[m.role]}</Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {isOwnerOrAdmin && !isSelf && m.role !== "owner" && (
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmRemoveId(m.id)}>
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

          {activeTab === "permissions" && (
            <SettingsSection
              title="Role Permissions"
              description="What each user role can do in ClinicPro. Read-only reference."
            >
              <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">About User Permissions</p>
                    <p className="mt-1 text-muted-foreground">
                      These permissions control who can access what in your ClinicPro account.
                      To manage practitioners, work schedules, and clinic roster, go to the Staff page (coming soon).
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Available Roles</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(PERM_ROLE_LABELS) as ClinicRole[])
                    .filter((role) => role !== "admin")
                    .map((role) => {
                      const permCount = ROLE_PERMISSIONS[role]?.length ?? 0;
                      return (
                        <div key={role} className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-semibold text-foreground">{PERM_ROLE_LABELS[role]}</h4>
                            <span className="text-xs text-muted-foreground">{permCount} permissions</span>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Permission Matrix</h3>
                {PERMISSION_MODULES.map((module) => (
                  <div key={module.key} className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                      <h4 className="text-sm font-semibold text-foreground">{module.label}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Permission</th>
                            {(Object.keys(PERM_ROLE_LABELS) as ClinicRole[])
                              .filter((role) => role !== "admin")
                              .map((role) => (
                                <th key={role} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                  {PERM_ROLE_LABELS[role]}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {module.keys.map((permKey) => (
                            <tr key={permKey} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-mono text-xs text-foreground">{permKey}</td>
                              {(Object.keys(PERM_ROLE_LABELS) as ClinicRole[])
                                .filter((role) => role !== "admin")
                                .map((role) => {
                                  const has = ROLE_PERMISSIONS[role]?.includes(permKey as PermissionKey);
                                  return (
                                    <td key={role} className="px-2 py-2.5 text-center">
                                      {has ? (
                                        <Check className="mx-auto h-4 w-4 text-green-600" />
                                      ) : (
                                        <XIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />
                                      )}
                                    </td>
                                  );
                                })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Note:</strong> The legacy "Admin" role has the same permissions as Senior Admin
                  and is preserved for backwards compatibility. New users should be assigned Senior Admin, Junior Admin, Manager,
                  Provider, or Front Desk based on their responsibilities.
                </p>
              </div>
            </SettingsSection>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
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

              {canViewSeedLog && (
                <SettingsSection title="Seed Activity" description="History of clinic seeding operations (services, consent forms, automations, memberships).">
                  {loadingSeedActivity ? (
                    <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                  ) : seedActivity.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">No seed operations have run yet for this clinic.</p>
                  ) : (
                    <div className="space-y-2">
                      {seedActivity.map((entry) => {
                        const r = entry.result as { attempted?: number; succeeded?: number; inserted?: number; errors?: string[] } | null;
                        const statusColor =
                          entry.status === "success" ? "text-emerald-500" :
                          entry.status === "partial" ? "text-amber-500" :
                          "text-rose-500";
                        return (
                          <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {entry.action}{entry.resource ? ` · ${entry.resource}` : ""}
                                </p>
                                <span className={cn("text-[10px] font-semibold uppercase tracking-wide", statusColor)}>
                                  {entry.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {r?.attempted != null && r?.succeeded != null
                                  ? `${r.succeeded}/${r.attempted} rows · `
                                  : ""}
                                {new Date(entry.created_at).toLocaleString()}
                              </p>
                              {entry.error_message && (
                                <p className="mt-1 text-[11px] text-rose-500">{entry.error_message}</p>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {entry.user_id ? `${entry.user_id.slice(0, 8)}…` : "system"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SettingsSection>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Developer tools */}
      {isOwnerOrAdmin && activeClinic && (
        <section className="rounded-2xl border border-dashed border-border bg-card p-4 sm:p-6 shadow-card">
          <header>
            <h2 className="font-display text-lg font-semibold">Developer tools</h2>
            <p className="text-xs text-muted-foreground">Internal helpers for testing flows.</p>
          </header>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { error } = await supabase
                  .from("clinics")
                  .update({ onboarding_completed_at: null, onboarding_dismissed_at: null } as any)
                  .eq("id", activeClinic.clinic_id);
                if (error) { toast.error(error.message); return; }
                toast.success("Onboarding reset. Refresh to see wizard again.");
              }}
            >
              Reset onboarding flow
            </Button>
          </div>
        </section>
      )}

      {/* Public booking link */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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

      <KioskUrlCard />

      {/* Clinic switcher */}
      {memberships.length > 1 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => !inviting && setInviteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a new user</DialogTitle>
            <DialogDescription>
              They'll receive an email invitation to join {clinicData.name} with the role you select.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ClinicRole)} disabled={inviting}>
                <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as ClinicRole[])
                    .filter((r) => r !== "owner" && r !== "admin")
                    .map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                See the Permissions tab for what each role can do.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</Button>
            <Button onClick={submitInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={confirmRemoveId !== null} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to {clinicData.name} immediately. You can re-invite them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
