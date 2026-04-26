import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMsg("No unsubscribe token provided.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data?.error ?? "Invalid or expired link.");
          return;
        }
        if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        if (data?.valid === true) {
          setStatus("valid");
          return;
        }
        setStatus("invalid");
        setErrorMsg("Invalid link.");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onConfirm = async () => {
    setStatus("submitting");
    try {
      const res = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.error ?? "Failed to unsubscribe");
        return;
      }
      if (data?.success === false && data?.reason === "already_unsubscribed") {
        setStatus("already");
        return;
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">ClinicPro</span>
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-elegant">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking your link…</p>
            </div>
          )}

          {status === "valid" && (
            <div className="space-y-5 text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Unsubscribe from emails
              </h1>
              <p className="text-sm text-muted-foreground">
                You&rsquo;ll stop receiving notification emails from ClinicPro at this address.
                You can still receive critical account and security messages.
              </p>
              <Button onClick={onConfirm} className="w-full" size="lg">
                Confirm unsubscribe
              </Button>
              <Link
                to="/"
                className="block text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel and go home
              </Link>
            </div>
          )}

          {status === "submitting" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processing…</p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                You&rsquo;re unsubscribed
              </h1>
              <p className="text-sm text-muted-foreground">
                We won&rsquo;t send marketing or notification emails to this address anymore.
              </p>
            </div>
          )}

          {status === "already" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Already unsubscribed
              </h1>
              <p className="text-sm text-muted-foreground">
                This email address has already been removed from our list.
              </p>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
