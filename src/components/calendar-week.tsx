import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, X, AlertTriangle,
  Columns3, Square, Search, Check, CheckCheck, Clock, Ban, XCircle,
  MapPin, Filter, User
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

/* ── Types ── */
type Appointment = Tables<"appointments">;
type Client = Tables<"clients">;
type Service = Tables<"services">;
type Staff = Tables<"staff">;
type Location = Tables<"locations">;

type AppointmentStatus = Appointment["status"];

/* ── Constants ── */
const STATUSES: AppointmentStatus[] = ["scheduled", "confirmed", "checked_in", "completed", "no_show", "cancelled"];

const STATUS_FLOW: Record<AppointmentStatus, { next: AppointmentStatus; label: string }[]> = {
  scheduled: [
    { next: "confirmed", label: "Confirm" },
    { next: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { next: "checked_in", label: "Check In" },
    { next: "no_show", label: "No-Show" },
    { next: "cancelled", label: "Cancel" },
  ],
  checked_in: [
    { next: "completed", label: "Complete" },
    { next: "no_show", label: "No-Show" },
    { next: "cancelled", label: "Cancel" },
  ],
  completed: [],
  no_show: [],
  cancelled: [],
};

const STATUS_TINT: Record<AppointmentStatus, string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  checked_in: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  no_show: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30 line-through opacity-60",
};

const STATUS_ICON: Record<AppointmentStatus, React.ReactNode> = {
  scheduled: <Clock className="h-3 w-3" />,
  confirmed: <Check className="h-3 w-3 text-emerald-400" />,
  checked_in: <User className="h-3 w-3 text-amber-400" />,
  completed: <CheckCheck className="h-3 w-3 text-zinc-400" />,
  no_show: <XCircle className="h-3 w-3 text-orange-400" />,
  cancelled: <Ban className="h-3 w-3 text-rose-400" />,
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  completed: "Completed",
  no_show: "No-Show",
  cancelled: "Cancelled",
};

const HOUR_START = 8;
const HOUR_END = 20;
const SLOT_MIN = 30;
const SLOT_PX = 48;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;

/* ── Helpers ── */
function startOfWeekMon(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Mon=0
  d.setDate(d.getDate() - diff);
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

function fullName(client?: Client | null) {
  if (!client) return "Walk-in";
  return [client.first_name, client.last_name].filter(Boolean).join(" ");
}

function overlaps(a: { starts_at: string; ends_at: string }, b: { starts_at: string; ends_at: string }) {
  return new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);
}

