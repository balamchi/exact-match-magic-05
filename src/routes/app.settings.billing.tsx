import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Check, ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { activeClinic } = useAuth();
  const { subscription, loading, isActive, isTrialing, isPastDue, trialDaysLeft } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    if (!activeClinic) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { clinicId: activeClinic.clinic_id },
      });
      if (error) throw error;
      if (data?.overviewUrl) window.open(data.overviewUrl, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PaymentTestModeBanner />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Plan, payments, and subscription management.</p>
        </div>
        <Link to="/pricing">
          <Button variant="outline">View all plans</Button>
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading subscription…
        </div>
      )}

      {!loading && !subscription && (
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold">No active subscription</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start your 14-day free trial. No credit card required to start.
              </p>
              <Link to="/pricing">
                <Button className="mt-4">Choose a plan</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && subscription && (
        <>
          {isPastDue && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Payment failed</div>
                <p className="text-sm text-muted-foreground">
                  We couldn't process your last payment. Please update your payment method to keep your subscription active.
                </p>
              </div>
            </div>
          )}

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <header className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold capitalize">
                    {subscription.plan_code} plan
                  </h2>
                  <p className="text-xs text-muted-foreground capitalize">
                    {subscription.billing_interval} billing
                  </p>
                </div>
              </div>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="capitalize"
              >
                {subscription.status.replace("_", " ")}
              </Badge>
            </header>

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {isTrialing && trialDaysLeft !== null && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-success">Free trial</div>
                  <div className="mt-1 font-display text-2xl font-semibold">
                    {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left
                  </div>
                  {subscription.trial_ends_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ends {new Date(subscription.trial_ends_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              {subscription.current_period_end && (
                <div>
                  <dt className="text-muted-foreground">Next renewal</dt>
                  <dd className="mt-1 font-medium">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {subscription.cancel_at_period_end && (
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="mt-1 font-medium text-warning">Cancels at period end</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={openPortal} disabled={portalLoading}>
                <ExternalLink className="me-2 h-4 w-4" />
                {portalLoading ? "Opening…" : "Manage subscription"}
              </Button>
              <Link to="/pricing">
                <Button variant="outline">Change plan</Button>
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">What's included in your plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Visit pricing to compare all tiers and features.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Unlimited online bookings",
                "Integrated payments",
                "Client CRM",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
