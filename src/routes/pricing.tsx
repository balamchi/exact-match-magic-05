import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — ClinicPro" },
      { name: "description", content: "Plans starting at $39/mo. Free 14-day trial. No credit card required." },
    ],
  }),
});

interface Plan {
  code: string;
  name: string;
  tagline: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  monthly_price_id: string | null;
  annual_price_id: string | null;
  features: string[];
  is_popular: boolean;
  display_order: number;
}

function PricingPage() {
  const { user, activeClinic } = useAuth();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "annual") setInterval("annual");

    supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_public", true)
      .order("display_order")
      .then(({ data }) => {
        setPlans((data ?? []) as unknown as Plan[]);
        setLoading(false);
      });
  }, []);

  const handleSubscribe = (plan: Plan) => {
    if (!user) {
      window.location.href = "/auth/sign-up";
      return;
    }
    if (plan.code === "enterprise") {
      window.location.href = "mailto:sales@clinicpro.io?subject=Enterprise%20inquiry";
      return;
    }
    const priceId = interval === "monthly" ? plan.monthly_price_id : plan.annual_price_id;
    if (!priceId) return;
    openCheckout({
      priceId,
      customerEmail: user.email,
      clinicId: activeClinic?.clinic_id,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />

      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 sm:px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">ClinicPro</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app/dashboard">
                <Button>Dashboard <ArrowRight className="ms-1.5 h-4 w-4" /></Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/sign-in">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button>Start free trial</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="px-4 sm:px-6 pt-20 pb-12 text-center">
        <div className="mx-auto max-w-[95vw] sm:max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight sm:text-6xl">
            Pricing that scales with your clinic
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            14-day free trial on every plan. No credit card required. Cancel anytime.
          </p>


          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                interval === "monthly" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                interval === "annual" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              Annual <span className="ms-1 text-[10px] uppercase tracking-wider text-success">Save 15%</span>
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-24">
        <div className="mx-auto grid max-w-[1280px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading && <div className="col-span-4 text-center text-muted-foreground">Loading plans…</div>}
          {plans.map((plan) => {
            const cents = interval === "monthly" ? plan.price_monthly_cents : Math.round(plan.price_annual_cents / 12);
            const display = plan.code === "enterprise" ? "Custom" : `$${(cents / 100).toFixed(0)}`;
            const monthlyCents = plan.price_monthly_cents;
            const annualMonthlyCents = Math.round(plan.price_annual_cents / 12);
            const savings = plan.code !== "enterprise" && interval === "annual" ? ((monthlyCents - annualMonthlyCents) * 12 / 100) : 0;
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.is_popular
                    ? "border-primary/50 bg-gradient-to-b from-primary/10 to-transparent shadow-glow"
                    : "border-border bg-card"
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </div>
                )}
                <div className="mb-1 font-display text-xl font-semibold">{plan.name}</div>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold">{display}</span>
                  {plan.code !== "enterprise" && (
                    <span className="text-sm text-muted-foreground">/mo</span>
                  )}
                </div>
                {interval === "annual" && plan.code !== "enterprise" && (
                  <>
                    <p className="mt-1 text-xs text-success">Billed ${(plan.price_annual_cents / 100).toFixed(0)} yearly</p>
                    {savings > 0 && (
                      <div className="mt-1 inline-flex w-fit rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                        Save ${savings.toFixed(0)}/year
                      </div>
                    )}
                  </>
                )}
                <Button
                  className="mt-6 w-full"
                  variant={plan.is_popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={checkoutLoading}
                >
                  {plan.code === "enterprise" ? "Contact sales" : user ? "Subscribe" : "Start free trial"}
                </Button>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-[95vw] sm:max-w-2xl text-center text-xs text-muted-foreground">
          All plans include unlimited online bookings, integrated payments, and email support. Card processing fees
          apply on transactions: 2.9% (Starter), 2.7% (Professional), 2.5% (Growth) + $0.30 per transaction.
        </p>
      </section>
    </div>
  );
}
