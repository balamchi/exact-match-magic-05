import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallProps {
  title?: string;
  message?: string;
}

/**
 * Full-screen paywall shown when a clinic has no active subscription
 * AND no active trial. Blocks the entire app shell.
 */
export function Paywall({
  title = "Your free trial has ended",
  message = "Choose a plan to continue using ClinicPro. All your data is safe and waiting for you.",
}: PaywallProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-8 shadow-card">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Lock className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/pricing" className="flex-1">
            <Button className="w-full">
              <Sparkles className="me-2 h-4 w-4" />
              View plans
            </Button>
          </Link>
          <Link to="/app/settings/billing" className="flex-1">
            <Button variant="outline" className="w-full">
              Manage billing
              <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@clinicpro.io"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
