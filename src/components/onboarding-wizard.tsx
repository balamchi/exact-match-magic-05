import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Loader2, Sparkles, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { seedClinicDefaults } from "@/server/seed-clinic.functions";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

export function useOnboardingCheck() {
  const { activeClinic } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) {
      setLoading(false);
      return;
    }

    // Check if clinic has been seeded (has at least 5 services)
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", activeClinic.clinic_id)
      .then(({ count }) => {
        setShowOnboarding(!count || count < 5);
        setLoading(false);
      });
  }, [activeClinic?.clinic_id]);

  return { showOnboarding, setShowOnboarding, loading };
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { activeClinic } = useAuth();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: "seed", title: "Load starter content", description: "60+ services, consent forms, automations & memberships", done: false },
    { id: "staff", title: "Add your first staff member", description: "Set up your team with roles and schedules", done: false },
    { id: "explore", title: "Explore your dashboard", description: "See your KPIs, calendar, and client management", done: false },
  ]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedClinicDefaults({ data: {} });
      if (result.seeded && "summary" in result && result.summary && "consentForms" in result.summary) {
        toast.success(
          `Loaded ${result.summary.services} services, ${result.summary.consentForms} consent forms, ${result.summary.automations} automations, and ${result.summary.memberships} memberships!`
        );
        setSteps((prev) => prev.map((s) => (s.id === "seed" ? { ...s, done: true } : s)));
        setSeeded(true);
      } else {
        toast.info("Your clinic already has content set up.");
        setSteps((prev) => prev.map((s) => (s.id === "seed" ? { ...s, done: true } : s)));
        setSeeded(true);
      }
    } catch (err) {
      toast.error("Failed to load content. Please try again.");
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleFinish = () => {
    onComplete();
    navigate({ to: "/app/dashboard" } as any);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-fuchsia-500 shadow-glow">
            <Rocket className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome to Clinic<span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">Pro</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let's get <strong>{activeClinic?.clinic.name}</strong> ready in under 60 seconds
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`rounded-2xl border p-5 transition-all ${
                step.done
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {step.done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                  {step.id === "seed" && !step.done && (
                    <Button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="mt-3 gap-2 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground shadow-glow hover:opacity-90"
                    >
                      {seeding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading content…
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> Load starter content
                        </>
                      )}
                    </Button>
                  )}
                  {step.id === "staff" && seeded && !step.done && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSteps((prev) => prev.map((s) => (s.id === "staff" ? { ...s, done: true } : s)));
                        navigate({ to: "/app/staff" } as any);
                        onComplete();
                      }}
                      className="mt-3 gap-2"
                    >
                      Add staff <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                  {step.id === "explore" && steps[1].done && (
                    <Button
                      onClick={() => {
                        setSteps((prev) => prev.map((s) => (s.id === "explore" ? { ...s, done: true } : s)));
                        handleFinish();
                      }}
                      className="mt-3 gap-2 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground shadow-glow hover:opacity-90"
                    >
                      <Sparkles className="h-4 w-4" /> Go to dashboard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Skip */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Skip setup — I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
