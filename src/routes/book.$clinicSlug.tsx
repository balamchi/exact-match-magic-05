import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar, Clock, ChevronRight, ChevronLeft, Check, MapPin, Sparkles,
  User, Mail, Phone, MessageSquare, Search, Loader2, AlertCircle,
  CalendarPlus, X, ChevronDown, Star, Zap, Heart, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Clinic = Tables<"clinics">;
type Service = Tables<"services">;
type Staff = Tables<"staff">;

interface BookingSettings {
  show_provider_photos?: boolean;
  show_provider_bios?: boolean;
  allow_provider_selection?: boolean;
  show_prices?: boolean;
  min_advance_hours?: number;
  max_advance_days?: number;
  buffer_minutes?: number;
  welcome_message?: string;
  thank_you_message?: string;
}

interface BookingState {
  serviceId: string;
  staffId: string; // "" = any available
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  notes: string;
  reminderConsent: boolean;
  marketingConsent: boolean;
}

const INITIAL: BookingState = {
  serviceId: "", staffId: "", date: "", time: "",
  firstName: "", lastName: "", email: "", phone: "",
  dob: "", notes: "", reminderConsent: false, marketingConsent: false,
};

/* ------------------------------------------------------------------ */
/*  Route                                                             */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/book/$clinicSlug")({
  component: PublicBookingPage,
  head: () => ({
    meta: [
      { title: "Book an Appointment — ClinicPro" },
      { name: "description", content: "Choose a service, pick your provider, and book online in seconds." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const STEPS = ["Service", "Provider", "Date & Time", "Your Info", "Confirm"] as const;

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h % 12) || 12)}:${String(m).padStart(2, "0")} ${ampm}`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function generateICS(apptId: string, start: Date, end: Date, service: string, clinic: string, location: string, provider: string) {
  const pad = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClinicPro//Booking//EN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${apptId}@clinicpro.io`,
    `DTSTAMP:${pad(new Date())}`,
    `DTSTART:${pad(start)}`,
    `DTEND:${pad(end)}`,
    `SUMMARY:${service} at ${clinic}`,
    `LOCATION:${location}`,
    `DESCRIPTION:Provider: ${provider}`,
    "STATUS:CONFIRMED",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalUrl(start: Date, end: Date, title: string, location: string, details: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(details)}`;
}

function downloadICS(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Quick filter definitions                                          */
/* ------------------------------------------------------------------ */

type QuickFilter = "all" | "popular" | "quick" | "new_patient" | "wellness";

const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Filter className="h-3 w-3" /> },
  { key: "popular", label: "Most Popular", icon: <Star className="h-3 w-3" /> },
  { key: "quick", label: "Quick (<30 min)", icon: <Zap className="h-3 w-3" /> },
  { key: "wellness", label: "Wellness", icon: <Heart className="h-3 w-3" /> },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

function PublicBookingPage() {
  const { clinicSlug } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffServices, setStaffServices] = useState<{ staff_id: string; service_id: string }[]>([]);
  const [settings, setSettings] = useState<BookingSettings>({});

  const [step, setStep] = useState(0);
  const [state, setState] = useState<BookingState>(INITIAL);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Referral code support
  const [refCode, setRefCode] = useState("");
  const [refBanner, setRefBanner] = useState<{ name: string; description: string; codeId: string; referrerClientId: string } | null>(null);

  // Category selection state (sidebar / chips)
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [popularity, setPopularity] = useState<Map<string, number>>(new Map());

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const contentRef = useRef<HTMLDivElement>(null);

  const currency = clinic?.currency ?? "CAD";
  const selectedService = useMemo(() => services.find((s) => s.id === state.serviceId), [services, state.serviceId]);
  const selectedStaff = useMemo(() => staff.find((s) => s.id === state.staffId), [staff, state.staffId]);

  // Eligible staff for selected service
  const eligibleStaff = useMemo(() => {
    if (!state.serviceId) return staff;
    const linked = new Set(staffServices.filter((ss) => ss.service_id === state.serviceId).map((ss) => ss.staff_id));
    if (linked.size === 0) return staff;
    return staff.filter((s) => linked.has(s.id));
  }, [staff, staffServices, state.serviceId]);

  /* ---------- Load clinic data ---------- */
  useEffect(() => {
    loadClinic();
  }, [clinicSlug]);

  const loadClinic = async () => {
    setLoading(true);
    const { data: c, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("slug", clinicSlug)
      .maybeSingle();

    if (error || !c) { setLoading(false); return; }
    setClinic(c);
    setSettings((c.booking_widget_settings as BookingSettings) ?? {});

    const [svcRes, staffRes, ssRes] = await Promise.all([
      supabase.from("services").select("*").eq("clinic_id", c.id).eq("active", true).eq("visible_online", true).order("category").order("name"),
      supabase.from("staff").select("*").eq("clinic_id", c.id).eq("active", true).eq("visible_online", true).order("display_name"),
      supabase.from("staff_services").select("staff_id, service_id").eq("clinic_id", c.id),
    ]);
    setServices(svcRes.data ?? []);
    setStaff(staffRes.data ?? []);
    setStaffServices(ssRes.data ?? []);

    // Fetch popularity (booking counts from last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: popData } = await supabase
      .from("appointments")
      .select("service_id")
      .eq("clinic_id", c.id)
      .gte("starts_at", ninetyDaysAgo.toISOString())
      .not("status", "in", '("cancelled","no_show")');

    const popMap = new Map<string, number>();
    (popData ?? []).forEach((a) => {
      if (a.service_id) popMap.set(a.service_id, (popMap.get(a.service_id) ?? 0) + 1);
    });
    setPopularity(popMap);

    // Default expanded categories: top 2 by popularity
    const svcList = svcRes.data ?? [];
    const catPop = new Map<string, number>();
    svcList.forEach((s) => {
      const cat = s.category || "Other";
      catPop.set(cat, (catPop.get(cat) ?? 0) + (popMap.get(s.id) ?? 0));
    });
    // No-op: default category is "all"
    void catPop;

    // Check for referral code in URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("ref");
      if (code && c) {
        setRefCode(code);
        const { data: codeData } = await supabase
          .from("referral_codes")
          .select("id, client_id, code")
          .eq("code", code)
          .eq("clinic_id", c.id)
          .eq("is_active", true)
          .maybeSingle();
        if (codeData) {
          const { data: referrer } = await supabase
            .from("clients")
            .select("first_name, last_name")
            .eq("id", codeData.client_id)
            .single();
          const { data: refSettings } = await supabase
            .from("referral_settings")
            .select("reward_description")
            .eq("clinic_id", c.id)
            .maybeSingle();
          const referrerName = referrer ? [referrer.first_name, referrer.last_name].filter(Boolean).join(" ") : "a friend";
          setRefBanner({
            name: referrerName,
            description: refSettings?.reward_description ?? "a special reward",
            codeId: codeData.id,
            referrerClientId: codeData.client_id,
          });
        }
      }
    }

    setLoading(false);
  };

  /* ---------- Top N popular service IDs ---------- */
  const popularServiceIds = useMemo(() => {
    const sorted = [...popularity.entries()].sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, 5).map(([id]) => id));
  }, [popularity]);

  // Per-category top 3
  const popularPerCategory = useMemo(() => {
    const catServices = new Map<string, { id: string; count: number }[]>();
    services.forEach((s) => {
      const cat = s.category || "Other";
      const arr = catServices.get(cat) ?? [];
      arr.push({ id: s.id, count: popularity.get(s.id) ?? 0 });
      catServices.set(cat, arr);
    });
    const result = new Set<string>();
    catServices.forEach((arr) => {
      arr.sort((a, b) => b.count - a.count);
      arr.slice(0, 3).filter((x) => x.count > 0).forEach((x) => result.add(x.id));
    });
    return result;
  }, [services, popularity]);

  /* ---------- Fetch available slots ---------- */
  const fetchSlots = useCallback(async (date: string) => {
    if (!clinic || !selectedService) return;
    setSlotsLoading(true);

    const targetStaffIds = state.staffId
      ? [state.staffId]
      : eligibleStaff.map((s) => s.id);

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("starts_at, ends_at, staff_id")
      .eq("clinic_id", clinic.id)
      .gte("starts_at", startOfDay)
      .lte("starts_at", endOfDay)
      .not("status", "in", '("cancelled","no_show")');

    const appts = existingAppts ?? [];
    const duration = selectedService.duration_minutes;
    const buffer = settings.buffer_minutes ?? 15;
    const minAdvance = (settings.min_advance_hours ?? 1) * 60;
    const now = new Date();

    const opHours = (clinic.operating_hours as Record<string, any>) ?? {};
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[new Date(date + "T12:00:00").getDay()];
    const dayHours = opHours[dayName] ?? { open: "09:00", close: "18:00", closed: false };
    if (dayHours.closed) { setSlots([]); setSlotsLoading(false); return; }

    const openMin = parseTime(dayHours.open ?? "09:00");
    const closeMin = parseTime(dayHours.close ?? "18:00");

    const available: string[] = [];

    for (let t = openMin; t + duration <= closeMin; t += 15) {
      const slotStart = `${date}T${minutesToTime(t)}:00`;
      const slotEnd = new Date(new Date(slotStart).getTime() + (duration + buffer) * 60000).toISOString();
      const slotStartDate = new Date(slotStart);

      if (slotStartDate.getTime() - now.getTime() < minAdvance * 60000) continue;

      const hasAvailable = targetStaffIds.length === 0 || targetStaffIds.some((sid) => {
        return !appts.some((a) => {
          if (a.staff_id !== sid) return false;
          const aStart = new Date(a.starts_at).getTime();
          const aEnd = new Date(a.ends_at).getTime();
          return slotStartDate.getTime() < aEnd && new Date(slotEnd).getTime() > aStart;
        });
      });

      if (hasAvailable) available.push(minutesToTime(t));
    }

    setSlots(available);
    setSlotsLoading(false);
  }, [clinic, selectedService, state.staffId, eligibleStaff, settings]);

  useEffect(() => {
    if (step === 2 && state.date) fetchSlots(state.date);
  }, [step, state.date, fetchSlots]);

  /* ---------- Submit ---------- */
  const submitBooking = async () => {
    if (!clinic || !selectedService || honeypot) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicSlug: clinic.slug,
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          email: state.email.trim(),
          phone: state.phone.trim(),
          serviceId: selectedService.id,
          staffId: state.staffId || null,
          date: state.date,
          time: state.time,
          notes: state.notes.trim() || null,
          dob: state.dob || null,
          reminderConsent: state.reminderConsent,
          marketingConsent: state.marketingConsent,
          honeypot,
          refCode: refBanner ? refCode : null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === "TIME_CONFLICT") {
          toast.error("This time was just booked by someone else. Please choose another slot.");
          setStep(2);
          setState((s) => ({ ...s, time: "" }));
          if (state.date) fetchSlots(state.date);
        } else {
          toast.error(body?.error || "Could not complete your booking. Please try again.");
        }
        return;
      }

      setConfirmationId(body.appointmentId?.slice(-6)?.toUpperCase() ?? "");

      // Create referral record if referral code was used
      if (refBanner && clinic) {
        try {
          await supabase.from("referrals").insert({
            clinic_id: clinic.id,
            referrer_client_id: refBanner.referrerClientId,
            referrer_code_id: refBanner.codeId,
            referrer_name: refBanner.name,
            referred_name: `${state.firstName.trim()} ${state.lastName.trim()}`,
            referred_email: state.email.trim(),
            referee_phone: state.phone.trim(),
            status: "signed_up",
            notes: `Booked via booking widget with code ${refCode}`,
          });
        } catch (refErr) {
          console.error("Referral creation failed (non-critical):", refErr);
        }
      }

      setSubmitted(true);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Navigation ---------- */
  const canAdvance = () => {
    if (step === 0) return !!state.serviceId;
    if (step === 1) return true;
    if (step === 2) return !!state.date && !!state.time;
    if (step === 3) {
      return state.firstName.trim().length > 0 &&
        state.lastName.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) &&
        state.phone.trim().length >= 7 &&
        state.reminderConsent;
    }
    return true;
  };

  const advance = () => {
    if (step === 1 && !state.staffId) {
      setStep(2);
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  };

  /* ---------- (no-op placeholder retained intentionally blank) ---------- */

  /* ---------- Filtered + grouped services for Step 0 ---------- */
  const { filteredGrouped, matchingCats } = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    let filtered = services;

    // Quick filter
    if (quickFilter === "popular") {
      filtered = filtered.filter((s) => popularServiceIds.has(s.id));
    } else if (quickFilter === "quick") {
      filtered = filtered.filter((s) => s.duration_minutes < 30);
    } else if (quickFilter === "wellness") {
      filtered = filtered.filter((s) => {
        const cat = (s.category ?? "").toLowerCase();
        const name = s.name.toLowerCase();
        return cat.includes("wellness") || cat.includes("iv") || name.includes("wellness") || name.includes("iv ");
      });
    }

    // Search filter
    if (needle) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(needle) ||
        (s.category ?? "").toLowerCase().includes(needle) ||
        ((s as any).booking_description ?? "").toLowerCase().includes(needle)
      );
    }

    const grouped = filtered.reduce<Record<string, Service[]>>((acc, s) => {
      const cat = s.category || "Other";
      (acc[cat] ??= []).push(s);
      return acc;
    }, {});

    // Sort categories by popularity
    const catOrder = Object.keys(grouped).sort((a, b) => {
      const aPop = grouped[a].reduce((sum, s) => sum + (popularity.get(s.id) ?? 0), 0);
      const bPop = grouped[b].reduce((sum, s) => sum + (popularity.get(s.id) ?? 0), 0);
      if (bPop !== aPop) return bPop - aPop;
      return a.localeCompare(b);
    });

    const sorted: Record<string, Service[]> = {};
    catOrder.forEach((c) => { sorted[c] = grouped[c]; });

    return {
      filteredGrouped: sorted,
      matchingCats: new Set(catOrder),
    };
  }, [services, searchQuery, quickFilter, popularServiceIds, popularity]);

  // Reset selected category when search clears or quick filter changes if invalid
  useEffect(() => {
    if (selectedCat !== "all" && selectedCat !== "__popular__" && !matchingCats.has(selectedCat)) {
      setSelectedCat("all");
    }
  }, [matchingCats, selectedCat]);

  /* ---------- Loading / Not Found ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-card">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <Skeleton className="h-10 w-48 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto mb-12" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full mb-3 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Clinic not found</h1>
          <p className="mt-3 text-sm text-neutral-400">
            We couldn't find a clinic with the link <span className="font-mono text-neutral-300">{clinicSlug}</span>.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-purple-400 underline hover:text-purple-300">Return to ClinicPro</Link>
        </div>
      </div>
    );
  }

  if (clinic.booking_widget_enabled === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Online booking is not available</h1>
          <p className="mt-3 text-sm text-neutral-400">
            {clinic.name} is not currently accepting online bookings.
          </p>
          {clinic.phone && (
            <a href={`tel:${clinic.phone}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-foreground hover:bg-purple-500">
              <Phone className="h-4 w-4" /> Call {clinic.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Success Page ---------- */
  if (submitted) {
    const startDt = new Date(`${state.date}T${state.time}:00`);
    const endDt = new Date(startDt.getTime() + (selectedService?.duration_minutes ?? 60) * 60000);
    const loc = clinic.phone ? `${clinic.name} · ${clinic.phone}` : clinic.name;
    const ics = generateICS(confirmationId, startDt, endDt, selectedService?.name ?? "", clinic.name, loc, selectedStaff?.display_name ?? "");
    const gCalUrl = googleCalUrl(startDt, endDt, `${selectedService?.name} at ${clinic.name}`, loc, `Provider: ${selectedStaff?.display_name ?? "Any"}`);

    return (
      <BookingShell clinic={clinic}>
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-green-400 animate-in zoom-in-50 duration-500">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold text-foreground">You're booked!</h1>
          <p className="mt-2 text-sm text-neutral-400">
            {(settings.thank_you_message) || "Thank you! We'll see you soon."}
          </p>

          {confirmationId && (
            <p className="mt-3 text-xs text-neutral-500">Confirmation # <span className="font-mono text-neutral-300">{confirmationId}</span></p>
          )}

          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-left text-sm">
            <Row icon={<Sparkles className="h-4 w-4 text-purple-400" />} label={selectedService?.name ?? ""} sub={`${selectedService?.duration_minutes} min${settings.show_prices !== false ? ` · ${money(selectedService?.price_cents ?? 0, currency)}` : ""}`} />
            <Row icon={<User className="h-4 w-4 text-neutral-500" />} label={selectedStaff?.display_name ?? "First available"} />
            <Row icon={<Calendar className="h-4 w-4 text-neutral-500" />} label={fmtDate(state.date)} sub={`${fmtTime(state.time)} – ${fmtTime(addMinutes(state.time, selectedService?.duration_minutes ?? 60))}`} />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a href={gCalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-neutral-700">
              <CalendarPlus className="h-4 w-4" /> Google Calendar
            </a>
            <button onClick={() => downloadICS(ics, "appointment.ics")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-neutral-700">
              <CalendarPlus className="h-4 w-4" /> Apple / Outlook
            </button>
          </div>

          <p className="mt-6 text-xs text-neutral-500">
            We've emailed your confirmation to <span className="text-neutral-300">{state.email}</span>
          </p>

          {(clinic.email || clinic.phone) && (
            <p className="mt-3 text-xs text-neutral-500">
              Need to change? {clinic.email && <>Email <a href={`mailto:${clinic.email}`} className="text-purple-400 underline">{clinic.email}</a></>}
              {clinic.email && clinic.phone && " or "}
              {clinic.phone && <>call <a href={`tel:${clinic.phone}`} className="text-purple-400 underline">{clinic.phone}</a></>}
            </p>
          )}

          <Button onClick={() => { setState(INITIAL); setStep(0); setSubmitted(false); }} className="mt-8 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-foreground hover:opacity-90">
            Book Another Appointment
          </Button>
        </div>
      </BookingShell>
    );
  }

  /* ---------- Date generation for step 3 ---------- */
  const maxDays = settings.max_advance_days ?? 90;
  const dates = Array.from({ length: Math.min(maxDays, 60) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const morningSlots = slots.filter((t) => parseInt(t) < 12);
  const afternoonSlots = slots.filter((t) => { const h = parseInt(t); return h >= 12 && h < 17; });
  const eveningSlots = slots.filter((t) => parseInt(t) >= 17);

  return (
    <BookingShell clinic={clinic}>
      {/* Referral banner */}
      {refBanner && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-300">
            🎁 You've been referred by <strong className="text-foreground">{refBanner.name}</strong>! Get <strong className="text-foreground">{refBanner.description}</strong> on your first visit.
          </div>
        </div>
      )}
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 pb-28">
        {/* Stepper */}
        <nav aria-label="Booking steps" className="mb-8">
          <ol className="flex items-center justify-between gap-1 text-xs">
            {STEPS.map((label, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <li key={label} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => i < step && setStep(i)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                      done ? "border-purple-500 bg-purple-600 text-foreground"
                        : active ? "border-purple-500 bg-purple-500/15 text-purple-400"
                          : "border-neutral-700 bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </button>
                  <span className={`hidden sm:inline truncate ${active ? "font-medium text-foreground" : "text-neutral-500"}`}>{label}</span>
                  {i < STEPS.length - 1 && <div className={`ml-1 hidden h-px flex-1 sm:block ${done ? "bg-purple-600" : "bg-neutral-700"}`} />}
                </li>
              );
            })}
          </ol>
        </nav>

        <section ref={contentRef} className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl backdrop-blur sm:p-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">

          {/* ======== STEP 0: Service ======== */}
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Choose a treatment</h2>
              <p className="mt-1 text-sm text-neutral-400">{settings.welcome_message || "Select the service you'd like to book."}</p>

              {services.length > 4 && (
                <div className="relative mt-5 sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-sm -mx-5 px-5 py-2 sm:-mx-8 sm:px-8 md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none">
                  <Search className="pointer-events-none absolute left-8 sm:left-11 md:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services…"
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800 pl-10 pr-3 text-sm text-foreground placeholder:text-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* Quick filter chips */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setQuickFilter(f.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] ${
                      quickFilter === f.key
                        ? "border-purple-500 bg-purple-500/15 text-purple-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </div>

              {services.length === 0 ? (
                <p className="mt-8 text-center text-sm text-neutral-400">No services available online. Please call us directly.</p>
              ) : Object.keys(filteredGrouped).length === 0 ? (
                <div className="mt-8 text-center">
                  <p className="text-sm text-neutral-400">No services match your search.</p>
                  <button type="button" onClick={() => { setSearchQuery(""); setQuickFilter("all"); }} className="mt-2 text-xs text-purple-400 underline hover:text-purple-300">Clear filters</button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {Object.entries(filteredGrouped).map(([cat, items]) => {
                    const isOpen = expandedCats.has(cat);
                    return (
                      <div key={cat} className="rounded-xl border border-neutral-800 overflow-hidden">
                        {/* Category header */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-800/60"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{cat}</span>
                            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">{items.length}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                        </button>

                        {/* Collapsible content */}
                        <div
                          className="transition-all duration-200 ease-in-out overflow-hidden"
                          style={{
                            maxHeight: isOpen ? `${items.length * 120 + 20}px` : "0px",
                            opacity: isOpen ? 1 : 0,
                          }}
                        >
                          <div className="space-y-2 px-3 pb-3">
                            {items.map((s) => {
                              const active = state.serviceId === s.id;
                              const isPopular = popularPerCategory.has(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setState((prev) => ({ ...prev, serviceId: s.id, staffId: "", date: "", time: "" }))}
                                  className={`flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all min-h-[48px] ${
                                    active ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30" : "border-neutral-800 bg-neutral-800/30 hover:border-purple-500/40 hover:bg-neutral-800/60"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground text-[15px]">{s.name}</span>
                                      {isPopular && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                          <Star className="h-2.5 w-2.5 fill-amber-400" /> Popular
                                        </span>
                                      )}
                                      {active && <Check className="h-4 w-4 shrink-0 text-purple-400" />}
                                    </div>
                                    {(s as any).booking_description && (
                                      <p className="mt-1 text-xs text-neutral-400 line-clamp-2">{(s as any).booking_description}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
                                      {settings.show_prices !== false && (
                                        <span className="font-medium text-purple-400">{money(s.price_cents, currency)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className={`mt-1 h-4 w-4 shrink-0 transition-colors ${active ? "text-purple-400" : "text-neutral-600"}`} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======== STEP 1: Provider ======== */}
          {step === 1 && (
            <div>
              <ServiceSummary service={selectedService!} settings={settings} currency={currency} />
              <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">Choose a provider</h2>
              <p className="mt-1 text-sm text-neutral-400">Or let us assign the first available.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, staffId: "" }))}
                  className={`rounded-xl border p-4 text-left transition-all min-h-[48px] ${
                    state.staffId === "" ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30" : "border-neutral-800 bg-neutral-800/50 hover:border-purple-500/40"
                  }`}
                >
                  <div className="font-medium text-foreground">Any available</div>
                  <div className="mt-1 text-xs text-neutral-400">First available provider</div>
                </button>

                {(settings.allow_provider_selection !== false) && eligibleStaff.map((s) => {
                  const active = state.staffId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, staffId: s.id, date: "", time: "" }))}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all min-h-[48px] ${
                        active ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30" : "border-neutral-800 bg-neutral-800/50 hover:border-purple-500/40"
                      }`}
                    >
                      {settings.show_provider_photos !== false && s.photo_url ? (
                        <img src={s.photo_url} alt={s.display_name} className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-foreground" style={{ background: s.color ?? "#9333EA" }}>
                          {s.display_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{s.display_name}</div>
                        {s.title && <div className="text-xs text-neutral-400">{s.title}</div>}
                        {settings.show_provider_bios !== false && (s as any).booking_bio && (
                          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{(s as any).booking_bio}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {eligibleStaff.length === 0 && (
                <p className="mt-6 text-center text-sm text-neutral-400">No providers available for this service.</p>
              )}
            </div>
          )}

          {/* ======== STEP 2: Date & Time ======== */}
          {step === 2 && (
            <div>
              <ServiceSummary service={selectedService!} settings={settings} currency={currency} staff={selectedStaff} />
              <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">Pick a date & time</h2>
              <p className="mt-1 text-sm text-neutral-400">Select your preferred appointment slot.</p>

              <div className="mt-5">
                <Label className="mb-2 block text-xs text-neutral-400">Date</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {dates.map((d) => {
                    const dt = new Date(d + "T12:00:00");
                    const isToday = d === new Date().toISOString().slice(0, 10);
                    const active = state.date === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { setState((s) => ({ ...s, date: d, time: "" })); }}
                        className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-all min-w-[60px] min-h-[48px] ${
                          active ? "border-purple-500 bg-purple-600 text-foreground" : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-purple-500/40"
                        }`}
                      >
                        <span className="text-[10px] uppercase">{dt.toLocaleDateString("en-US", { weekday: "short" })}</span>
                        <span className="text-lg font-semibold">{dt.getDate()}</span>
                        <span className="text-[10px]">{dt.toLocaleDateString("en-US", { month: "short" })}</span>
                        {isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {state.date && (
                <div className="mt-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 py-8 justify-center text-sm text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading available times…
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-400">No times available on this day. Try another date.</p>
                  ) : (
                    <div className="space-y-4">
                      {morningSlots.length > 0 && <TimeGroup label="Morning" slots={morningSlots} selected={state.time} duration={selectedService?.duration_minutes ?? 60} onSelect={(t) => setState((s) => ({ ...s, time: t }))} />}
                      {afternoonSlots.length > 0 && <TimeGroup label="Afternoon" slots={afternoonSlots} selected={state.time} duration={selectedService?.duration_minutes ?? 60} onSelect={(t) => setState((s) => ({ ...s, time: t }))} />}
                      {eveningSlots.length > 0 && <TimeGroup label="Evening" slots={eveningSlots} selected={state.time} duration={selectedService?.duration_minutes ?? 60} onSelect={(t) => setState((s) => ({ ...s, time: t }))} />}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======== STEP 3: Client Info ======== */}
          {step === 3 && (
            <div>
              <ServiceSummary service={selectedService!} settings={settings} currency={currency} staff={selectedStaff} date={state.date} time={state.time} />
              <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">Your details</h2>
              <p className="mt-1 text-sm text-neutral-400">So we can confirm your appointment.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fn" className="text-neutral-300"><User className="mr-1 inline h-3.5 w-3.5" /> First name *</Label>
                  <Input id="fn" value={state.firstName} onChange={(e) => setState((s) => ({ ...s, firstName: e.target.value }))} placeholder="Jane" className="bg-neutral-800 border-neutral-700 text-foreground placeholder:text-neutral-500 min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ln" className="text-neutral-300">Last name *</Label>
                  <Input id="ln" value={state.lastName} onChange={(e) => setState((s) => ({ ...s, lastName: e.target.value }))} placeholder="Smith" className="bg-neutral-800 border-neutral-700 text-foreground placeholder:text-neutral-500 min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em" className="text-neutral-300"><Mail className="mr-1 inline h-3.5 w-3.5" /> Email *</Label>
                  <Input id="em" type="email" value={state.email} onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))} placeholder="jane@example.com" className="bg-neutral-800 border-neutral-700 text-foreground placeholder:text-neutral-500 min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ph" className="text-neutral-300"><Phone className="mr-1 inline h-3.5 w-3.5" /> Phone *</Label>
                  <Input id="ph" type="tel" value={state.phone} onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))} placeholder="+1 555 123 4567" className="bg-neutral-800 border-neutral-700 text-foreground placeholder:text-neutral-500 min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-neutral-300">Date of birth</Label>
                  <Input id="dob" type="date" value={state.dob} onChange={(e) => setState((s) => ({ ...s, dob: e.target.value }))} className="bg-neutral-800 border-neutral-700 text-foreground min-h-[48px]" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="notes" className="text-neutral-300"><MessageSquare className="mr-1 inline h-3.5 w-3.5" /> Notes for the clinic</Label>
                  <Textarea id="notes" value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} rows={3} placeholder="Anything we should know?" className="bg-neutral-800 border-neutral-700 text-foreground placeholder:text-neutral-500" maxLength={1000} />
                </div>

                {/* Honeypot */}
                <div className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>

                <div className="sm:col-span-2 space-y-3 rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer min-h-[48px] items-center">
                    <input type="checkbox" checked={state.reminderConsent} onChange={(e) => setState((s) => ({ ...s, reminderConsent: e.target.checked }))} className="mt-0.5 h-5 w-5 accent-purple-500 rounded" />
                    <span className="text-xs text-neutral-300">I agree to receive appointment reminders by email and SMS *</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer min-h-[48px] items-center">
                    <input type="checkbox" checked={state.marketingConsent} onChange={(e) => setState((s) => ({ ...s, marketingConsent: e.target.checked }))} className="mt-0.5 h-5 w-5 accent-purple-500 rounded" />
                    <span className="text-xs text-neutral-300">I'd like to receive promotional offers and clinic news</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ======== STEP 4: Confirm ======== */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Review & confirm</h2>
              <p className="mt-1 text-sm text-neutral-400">Double-check everything before booking.</p>

              <dl className="mt-6 space-y-3 rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 text-sm">
                <SummaryRow label="Treatment" value={selectedService?.name ?? ""} />
                <SummaryRow label="Duration" value={`${selectedService?.duration_minutes ?? 0} minutes`} />
                {settings.show_prices !== false && <SummaryRow label="Price" value={money(selectedService?.price_cents ?? 0, currency)} />}
                <SummaryRow label="Provider" value={selectedStaff?.display_name ?? "First available"} />
                <SummaryRow label="Date" value={fmtDate(state.date)} />
                <SummaryRow label="Time" value={`${fmtTime(state.time)} – ${fmtTime(addMinutes(state.time, selectedService?.duration_minutes ?? 60))}`} />
                <div className="border-t border-neutral-700 pt-3" />
                <SummaryRow label="Name" value={`${state.firstName} ${state.lastName}`} />
                <SummaryRow label="Email" value={state.email} />
                <SummaryRow label="Phone" value={state.phone} />
                {state.notes && <SummaryRow label="Notes" value={state.notes} />}
              </dl>

              <p className="mt-4 text-[11px] text-neutral-500">
                By booking, you agree to the clinic's cancellation policy. Cancellations must be made at least 24 hours in advance.
              </p>
            </div>
          )}
        </section>

        {/* ======== STICKY BOTTOM NAV ======== */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-800 bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-neutral-400 hover:text-foreground hover:bg-neutral-800 min-h-[48px]"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={advance}
                disabled={!canAdvance()}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-foreground shadow-lg shadow-purple-600/20 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] px-6"
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submitBooking}
                disabled={submitting}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-foreground shadow-lg shadow-purple-600/20 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] px-6"
              >
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : "Confirm Booking"}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-neutral-600">
          Powered by <Link to="/" className="font-medium text-neutral-500 hover:text-neutral-400">ClinicPro</Link>
        </p>
      </main>
    </BookingShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function BookingShell({ clinic, children }: { clinic: Clinic; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-neutral-800/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          {clinic.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name} className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold text-foreground truncate">{clinic.name}</div>
            {clinic.bio && <p className="text-xs text-neutral-400 truncate">{clinic.bio}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
              {clinic.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clinic.phone}</span>}
              {clinic.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{clinic.email}</span>}
              {clinic.timezone && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{clinic.timezone}</span>}
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function ServiceSummary({ service, settings, currency, staff, date, time }: { service: Service; settings: BookingSettings; currency: string; staff?: Staff; date?: string; time?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-xs text-neutral-300">
      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
      <span className="font-medium text-foreground">{service.name}</span>
      <span className="text-neutral-500">·</span>
      <span>{service.duration_minutes} min</span>
      {settings.show_prices !== false && <><span className="text-neutral-500">·</span><span className="text-purple-400">{money(service.price_cents, currency)}</span></>}
      {staff && <><span className="text-neutral-500">·</span><span>{staff.display_name}</span></>}
      {date && time && <><span className="text-neutral-500">·</span><span>{fmtTime(time)}</span></>}
    </div>
  );
}

function TimeGroup({ label, slots, selected, duration, onSelect }: { label: string; slots: string[]; selected: string; duration: number; onSelect: (t: string) => void }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</h4>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            className={`rounded-lg border px-2 py-2.5 text-sm transition-all min-h-[48px] ${
              selected === t
                ? "border-purple-500 bg-purple-600 text-foreground"
                : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-purple-500/40"
            }`}
          >
            {fmtTime(t)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0">
      {icon}
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {sub && <div className="text-xs text-neutral-400">{sub}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                      */
/* ------------------------------------------------------------------ */

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
