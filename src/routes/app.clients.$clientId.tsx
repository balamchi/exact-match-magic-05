import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, Mail, Phone, Tag, Pencil, Sparkles,
  Clock, DollarSign, Activity, FileText, Syringe, Camera,
  AlertTriangle, Pill, ShieldAlert, Crown, Ban, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/clients/$clientId")({
  component: ClientDetailPage,
});

type Client = Tables<"clients">;
type Appointment = Tables<"appointments"> & {
  services?: Pick<Tables<"services">, "name" | "category"> | null;
  staff?: Pick<Tables<"staff">, "display_name" | "color"> | null;
};
type SoapNote = Tables<"soap_notes">;
type InjectionSite = Tables<"injection_sites">;
type BeforeAfter = Tables<"before_after_photos">;

function formatMoney(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

type Tab = "history" | "soap" | "injections" | "photos";

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const { activeClinic } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [soapNotes, setSoapNotes] = useState<SoapNote[]>([]);
  const [injections, setInjections] = useState<InjectionSite[]>([]);
  const [photos, setPhotos] = useState<BeforeAfter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("history");

  useEffect(() => {
    if (!activeClinic) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [clientRes, apptRes, soapRes, injRes, photoRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).eq("clinic_id", activeClinic.clinic_id).maybeSingle(),
        supabase.from("appointments").select("*, services(name, category), staff(display_name, color)").eq("clinic_id", activeClinic.clinic_id).eq("client_id", clientId).order("starts_at", { ascending: false }),
        supabase.from("soap_notes").select("*").eq("clinic_id", activeClinic.clinic_id).eq("client_id", clientId).order("visit_date", { ascending: false }),
        supabase.from("injection_sites").select("*").eq("clinic_id", activeClinic.clinic_id).eq("client_id", clientId).order("visit_date", { ascending: false }),
        supabase.from("before_after_photos").select("*").eq("clinic_id", activeClinic.clinic_id).eq("client_id", clientId).order("taken_on", { ascending: false }),
      ]);
      if (cancelled) return;
      if (clientRes.error) toast.error("Could not load client");
      setClient(clientRes.data ?? null);
      setAppointments((apptRes.data as Appointment[] | null) ?? []);
      setSoapNotes(soapRes.data ?? []);
      setInjections(injRes.data ?? []);
      setPhotos(photoRes.data ?? []);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeClinic?.clinic_id, clientId]);

  const stats = useMemo(() => {
    const completed = appointments.filter((a) => a.status === "completed");
    const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() > Date.now() && a.status !== "cancelled" && a.status !== "no_show");
    const lifetimeValueCents = completed.reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
    const lastVisit = completed[0]?.starts_at ?? null;
    return { visits: completed.length, upcoming: upcoming.length, lifetimeValueCents, lastVisit };
  }, [appointments]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
        <h2 className="font-display text-xl font-semibold">Client not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This client may have been deleted or doesn't belong to this clinic.</p>
        <Button asChild className="mt-5"><Link to="/app/clients">Back to clients</Link></Button>
      </div>
    );
  }

  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ");
  const initials = `${client.first_name.slice(0, 1)}${client.last_name?.slice(0, 1) ?? ""}`.toUpperCase();
  const currency = activeClinic?.clinic.currency ?? "CAD";
  const clientAny = client as any;
  const age = clientAny.date_of_birth ? (() => { const b = new Date(clientAny.date_of_birth); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a; })() : null;
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const cancellations = appointments.filter((a) => a.status === "cancelled").length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "history", label: "Visits", icon: <CalendarDays className="h-3.5 w-3.5" />, count: appointments.length },
    { id: "soap", label: "SOAP Notes", icon: <FileText className="h-3.5 w-3.5" />, count: soapNotes.length },
    { id: "injections", label: "Injections", icon: <Syringe className="h-3.5 w-3.5" />, count: injections.length },
    { id: "photos", label: "Photos", icon: <Camera className="h-3.5 w-3.5" />, count: photos.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate({ to: "/app/clients" })} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </button>
      </div>

      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Client profile</p>
              <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
                {fullName}
                {clientAny.vip_status && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400"><Crown className="h-3 w-3" />VIP</span>}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {age != null && <span>{age} yo</span>}
                {clientAny.pronouns && <span>· {clientAny.pronouns}</span>}
                {clientAny.city && <span>· {clientAny.city}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {client.email}</span>}
                {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {client.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/app/clients" search={{ edit: client.id } as never}><Pencil className="h-4 w-4" /> Edit</Link>
            </Button>
            <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Link to="/app/booking"><Sparkles className="h-4 w-4" /> Book visit</Link>
            </Button>
          </div>
        </div>
        {(client.tags ?? []).length > 0 && (
          <div className="relative mt-5 flex flex-wrap items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            {(client.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{tag}</span>
            ))}
          </div>
        )}
      </section>

      {/* Medical Alerts Banner */}
      {(client.medical_alerts || (client.allergies as string[] | null)?.length || (client.medications as string[] | null)?.length) ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 shadow-card">
          <div className="flex items-center gap-2 text-destructive mb-3">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="font-display text-lg font-semibold">Medical Alerts</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {client.medical_alerts && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive/80 mb-1">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />Conditions
                </p>
                <p className="text-sm text-foreground/85">{client.medical_alerts}</p>
              </div>
            )}
            {(client.allergies as string[] | null)?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive/80 mb-1">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />Allergies
                </p>
                <div className="flex flex-wrap gap-1">
                  {(client.allergies as string[]).map((a) => (
                    <span key={a} className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">{a}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {(client.medications as string[] | null)?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-1">
                  <Pill className="inline h-3 w-3 mr-1" />Medications
                </p>
                <div className="flex flex-wrap gap-1">
                  {(client.medications as string[]).map((m) => (
                    <span key={m} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">{m}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile icon={<Activity className="h-4 w-4" />} label="Total visits" value={stats.visits.toString()} />
        <StatTile icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={stats.upcoming.toString()} />
        <StatTile icon={<DollarSign className="h-4 w-4" />} label="Lifetime value" value={formatMoney(stats.lifetimeValueCents, currency)} />
        <StatTile icon={<Clock className="h-4 w-4" />} label="Last visit" value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : "—"} />
      </section>

      {/* Tabbed content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card shadow-card lg:col-span-2">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "history" && <AppointmentList appointments={appointments} currency={currency} />}
          {activeTab === "soap" && <SoapNotesList notes={soapNotes} />}
          {activeTab === "injections" && <InjectionsList injections={injections} />}
          {activeTab === "photos" && <PhotosList photos={photos} />}
        </section>

        {/* Sidebar */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold">Care notes</h2>
          <p className="mt-1 text-xs text-muted-foreground">Internal observations and reminders.</p>
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm leading-relaxed text-foreground/85">
            {client.notes?.trim() || <span className="text-muted-foreground">No notes added yet.</span>}
          </div>

          {/* Spending breakdown */}
          {stats.lifetimeValueCents > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Spending by service</h3>
              <SpendingBreakdown appointments={appointments} currency={currency} />
            </div>
          )}

          <div className="mt-5 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Created</span><span>{new Date(client.created_at).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span>Last updated</span><span>{new Date(client.updated_at).toLocaleDateString()}</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ——— Sub-components ——— */

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="mt-4 font-display text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-500/10 text-blue-400" },
    confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-400" },
    checked_in: { label: "Checked in", className: "bg-primary/10 text-primary" },
    completed: { label: "Completed", className: "bg-foreground/10 text-foreground" },
    no_show: { label: "No-show", className: "bg-amber-500/10 text-amber-400" },
    cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
  };
  const meta = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>{meta.label}</span>;
}

function AppointmentList({ appointments, currency }: { appointments: Appointment[]; currency: string }) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><CalendarDays className="h-5 w-5" /></div>
        <h3 className="font-medium">No visits yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Once you book this client they'll see their full treatment history here.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {appointments.map((appt) => (
        <li key={appt.id} className="grid gap-3 p-4 transition hover:bg-surface/60 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">{new Date(appt.starts_at).toLocaleDateString("en-US", { month: "short" })}</span>
            <span className="font-display text-base font-semibold leading-none">{new Date(appt.starts_at).getDate()}</span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-medium">{appt.services?.name ?? "Custom appointment"}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(appt.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              {appt.staff && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: appt.staff.color ?? "#a78bfa" }} />
                  {appt.staff.display_name}
                </span>
              )}
              <StatusPill status={appt.status} />
            </div>
          </div>
          <div className="text-right text-sm font-medium">{appt.price_cents > 0 ? formatMoney(appt.price_cents, currency) : "—"}</div>
        </li>
      ))}
    </ul>
  );
}

