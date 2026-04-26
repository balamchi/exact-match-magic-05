import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Appointment = Tables<"appointments">;
type Client = Tables<"clients">;
type Service = Tables<"services">;
type Staff = Tables<"staff">;

const STATUSES: Appointment["status"][] = [
  "scheduled",
  "confirmed",
  "checked_in",
  "completed",
  "no_show",
  "cancelled",
];

const STATUS_FLOW: Record<Appointment["status"], Appointment["status"][]> = {
  scheduled: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["completed", "no_show"],
  completed: [],
  no_show: ["scheduled"],
  cancelled: ["scheduled"],
};

const STATUS_TINT: Record<Appointment["status"], string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  checked_in: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  no_show: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30 line-through",
};

const HOUR_START = 7;
const HOUR_END = 21;
const SLOT_MIN = 30;
const SLOT_PX = 28;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;

interface DraftForm {
  client_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: Appointment["status"];
  price: string;
  notes: string;
}

const emptyDraft: DraftForm = {
  client_id: "",
  service_id: "",
  staff_id: "",
  starts_at: "",
  ends_at: "",
  status: "scheduled",
  price: "0",
  notes: "",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function fullName(client?: Client) {
  if (!client) return "Walk-in";
  return [client.first_name, client.last_name].filter(Boolean).join(" ");
}

function overlaps(a: { starts_at: string; ends_at: string }, b: { starts_at: string; ends_at: string }) {
  return new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);
}