function timeStr(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ── Draft Form ── */
interface DraftForm {
  client_id: string;
  service_id: string;
  staff_id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price: string;
  notes: string;
  internal_notes: string;
}

const emptyDraft: DraftForm = {
  client_id: "",
  service_id: "",
  staff_id: "",
  location_id: "",
  starts_at: "",
  ends_at: "",
  status: "confirmed",
  price: "0",
  notes: "",
  internal_notes: "",
};

/* ═════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                  */
/* ═════════════════════════════════════════════════════════════════ */
export function CalendarWeek() {
  const { activeClinic } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMon(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [clientSearch, setClientSearch] = useState("");
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [overrideConflict, setOverrideConflict] = useState(false);

  // View state
  const [byProvider, setByProvider] = useState(false);

  // Filters
  const [filterLocationId, setFilterLocationId] = useState<string>("all");
  const [filterStaffIds, setFilterStaffIds] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<AppointmentStatus>>(
    new Set(["scheduled", "confirmed", "checked_in", "completed", "no_show"])
  );

  // Date picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const slotCount = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR;
  const totalHeight = slotCount * SLOT_PX;

  // Scroll ref for current time indicator
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Data Loading ── */
  const loadAll = useCallback(async () => {
    if (!activeClinic) return;
    setLoading(true);
    const clinicId = activeClinic.clinic_id;
    try {
      const [aRes, cRes, sRes, stRes, lRes] = await Promise.all([
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
        supabase.from("locations").select("*").eq("clinic_id", clinicId).eq("active", true).order("name"),
      ]);
      if (aRes.error) { console.error("Appointments query failed:", aRes.error); toast.error("Could not load appointments"); }
      if (cRes.error) console.error("Clients query failed:", cRes.error);
      if (sRes.error) console.error("Services query failed:", sRes.error);
      if (stRes.error) console.error("Staff query failed:", stRes.error);
      if (lRes.error) console.error("Locations query failed:", lRes.error);
      setAppointments(aRes.data ?? []);
      setClients(cRes.data ?? []);
      setServices(sRes.data ?? []);
      setStaff(stRes.data ?? []);
      setLocations(lRes.data ?? []);
    } catch (err) {
      console.error("Calendar loadAll error:", err);
      toast.error("Connection issue, try again");
    }
    setLoading(false);
  }, [activeClinic, weekStart, weekEnd]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Scroll to current time on initial load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
      if (mins > 0) {
        const top = (mins / SLOT_MIN) * SLOT_PX - 100;
        scrollRef.current.scrollTop = Math.max(0, top);
      }
    }
  }, [loading]);

  /* ── Filtered appointments ── */
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (!filterStatuses.has(a.status)) return false;
      if (filterLocationId !== "all" && a.location_id && a.location_id !== filterLocationId) return false;
      if (filterStaffIds.size > 0 && a.staff_id && !filterStaffIds.has(a.staff_id)) return false;
      return true;
    });
  }, [appointments, filterStatuses, filterLocationId, filterStaffIds]);

  /* ── Filtered staff for column display ── */
  const displayStaff = useMemo(() => {
    if (filterStaffIds.size === 0) return staff;
    return staff.filter((s) => filterStaffIds.has(s.id));
  }, [staff, filterStaffIds]);

  /* ── Conflict Detection ── */
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
        a.status !== "no_show" &&
        overlaps(candidate, a)
    );
    if (!clash) return null;
    return {
      appointment: clash,
      member: staffById.get(clash.staff_id ?? "")?.display_name ?? "Staff",
      client: fullName(clientById.get(clash.client_id ?? "")),
      time: `${timeStr(new Date(clash.starts_at))}–${timeStr(new Date(clash.ends_at))}`,
    };
  }, [appointments, clientById, draft.ends_at, draft.staff_id, draft.starts_at, editing?.id, staffById]);

  /* ── Slot Click Handlers ── */
  const openSlot = (day: Date, hour: number, minute: number, staffId?: string) => {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    setEditing(null);
    setOverrideConflict(false);
    setShowCancelReason(false);
    setCancelReason("");
    setClientSearch("");
    setDraft({
      ...emptyDraft,
      starts_at: toLocalInput(start),
      ends_at: toLocalInput(end),
      staff_id: staffId ?? "",
      location_id: filterLocationId !== "all" ? filterLocationId : "",
    });
    setOpen(true);
  };

  const openNew = () => {
    const now = new Date();
    const nextSlot = new Date(now);
    nextSlot.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    openSlot(nextSlot, nextSlot.getHours(), nextSlot.getMinutes());
  };

  const openExisting = (appointment: Appointment) => {
    setEditing(appointment);
    setOverrideConflict(false);
    setShowCancelReason(false);
    setCancelReason("");
    setClientSearch("");
    setDraft({
      client_id: appointment.client_id ?? "",
      service_id: appointment.service_id ?? "",
      staff_id: appointment.staff_id ?? "",
      location_id: appointment.location_id ?? "",
      starts_at: toLocalInput(new Date(appointment.starts_at)),
      ends_at: toLocalInput(new Date(appointment.ends_at)),
      status: appointment.status,
      price: String((appointment.price_cents ?? 0) / 100),
      notes: appointment.notes ?? "",
      internal_notes: appointment.internal_notes ?? "",
    });
    setOpen(true);
  };

  /* ── Service auto-fill ── */
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

  /* ── Duration display ── */
  const durationMin = useMemo(() => {
    if (!draft.starts_at || !draft.ends_at) return 0;
    return Math.round((new Date(draft.ends_at).getTime() - new Date(draft.starts_at).getTime()) / 60000);
  }, [draft.starts_at, draft.ends_at]);

  /* ── Client search results ── */
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        fullName(c).toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.phone?.includes(q))
    ).slice(0, 20);
  }, [clients, clientSearch]);

  /* ── Submit ── */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.starts_at || !draft.ends_at) return toast.error("Start and end time required");
    if (new Date(draft.ends_at) <= new Date(draft.starts_at)) return toast.error("End must be after start");
    if (conflict && !overrideConflict) return toast.error(`Conflict with ${conflict.member} at ${conflict.time}. Override or pick a different time.`);
    setSaving(true);
    try {
      const payload = {
        clinic_id: activeClinic.clinic_id,
        client_id: draft.client_id || null,
        service_id: draft.service_id || null,
        staff_id: draft.staff_id || null,
        location_id: draft.location_id || null,
        starts_at: new Date(draft.starts_at).toISOString(),
        ends_at: new Date(draft.ends_at).toISOString(),
        status: draft.status as AppointmentStatus,
        price_cents: Math.round(Number(draft.price || 0) * 100),
        notes: draft.notes.trim() || null,
        internal_notes: draft.internal_notes.trim() || null,
      };
      const res = editing
        ? await supabase.from("appointments").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
        : await supabase.from("appointments").insert(payload);
      if (res.error) {
        toast.error(res.error.message);
      } else {
        toast.success(editing ? "Appointment updated" : "Appointment booked");
        setOpen(false);
        await loadAll();
      }
    } catch (err) {
      console.error("Save appointment error:", err);
      toast.error("Connection issue, try again");
    }
    setSaving(false);
  };

  /* ── Post-completion: auto-create review request ── */
  const autoCreateReviewRequest = async (appointment: Appointment, clinicId: string) => {
    try {
      // Check if review_settings is enabled
      const { data: rs } = await supabase
        .from("review_settings")
        .select("is_enabled, trigger_hours_after_appointment")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!rs?.is_enabled) return;

      // Check no existing review_request for this appointment
      const { data: existing } = await supabase
        .from("review_requests")
        .select("id")
        .eq("appointment_id", appointment.id)
        .maybeSingle();
      if (existing) return;

      if (!appointment.client_id) return;

      const scheduledAt = new Date(Date.now() + (rs.trigger_hours_after_appointment ?? 2) * 3600000).toISOString();
      await supabase.from("review_requests").insert({
        clinic_id: clinicId,
        client_id: appointment.client_id,
        appointment_id: appointment.id,
        status: "pending",
        scheduled_send_at: scheduledAt,
        sent_via: "email",
      });
    } catch (err) {
      console.error("Auto review request failed (non-critical):", err);
    }
  };

  /* ── Post-completion: auto-unlock referral reward ── */
  const autoUnlockReferralReward = async (appointment: Appointment, clinicId: string) => {
    try {
      if (!appointment.client_id) return;

      // Count completed appointments for this client (including the one just completed)
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("client_id", appointment.client_id)
        .eq("status", "completed");

      if (count !== 1) return; // Only trigger on FIRST completed appointment

      // Check if this client was referred
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, referrer_client_id, referrer_code_id, referrer_name, status")
        .eq("clinic_id", clinicId)
        .eq("referee_client_id", appointment.client_id)
        .in("status", ["invited", "signed_up"])
        .maybeSingle();

      if (!referral) return;

      // Update referral status
      await supabase.from("referrals").update({
        status: "first_appointment_completed",
        reward_unlocked_at: new Date().toISOString(),
      }).eq("id", referral.id);

      // Fetch referral settings
      const { data: refSettings } = await supabase
        .from("referral_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (!refSettings?.is_enabled) return;

      let rewardAmountCents = 0;
      let notes = "";
      switch (refSettings.reward_type) {
        case "credit":
          rewardAmountCents = refSettings.reward_value * 100;
          notes = `$${refSettings.reward_value} credit reward`;
          break;
        case "percentage":
          notes = `${refSettings.reward_value}% discount reward`;
          break;
        case "free_service":
          if (refSettings.reward_service_id) {
            const { data: svc } = await supabase.from("services").select("price_cents, name").eq("id", refSettings.reward_service_id).maybeSingle();
            if (svc) { rewardAmountCents = svc.price_cents; notes = `Free service: ${svc.name}`; }
          }
          break;
        default:
          notes = refSettings.reward_description ?? "Custom reward";
      }

      // Insert reward for referrer
      if (referral.referrer_client_id) {
        await supabase.from("referral_rewards").insert({
          clinic_id: clinicId,
          referral_id: referral.id,
          recipient_client_id: referral.referrer_client_id,
          reward_type: refSettings.reward_type,
          amount_cents: rewardAmountCents,
          status: "available",
          notes,
        });
      }

      // Insert reward for referee if enabled
      if (refSettings.referee_reward_enabled && appointment.client_id) {
        let refNotes = "";
        let refAmount = 0;
        switch (refSettings.referee_reward_type) {
          case "credit": refAmount = refSettings.referee_reward_value * 100; refNotes = `$${refSettings.referee_reward_value} welcome credit`; break;
          case "percentage": refNotes = `${refSettings.referee_reward_value}% welcome discount`; break;
          default: refNotes = "Welcome reward";
        }
        await supabase.from("referral_rewards").insert({
          clinic_id: clinicId,
          referral_id: referral.id,
          recipient_client_id: appointment.client_id,
          reward_type: refSettings.referee_reward_type,
          amount_cents: refAmount,
          status: "available",
          notes: refNotes,
        });
      }

      // Update referral code usage
      if (referral.referrer_code_id) {
        const { data: codeData } = await supabase.from("referral_codes").select("times_used, total_rewards_earned_cents").eq("id", referral.referrer_code_id).maybeSingle();
        if (codeData) {
          await supabase.from("referral_codes").update({
            times_used: (codeData.times_used ?? 0) + 1,
            total_rewards_earned_cents: (codeData.total_rewards_earned_cents ?? 0) + rewardAmountCents,
          }).eq("id", referral.referrer_code_id);
        }
      }

      toast.success(`🎉 Referral reward unlocked for ${referral.referrer_name}!`);
    } catch (err) {
      console.error("Referral reward unlock failed (non-critical):", err);
    }
  };

  /* ── Status transitions ── */
  const advanceStatus = async (appointment: Appointment, next: AppointmentStatus, reason?: string) => {
    if (!activeClinic) return;
    const updates: Partial<Appointment> = { status: next };
    if (next === "checked_in") updates.check_in_at = new Date().toISOString();
    if (next === "completed") updates.check_out_at = new Date().toISOString();
    if (next === "no_show") updates.no_show_at = new Date().toISOString();
    if (next === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
      if (reason) updates.cancel_reason = reason;
    }
    try {
      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", appointment.id)
        .eq("clinic_id", activeClinic.clinic_id);
      if (error) toast.error(error.message);
      else {
        toast.success(`Marked ${STATUS_LABELS[next]}`);
        setOpen(false);

        // Post-completion automation (non-blocking)
        if (next === "completed") {
          autoCreateReviewRequest(appointment, activeClinic.clinic_id);
          autoUnlockReferralReward(appointment, activeClinic.clinic_id);
        }

        await loadAll();
      }
    } catch (err) {
      toast.error("Connection issue, try again");
    }
  };

  const handleCancel = () => {
    if (!editing) return;
    if (!showCancelReason) {
      setShowCancelReason(true);
      return;
    }
    advanceStatus(editing, "cancelled", cancelReason);
  };

  /* ── Position calculation ── */
  const positionFor = (appointment: Appointment) => {
    const start = new Date(appointment.starts_at);
    const end = new Date(appointment.ends_at);
    const startMin = start.getHours() * 60 + start.getMinutes() - HOUR_START * 60;
    const durMin = (end.getTime() - start.getTime()) / 60000;
    const top = (startMin / SLOT_MIN) * SLOT_PX;
    const height = Math.max(SLOT_PX - 2, (durMin / SLOT_MIN) * SLOT_PX - 2);
    return { top, height };
  };

  /* ── Current time indicator position ── */
  const nowPosition = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
    if (mins < 0 || mins > (HOUR_END - HOUR_START) * 60) return null;
    return (mins / SLOT_MIN) * SLOT_PX;
  }, []);

  const isViewOnly = editing && (editing.status === "completed" || editing.status === "cancelled" || editing.status === "no_show");

  /* ── Week label ── */
  const weekLabel = `Week of ${format(weekStart, "MMM d")}–${format(addDays(weekStart, 6), "d, yyyy")}`;

  const toggleStaffFilter = (id: string) => {
    setFilterStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatusFilter = (status: AppointmentStatus) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Calendar</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Manage appointments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any slot to book · Use arrows to navigate weeks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button aria-label="Action" variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeekMon(new Date()))} className="gap-2">
            <CalendarDays className="h-4 w-4" /> Today
          </Button>
          <Button aria-label="Action" variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-sm font-medium">
                {weekLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekStart}
                onSelect={(d) => { if (d) { setWeekStart(startOfWeekMon(d)); setDatePickerOpen(false); } }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setByProvider((v) => !v)}
            className="gap-2"
          >
            {byProvider ? <Square className="h-4 w-4" /> : <Columns3 className="h-4 w-4" />}
            {byProvider ? "Combined" : "By Provider"}
          </Button>

          <Button onClick={openNew} className="gap-2 bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-lg hover:opacity-90">
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>

        {/* Location filter */}
        {locations.length > 1 && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Staff filter chips */}
        <div className="flex flex-wrap items-center gap-1">
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleStaffFilter(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                filterStaffIds.size === 0 || filterStaffIds.has(s.id)
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color ?? "#9333EA" }} />
              {s.display_name}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-1">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition capitalize",
                filterStatuses.has(status)
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""} this week
        </span>
      </section>

      {/* ── Calendar Grid ── */}
      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-auto max-h-[calc(100vh-280px)]">
            <div style={{ minWidth: byProvider ? Math.max(900, 60 + 7 * Math.max(1, displayStaff.length) * 120) : 900 }}>
              {/* Day header row */}
              <div
                className="grid border-b border-border sticky top-0 z-10 bg-card"
                style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
              >
                <div className="border-r border-border" />
                {days.map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={day.toISOString()} className={cn("border-l border-border px-2 py-2.5 text-center", isToday && "bg-primary/5")}>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <div className={cn("mt-1 text-lg font-semibold font-display", isToday && "text-primary")}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Provider sub-header */}
              {byProvider && displayStaff.length > 0 && (
                <div
                  className="grid border-b border-border sticky top-[62px] z-10 bg-card/95 backdrop-blur-sm"
                  style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
                >
                  <div className="border-r border-border" />
                  {days.map((day) => (
                    <div
                      key={`hdr-${day.toISOString()}`}
                      className="grid border-l border-border"
                      style={{ gridTemplateColumns: `repeat(${displayStaff.length}, minmax(0, 1fr))` }}
                    >
                      {displayStaff.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-center gap-1 border-l border-border/40 px-1 py-1.5 text-[10px] font-medium first:border-l-0"
                        >
                          <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: s.color ?? "#9333EA" }} />
                          <span className="truncate text-muted-foreground">{s.display_name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Time-grid body */}
              <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}>
                {/* Time labels */}
                <div className="border-r border-border">
                  {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                    <div key={i} style={{ height: SLOT_PX * SLOTS_PER_HOUR }} className="relative">
                      <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground select-none">
                        {format(new Date(2000, 0, 1, HOUR_START + i), "h a")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayAppts = filteredAppointments.filter(
                    (a) => new Date(a.starts_at).toDateString() === day.toDateString()
                  );

                  if (byProvider && displayStaff.length > 0) {
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn("relative grid border-l border-border", isToday && "bg-primary/[0.02]")}
                        style={{ height: totalHeight, gridTemplateColumns: `repeat(${displayStaff.length}, minmax(0, 1fr))` }}
                      >
                        {displayStaff.map((member) => {
                          const colAppts = dayAppts.filter((a) => a.staff_id === member.id);
                          return (
                            <div
                              key={`${day.toISOString()}-${member.id}`}
                              className="relative border-l border-border/40 first:border-l-0"
                              style={{ height: totalHeight }}
                            >
                              {/* Slot buttons */}
                              {Array.from({ length: slotCount }).map((_, slot) => {
                                const hour = HOUR_START + Math.floor(slot / SLOTS_PER_HOUR);
                                const minute = (slot % SLOTS_PER_HOUR) * SLOT_MIN;
                                return (
                                  <button
                                    key={slot}
                                    onClick={() => openSlot(day, hour, minute, member.id)}
                                    className={cn(
                                      "block w-full border-b border-border/30 transition hover:bg-primary/5",
                                      minute === 0 && "border-border/60"
                                    )}
                                    style={{ height: SLOT_PX }}
                                    aria-label={`Book ${member.display_name} ${format(day, "EEE MMM d")} ${hour}:${String(minute).padStart(2, "0")}`}
                                  />
                                );
                              })}
                              {/* Appointment blocks */}
                              {colAppts.map((appointment) => {
                                const { top, height } = positionFor(appointment);
                                const svc = serviceById.get(appointment.service_id ?? "");
                                return (
                                  <button
                                    key={appointment.id}
                                    onClick={() => openExisting(appointment)}
                                    className={cn(
                                      "absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[10px] shadow-sm transition hover:ring-1 hover:ring-primary/40",
                                      STATUS_TINT[appointment.status]
                                    )}
                                    style={{ top, height, borderLeft: `3px solid ${member.color ?? "#9333EA"}`, background: `${member.color ?? "#9333EA"}15` }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="truncate font-medium">{fullName(clientById.get(appointment.client_id ?? ""))}</span>
                                      {STATUS_ICON[appointment.status]}
                                    </div>
                                    {height > 36 && <div className="truncate opacity-80">{svc?.name ?? "—"}</div>}
                                    {height > 60 && <div className="truncate opacity-60">{timeStr(new Date(appointment.starts_at))}</div>}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                        {/* Current time indicator */}
                        {isToday && nowPosition !== null && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowPosition }}>
                            <div className="h-0.5 w-full bg-rose-500" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Combined day column
                  return (
                    <div key={day.toISOString()} className={cn("relative border-l border-border", isToday && "bg-primary/[0.02]")} style={{ height: totalHeight }}>
                      {Array.from({ length: slotCount }).map((_, slot) => {
                        const hour = HOUR_START + Math.floor(slot / SLOTS_PER_HOUR);
                        const minute = (slot % SLOTS_PER_HOUR) * SLOT_MIN;
                        return (
                          <button
                            key={slot}
                            onClick={() => openSlot(day, hour, minute)}
                            className={cn(
                              "block w-full border-b border-border/30 transition hover:bg-primary/5",
                              minute === 0 && "border-border/60"
                            )}
                            style={{ height: SLOT_PX }}
                            aria-label={`Book ${format(day, "EEE MMM d")} ${hour}:${String(minute).padStart(2, "0")}`}
                          />
                        );
                      })}
                      {/* Appointment blocks with overlap handling */}
                      {(() => {
                        // Group overlapping appointments
                        const sorted = [...dayAppts].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
                        const groups: Appointment[][] = [];
                        for (const appt of sorted) {
                          let placed = false;
                          for (const group of groups) {
                            if (group.some((g) => overlaps(g, appt))) {
                              group.push(appt);
                              placed = true;
                              break;
                            }
                          }
                          if (!placed) groups.push([appt]);
                        }
                        return sorted.map((appointment) => {
                          const { top, height } = positionFor(appointment);
                          const member = staffById.get(appointment.staff_id ?? "");
                          const svc = serviceById.get(appointment.service_id ?? "");
                          // Find this appointment's group for side-by-side rendering
                          const group = groups.find((g) => g.includes(appointment))!;
                          const idx = group.indexOf(appointment);
                          const count = group.length;
                          const widthPct = 100 / count;
                          const leftPct = idx * widthPct;
                          return (
                            <button
                              key={appointment.id}
                              onClick={() => openExisting(appointment)}
                              className={cn(
                                "absolute overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition hover:ring-1 hover:ring-primary/40",
                                STATUS_TINT[appointment.status]
                              )}
                              style={{
                                top,
                                height,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                borderLeft: `3px solid ${member?.color ?? "#9333EA"}`,
                                background: `${member?.color ?? "#9333EA"}15`,
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <span className="truncate font-medium">{fullName(clientById.get(appointment.client_id ?? ""))}</span>
                                {STATUS_ICON[appointment.status]}
                              </div>
                              {height > 40 && <div className="truncate opacity-80">{svc?.name ?? "—"}</div>}
                              {height > 60 && <div className="truncate opacity-60">{member?.display_name ?? "Unassigned"}</div>}
                              {height > 76 && <div className="truncate opacity-50">{timeStr(new Date(appointment.starts_at))}</div>}
                            </button>
                          );
                        });
                      })()}
                      {/* Current time indicator */}
                      {isToday && nowPosition !== null && (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowPosition }}>
                          <div className="relative">
                            <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-rose-500" />
                            <div className="h-0.5 w-full bg-rose-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Empty state */}
            {!loading && filteredAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No appointments this week</h3>
                <p className="mt-1 text-sm text-muted-foreground/70">Create one to get started.</p>
                <Button onClick={openNew} className="mt-4 gap-2 bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground">
                  <Plus className="h-4 w-4" /> New Appointment
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════ MODAL ═══════════════════ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 pt-[5vh] backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {editing ? (isViewOnly ? "Appointment Details" : "Edit Appointment") : "New Appointment"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editing
                    ? `${STATUS_LABELS[editing.status]} · ${format(new Date(editing.starts_at), "EEE, MMM d 'at' h:mm a")}`
                    : "Fill in the details below"}
                </p>
              </div>
              <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick actions for existing appointment */}
            {editing && STATUS_FLOW[editing.status].length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
                <span className="text-xs font-medium text-muted-foreground">Actions:</span>
                {STATUS_FLOW[editing.status].map(({ next, label }) => {
                  if (next === "cancelled") {
                    return (
                      <Button key={next} type="button" size="sm" variant="outline" onClick={handleCancel} className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10">
                        {label}
                      </Button>
                    );
                  }
                  return (
                    <Button key={next} type="button" size="sm" variant="outline" onClick={() => advanceStatus(editing, next)}>
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Cancel reason */}
            {showCancelReason && (
              <div className="border-b border-rose-500/30 bg-rose-500/5 px-5 py-3">
                <label className="text-xs font-medium text-rose-300">Reason for cancellation</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Optional reason..."
                    className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button type="button" size="sm" variant="destructive" onClick={() => advanceStatus(editing!, "cancelled", cancelReason)}>
                    Confirm Cancel
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowCancelReason(false)}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Conflict warning */}
            {conflict && (
              <div className="flex items-start gap-3 border-b border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1">
                  <div className="font-semibold">⚠️ Schedule Conflict</div>
                  <div className="text-red-200/80">
                    {conflict.member} has a conflicting appointment with {conflict.client} at {conflict.time}.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setOverrideConflict(true)}
                      className={cn("text-xs", overrideConflict && "bg-primary/20 border-primary/40")}
                    >
                      {overrideConflict ? "✓ Override enabled" : "Override and book anyway"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {/* Client */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={clientSearch || (draft.client_id ? fullName(clientById.get(draft.client_id)) : "")}
                    onChange={(e) => { setClientSearch(e.target.value); setDraft({ ...draft, client_id: "" }); }}
                    onFocus={() => setClientSearch(clientSearch || "")}
                    placeholder="Search by name, email, or phone..."
                    disabled={!!isViewOnly}
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                {clientSearch !== "" && !draft.client_id && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                    <button type="button" onClick={() => { setDraft({ ...draft, client_id: "" }); setClientSearch(""); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-muted-foreground">
                      Walk-in / no client
                    </button>
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setDraft({ ...draft, client_id: c.id }); setClientSearch(""); }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{fullName(c)}</span>
                            {c.vip_status && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">VIP</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No clients found</div>
                    )}
                  </div>
                )}
                {/* Selected client info */}
                {draft.client_id && clientById.get(draft.client_id) && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(clientById.get(draft.client_id)!.first_name?.[0] ?? "").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {fullName(clientById.get(draft.client_id))}
                        {clientById.get(draft.client_id)!.vip_status && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">VIP</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[clientById.get(draft.client_id)!.email, clientById.get(draft.client_id)!.phone].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {!isViewOnly && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...draft, client_id: "" }); setClientSearch(""); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Service</label>
                <select
                  value={draft.service_id}
                  onChange={(e) => updateService(e.target.value)}
                  disabled={!!isViewOnly}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">No service</option>
                  {(() => {
                    const categories = [...new Set(services.map((s) => s.category ?? "Other"))];
                    return categories.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {services.filter((s) => (s.category ?? "Other") === cat).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.duration_minutes}m · {money(s.price_cents)}
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>

              {/* Staff */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Provider</label>
                <select
                  value={draft.staff_id}
                  onChange={(e) => setDraft({ ...draft, staff_id: e.target.value })}
                  disabled={!!isViewOnly}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      ● {s.display_name}{s.title ? ` · ${s.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/time */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start</label>
                <input
                  type="datetime-local"
                  required
                  value={draft.starts_at}
                  onChange={(e) => updateStart(e.target.value)}
                  disabled={!!isViewOnly}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  End {durationMin > 0 && <span className="text-primary">({durationMin} min)</span>}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={draft.ends_at}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                  disabled={!!isViewOnly}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {/* Location */}
              {locations.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Location</label>
                  <select
                    value={draft.location_id}
                    onChange={(e) => setDraft({ ...draft, location_id: e.target.value })}
                    disabled={!!isViewOnly}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">No location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  disabled={!!isViewOnly}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {/* Status (only for new appointments) */}
              {!editing && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as AppointmentStatus })}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="scheduled">Scheduled / Tentative</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Client-facing notes</label>
                <textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  disabled={!!isViewOnly}
                  placeholder="These will appear in client confirmation..."
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Internal notes (staff only)</label>
                <textarea
                  rows={2}
                  value={draft.internal_notes}
                  onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}
                  disabled={!!isViewOnly}
                  placeholder="Private — only staff see these..."
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {/* Metadata for existing appointments */}
              {editing && (
                <div className="md:col-span-2 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                  <span>Created {format(new Date(editing.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  <span>Updated {format(new Date(editing.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  {editing.cancelled_at && <span className="text-rose-400">Cancelled {format(new Date(editing.cancelled_at), "MMM d 'at' h:mm a")}{editing.cancel_reason ? ` — ${editing.cancel_reason}` : ""}</span>}
                  {editing.check_in_at && <span className="text-amber-400">Checked in {format(new Date(editing.check_in_at), "h:mm a")}</span>}
                  {editing.check_out_at && <span className="text-emerald-400">Completed {format(new Date(editing.check_out_at), "h:mm a")}</span>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  {isViewOnly ? "Close" : "Cancel"}
                </Button>
                {!isViewOnly && (
                  <Button
                    disabled={saving || (!!conflict && !overrideConflict)}
                    className="bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-lg hover:opacity-90"
                  >
                    {saving ? "Saving…" : editing ? "Save Changes" : "Book Appointment"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
