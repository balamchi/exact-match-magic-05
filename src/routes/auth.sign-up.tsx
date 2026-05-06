import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { isValidEmail, checkPassword, isPasswordValid, passwordStrength } from "@/lib/email-validation";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { user, loading, refreshMemberships } = useAuth();
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");

  const pwCheck = checkPassword(password);
  const pwValid = isPasswordValid(password);
  const strength = password ? passwordStrength(password) : null;

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app/dashboard" });
  }, [user, loading, navigate]);

  // Validate email on blur
  const handleEmailBlur = () => {
    if (!email) return;
    const result = isValidEmail(email);
    setEmailError(result.valid ? "" : (result.reason || "Invalid email"));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side email validation
    const emailResult = isValidEmail(email);
    if (!emailResult.valid) {
      setEmailError(emailResult.reason || "Invalid email");
      return;
    }

    if (!pwValid) {
      toast.error("Password doesn't meet the requirements.");
      return;
    }

    setBusy(true);

    // Rate limit check
    try {
      const rateRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup-rate-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ email }),
        }
      );
      const rateData = await rateRes.json();
      if (!rateData.allowed) {
        setBusy(false);
        const mins = rateData.retryAfter ? Math.ceil(rateData.retryAfter / 60) : 60;
        toast.error(rateData.reason || `Too many signup attempts. Please try again in ${mins} minutes.`);
        return;
      }
    } catch {
      // Fail open if rate check is down
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify`,
        data: { clinic_name: clinicName.trim() || "My Clinic" },
      },
    });

    if (error) {
      setBusy(false);
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
        toast.error("An account with this email already exists. Sign in instead?");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setBusy(false);
    navigate({ to: "/auth/check-email", search: { email } });
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    await refreshMemberships();
    toast.success("Welcome to ClinicPro");
    navigate({ to: "/app/dashboard" });
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Create your clinic</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your free trial. No credit card required.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Clinic name</label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Divan Aesthetics"
                className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                onBlur={handleEmailBlur}
                placeholder="you@clinic.com"
                className={`h-10 w-full rounded-lg border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 bg-surface ${emailError ? "border-destructive focus:border-destructive" : "border-input focus:border-ring"}`}
              />
              {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <PasswordRule met={pwCheck.minLength} label="At least 8 characters" />
                  <PasswordRule met={pwCheck.hasNumber} label="Contains a number" />
                  <PasswordRule met={pwCheck.hasSpecial} label="Contains a special character" />
                  {strength && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1">
                        <div className={`h-full flex-1 rounded-full ${strength === "Weak" ? "bg-destructive" : strength === "Medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                        <div className={`h-full flex-1 rounded-full ${strength === "Medium" ? "bg-yellow-500" : strength === "Strong" ? "bg-green-500" : "bg-muted"}`} />
                        <div className={`h-full flex-1 rounded-full ${strength === "Strong" ? "bg-green-500" : "bg-muted"}`} />
                      </div>
                      <span className={`text-xs font-medium ${strength === "Weak" ? "text-destructive" : strength === "Medium" ? "text-yellow-500" : "text-green-500"}`}>
                        {strength}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || !pwValid}
              className="h-10 w-full rounded-lg bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Creating clinic…" : "Create clinic"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={met ? "text-green-500" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
