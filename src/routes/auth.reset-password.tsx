import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery") && !hash.includes("access_token")) {
      setValid(false);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Password updated!");
    setTimeout(() => navigate({ to: "/app/dashboard" }), 2000);
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
          {done ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-400" />
              <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard…</p>
            </div>
          ) : !valid ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Invalid reset link</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This link may have expired. Request a new one.
              </p>
              <Link
                to="/auth/forgot-password"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Request new link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Set new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-10 w-full rounded-lg bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
