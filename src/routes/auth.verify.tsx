import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/verify")({
  component: Verify,
});

function Verify() {
  const { refreshMemberships } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "expired">("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // Wait a moment for Supabase to process the token from the URL hash
      await new Promise((r) => setTimeout(r, 1000));

      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        setStatus("expired");
        return;
      }

      if (data.user.email_confirmed_at) {
        setStatus("success");
        await refreshMemberships();
        setTimeout(() => {
          if (!cancelled) {
            window.location.href = "/app/dashboard";
          }
        }, 1500);
      } else {
        setStatus("expired");
        setResendEmail(data.user.email || "");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [navigate, refreshMemberships]);

  const handleResend = async () => {
    if (!resendEmail || resendBusy) return;
    setResendBusy(true);
    await supabase.auth.resend({
      type: "signup",
      email: resendEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
    });
    setResendBusy(false);
    setResendDone(true);
  };

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
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-4 font-display text-xl font-semibold">Verifying your email…</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
              <h1 className="mt-4 font-display text-xl font-semibold">Welcome to ClinicPro!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Setting up your dashboard…
              </p>
              <a
                href="/app/dashboard"
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Continue to Dashboard
              </a>
            </>
          )}

          {status === "expired" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 font-display text-xl font-semibold">Verification link expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This link may have expired or already been used.
              </p>

              <div className="mt-6 space-y-3">
                {resendEmail && !resendDone && (
                  <button
                    onClick={handleResend}
                    disabled={resendBusy}
                    className="h-10 w-full rounded-lg bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
                  >
                    {resendBusy ? "Sending…" : "Resend confirmation email"}
                  </button>
                )}
                {resendDone && (
                  <p className="text-sm text-green-500">New email sent! Check your inbox.</p>
                )}
                <Link
                  to="/auth/sign-up"
                  className="block text-xs text-muted-foreground hover:text-primary"
                >
                  Sign up with a different email
                </Link>
                <Link
                  to="/auth/sign-in"
                  className="block text-xs text-muted-foreground hover:text-primary"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
