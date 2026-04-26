import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getPaddleEnvironment } from "@/lib/paddle";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled";

export interface SubscriptionRow {
  id: string;
  clinic_id: string;
  plan_code: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  product_id: string;
  price_id: string;
  status: SubscriptionStatus;
  billing_interval: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  environment: string;
  created_at: string;
  scheduled_change_action: string | null;
  scheduled_change_effective_at: string | null;
  scheduled_change_meta: any | null;
}

export interface UseSubscriptionResult {
  subscription: SubscriptionRow | null;
  loading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  trialDaysLeft: number | null;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { activeClinic } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeClinic) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const env = getPaddleEnvironment();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load subscription", error);
      setSubscription(null);
    } else {
      setSubscription(data as SubscriptionRow | null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  // Realtime — refetch on any subscription change for this clinic
  useEffect(() => {
    const clinicId = activeClinic?.clinic_id;
    if (!clinicId) return;
    const channel = supabase.channel(
      `subs-${clinicId}-${Math.random().toString(36).slice(2, 8)}`
    );
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeClinic?.clinic_id]);

  const now = Date.now();
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).getTime() : null;

  const isTrialing =
    subscription?.status === "trialing" && (trialEnd === null || trialEnd > now);
  const isActive =
    !!subscription &&
    ((["active", "trialing", "past_due"].includes(subscription.status) &&
      (periodEnd === null || periodEnd > now)) ||
      (subscription.status === "canceled" && periodEnd !== null && periodEnd > now));
  const isPastDue = subscription?.status === "past_due";
  const isCanceled = subscription?.status === "canceled";
  const trialDaysLeft =
    isTrialing && trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : null;

  return {
    subscription,
    loading,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    trialDaysLeft,
    refresh: load,
  };
}
