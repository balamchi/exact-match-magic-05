import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, ChevronRight, ChevronLeft, Check, MapPin, Sparkles, User, Mail, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Clinic = Pick<Tables<"clinics">, "id" | "name" | "slug" | "currency" | "timezone">;
type Service = Tables<"services">;
type Staff = Tables<"staff">;

export const Route = createFileRoute("/book/$slug")({
  component: PublicBookingPage,
});

const STEPS = ["Service", "Provider", "Time", "Details", "Confirm"] as const;

function PublicBookingPage() {
  const { slug } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  // Wizard state
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadClinic();
  }, [slug]);

  const loadClinic = async () => {
    setLoading(true);
    const { data: clinicData, error: clinicErr } = await supabase
      .from("clinics")
      .select("id, name, slug, currency, timezone")
      .eq("slug", slug)
      .maybeSingle();

    if (clinicErr || !clinicData) {
      setLoading(false);
      return;
    }
    setClinic(clinicData);

    const [svcRes, staffRes] = await Promise.all([
      supabase.from("services").select("*").eq("clinic_id", clinicData.id).eq("active", true).order("name"),
      supabase.from("staff").select("*").eq("clinic_id", clinicData.id).eq("active", true).order("display_name"),
    ]);
    setServices(svcRes.data ?? []);
    setStaff(staffRes.data ?? []);
    setLoading(false);
  };

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedStaff = useMemo(() => staff.find((s) => s.id === staffId), [staff, staffId]);
  const currency = clinic?.currency ?? "CAD";
  const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);

  // Generate time slots (9am – 6pm, every 30 min)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const canAdvance = () => {
    if (step === 0) return !!serviceId;
    if (step === 1) return true; // staff optional
    if (step === 2) return !!date && !!time;
    if (step === 3) return name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0);
    return true;
  };

  const submitBooking = async () => {
    if (!clinic || !selectedService) return;
    setSubmitting(true);
    const desiredTime = `${date}T${time}`;
    const requestedAt = new Date(desiredTime).toLocaleString();
    const noteText = [
      `📅 Requested: ${requestedAt}`,
      `💆 Service: ${selectedService.name} (${selectedService.duration_minutes} min · ${money(selectedService.price_cents)})`,
      selectedStaff ? `👤 Provider: ${selectedStaff.display_name}` : "👤 Provider: No preference",
      notes.trim() ? `\n📝 Client note:\n${notes.trim()}` : "",
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("leads").insert({
      clinic_id: clinic.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      source: "public_booking",
      stage: "new",
      estimated_value_cents: selectedService.price_cents,
      notes: noteText,
    });

    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit your request. Please try again.");
      console.error(error);
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-5xl font-semibold">Not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't find a clinic with the link <span className="font-mono">{slug}</span>.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-primary underline">Go home</Link>
        </div>
      </div>
    );
  }

  // Success view
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Request received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks {name.split(" ")[0]} — {clinic.name} will reach out shortly to confirm your appointment.
          </p>
          <div className="mt-6 rounded-xl border border-border/60 bg-surface p-4 text-left text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />{selectedService?.name}</div>
            <div className="mt-2 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(`${date}T${time}`).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}</div>
            {selectedStaff && <div className="mt-1 flex items-center gap-2"><User className="h-3.5 w-3.5" />with {selectedStaff.display_name}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">{clinic.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{clinic.timezone}
              </div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Book online</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Stepper */}
        <ol className="mb-8 flex items-center justify-between gap-2 text-xs">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  done ? "border-primary bg-primary text-primary-foreground"
                  : active ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground"
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`hidden sm:inline ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`ml-1 hidden h-px flex-1 sm:block ${done ? "bg-primary" : "bg-border"}`} />}
              </li>
            );
          })}
        </ol>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          {/* Step 0: Service */}
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Choose a treatment</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select the service you'd like to book.</p>
              {services.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">This clinic isn't currently accepting online bookings. Please contact them directly.</p>
              ) : (
                <div className="mt-6 grid gap-3">
                  {services.map((s) => {
                    const active = serviceId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(s.id)}
                        className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${
                          active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-surface/60"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{s.name}</div>
                          {s.category && <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{s.category}</div>}
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
                          </div>
                        </div>
                        <div className="font-display text-lg font-semibold text-primary">{money(s.price_cents)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Staff */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Choose a provider</h2>
              <p className="mt-1 text-sm text-muted-foreground">Or skip and let the clinic assign someone.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStaffId("")}
                  className={`rounded-xl border p-4 text-left transition ${
                    staffId === "" ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="font-medium">No preference</div>
                  <div className="mt-1 text-xs text-muted-foreground">First available</div>
                </button>
                {staff.map((s) => {
                  const active = staffId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffId(s.id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                        style={{ background: s.color ?? "hsl(var(--primary))" }}
                      >
                        {s.display_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium">{s.display_name}</div>
                        {s.title && <div className="text-xs text-muted-foreground">{s.title}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Time */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Pick a date & time</h2>
              <p className="mt-1 text-sm text-muted-foreground">The clinic will confirm availability after you submit.</p>
              <div className="mt-6 grid gap-5">
                <div>
                  <Label htmlFor="date" className="mb-2 block">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                {date && (
                  <div>
                    <Label className="mb-2 block">Time</Label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {timeSlots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className={`rounded-lg border px-2 py-2 text-sm transition ${
                            time === t
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Your details</h2>
              <p className="mt-1 text-sm text-muted-foreground">So the clinic can confirm with you.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="name"><User className="mr-1 inline h-3.5 w-3.5" /> Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email"><Mail className="mr-1 inline h-3.5 w-3.5" /> Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone"><Phone className="mr-1 inline h-3.5 w-3.5" /> Phone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="notes"><MessageSquare className="mr-1 inline h-3.5 w-3.5" /> Notes (optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything we should know?" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Provide an email or phone number so we can reach you.</p>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Review & confirm</h2>
              <p className="mt-1 text-sm text-muted-foreground">Send this request to {clinic.name}.</p>
              <dl className="mt-6 space-y-3 rounded-xl border border-border bg-surface/40 p-5 text-sm">
                <Row label="Treatment" value={selectedService?.name ?? "—"} />
                <Row label="Duration" value={`${selectedService?.duration_minutes ?? 0} minutes`} />
                <Row label="Price" value={selectedService ? money(selectedService.price_cents) : "—"} />
                <Row label="Provider" value={selectedStaff?.display_name ?? "No preference"} />
                <Row label="Date & time" value={date && time ? new Date(`${date}T${time}`).toLocaleString([], { dateStyle: "long", timeStyle: "short" }) : "—"} />
                <Row label="Name" value={name} />
                {email && <Row label="Email" value={email} />}
                {phone && <Row label="Phone" value={phone} />}
              </dl>
            </div>
          )}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submitBooking}
                disabled={submitting}
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {submitting ? "Sending…" : "Confirm booking"}
              </Button>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Powered by <span className="font-medium text-foreground">ClinicPro</span>
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