export function CalendarWeek() {
  const { activeClinic } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const slotCount = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR;
  const totalHeight = slotCount * SLOT_PX;

  const loadAll = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const clinicId = activeClinic.clinic_id;
    const [aRes, cRes, sRes, stRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at"),
      supabase.from("clients").select("*").eq("clinic_id", clinicId).order("first_name"),
      supabase.from("services").select("*").eq("clinic_id", clinicId).eq("active", true).order("name"),
      supabase.from("staff").select("*").eq("clinic_id", clinicId).eq("active", true).order("display_name"),
    ]);
    if (aRes.error) toast.error("Could not load appointments");
    setAppointments(aRes.data ?? []);
    setClients(cRes.data ?? []);
    setServices(sRes.data ?? []);
    setStaff(stRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id, weekStart.getTime()]);

  const conflict = useMemo(() => {
    if (!draft.starts_at || !draft.ends_at || !draft.staff_id) return null;
    const candidate = {
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: new Date(draft.ends_at).toISOString(),
    };
    if (new Date(candidate.ends_at) <= new Date(candidate.starts_at)) return null;
    const clash = appointments.find(
      (a) =>
        a.id !== editing?.id &&
        a.staff_id === draft.staff_id &&
        a.status !== "cancelled" &&
        overlaps(candidate, a)
    );
    if (!clash) return null;
    return {
      member: staffById.get(clash.staff_id ?? "")?.display_name ?? "Staff",
      with: fullName(clientById.get(clash.client_id ?? "")),
      time: `${new Date(clash.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${new Date(clash.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
    };
  }, [appointments, clientById, draft.ends_at, draft.staff_id, draft.starts_at, editing?.id, staffById]);

  const openSlot = (day: Date, hour: number, minute: number, staffId?: string) => {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    setEditing(null);
    setDraft({ ...emptyDraft, starts_at: toLocalInput(start), ends_at: toLocalInput(end), staff_id: staffId ?? "" });
    setOpen(true);
  };

  const openExisting = (appointment: Appointment) => {
    setEditing(appointment);
    setDraft({
      client_id: appointment.client_id ?? "",
      service_id: appointment.service_id ?? "",
      staff_id: appointment.staff_id ?? "",
      starts_at: toLocalInput(new Date(appointment.starts_at)),
      ends_at: toLocalInput(new Date(appointment.ends_at)),
      status: appointment.status,
      price: String((appointment.price_cents ?? 0) / 100),
      notes: appointment.notes ?? "",
    });
    setOpen(true);
  };

  const updateService = (id: string) => {
    const svc = serviceById.get(id);
    const start = draft.starts_at ? new Date(draft.starts_at) : new Date();
    const dur = svc?.duration_minutes ?? 60;
    setDraft({
      ...draft,
      service_id: id,
      price: String((svc?.price_cents ?? 0) / 100),
      ends_at: toLocalInput(new Date(start.getTime() + dur * 60000)),
    });
  };

  const updateStart = (val: string) => {
    const svc = serviceById.get(draft.service_id);
    const dur = svc?.duration_minutes ?? 60;
    const end = val ? toLocalInput(new Date(new Date(val).getTime() + dur * 60000)) : draft.ends_at;
    setDraft({ ...draft, starts_at: val, ends_at: end });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.starts_at || !draft.ends_at) return toast.error("Start and end required");
    if (new Date(draft.ends_at) <= new Date(draft.starts_at)) return toast.error("End must be after start");
    if (conflict) return toast.error(`Conflict with ${conflict.member} at ${conflict.time}`);
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      client_id: draft.client_id || null,
      service_id: draft.service_id || null,
      staff_id: draft.staff_id || null,
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: new Date(draft.ends_at).toISOString(),
      status: draft.status,
      price_cents: Math.round(Number(draft.price || 0) * 100),
      notes: draft.notes.trim() || null,
    };
    const res = editing
      ? await supabase.from("appointments").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("appointments").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Appointment updated" : "Appointment booked");
      setOpen(false);
      await loadAll();
    }
    setSaving(false);
  };

  const advanceStatus = async (appointment: Appointment, next: Appointment["status"]) => {
    if (!activeClinic) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: next })
      .eq("id", appointment.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked ${next.replace("_", " ")}`);
      await loadAll();
    }
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this appointment?")) return;
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", editing.id)
      .eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Appointment deleted");
      setOpen(false);
      await loadAll();
    }
  };

  const positionFor = (appointment: Appointment) => {
    const start = new Date(appointment.starts_at);
    const end = new Date(appointment.ends_at);
    const startMin = start.getHours() * 60 + start.getMinutes() - HOUR_START * 60;
    const durMin = (end.getTime() - start.getTime()) / 60000;
    const top = (startMin / SLOT_MIN) * SLOT_PX;
    const height = Math.max(SLOT_PX - 2, (durMin / SLOT_MIN) * SLOT_PX - 2);
    return { top, height };
  };

  const weekLabel = `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Calendar</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Week view</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Click any empty slot to book. Drag through the week with the arrows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))} className="gap-2">
            <CalendarDays className="h-4 w-4" /> Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openSlot(new Date(), 9, 0)} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-lg font-semibold">{weekLabel}</span>
          <span className="text-xs text-muted-foreground">{appointments.length} this week</span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading calendar…</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid border-b border-border" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
                <div />
                {days.map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={day.toISOString()} className={cn("border-l border-border px-2 py-2 text-center", isToday && "bg-primary/5")}>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {day.toLocaleDateString([], { weekday: "short" })}
                      </div>
                      <div className={cn("mt-1 font-display text-lg font-semibold", isToday && "text-primary")}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid relative" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
                <div className="border-r border-border">
                  {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                    <div key={i} style={{ height: SLOT_PX * SLOTS_PER_HOUR }} className="relative">
                      <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                        {((HOUR_START + i + 11) % 12) + 1}
                        {HOUR_START + i < 12 ? "a" : "p"}
                      </span>
                    </div>
                  ))}
                </div>

                {days.map((day) => {
                  const dayAppts = appointments.filter(
                    (a) => new Date(a.starts_at).toDateString() === day.toDateString()
                  );
                  return (
                    <div key={day.toISOString()} className="relative border-l border-border" style={{ height: totalHeight }}>
                      {Array.from({ length: slotCount }).map((_, slot) => {
                        const hour = HOUR_START + Math.floor(slot / SLOTS_PER_HOUR);
                        const minute = (slot % SLOTS_PER_HOUR) * SLOT_MIN;
                        return (
                          <button
                            key={slot}
                            onClick={() => openSlot(day, hour, minute)}
                            className={cn(
                              "block w-full border-b border-border/40 transition hover:bg-primary/5",
                              minute === 0 && "border-border/60"
                            )}
                            style={{ height: SLOT_PX }}
                            aria-label={`Book ${day.toLocaleDateString()} ${hour}:${String(minute).padStart(2, "0")}`}
                          />
                        );
                      })}
                      {dayAppts.map((appointment) => {
                        const { top, height } = positionFor(appointment);
                        const member = staffById.get(appointment.staff_id ?? "");
                        const svc = serviceById.get(appointment.service_id ?? "");
                        return (
                          <button
                            key={appointment.id}
                            onClick={() => openExisting(appointment)}
                            className={cn(
                              "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition hover:opacity-90",
                              STATUS_TINT[appointment.status]
                            )}
                            style={{ top, height, borderLeft: `3px solid ${member?.color ?? "var(--color-primary)"}` }}
                          >
                            <div className="truncate font-medium">{fullName(clientById.get(appointment.client_id ?? ""))}</div>
                            <div className="truncate opacity-80">{svc?.name ?? "—"}</div>
                            {height > 56 && (
                              <div className="truncate opacity-70">{member?.display_name ?? "Unassigned"}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit appointment" : "New appointment"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Client, service, provider, time, and status.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editing && STATUS_FLOW[editing.status].length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-5 py-3">
                <span className="text-xs font-medium text-muted-foreground">Quick actions:</span>
                {STATUS_FLOW[editing.status].map((next) => (
                  <Button key={next} type="button" size="sm" variant="outline" onClick={() => advanceStatus(editing, next)} className="capitalize">
                    Mark {next.replace("_", " ")}
                  </Button>
                ))}
              </div>
            )}

            {conflict && (
              <div className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">Schedule conflict</div>
                  <div className="text-amber-200/80">
                    {conflict.member} is already booked with {conflict.with} at {conflict.time}.
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Select label="Client" value={draft.client_id} onChange={(v) => setDraft({ ...draft, client_id: v })} options={[{ label: "Walk-in / no client", value: "" }, ...clients.map((c) => ({ label: fullName(c), value: c.id }))]} />
              <Select label="Service" value={draft.service_id} onChange={updateService} options={[{ label: "No service", value: "" }, ...services.map((s) => ({ label: `${s.name} · ${s.duration_minutes}m · ${money(s.price_cents)}`, value: s.id }))]} />
              <Select label="Staff" value={draft.staff_id} onChange={(v) => setDraft({ ...draft, staff_id: v })} options={[{ label: "Unassigned", value: "" }, ...staff.map((s) => ({ label: `${s.display_name}${s.title ? ` · ${s.title}` : ""}`, value: s.id }))]} />
              <Select label="Status" value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as Appointment["status"] })} options={STATUSES.map((s) => ({ label: s.replace("_", " "), value: s }))} />
              <Field label="Starts" type="datetime-local" required value={draft.starts_at} onChange={updateStart} />
              <Field label="Ends" type="datetime-local" required value={draft.ends_at} onChange={(v) => setDraft({ ...draft, ends_at: v })} />
              <Field label="Price" type="number" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</span>
                <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={saving || !!conflict} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Book appointment"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm capitalize focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
        {options.map((o) => (
          <option key={o.value || o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
