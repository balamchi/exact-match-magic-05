import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Check, ExternalLink, AlertTriangle, Sparkles, Zap, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
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

type PaymentTransaction = {
  id: string;
  paddle_transaction_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  origin: string | null;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  plan_code: string | null;
  error_reason: string | null;
  billed_at: string | null;
  created_at: string;
  environment: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency?.toUpperCase() || "CAD",
  }).format((cents ?? 0) / 100);
}

function shortTxId(id: string) {
  if (!id) return "—";
  return `…${id.slice(-8)}`;
}

function txStatusBadge(status: string): { label: string; className: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "paid" || s === "completed") return { label: "Paid", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (s === "failed" || s === "error") return { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (s === "refunded") return { label: "Refunded", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (s === "pending") return { label: "Pending", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  return { label: status || "Unknown", className: "bg-muted text-muted-foreground border-border" };
}

function BillingPage() {
  const { activeClinic, user } = useAuth();
  const { subscription, loading, isActive, isTrialing, isPastDue, trialDaysLeft, refresh } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const clinicId = activeClinic?.clinic_id;
  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    (async () => {
      setTxLoading(true);
      const env = subscription?.environment ?? "live";
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (error) {
        console.error("Failed to load payment transactions", error);
        setTransactions([]);
      } else {
        setTransactions((data ?? []) as PaymentTransaction[]);
      }
      setTxLoading(false);
    })();
    return () => { active = false; };
  }, [clinicId, subscription?.environment]);

  // Post-checkout success — toast + poll until webhook upserts the real subscription
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    toast.success("Payment received — activating your subscription…");
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      while (!cancelled && tries < 10) {
        await refresh();
        tries += 1;
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    poll();
    // strip the query param so a refresh doesn't re-toast
    window.history.replaceState({}, "", window.location.pathname);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Plan, payments, and subscription management.</p>
        </div>
        <Link to="/pricing">
          <Button variant="outline">View all plans</Button>
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 text-center text-muted-foreground">
          Loading subscription…
        </div>
      )}

      {/* No subscription at all → trial picker */}
      {!loading && !subscription && (
        <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 sm:p-6 sm:p-8">
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
                  <span className="font-display text-2xl sm:text-3xl font-bold">
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
            <div className="flex flex-col gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div className="space-y-1">
                  <div className="font-semibold text-destructive">Payment failed — action required</div>
                  <p className="text-sm text-muted-foreground">
                    We couldn't process your last payment for the{" "}
                    <span className="font-medium text-foreground">
                      {subscription.plan_code
                        ? subscription.plan_code.charAt(0).toUpperCase() + subscription.plan_code.slice(1)
                        : "current"}
                    </span>{" "}
                    plan. Paddle will retry the charge automatically, but to avoid
                    interruption please update your payment method now.
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-muted-foreground/80">
                      Subscription will be canceled if not resolved by{" "}
                      <span className="font-medium text-foreground">
                        {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      .
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={openPortal}
                disabled={portalLoading}
                variant="destructive"
                className="flex-shrink-0 self-stretch sm:self-start"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {portalLoading ? "Opening…" : "Update payment method"}
              </Button>
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

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
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

          {/* Payment History — read-only audit log */}
          {hasPermission(activeClinic?.role, "clinic.billing.read") && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold tracking-tight">Payment history</h2>
                </div>
                <span className="text-xs text-muted-foreground">Last 50 transactions</span>
              </div>

              {txLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
                  <Receipt className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">No payments yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your Paddle transactions will appear here once your first charge processes.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Plan</th>
                        <th className="px-3 py-2 font-medium">Invoice</th>
                        <th className="px-3 py-2 font-medium">Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const badge = txStatusBadge(tx.status);
                        const date = tx.billed_at ?? tx.created_at;
                        return (
                          <tr key={tx.id} className="border-t border-border/40 hover:bg-muted/20">
                            <td className="px-3 py-2.5 text-sm">
                              {new Date(date).toLocaleDateString("en-CA", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="px-3 py-2.5 font-medium">
                              {formatMoney(tx.amount_cents, tx.currency)}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className={cn("text-xs", badge.className)}>
                                {badge.label}
                              </Badge>
                              {tx.error_reason && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {tx.error_reason}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">
                              {tx.plan_code ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              {tx.invoice_pdf_url ? (
                                <a
                                  href={tx.invoice_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {tx.invoice_number ?? "Download"}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">
                                  {tx.invoice_number ?? "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground" title={tx.paddle_transaction_id}>
                              {shortTxId(tx.paddle_transaction_id)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
