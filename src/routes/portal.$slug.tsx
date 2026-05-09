import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  User,
  FileText,
  Clock,
  ChevronRight,
  LogIn,
  Mail,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/$slug")({
  component: ClientPortal,
});

type ClientInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
};

type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  services: { name: string } | null;
  staff: { display_name: string } | null;
};

function ClientPortal() {
  const { slug } = Route.useParams();
  const [clinicName, setClinicName] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [step, setStep] = useState<"lookup" | "verify" | "dashboard">("lookup");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "profile">("upcoming");

  useEffect(() => {
    loadClinic();
  }, [slug]);

  const loadClinic = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("slug", slug)
      .single();
    if (data) {
      setClinicName(data.name);
      setClinicId(data.id);
    }
    setLoading(false);
  };

  const lookupClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !email.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone")
      .eq("clinic_id", clinicId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      toast.error("No account found with that email. Please contact your clinic.");
      setSubmitting(false);
      return;
    }

    // In production, send an OTP email. For now, skip verification.
    setClient(data as ClientInfo);
    setStep("dashboard");
    await loadAppointments(data.id);
    setSubmitting(false);
  };

  const loadAppointments = async (clientId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, status, notes, services(name), staff(display_name)")
      .eq("client_id", clientId)
      .order("start_time", { ascending: false })
      .limit(50);
    if (data) setAppointments(data as any[]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">Clinic not found</h1>
        <p className="text-muted-foreground">The portal link may be incorrect.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Go home
          </Button>
        </Link>
      </div>
    );
  }

  if (step === "lookup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500">
              <User className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{clinicName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Client portal — view appointments & manage your profile
            </p>
          </div>

          <form onSubmit={lookupClient} className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-6 backdrop-blur">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3 w-3" /> Email address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow">
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
              {submitting ? "Looking up…" : "Access my portal"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Can't find your account? Contact {clinicName} to get set up.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard
  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.start_time >= now && a.status !== "cancelled");
  const past = appointments.filter((a) => a.start_time < now || a.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{clinicName}</p>
            <h1 className="text-lg font-semibold">
              Welcome, {client?.first_name}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStep("lookup"); setClient(null); }}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <div className="mb-6 inline-flex rounded-lg border border-border/60 bg-card/30 p-0.5">
          {([
            { key: "upcoming", label: "Upcoming", icon: Calendar },
            { key: "past", label: "History", icon: Clock },
            { key: "profile", label: "Profile", icon: User },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition",
                  tab === t.key
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "upcoming" && (
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/20 py-12 text-center">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                <Link to="/book/$slug" params={{ slug }}>
                  <Button size="sm" className="mt-3">
                    Book now
                  </Button>
                </Link>
              </div>
            ) : (
              upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
            )}
          </div>
        )}

        {tab === "past" && (
          <div className="space-y-3">
            {past.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/20 py-12 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No past appointments</p>
              </div>
            ) : (
              past.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
            )}
          </div>
        )}

        {tab === "profile" && client && (
          <ProfileSection client={client} clinicId={clinicId} onUpdate={(c) => setClient(c)} />
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ apt }: { apt: Appointment }) {
  const d = new Date(apt.start_time);
  const statusColors: Record<string, string> = {
    confirmed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    completed: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    cancelled: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    no_show: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="text-xs font-bold uppercase">{d.toLocaleDateString("en", { month: "short" })}</span>
        <span className="text-lg font-bold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{apt.services?.name || "Appointment"}</p>
        <p className="text-xs text-muted-foreground">
          {d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
          {apt.staff?.display_name && ` · ${apt.staff.display_name}`}
        </p>
      </div>
      <Badge variant="outline" className={cn("text-[10px] uppercase", statusColors[apt.status] || "")}>
        {apt.status.replace("_", " ")}
      </Badge>
    </div>
  );
}

function ProfileSection({
  client,
  clinicId,
  onUpdate,
}: {
  client: ClientInfo;
  clinicId: string;
  onUpdate: (c: ClientInfo) => void;
}) {
  const [firstName, setFirstName] = useState(client.first_name);
  const [lastName, setLastName] = useState(client.last_name);
  const [phone, setPhone] = useState(client.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      })
      .eq("id", client.id);

    if (error) {
      toast.error("Couldn't update profile");
    } else {
      toast.success("Profile updated");
      onUpdate({ ...client, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-5 backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">First name</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Last name</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input value={client.email} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow">
          {saving ? "Saving…" : "Update profile"}
        </Button>
      </div>
    </form>
  );
}
