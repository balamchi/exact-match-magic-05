import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Mail, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth/check-email")({
  validateSearch: (search) => searchSchema.parse(search),
  component: CheckEmail,
});

function CheckEmail() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0 || resendCount >= 5) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
    });
    setBusy(false);
    if (error) {
      // silently fail — don't reveal if email exists
    }
    setCooldown(60);
    setResendCount((c) => c + 1);
  }, [email, cooldown, resendCount]);

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-muted-foreground">No email provided.</p>
          <Link to="/auth/sign-up" className="mt-2 inline-block text-primary hover:underline">
            Go to sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm text-center">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">ClinicPro</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-elevated">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link to activate your ClinicPro account.
          </p>

          <p className="mt-4 text-xs text-muted-foreground">
            Don't see it? Check your spam folder.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleResend}
              disabled={busy || cooldown > 0 || resendCount >= 5}
              className="h-10 w-full rounded-lg border border-border bg-surface text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {busy
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : resendCount >= 5
                    ? "Max resends reached"
                    : "Resend email"}
            </button>

            <Link
              to="/auth/sign-up"
              className="block text-xs text-muted-foreground hover:text-primary"
            >
              Wrong email? Sign up again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
