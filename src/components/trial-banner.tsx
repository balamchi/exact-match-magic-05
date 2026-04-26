import { Link } from "@tanstack/react-router";
import { useSubscription } from "@/hooks/use-subscription";
import { Sparkles, AlertTriangle, Clock } from "lucide-react";

export function TrialBanner() {
  const { subscription, loading, isTrialing, isPastDue, trialDaysLeft } = useSubscription();

  if (loading) return null;

  // No subscription at all → prompt to start trial
  if (!subscription) {
    return (
      <Link
        to="/app/settings/billing"
        className="flex items-center justify-center gap-2 border-b border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-2 text-xs text-foreground transition-colors hover:bg-primary/20"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          <strong>Start your 14-day free trial</strong> · No credit card required ·{" "}
          <span className="underline decoration-primary/40 underline-offset-2">Choose a plan</span>
        </span>
      </Link>
    );
  }

  if (isPastDue) {
    return (
      <Link
        to="/app/settings/billing"
        className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-xs text-foreground transition-colors hover:bg-destructive/25"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <span>
          <strong className="text-destructive">Payment failed.</strong> Update your billing method to keep your subscription active ·{" "}
          <span className="underline underline-offset-2">Manage billing</span>
        </span>
      </Link>
    );
  }

  if (isTrialing && trialDaysLeft !== null && trialDaysLeft <= 7) {
    const urgent = trialDaysLeft <= 3;
    return (
      <Link
        to="/app/settings/billing"
        className={`flex items-center justify-center gap-2 border-b px-4 py-2 text-xs text-foreground transition-colors ${
          urgent
            ? "border-warning/40 bg-warning/15 hover:bg-warning/25"
            : "border-primary/30 bg-primary/10 hover:bg-primary/15"
        }`}
      >
        <Clock className={`h-3.5 w-3.5 ${urgent ? "text-warning" : "text-primary"}`} />
        <span>
          <strong>
            {trialDaysLeft === 0
              ? "Your trial ends today."
              : `${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left in your trial.`}
          </strong>{" "}
          Add a payment method to keep using ClinicPro ·{" "}
          <span className="underline underline-offset-2">Add billing</span>
        </span>
      </Link>
    );
  }

  return null;
}
