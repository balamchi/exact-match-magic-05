import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Mail, Phone, Tag, Pencil, Sparkles,
  Clock, DollarSign, Activity, FileText, Syringe, Camera,
  AlertTriangle, Pill, ShieldAlert, Crown, Ban, XCircle, Receipt, PenLine,
  MoreHorizontal, UserPlus, CreditCard, MessageSquare, Gift, Star,
  Heart, Award, Package, File, Send, Search, ArrowRight, Share2, ListChecks, Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app/clients_/$clientId")({
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

type Tab = "overview" | "appointments" | "treatments" | "photos" | "payments" | "consents" | "soap" | "communication" | "files" | "loyalty" | "reviews" | "referrals" | "plans";

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const { activeClinic } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [soapNotes, setSoapNotes] = useState<SoapNote[]>([]);
  const [injections, setInjections] = useState<InjectionSite[]>([]);
  const [photos, setPhotos] = useState<BeforeAfter[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [signedConsents, setSignedConsents] = useState<any[]>([]);
  const [loyaltyAccount, setLoyaltyAccount] = useState<any>(null);
  const [clientPackages, setClientPackages] = useState<any[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!activeClinic) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const cid = activeClinic.clinic_id;
      const results = await Promise.allSettled([
        supabase.from("clients").select("*").eq("id", clientId).eq("clinic_id", cid).maybeSingle(),
        supabase.from("appointments").select("*, services(name, category), staff(display_name, color)").eq("clinic_id", cid).eq("client_id", clientId).order("starts_at", { ascending: false }),
        supabase.from("soap_notes").select("*").eq("clinic_id", cid).eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("injection_sites").select("*").eq("clinic_id", cid).eq("client_id", clientId).order("visit_date", { ascending: false }),
        supabase.from("before_after_photos").select("*").eq("clinic_id", cid).eq("client_id", clientId).order("taken_on", { ascending: false }),
        supabase.from("invoices").select("*").eq("clinic_id", cid).eq("client_id", clientId).order("issued_on", { ascending: false }),
        supabase.from("consent_form_signatures").select("*, template:consent_form_templates(name)").eq("clinic_id", cid).eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("loyalty_accounts").select("*").eq("clinic_id", cid).eq("client_id", clientId).maybeSingle(),
        supabase.from("client_packages").select("*, package:packages(name)").eq("clinic_id", cid).eq("client_id", clientId).order("purchased_at", { ascending: false }),
        supabase.from("treatment_plans").select("*, service:services(name)").eq("clinic_id", cid).eq("client_id", clientId).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;

      const unwrap = <T,>(r: PromiseSettledResult<{ data: T; error: any }>, label: string): T | null => {
        if (r.status === "rejected") { console.error(`${label} query rejected:`, r.reason); return null; }
        if (r.value.error) { console.error(`${label} query failed:`, r.value.error); return null; }
        return r.value.data;
      };

      const clientData = unwrap(results[0], "Client");
      if (!clientData) toast.error("Could not load client");
      setClient(clientData ?? null);
      setAppointments((unwrap(results[1], "Appointments") as Appointment[] | null) ?? []);
      setSoapNotes(unwrap(results[2], "SOAP Notes") ?? []);
      setInjections(unwrap(results[3], "Injections") ?? []);
      setPhotos(unwrap(results[4], "Photos") ?? []);
      setInvoices(unwrap(results[5], "Invoices") ?? []);
      setSignedConsents(unwrap(results[6], "Consents") ?? []);
      setLoyaltyAccount(unwrap(results[7], "Loyalty") ?? null);
      setClientPackages((unwrap(results[8], "Packages") ?? []) as any[]);
      setTreatmentPlans((unwrap(results[9], "Plans") ?? []) as any[]);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeClinic?.clinic_id, clientId]);

  const stats = useMemo(() => {
    const completed = appointments.filter((a) => a.status === "completed");
    const upcoming = appointments.filter((a) => new Date(a.starts_at).getTime() > Date.now() && a.status !== "cancelled" && a.status !== "no_show");
    const lifetimeValueCents = completed.reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
    const avgValueCents = completed.length > 0 ? Math.round(lifetimeValueCents / completed.length) : 0;
    const noShows = appointments.filter((a) => a.status === "no_show").length;
    const cancellations = appointments.filter((a) => a.status === "cancelled").length;
    const total = appointments.filter((a) => a.status !== "cancelled").length;
    const noShowRate = total > 0 ? Math.round((noShows / total) * 100) : 0;
    const cancelRate = appointments.length > 0 ? Math.round((cancellations / appointments.length) * 100) : 0;
    const repeatVisits = completed.length >= 2;
    const rebookRate = completed.length > 0 ? (repeatVisits ? Math.round((completed.length / Math.max(completed.length, 1)) * 100) : 0) : 0;
    const lastVisit = completed[0]?.starts_at ?? null;
    return { visits: completed.length, upcoming: upcoming.length, lifetimeValueCents, avgValueCents, noShows, noShowRate, cancellations, cancelRate, rebookRate, lastVisit };
  }, [appointments]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
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
  const age = client.date_of_birth ? (() => { const b = new Date(client.date_of_birth); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a; })() : null;

  const nextAppt = appointments.find((a) => new Date(a.starts_at).getTime() > Date.now() && a.status !== "cancelled" && a.status !== "no_show");
  const lastVisitDays = stats.lastVisit ? Math.floor((Date.now() - new Date(stats.lastVisit).getTime()) / 86400000) : null;

  // Alerts
  const alerts: { icon: typeof AlertTriangle; text: string; severity: "red" | "amber" | "blue" }[] = [];
  if ((client.allergies as string[] | null)?.length) alerts.push({ icon: AlertTriangle, text: `Allergies: ${(client.allergies as string[]).join(", ")}`, severity: "red" });
  if ((client.medical_conditions as string[] | null)?.length) alerts.push({ icon: ShieldAlert, text: `Medical conditions: ${(client.medical_conditions as string[]).join(", ")}`, severity: "red" });
  if (client.medical_alerts) alerts.push({ icon: ShieldAlert, text: client.medical_alerts, severity: "red" });
  const unpaidInvoices = invoices.filter((i) => i.status === "draft" || i.status === "sent" || i.status === "overdue");
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total_cents ?? 0), 0);
  if (unpaidTotal > 0) alerts.push({ icon: Receipt, text: `Outstanding balance: ${formatMoney(unpaidTotal, currency)}`, severity: "amber" });
  if (client.date_of_birth) {
    const dob = new Date(client.date_of_birth);
    const bday = new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate());
    const diff = (bday.getTime() - Date.now()) / 86400000;
    if (diff >= 0 && diff <= 7) alerts.push({ icon: Heart, text: `Birthday: ${bday.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${diff < 1 ? " (Today! 🎂)" : ` (in ${Math.ceil(diff)} days)`}`, severity: "blue" });
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "appointments", label: "Appointments", icon: <CalendarDays className="h-3.5 w-3.5" />, count: appointments.length },
    { id: "treatments", label: "Treatments", icon: <Syringe className="h-3.5 w-3.5" />, count: injections.length },
    { id: "photos", label: "Photos", icon: <Camera className="h-3.5 w-3.5" />, count: photos.length },
    { id: "payments", label: "Payments", icon: <Receipt className="h-3.5 w-3.5" />, count: invoices.length },
    { id: "consents", label: "Consents", icon: <PenLine className="h-3.5 w-3.5" />, count: signedConsents.length },
    { id: "soap", label: "Notes", icon: <FileText className="h-3.5 w-3.5" />, count: soapNotes.length },
    { id: "plans", label: "Plans", icon: <ListChecks className="h-3.5 w-3.5" />, count: treatmentPlans.length },
    { id: "reviews", label: "Reviews", icon: <Star className="h-3.5 w-3.5" /> },
    { id: "referrals", label: "Referrals", icon: <Gift className="h-3.5 w-3.5" /> },
    { id: "communication", label: "Comms", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { id: "files", label: "Files", icon: <File className="h-3.5 w-3.5" /> },
    { id: "loyalty", label: "Loyalty", icon: <Award className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button onClick={() => navigate({ to: "/app/clients" })} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All clients
      </button>

      {/* Hero Card */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 shadow-card">
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              {client.photo_url ? (
                <img src={client.photo_url} alt={fullName} className="h-24 w-24 rounded-2xl object-cover shadow-lg md:h-32 md:w-32" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-semibold text-primary-foreground shadow-glow md:h-32 md:w-32 md:text-3xl">{initials}</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Client profile</p>
              <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {fullName}
                {client.vip_status && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400"><Crown className="h-3 w-3" />VIP</span>}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {client.preferred_name && <span>"{client.preferred_name}"</span>}
                {age != null && <span>{age} years old</span>}
                {client.pronouns && <span>· {client.pronouns}</span>}
                {lastVisitDays != null && <span>· Last visit {lastVisitDays === 0 ? "today" : `${lastVisitDays}d ago`}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Phone className="h-3.5 w-3.5" /> {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" /> {client.email}
                  </a>
                )}
              </div>
              {(client.tags ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {(client.tags ?? []).map((tag) => <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{tag}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/app/clients" search={{ edit: client.id } as never}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
            </Button>
            <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" asChild>
              <Link to="/app/booking"><CalendarDays className="h-3.5 w-3.5" /> Book</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><Send className="mr-2 h-3.5 w-3.5" /> Send message</DropdownMenuItem>
                <DropdownMenuItem><Gift className="mr-2 h-3.5 w-3.5" /> Apply gift card</DropdownMenuItem>
                <DropdownMenuItem><CreditCard className="mr-2 h-3.5 w-3.5" /> Charge card</DropdownMenuItem>
                <DropdownMenuItem><PenLine className="mr-2 h-3.5 w-3.5" /> Send consent form</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Star className="mr-2 h-3.5 w-3.5" /> {client.vip_status ? "Remove VIP" : "Mark as VIP"}</DropdownMenuItem>
                <DropdownMenuItem><Award className="mr-2 h-3.5 w-3.5" /> Add membership</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-card">
          <div className="flex flex-wrap gap-3">
            {alerts.map((alert, i) => {
              const Icon = alert.icon;
              const colors = alert.severity === "red" ? "text-destructive" : alert.severity === "amber" ? "text-amber-400" : "text-sky-400";
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Icon className={cn("h-4 w-4 shrink-0", colors)} />
                  <span className="text-foreground/90">{alert.text}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Next Appointment */}
      {nextAppt && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Next Appointment</p>
                <p className="text-sm font-medium">
                  {new Date(nextAppt.starts_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {" at "}
                  {new Date(nextAppt.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextAppt.services?.name ?? "Service"}
                  {nextAppt.staff && ` with ${nextAppt.staff.display_name}`}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Activity className="h-4 w-4" />} label="Total Visits" value={stats.visits.toString()} />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label="Lifetime Value" value={formatMoney(stats.lifetimeValueCents, currency)} highlight />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label="Avg Visit Value" value={formatMoney(stats.avgValueCents, currency)} />
        <KpiTile icon={<Ban className="h-4 w-4" />} label="No-Show Rate" value={`${stats.noShowRate}%`} warn={stats.noShowRate > 10} />
        <KpiTile icon={<XCircle className="h-4 w-4" />} label="Cancel Rate" value={`${stats.cancelRate}%`} />
        <KpiTile icon={<Clock className="h-4 w-4" />} label="Last Visit" value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"} />
      </section>

      {/* Tabbed Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card shadow-card lg:col-span-2">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none]">
            {TABS.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn(
                "flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-medium transition whitespace-nowrap",
                activeTab === tab.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {tab.icon} {tab.label}
                {tab.count != null && tab.count > 0 && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && <OverviewTab appointments={appointments} currency={currency} stats={stats} client={client} />}
          {activeTab === "appointments" && <AppointmentList appointments={appointments} currency={currency} />}
          {activeTab === "treatments" && <InjectionsList injections={injections} />}
          {activeTab === "photos" && <PhotosList photos={photos} />}
          {activeTab === "payments" && <FinancialTab invoices={invoices} appointments={appointments} currency={currency} />}
          {activeTab === "consents" && <ConsentsTab consents={signedConsents} />}
          {activeTab === "soap" && <SoapNotesList notes={soapNotes} />}
          {activeTab === "plans" && <TreatmentPlansTab plans={treatmentPlans} />}
          {activeTab === "communication" && <PlaceholderTab title="Communication" description="Message history will show SMS, email, and WhatsApp conversations." icon={<MessageSquare className="h-8 w-8" />} />}
          {activeTab === "files" && <PlaceholderTab title="Files" description="Upload and manage client documents — IDs, insurance, referrals." icon={<File className="h-8 w-8" />} />}
          {activeTab === "loyalty" && <LoyaltyTab loyalty={loyaltyAccount} packages={clientPackages} currency={currency} />}
          {activeTab === "reviews" && <ReviewsTab clientId={clientId} clinicId={activeClinic?.clinic_id ?? ""} />}
          {activeTab === "referrals" && <ReferralsTab clientId={clientId} clinicId={activeClinic?.clinic_id ?? ""} currency={currency} />}
        </section>

        {/* Sidebar */}
        <section className="space-y-4">
          {/* Care notes */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-semibold">Care Notes</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Internal observations and reminders.</p>
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm leading-relaxed text-foreground/85">
              {client.notes?.trim() || client.notes_internal?.trim() || <span className="text-muted-foreground">No notes added yet.</span>}
            </div>
          </div>

          {/* Spending breakdown */}
          {stats.lifetimeValueCents > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-display text-sm font-semibold">Spending by Service</h3>
              <SpendingBreakdown appointments={appointments} currency={currency} />
            </div>
          )}

          {/* Client details */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-xs">
              {client.source && <DetailRow label="Source" value={client.source} />}
              {client.preferred_language && <DetailRow label="Language" value={client.preferred_language} />}
              {client.gender && <DetailRow label="Gender" value={client.gender} />}
              {client.city && <DetailRow label="Location" value={[client.city, client.state_province].filter(Boolean).join(", ")} />}
              <DetailRow label="Created" value={new Date(client.created_at).toLocaleDateString()} />
              <DetailRow label="Updated" value={new Date(client.updated_at).toLocaleDateString()} />
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ——— Sub-components ——— */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function KpiTile({ icon, label, value, highlight, warn }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", warn ? "border-amber-500/30" : highlight ? "border-primary/30" : "border-border")}>
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", highlight ? "bg-primary/15 text-primary" : warn ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground")}>{icon}</div>
      <div className={cn("mt-3 font-display text-xl font-semibold tracking-tight", warn && "text-amber-400")}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
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

function OverviewTab({ appointments, currency, stats, client }: { appointments: Appointment[]; currency: string; stats: any; client: Client }) {
  const last5 = appointments.filter((a) => a.status === "completed").slice(0, 5);
  return (
    <div className="p-5 space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface/40 p-3 text-center">
          <div className="font-display text-2xl font-bold text-primary">{stats.visits}</div>
          <div className="text-[10px] text-muted-foreground">Completed Visits</div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-3 text-center">
          <div className="font-display text-2xl font-bold">{formatMoney(stats.lifetimeValueCents, currency)}</div>
          <div className="text-[10px] text-muted-foreground">Lifetime Value</div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-3 text-center">
          <div className="font-display text-2xl font-bold">{formatMoney(stats.avgValueCents, currency)}</div>
          <div className="text-[10px] text-muted-foreground">Avg Visit Value</div>
        </div>
      </div>

      {/* Recent visits */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Visits</h3>
        {last5.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed visits yet.</p>
        ) : (
          <div className="space-y-2">
            {last5.map((appt) => (
              <div key={appt.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
                  <span className="text-[9px] font-semibold uppercase text-muted-foreground">{new Date(appt.starts_at).toLocaleDateString("en-US", { month: "short" })}</span>
                  <span className="font-display text-sm font-semibold leading-none">{new Date(appt.starts_at).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{appt.services?.name ?? "Service"}</p>
                  <p className="text-[11px] text-muted-foreground">{appt.staff?.display_name ?? ""}</p>
                </div>
                <span className="text-sm font-medium">{appt.price_cents > 0 ? formatMoney(appt.price_cents, currency) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentList({ appointments, currency }: { appointments: Appointment[]; currency: string }) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "completed" | "cancelled" | "no_show">("all");
  const filtered = useMemo(() => {
    const now = Date.now();
    switch (filter) {
      case "upcoming": return appointments.filter((a) => new Date(a.starts_at).getTime() > now && a.status !== "cancelled");
      case "past": return appointments.filter((a) => new Date(a.starts_at).getTime() <= now);
      case "completed": return appointments.filter((a) => a.status === "completed");
      case "cancelled": return appointments.filter((a) => a.status === "cancelled");
      case "no_show": return appointments.filter((a) => a.status === "no_show");
      default: return appointments;
    }
  }, [appointments, filter]);

  if (appointments.length === 0) return <EmptyTab title="No visits yet" description="Once you book this client they'll see their full history here." icon={<CalendarDays className="h-8 w-8" />} />;

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto p-3 pb-0">
        {(["all", "upcoming", "past", "completed", "cancelled", "no_show"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 text-[11px] font-medium capitalize transition", filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((appt) => (
          <li key={appt.id} className="grid gap-3 p-4 transition hover:bg-surface/60 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">{new Date(appt.starts_at).toLocaleDateString("en-US", { month: "short" })}</span>
              <span className="font-display text-base font-semibold leading-none">{new Date(appt.starts_at).getDate()}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-medium">{appt.services?.name ?? "Custom appointment"}</h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(appt.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                {appt.staff && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: appt.staff.color ?? "#a78bfa" }} />{appt.staff.display_name}</span>}
                <StatusPill status={appt.status} />
              </div>
            </div>
            <div className="text-right text-sm font-medium">{appt.price_cents > 0 ? formatMoney(appt.price_cents, currency) : "—"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SoapNotesList({ notes }: { notes: SoapNote[] }) {
  if (notes.length === 0) return <EmptyTab title="No SOAP notes yet" description="SOAP notes from this client's visits will appear here." icon={<FileText className="h-8 w-8" />} />;
  return (
    <ul className="divide-y divide-border">
      {notes.map((note) => (
        <li key={note.id} className="p-4 transition hover:bg-surface/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{new Date(note.created_at).toLocaleDateString()}</span>
              {note.status === "finalized" && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">Finalized</span>}
              {note.status === "amended" && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">Amended</span>}
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
  if (injections.length === 0) return <EmptyTab title="No injection records" description="Injection mapping records for this client will appear here." icon={<Syringe className="h-8 w-8" />} />;

  // Group by product
  const byProduct = new Map<string, { totalUnits: number; count: number }>();
  for (const inj of injections) {
    const key = inj.product;
    const prev = byProduct.get(key) ?? { totalUnits: 0, count: 0 };
    byProduct.set(key, { totalUnits: prev.totalUnits + Number(inj.units), count: prev.count + 1 });
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex gap-3 overflow-x-auto p-4 pb-2">
        {Array.from(byProduct.entries()).map(([product, data]) => (
          <div key={product} className="shrink-0 rounded-xl border border-border bg-surface/40 p-3 text-center min-w-[100px]">
            <div className="font-display text-lg font-bold text-primary">{data.totalUnits}u</div>
            <div className="text-[10px] text-muted-foreground">{product} · {data.count} sessions</div>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {injections.map((inj) => (
          <li key={inj.id} className="flex items-center gap-4 p-4 transition hover:bg-surface/60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Syringe className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-medium">{inj.product}</span><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{inj.region}</span></div>
              <div className="mt-0.5 text-xs text-muted-foreground">{new Date(inj.visit_date).toLocaleDateString()} · {Number(inj.units)} units{inj.notes && <span> · {inj.notes}</span>}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotosList({ photos }: { photos: BeforeAfter[] }) {
  if (photos.length === 0) return <EmptyTab title="No photos yet" description="Before & after photos for this client will appear here." icon={<Camera className="h-8 w-8" />} />;
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {photos.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            {p.before_url ? <img src={p.before_url} alt="Before" className="h-32 w-full rounded-lg object-cover" /> : <div className="flex h-32 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No before</div>}
            {p.after_url ? <img src={p.after_url} alt="After" className="h-32 w-full rounded-lg object-cover" /> : <div className="flex h-32 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No after</div>}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span><span className="font-medium">{p.treatment ?? "Treatment"}</span> · {new Date(p.taken_on).toLocaleDateString()}</span>
            {p.consent_given && <span className="text-emerald-400 text-[10px]">Consent ✓</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialTab({ invoices, appointments, currency }: { invoices: any[]; appointments: Appointment[]; currency: string }) {
  const completed = appointments.filter(a => a.status === "completed");
  const totalSpent = completed.reduce((s, a) => s + (a.price_cents ?? 0), 0);
  const totalInvoiced = invoices.reduce((s, inv) => s + (inv.total_cents ?? 0), 0);
  const unpaid = invoices.filter(inv => inv.status === "draft" || inv.status === "sent" || inv.status === "overdue");
  const unpaidTotal = unpaid.reduce((s, inv) => s + (inv.total_cents ?? 0), 0);

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface/40 p-4 text-center">
          <div className="font-display text-2xl font-bold text-primary">{formatMoney(totalSpent, currency)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Total spent</div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-4 text-center">
          <div className="font-display text-2xl font-bold">{formatMoney(totalInvoiced, currency)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Total invoiced</div>
        </div>
        <div className="rounded-xl border border-border bg-surface/40 p-4 text-center">
          <div className="font-display text-2xl font-bold text-amber-400">{formatMoney(unpaidTotal, currency)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Outstanding</div>
        </div>
      </div>
      {invoices.length === 0 ? (
        <EmptyTab title="No invoices yet" description="Invoices for this client will appear here." icon={<Receipt className="h-8 w-8" />} />
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Invoices</h3>
          {invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-3">
              <div>
                <p className="text-sm font-medium">{inv.invoice_number || "Draft"}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(inv.issued_on).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : inv.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                )}>{inv.status}</span>
                <span className="font-medium text-sm">{formatMoney(inv.total_cents ?? 0, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsentsTab({ consents }: { consents: any[] }) {
  if (consents.length === 0) return <EmptyTab title="No signed consents" description="Signed consent forms for this client will appear here." icon={<PenLine className="h-8 w-8" />} />;
  return (
    <div className="divide-y divide-border">
      {consents.map((sc: any) => (
        <div key={sc.id} className="p-4 transition hover:bg-surface/60">
          <div className="flex items-center gap-4">
            {sc.signature_data && <img src={sc.signature_data} alt="Signature" className="h-14 w-28 rounded border border-border object-contain bg-white" />}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium">{sc.consent_title}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Signed {new Date(sc.signed_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoyaltyTab({ loyalty, packages, currency }: { loyalty: any; packages: any[]; currency: string }) {
  return (
    <div className="p-5 space-y-5">
      {/* Loyalty account */}
      {loyalty ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Award className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold">{loyalty.points_balance} points</p>
              <p className="text-[11px] text-muted-foreground">Tier: <span className="capitalize text-primary">{loyalty.tier}</span> · Lifetime: {loyalty.lifetime_points} pts</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Award className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
          <p>No loyalty account yet.</p>
        </div>
      )}

      {/* Packages */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Packages</h3>
        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active packages.</p>
        ) : (
          <div className="space-y-2">
            {packages.map((pkg: any) => (
              <div key={pkg.id} className="flex items-center justify-between rounded-xl border border-border bg-surface/40 p-3">
                <div>
                  <p className="text-sm font-medium">{pkg.package?.name ?? "Package"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {pkg.sessions_used}/{pkg.total_sessions} sessions used
                    {pkg.expires_at && ` · Expires ${new Date(pkg.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    pkg.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>{pkg.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 text-[10px] text-primary">Coming soon</p>
    </div>
  );
}

function EmptyTab({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SpendingBreakdown({ appointments, currency }: { appointments: Appointment[]; currency: string }) {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) { if (a.status !== "completed" || !a.price_cents) continue; const name = a.services?.name ?? "Other"; map.set(name, (map.get(name) ?? 0) + a.price_cents); }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [appointments]);
  if (breakdown.length === 0) return null;
  const max = breakdown[0][1];
  return (
    <div className="mt-3 space-y-2">
      {breakdown.map(([name, cents]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs"><span className="truncate">{name}</span><span className="font-medium">{formatMoney(cents, currency)}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(cents / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({ clientId, clinicId }: { clientId: string; clinicId: string }) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["client-reviews", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("clinic_id", clinicId).eq("client_id", clientId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clinicId,
  });

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading reviews…</div>;
  if (!reviews?.length) return <PlaceholderTab title="Reviews" description="No reviews from this client yet." icon={<Star className="h-8 w-8" />} />;

  return (
    <div className="space-y-3">
      {reviews.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < (r.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />)}</div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          {r.body && <p className="mt-2 text-sm text-foreground/80">{r.body}</p>}
        </div>
      ))}
    </div>
  );
}

function ReferralsTab({ clientId, clinicId, currency }: { clientId: string; clinicId: string; currency: string }) {
  const { data: code, isLoading } = useQuery({
    queryKey: ["client-referral", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("referral_codes").select("*, referral_rewards(*)").eq("clinic_id", clinicId).eq("client_id", clientId).maybeSingle();
      return data;
    },
    enabled: !!clinicId,
  });

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading referrals…</div>;
  if (!code) return <PlaceholderTab title="Referrals" description="No referral code assigned to this client." icon={<Share2 className="h-8 w-8" />} />;

  const rewards = (code as any).referral_rewards ?? [];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Referral Code</p>
        <p className="mt-1 font-mono text-lg font-semibold">{code.code}</p>
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span>Uses: <strong className="text-foreground">{code.times_used ?? 0}</strong></span>
          <span>Rewards: <strong className="text-foreground">{rewards.length}</strong></span>
        </div>
      </div>
      {rewards.map((rw: any) => (
        <div key={rw.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium capitalize">{rw.reward_type?.replace("_", " ")}</p>
            <p className="text-xs text-muted-foreground">{new Date(rw.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rw.status === "redeemed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{rw.status}</span>
        </div>
      ))}
    </div>
  );
}
