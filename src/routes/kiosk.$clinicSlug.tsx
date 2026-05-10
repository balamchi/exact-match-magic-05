import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Phone, Mail, ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import {
  lookupClientForKiosk,
  registerNewClientFromKiosk,
  submitKioskCheckin,
} from "@/lib/kiosk/kiosk.functions";

export const Route = createFileRoute("/kiosk/$clinicSlug")({
  component: KioskPage,
  head: () => ({ meta: [{ title: "Check In — ClinicPro Kiosk" }] }),
});

type Step = "welcome" | "lookup" | "found" | "register" | "done";

function KioskPage() {
  const { clinicSlug } = Route.useParams();
  const [step, setStep] = useState<Step>("welcome");
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupClientForKiosk>> | null>(null);
  const [clinicName, setClinicName] = useState<string>("");

  const lookup = useServerFn(lookupClientForKiosk);
  const register = useServerFn(registerNewClientFromKiosk);
  const submit = useServerFn(submitKioskCheckin);

  // Auto reset after done
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => {
      setStep("welcome");
      setContact("");
      setResult(null);
    }, 30000);
    return () => clearTimeout(t);
  }, [step]);

  async function handleLookup() {
    if (!contact.trim()) return;
    setLoading(true);
    try {
      const r = await lookup({
        data: {
          clinic_slug: clinicSlug,
          ...(contactType === "phone" ? { phone: contact } : { email: contact }),
        },
      });
      setResult(r);
      setClinicName(r.clinic_name);
      if (r.found) setStep("found");
      else setStep("register");
    } catch (e: any) {
      toast.error(e.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    if (!result || !result.found) return;
    setLoading(true);
    try {
      const appt = result.appointments[0];
      await submit({
        data: {
          clinic_slug: clinicSlug,
          client_id: result.client.id,
          appointment_id: appt?.id,
        },
      });
      setStep("done");
    } catch (e: any) {
      toast.error(e.message ?? "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-6 sm:p-8">
      <div className="w-full max-w-2xl">
        {step === "welcome" && (
          <div className="text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-fuchsia-500 shadow-glow">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold mb-4">Welcome</h1>
            <p className="text-lg text-muted-foreground mb-10">
              Please check in for your appointment
            </p>
            <Button
              size="lg"
              className="h-16 px-12 text-lg bg-gradient-to-r from-primary to-fuchsia-500"
              onClick={() => setStep("lookup")}
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              I'm here for my appointment
            </Button>
            <p className="mt-8 text-sm text-muted-foreground">
              Need help? Please see the front desk.
            </p>
          </div>
        )}

        {step === "lookup" && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-3xl font-semibold mb-2">Find your account</h2>
            <p className="text-muted-foreground mb-6">
              Enter the {contactType} we have on file for you.
            </p>
            <div className="mb-4 flex gap-2">
              <Button
                variant={contactType === "phone" ? "default" : "outline"}
                onClick={() => { setContactType("phone"); setContact(""); }}
              >
                <Phone className="mr-2 h-4 w-4" /> Phone
              </Button>
              <Button
                variant={contactType === "email" ? "default" : "outline"}
                onClick={() => { setContactType("email"); setContact(""); }}
              >
                <Mail className="mr-2 h-4 w-4" /> Email
              </Button>
            </div>
            <Label className="text-sm">{contactType === "phone" ? "Phone number" : "Email address"}</Label>
            <Input
              autoFocus
              type={contactType === "phone" ? "tel" : "email"}
              inputMode={contactType === "phone" ? "tel" : "email"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={contactType === "phone" ? "(555) 123-4567" : "you@example.com"}
              className="mt-2 h-14 text-lg"
            />
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("welcome")}>Back</Button>
              <Button size="lg" onClick={handleLookup} disabled={loading || !contact.trim()}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "found" && result?.found && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-3xl font-semibold mb-2">
              Hi {result.client.first_name}!
            </h2>
            {result.appointments.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-6">
                  We don't see an appointment for you today. Please see the front desk.
                </p>
                <Button onClick={() => setStep("welcome")}>Done</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  We have your appointment ready:
                </p>
                <div className="rounded-xl bg-muted p-4 mb-6">
                  {result.appointments.map((a) => (
                    <div key={a.id} className="text-sm">
                      <div className="font-medium">
                        {new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {(a as any).services?.name ?? "Service"}
                      </div>
                      {(a as any).staff && (
                        <div className="text-muted-foreground">
                          with {(a as any).staff.first_name} {(a as any).staff.last_name ?? ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep("welcome")}>Cancel</Button>
                  <Button size="lg" onClick={handleCheckin} disabled={loading}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Check me in
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "register" && (
          <NewClientForm
            clinicSlug={clinicSlug}
            initialContact={contact}
            contactType={contactType}
            onCancel={() => setStep("welcome")}
            onRegistered={async (clientId) => {
              try {
                await submit({ data: { clinic_slug: clinicSlug, client_id: clientId } });
                setStep("done");
              } catch (e: any) {
                toast.error(e.message ?? "Check-in failed");
              }
            }}
            register={register}
          />
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-14 w-14" />
            </div>
            <h2 className="font-display text-4xl font-semibold mb-3">Thank you!</h2>
            <p className="text-lg text-muted-foreground">
              Please have a seat. We'll call you when we're ready.
            </p>
            <p className="mt-8 text-xs text-muted-foreground">
              {clinicName ? `${clinicName} · ` : ""}Returning to welcome screen…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewClientForm({
  clinicSlug,
  initialContact,
  contactType,
  onCancel,
  onRegistered,
  register,
}: {
  clinicSlug: string;
  initialContact: string;
  contactType: "phone" | "email";
  onCancel: () => void;
  onRegistered: (clientId: string) => void;
  register: ReturnType<typeof useServerFn<typeof registerNewClientFromKiosk>>;
}) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: contactType === "phone" ? initialContact : "",
    email: contactType === "email" ? initialContact : "",
    date_of_birth: "",
    allergies: "",
    medications: "",
    medical_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit() {
    if (!form.first_name || !form.last_name || !form.phone) {
      toast.error("First name, last name, and phone are required");
      return;
    }
    setSubmitting(true);
    try {
      const { client_id } = await register({
        data: { clinic_slug: clinicSlug, ...form },
      });
      onRegistered(client_id);
    } catch (e: any) {
      toast.error(e.message ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
      <h2 className="font-display text-3xl font-semibold mb-2">Welcome — let's get you set up</h2>
      <p className="text-muted-foreground mb-6">
        We don't have your record yet. Please fill out a few quick details.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>First name *</Label>
          <Input value={form.first_name} onChange={set("first_name")} className="h-12" />
        </div>
        <div>
          <Label>Last name *</Label>
          <Input value={form.last_name} onChange={set("last_name")} className="h-12" />
        </div>
        <div>
          <Label>Phone *</Label>
          <Input value={form.phone} onChange={set("phone")} type="tel" className="h-12" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={set("email")} type="email" className="h-12" />
        </div>
        <div>
          <Label>Date of birth</Label>
          <Input value={form.date_of_birth} onChange={set("date_of_birth")} type="date" className="h-12" />
        </div>
        <div>
          <Label>Emergency contact name</Label>
          <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} className="h-12" />
        </div>
        <div>
          <Label>Emergency contact phone</Label>
          <Input value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} className="h-12" />
        </div>
        <div className="sm:col-span-2">
          <Label>Allergies</Label>
          <Input value={form.allergies} onChange={set("allergies")} className="h-12" />
        </div>
        <div className="sm:col-span-2">
          <Label>Current medications</Label>
          <Input value={form.medications} onChange={set("medications")} className="h-12" />
        </div>
        <div className="sm:col-span-2">
          <Label>Medical conditions</Label>
          <Input value={form.medical_conditions} onChange={set("medical_conditions")} className="h-12" />
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save & check in"}
        </Button>
      </div>
    </div>
  );
}
