import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, DollarSign, Edit3, Plus, Search, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

type Appointment = Tables<"appointments">;
type Client = Tables<"clients">;
type Service = Tables<"services">;
type Staff = Tables<"staff">;
type BookingMode = "booking" | "calendar";

interface AppointmentForm {
  client_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: Appointment["status"];
  price: string;
  notes: string;
}

const statuses: Appointment["status"][] = ["scheduled", "confirmed", "checked_in", "completed", "no_show", "cancelled"];
const emptyForm: AppointmentForm = {
  client_id: "",
  service_id: "",
  staff_id: "",
  starts_at: "",
  ends_at: "",
  status: "scheduled",
  price: "0",
  notes: "",
};

function toDatetimeLocal(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function fullName(client?: Client) {
  if (!client) return "Walk-in client";
  return [client.first_name, client.last_name].filter(Boolean).join(" ");
}

export function BookingWorkflow({ mode }: { mode: BookingMode }) {
  const { activeClinic } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppointmentForm>(emptyForm);

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const staffById = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const loadAll = useCallback(async () => {
    if (!activeClinic) return;
    setLoading(true);
    const clinicId = activeClinic.clinic_id;
    const [appointmentRes, clientRes, serviceRes, staffRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("clinic_id", clinicId).order("starts_at", { ascending: true }),
      supabase.from("clients").select("*").eq("clinic_id", clinicId).order("first_name", { ascending: true }),
      supabase.from("services").select("*").eq("clinic_id", clinicId).eq("active", true).order("name", { ascending: true }),
      supabase.from("staff").select("*").eq("clinic_id", clinicId).eq("active", true).order("display_name", { ascending: true }),
    ]);

    if (appointmentRes.error) toast.error("Could not load appointments");
    if (clientRes.error) toast.error("Could not load clients");
    if (serviceRes.error) toast.error("Could not load services");
    if (staffRes.error) toast.error("Could not load staff");

    setAppointments(appointmentRes.data ?? []);
    setClients(clientRes.data ?? []);
    setServices(serviceRes.data ?? []);
    setStaff(staffRes.data ?? []);
    setLoading(false);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useRealtimeTable("appointments", activeClinic?.clinic_id, loadAll);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = Date.now();
    const source = mode === "booking" ? appointments.filter((item) => new Date(item.starts_at).getTime() >= now - 86400000) : appointments;
    if (!needle) return source;
    return source.filter((appointment) => {
      const haystack = [
        fullName(clientById.get(appointment.client_id ?? "")),
        serviceById.get(appointment.service_id ?? "")?.name,
        staffById.get(appointment.staff_id ?? "")?.display_name,
        appointment.status,
        appointment.notes,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [appointments, clientById, mode, query, serviceById, staffById]);

  const grouped = useMemo(() => {
    return shown.reduce<Record<string, Appointment[]>>((acc, appointment) => {
      const label = new Date(appointment.starts_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      acc[label] = [...(acc[label] ?? []), appointment];
      return acc;
    }, {});
  }, [shown]);

  const openCreate = () => {
    const start = new Date();
    start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    setEditing(null);
    setForm({ ...emptyForm, starts_at: toDatetimeLocal(start), ends_at: toDatetimeLocal(end) });
    setOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setForm({
      client_id: appointment.client_id ?? "",
      service_id: appointment.service_id ?? "",
      staff_id: appointment.staff_id ?? "",
      starts_at: toDatetimeLocal(appointment.starts_at),
      ends_at: toDatetimeLocal(appointment.ends_at),
      status: appointment.status,
      price: String((appointment.price_cents ?? 0) / 100),
      notes: appointment.notes ?? "",
    });
    setOpen(true);
  };

  const updateService = (serviceId: string) => {
    const service = serviceById.get(serviceId);
    const start = form.starts_at ? new Date(form.starts_at) : new Date();
    const duration = service?.duration_minutes ?? 60;
    const end = new Date(start.getTime() + duration * 60000);
    setForm({ ...form, service_id: serviceId, price: String((service?.price_cents ?? 0) / 100), ends_at: toDatetimeLocal(end) });
  };

  const updateStart = (startsAt: string) => {
    const service = serviceById.get(form.service_id);
    const duration = service?.duration_minutes ?? 60;
    const end = startsAt ? new Date(new Date(startsAt).getTime() + duration * 60000) : null;
    setForm({ ...form, starts_at: startsAt, ends_at: end ? toDatetimeLocal(end) : form.ends_at });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic) return;
    if (!form.starts_at || !form.ends_at) return toast.error("Start and end times are required");
    if (new Date(form.ends_at).getTime() <= new Date(form.starts_at).getTime()) return toast.error("End time must be after start time");
    setSaving(true);

    const payload = {
      clinic_id: activeClinic.clinic_id,
      client_id: form.client_id || null,
      service_id: form.service_id || null,
      staff_id: form.staff_id || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      status: form.status,
      price_cents: Math.round(Number(form.price || 0) * 100),
      notes: form.notes.trim() || null,
    };

    const result = editing
      ? await supabase.from("appointments").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("appointments").insert(payload);

    if (result.error) toast.error(result.error.message);
    else {
      toast.success(editing ? "Appointment updated" : "Appointment booked");
      setOpen(false);
      await loadAll();
    }
    setSaving(false);
  };

  const remove = async (appointment: Appointment) => {
    if (!activeClinic || !confirm("Delete this appointment?")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Appointment deleted");
      await loadAll();
    }
  };

  const todayCount = appointments.filter((item) => new Date(item.starts_at).toDateString() === new Date().toDateString()).length;
  const confirmedCount = appointments.filter((item) => item.status === "confirmed" || item.status === "scheduled").length;
  const revenue = appointments.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.price_cents, 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{mode === "booking" ? "Scheduling" : "Calendar"}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{mode === "booking" ? "Booking" : "Calendar"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Create appointments with linked clients, services, staff, times, pricing, and status.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New appointment</Button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Today" value={todayCount.toString()} icon={<CalendarDays className="h-4.5 w-4.5" />} />
        <Metric label="Scheduled / confirmed" value={confirmedCount.toString()} icon={<Clock className="h-4.5 w-4.5" />} />
        <Metric label="Clients" value={clients.length.toString()} icon={<Users className="h-4.5 w-4.5" />} />
        <Metric label="Booked value" value={money(revenue)} icon={<DollarSign className="h-4.5 w-4.5" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, service, staff, status…" className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <span className="text-xs text-muted-foreground">{shown.length} appointments</span>
        </div>

        {loading ? <div className="p-6 text-sm text-muted-foreground">Loading appointments…</div> : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays className="h-6 w-6" /></div>
            <h2 className="font-display text-xl font-semibold">No appointments yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add clients, services, and staff, then create your first appointment.</p>
            <Button onClick={openCreate} className="mt-5 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Book appointment</Button>
          </div>
        ) : mode === "calendar" ? (
          <div className="grid gap-0 divide-y divide-border">
            {Object.entries(grouped).map(([day, items]) => <DayGroup key={day} day={day} appointments={items} clients={clientById} services={serviceById} staff={staffById} onEdit={openEdit} onDelete={remove} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left font-medium">Client</th><th className="px-4 py-3 text-left font-medium">Service</th><th className="px-4 py-3 text-left font-medium">Staff</th><th className="px-4 py-3 text-left font-medium">Time</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-left font-medium">Price</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">{shown.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} clients={clientById} services={serviceById} staff={staffById} onEdit={openEdit} onDelete={remove} />)}</tbody>
            </table>
          </div>
        )}
      </section>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated"><div className="border-b border-border p-5"><h2 className="font-display text-2xl font-semibold">{editing ? "Edit appointment" : "New appointment"}</h2><p className="mt-1 text-sm text-muted-foreground">Choose the client, service, provider, and time.</p></div><div className="grid gap-4 p-5 md:grid-cols-2"><Select label="Client" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} options={[{ label: "Walk-in / no client", value: "" }, ...clients.map((client) => ({ label: fullName(client), value: client.id }))]} /><Select label="Service" value={form.service_id} onChange={updateService} options={[{ label: "No service", value: "" }, ...services.map((service) => ({ label: `${service.name} · ${service.duration_minutes} min · ${money(service.price_cents)}`, value: service.id }))]} /><Select label="Staff" value={form.staff_id} onChange={(value) => setForm({ ...form, staff_id: value })} options={[{ label: "Unassigned", value: "" }, ...staff.map((member) => ({ label: `${member.display_name}${member.title ? ` · ${member.title}` : ""}`, value: member.id }))]} /><Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as Appointment["status"] })} options={statuses.map((status) => ({ label: status.replace("_", " "), value: status }))} /><Field label="Starts" type="datetime-local" required value={form.starts_at} onChange={updateStart} /><Field label="Ends" type="datetime-local" required value={form.ends_at} onChange={(value) => setForm({ ...form, ends_at: value })} /><Field label="Price" type="number" value={form.price} onChange={(value) => setForm({ ...form, price: value })} /><label className="md:col-span-2"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</span><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" /></label></div><div className="flex justify-end gap-2 border-t border-border p-5"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">{saving ? "Saving…" : "Save appointment"}</Button></div></form></div>}
    </div>
  );
}

function AppointmentRow({ appointment, clients, services, staff, onEdit, onDelete }: { appointment: Appointment; clients: Map<string, Client>; services: Map<string, Service>; staff: Map<string, Staff>; onEdit: (appointment: Appointment) => void; onDelete: (appointment: Appointment) => void }) {
  const service = services.get(appointment.service_id ?? "");
  const member = staff.get(appointment.staff_id ?? "");
  return <tr className="transition hover:bg-surface/60"><td className="px-4 py-3 font-medium">{fullName(clients.get(appointment.client_id ?? ""))}</td><td className="px-4 py-3">{service?.name ?? "—"}</td><td className="px-4 py-3">{member?.display_name ?? "Unassigned"}</td><td className="px-4 py-3">{new Date(appointment.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td className="px-4 py-3 capitalize">{appointment.status.replace("_", " ")}</td><td className="px-4 py-3">{money(appointment.price_cents)}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => onEdit(appointment)}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => onDelete(appointment)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></td></tr>;
}

function DayGroup({ day, appointments, clients, services, staff, onEdit, onDelete }: { day: string; appointments: Appointment[]; clients: Map<string, Client>; services: Map<string, Service>; staff: Map<string, Staff>; onEdit: (appointment: Appointment) => void; onDelete: (appointment: Appointment) => void }) {
  return <div className="grid gap-3 p-4 lg:grid-cols-[180px_1fr]"><div><h2 className="font-display text-lg font-semibold">{day}</h2><p className="text-xs text-muted-foreground">{appointments.length} appointments</p></div><div className="space-y-2">{appointments.map((appointment) => <div key={appointment.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-4.5 w-4.5" /></div><div><div className="font-medium">{fullName(clients.get(appointment.client_id ?? ""))}</div><div className="mt-1 text-xs text-muted-foreground">{new Date(appointment.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–{new Date(appointment.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {services.get(appointment.service_id ?? "")?.name ?? "No service"} · {staff.get(appointment.staff_id ?? "")?.display_name ?? "Unassigned"}</div></div></div><div className="flex items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground">{appointment.status.replace("_", " ")}</span><Button variant="ghost" size="icon" onClick={() => onEdit(appointment)}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => onDelete(appointment)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></div>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-card"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span><input type={type} required={required} step={type === "number" ? "0.01" : undefined} min={type === "number" ? "0" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm capitalize focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">{options.map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}</select></label>;
}
