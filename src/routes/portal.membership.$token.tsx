import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldCheck,
  CalendarClock,
  Receipt,
  Ban,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  getPortalSubscription,
  cancelViaPortal,
} from "@/lib/square/portal.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/membership/$token")({
  component: MemberPortal,
  head: () => ({
    meta: [
      { title: "Manage your membership" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Sub = {
  id: string;
  status: string;
  started_at: string | null;
  next_billing_at: string | null;
  canceled_at: string | null;
  last_charge_at: string | null;
  last_charge_status: string | null;
  failed_charge_count: number | null;
  clients: { first_name: string; last_name: string | null; email: string | null } | null;
  memberships: {
    name: string;
    monthly_price_cents: number;
    benefits: string | null;
    billing_cadence: string | null;
  } | null;
  clinics: { name: string } | null;
};

type Charge = {
  id: string;
  amount_cents: number;
  currency: string | null;
  status: string;
  charged_at: string | null;
  failure_reason: string | null;
};

const fmtMoney = (cents: number, currency: string | null = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(
    (cents ?? 0) / 100,
  );

function MemberPortal() {
  const { token } = useParams({ from: "/portal/membership/$token" });
  const fetchFn = useServerFn(getPortalSubscription);
  const cancelFn = useServerFn(cancelViaPortal);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn({ data: { token } });
      setSub(res.subscription as unknown as Sub);
      setCharges(res.charges as unknown as Charge[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load membership");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitCancel = async () => {
    setBusy(true);
    try {
      await cancelFn({ data: { token, reason } });
      toast.success("Your membership has been canceled.");
      setDone(true);
      setShowCancel(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Member portal
            </p>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Manage your membership
            </h1>
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your membership…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-200">
            {error}
          </div>
        )}

        {sub && !error && (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
              <div className="border-b border-border/60 px-6 py-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {sub.clinics?.name ?? "Your clinic"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {sub.memberships?.name ?? "Membership"}
                </h2>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-3xl font-bold">
                    {fmtMoney(sub.memberships?.monthly_price_cents ?? 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{sub.memberships?.billing_cadence?.toLowerCase().replace("ly", "") ?? "month"}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.memberships?.benefits && (
                  <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
                    {sub.memberships.benefits}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <InfoCell
                  icon={CalendarClock}
                  label="Next billing"
                  value={
                    sub.canceled_at
                      ? "—"
                      : sub.next_billing_at
                        ? new Date(sub.next_billing_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Pending"
                  }
                />
                <InfoCell
                  icon={ShieldCheck}
                  label="Member since"
                  value={
                    sub.started_at
                      ? new Date(sub.started_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"
                  }
                />
              </dl>
            </section>

            {charges.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Recent charges</p>
                </header>
                <ul className="divide-y divide-border/60">
                  {charges.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium tabular-nums">
                          {fmtMoney(c.amount_cents, c.currency)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.charged_at
                            ? new Date(c.charged_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                          {c.failure_reason ? ` · ${c.failure_reason}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase",
                          c.status === "paid"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : c.status === "failed"
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                              : "border-border/60 bg-muted/30 text-muted-foreground",
                        )}
                      >
                        {c.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
              {sub.status === "canceled" || done ? (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  Your membership has been canceled. You won't be billed again. Reach out
                  to {sub.clinics?.name ?? "the clinic"} if you'd like to come back.
                </div>
              ) : !showCancel ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Need to cancel?</p>
                    <p className="text-xs text-muted-foreground">
                      You can cancel anytime — billing stops at the end of the current
                      cycle.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancel(true)}
                    className="text-rose-300 hover:bg-rose-500/10"
                  >
                    <Ban className="mr-1.5 h-4 w-4" />
                    Cancel membership
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">We're sorry to see you go.</p>
                  <Textarea
                    placeholder="Optional: tell us why you're canceling so we can improve."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowCancel(false)} disabled={busy}>
                      Keep membership
                    </Button>
                    <Button
                      onClick={submitCancel}
                      disabled={busy}
                      className="bg-rose-500 hover:bg-rose-600 text-white"
                    >
                      {busy ? "Canceling…" : "Confirm cancel"}
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <p className="pt-2 text-center text-[11px] text-muted-foreground">
              Signed in as {sub.clients?.email ?? "—"} · This link is private to you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    paused: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    past_due: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    canceled: "border-border/60 bg-muted/30 text-muted-foreground",
    pending: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  };
  return (
    <Badge variant="outline" className={cn("ml-auto text-[10px] uppercase", map[status] ?? map.pending)}>
      {status}
    </Badge>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
