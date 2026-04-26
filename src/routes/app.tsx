import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { AppShell } from "@/components/app-shell";
import { Paywall } from "@/components/paywall";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

// Routes always accessible regardless of subscription state
const ALWAYS_ALLOWED = ["/app/settings", "/app/settings/billing"];

function AppLayout() {
  const { user, loading, activeClinic } = useAuth();
  const { subscription, loading: subLoading, isActive } = useSubscription();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/sign-in" />;

  if (!activeClinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl font-semibold">No clinic linked to your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask your clinic owner to invite you, or create your own.
          </p>
        </div>
      </div>
    );
  }

  // Paywall: only block when we have a subscription that's expired/inactive.
  // Brand-new clinics with NO subscription row still see the app + trial banner CTA.
  const allowed = ALWAYS_ALLOWED.some((p) => location.pathname.startsWith(p));
  const shouldBlock = !subLoading && subscription && !isActive && !allowed;

  if (shouldBlock) {
    return (
      <AppShell>
        <Paywall />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