function SoapNotesList({ notes }: { notes: SoapNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileText className="h-5 w-5" /></div>
        <h3 className="font-medium">No SOAP notes yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">SOAP notes from this client's visits will appear here.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {notes.map((note) => (
        <li key={note.id} className="p-4 transition hover:bg-surface/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{new Date(note.visit_date).toLocaleDateString()}</span>
              {note.signed && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">Signed</span>}
            </div>
          </div>
          <div className="mt-2 grid gap-2 text-sm">
            {note.subjective && <div><span className="font-semibold text-primary">S:</span> <span className="text-muted-foreground">{note.subjective}</span></div>}
            {note.objective && <div><span className="font-semibold text-primary">O:</span> <span className="text-muted-foreground">{note.objective}</span></div>}
            {note.assessment && <div><span className="font-semibold text-primary">A:</span> <span className="text-muted-foreground">{note.assessment}</span></div>}
            {note.plan && <div><span className="font-semibold text-primary">P:</span> <span className="text-muted-foreground">{note.plan}</span></div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function InjectionsList({ injections }: { injections: InjectionSite[] }) {
  if (injections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Syringe className="h-5 w-5" /></div>
        <h3 className="font-medium">No injection records</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Injection mapping records for this client will appear here.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {injections.map((inj) => (
        <li key={inj.id} className="flex items-center gap-4 p-4 transition hover:bg-surface/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Syringe className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{inj.product}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{inj.region}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {new Date(inj.visit_date).toLocaleDateString()} · {Number(inj.units)} units
              {inj.notes && <span> · {inj.notes}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PhotosList({ photos }: { photos: BeforeAfter[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Camera className="h-5 w-5" /></div>
        <h3 className="font-medium">No photos yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Before & after photos for this client will appear here.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {photos.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            {p.before_url ? (
              <img src={p.before_url} alt="Before" className="h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No before</div>
            )}
            {p.after_url ? (
              <img src={p.after_url} alt="After" className="h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No after</div>
            )}
          </div>
          <div className="mt-2 text-xs">
            <span className="font-medium">{p.treatment ?? "Treatment"}</span>
            <span className="text-muted-foreground"> · {new Date(p.taken_on).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpendingBreakdown({ appointments, currency }: { appointments: Appointment[]; currency: string }) {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      if (a.status !== "completed" || !a.price_cents) continue;
      const name = a.services?.name ?? "Other";
      map.set(name, (map.get(name) ?? 0) + a.price_cents);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [appointments]);

  if (breakdown.length === 0) return null;

  const max = breakdown[0][1];

  return (
    <div className="mt-3 space-y-2">
      {breakdown.map(([name, cents]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs">
            <span className="truncate">{name}</span>
            <span className="font-medium">{formatMoney(cents, currency)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(cents / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
