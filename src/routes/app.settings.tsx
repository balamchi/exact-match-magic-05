import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Users, Globe, LogOut, Save, Mail, Shield, Trash2, Link2, Copy, ExternalLink } from "lucide-react";
import { useAuth, type ClinicRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "AED", "SGD"];

const ROLE_LABELS: Record<ClinicRole, string> = {
  owner: "Owner",
  admin: "Admin",
  provider: "Provider",
  front_desk: "Front desk",
};

interface MemberRow {
  id: string;
  user_id: string;
  role: ClinicRole;
  created_at: string;
}

function SettingsPage() {
  const { activeClinic, user, memberships, refreshMemberships, signOut } = useAuth();
  const isOwnerOrAdmin = activeClinic?.role === "owner" || activeClinic?.role === "admin";

  // Clinic profile state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [currency, setCurrency] = useState("CAD");
  const [savingClinic, setSavingClinic] = useState(false);

  // Members state
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (activeClinic) {
      setName(activeClinic.clinic.name);
      setTimezone(activeClinic.clinic.timezone);
      setCurrency(activeClinic.clinic.currency);
    }
  }, [activeClinic]);

  useEffect(() => {
    if (!activeClinic) return;
    loadMembers(activeClinic.clinic_id);
  }, [activeClinic?.clinic_id]);

  const loadMembers = async (clinicId: string) => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("clinic_members")
      .select("id, user_id, role, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load team");
    } else {
      setMembers((data ?? []) as MemberRow[]);
    }
    setLoadingMembers(false);
  };

  const saveClinic = async () => {
    if (!activeClinic) return;
    setSavingClinic(true);
    const { error } = await supabase
      .from("clinics")
      .update({ name, timezone, currency })
      .eq("id", activeClinic.clinic_id);
    setSavingClinic(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Clinic profile updated");
    await refreshMemberships();
  };

  const updateRole = async (memberId: string, role: ClinicRole) => {
    const { error } = await supabase.from("clinic_members").update({ role }).eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role updated");
    if (activeClinic) loadMembers(activeClinic.clinic_id);
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("clinic_members").delete().eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Member removed");
    if (activeClinic) loadMembers(activeClinic.clinic_id);
  };

  if (!activeClinic) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        No clinic selected.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your clinic profile, team, and account preferences.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Clinic profile */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Clinic profile</h2>
              <p className="text-xs text-muted-foreground">Public name, timezone, and billing currency.</p>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="clinic-name">Clinic name</Label>
              <Input
                id="clinic-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwnerOrAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={activeClinic.clinic.slug} disabled />
              <p className="text-[10px] text-muted-foreground/70">URL identifier — contact support to change.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={!isOwnerOrAdmin}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={!isOwnerOrAdmin}>
                <SelectTrigger id="timezone"><Globe className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isOwnerOrAdmin && (
            <div className="mt-6 flex justify-end">
              <Button onClick={saveClinic} disabled={savingClinic}>
                <Save className="mr-2 h-4 w-4" /> {savingClinic ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </section>

        {/* Account card */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Your account</h2>
              <p className="text-xs text-muted-foreground">Signed-in identity and access.</p>
            </div>
          </header>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right font-medium break-all">{user?.email ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge variant="secondary" className="capitalize">{ROLE_LABELS[activeClinic.role]}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Clinics</dt>
              <dd className="font-medium">{memberships.length}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Team management */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Team members</h2>
              <p className="text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"} in {activeClinic.clinic.name}
              </p>
            </div>
          </div>
          {isOwnerOrAdmin && (
            <Button variant="outline" disabled title="Email invites coming soon">
              <Mail className="mr-2 h-4 w-4" /> Invite member
            </Button>
          )}
        </header>

        <div className="mt-6 overflow-x-auto">
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
              {loadingMembers && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading team…</td></tr>
              )}
              {!loadingMembers && members.map((m) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <tr key={m.id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">
                      {m.user_id.slice(0, 8)}…{isSelf && <Badge variant="outline" className="ml-2">You</Badge>}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      {isOwnerOrAdmin && !isSelf ? (
                        <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as ClinicRole)}>
                          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABELS) as ClinicRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">{ROLE_LABELS[m.role]}</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {isOwnerOrAdmin && !isSelf && m.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeMember(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadingMembers && members.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
          const url = `${origin}/book/${activeClinic.clinic.slug}`;
          return (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">{url}</code>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Preview
                  </a>
                </Button>
              </div>
            </div>
          );
        })()}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Bookings arrive in <strong>Leads</strong> tagged <code>public_booking</code>. Confirm them into appointments from there.
        </p>
      </section>

      {/* Clinic switcher */}
      {memberships.length > 1 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Your clinics</h2>
          <p className="text-xs text-muted-foreground">Switch between clinics you belong to.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <div
                key={m.clinic_id}
                className={`rounded-xl border p-4 ${
                  m.clinic_id === activeClinic.clinic_id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border"
                }`}
              >
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
