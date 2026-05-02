import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent — check your inbox.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">ClinicPro</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-elevated">
          {sent ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <Link
                to="/auth/sign-in"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Reset password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send a reset link.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-10 w-full rounded-lg bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="mt-5 text-center">
                <Link
                  to="/auth/sign-in"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
