import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Check, ExternalLink, AlertTriangle, Sparkles, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings/billing")({
  component: BillingPage,
});

interface PlanRow {
  code: string;
  name: string;
  tagline: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  monthly_price_id: string | null;
  annual_price_id: string | null;
  is_popular: boolean;
  display_order: number;
}

function BillingPage() {
  const { activeClinic, user } = useAuth();
  const { subscription, loading, isActive, isTrialing, isPastDue, trialDaysLeft, refresh } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("code, name, tagline, price_monthly_cents, price_annual_cents, monthly_price_id, annual_price_id, is_popular, display_order")
      .eq("is_public", true)
      .neq("code", "enterprise")
      .order("display_order")
      .then(({ data }) => setPlans((data ?? []) as PlanRow[]));
  }, []);

  const changePlan = async (targetPlan: PlanRow, mode: "upgrade" | "downgrade") => {
    if (!activeClinic || !subscription) return;
    const interval = subscription.billing_interval === "annual" ? "annual" : "monthly";
    const newPriceId = interval === "annual" ? targetPlan.annual_price_id : targetPlan.monthly_price_id;
    if (!newPriceId) {
      toast.error("This plan is not available for your current billing interval");
      return;
    }
    const verb = mode === "upgrade" ? "Upgrade" : "Downgrade";
    const detail =
      mode === "upgrade"
        ? "You'll be charged a prorated amount today."
        : "Your plan will switch at the end of the current period.";
    if (!confirm(`${verb} to ${targetPlan.name}?\n\n${detail}`)) return;

    setChangingPlan(targetPlan.code);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: {
          clinicId: activeClinic.clinic_id,
          newPriceId,
          mode,
          environment: getPaddleEnvironment(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(
        mode === "upgrade"
          ? `Upgraded to ${targetPlan.name} — prorated charge applied.`
          : `Downgrade to ${targetPlan.name} scheduled at end of period.`
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change plan");
    } finally {
      setChangingPlan(null);
    }
  };

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

  const startTrial = async (planCode: string) => {
    if (!activeClinic) return;
    setTrialLoading(planCode);
    try {
      const { error } = await supabase.functions.invoke("start-trial", {
        body: {
          clinicId: activeClinic.clinic_id,
          planCode,
          environment: getPaddleEnvironment(),
        },
      });
      if (error) throw error;
      toast.success(`Your 14-day free trial of ${planCode} has started!`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start trial");
    } finally {
      setTrialLoading(null);
    }
  };

  const upgradeNow = (priceId: string) => {
    if (!user || !activeClinic) return;
    openCheckout({
      priceId,
      customerEmail: user.email,
      clinicId: activeClinic.clinic_id,
    });
  };

  const isTrialPlaceholder = subscription?.paddle_subscription_id?.startsWith("trial_");

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

      {/* No subscription at all → trial picker */}
      {!loading && !subscription && (
        <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold">Start your 14-day free trial</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a plan below to unlock the full ClinicPro suite. No credit card required to start.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.code}
                onClick={() => startTrial(plan.code)}
                disabled={trialLoading !== null}
                className={`group relative flex flex-col rounded-xl border p-5 text-start transition ${
                  plan.is_popular
                    ? "border-primary/50 bg-gradient-to-b from-primary/15 to-transparent hover:border-primary"
                    : "border-border bg-card hover:border-primary/40"
                } disabled:cursor-wait disabled:opacity-60`}
              >
                {plan.is_popular && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-gradient-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="font-display text-base font-semibold">{plan.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">
                    ${(plan.price_monthly_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">/mo after trial</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  {trialLoading === plan.code ? "Starting…" : "Start free trial"}
                  <Zap className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Has a subscription (real or trial placeholder) */}
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

          {subscription.scheduled_change_action && subscription.scheduled_change_effective_at && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                <div>
                  <div className="font-semibold capitalize text-warning">
                    {subscription.scheduled_change_action === "cancel"
                      ? "Cancellation scheduled"
                      : `${subscription.scheduled_change_action} scheduled`}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Takes effect on {new Date(subscription.scheduled_change_effective_at).toLocaleDateString()}.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!activeClinic) return;
                  if (!confirm("Cancel this scheduled change? Your subscription will continue as-is.")) return;
                  try {
                    const { data, error } = await supabase.functions.invoke("cancel-scheduled-change", {
                      body: { clinicId: activeClinic.clinic_id, environment: getPaddleEnvironment() },
                    });
                    if (error) throw error;
                    if ((data as any)?.error) throw new Error((data as any).error);
                    toast.success("Scheduled change canceled");
                    await refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to cancel scheduled change");
                  }
                }}
              >
                Keep current plan
              </Button>
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
                  <p className="text-xs capitalize text-muted-foreground">
                    {isTrialPlaceholder ? "Free trial · no card on file" : `${subscription.billing_interval} billing`}
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
              {!isTrialPlaceholder && subscription.current_period_end && (
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

            {/* Trial placeholder → "Add payment method" instead of "Manage subscription" */}
            <div className="mt-6 flex flex-wrap gap-3">
              {isTrialPlaceholder ? (
                <>
                  {plans
                    .filter((p) => p.code === subscription.plan_code)
                    .map((p) =>
                      p.monthly_price_id ? (
                        <Button
                          key={p.code}
                          onClick={() => upgradeNow(p.monthly_price_id!)}
                          disabled={checkoutLoading}
                        >
                          <CreditCard className="me-2 h-4 w-4" />
                          {checkoutLoading ? "Opening…" : "Add payment method"}
                        </Button>
                      ) : null
                    )}
                  <Link to="/pricing">
                    <Button variant="outline">Change plan</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button onClick={openPortal} disabled={portalLoading}>
                    <ExternalLink className="me-2 h-4 w-4" />
                    {portalLoading ? "Opening…" : "Manage subscription"}
                  </Button>
                  <Link to="/pricing">
                    <Button variant="outline">Change plan</Button>
                  </Link>
                </>
              )}
            </div>
          </section>

          {!isTrialPlaceholder && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Change plan</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upgrades take effect immediately with prorated billing. Downgrades apply at the end of your current period.
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{subscription.billing_interval}</Badge>
              </header>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {plans.map((p) => {
                  const currentRank = plans.find((x) => x.code === subscription.plan_code)?.display_order ?? 0;
                  const isCurrent = p.code === subscription.plan_code;
                  const mode: "upgrade" | "downgrade" = p.display_order > currentRank ? "upgrade" : "downgrade";
                  const interval = subscription.billing_interval === "annual" ? "annual" : "monthly";
                  const cents = interval === "annual" ? p.price_annual_cents : p.price_monthly_cents;
                  const perLabel = interval === "annual" ? "/yr" : "/mo";
                  return (
                    <div
                      key={p.code}
                      className={`flex flex-col rounded-xl border p-4 ${
                        isCurrent
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-display text-sm font-semibold">{p.name}</div>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px]">Current</Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.tagline}</p>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold">${(cents / 100).toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground">{perLabel}</span>
                      </div>
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant={mode === "upgrade" ? "default" : "outline"}
                          className="mt-4 w-full"
                          disabled={changingPlan !== null}
                          onClick={() => changePlan(p, mode)}
                        >
                          {mode === "upgrade" ? (
                            <ArrowUpRight className="me-1.5 h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="me-1.5 h-3.5 w-3.5" />
                          )}
                          {changingPlan === p.code
                            ? "Working…"
                            : mode === "upgrade"
                              ? "Upgrade"
                              : "Downgrade"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
