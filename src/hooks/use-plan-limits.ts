import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/use-subscription";

export interface PlanLimits {
  plan_code: string | null;
  plan_name: string | null;
  staff_seats_included: number | null;
  locations_included: number | null;
  active_clients_limit: number | null;
  sms_included: number;
  email_included: number;
  whatsapp_included: number;
  ai_calls_included: number;
}

export interface PlanUsage {
  staff_count: number;
  location_count: number;
  active_client_count: number;
}

export interface UsePlanLimitsResult {
  limits: PlanLimits | null;
  usage: PlanUsage | null;
  loading: boolean;
  atSeatLimit: boolean;
  atLocationLimit: boolean;
  atClientLimit: boolean;
  seatsRemaining: number | null;
  locationsRemaining: number | null;
  clientsRemaining: number | null;
  canUseWhatsApp: boolean;
  canUseAI: boolean;
  refresh: () => Promise<void>;
}

export function usePlanLimits(): UsePlanLimitsResult {
  const { activeClinic } = useAuth();
  const { subscription } = useSubscription();

  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeClinic) {
      setLimits(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const planCode = subscription?.plan_code ?? "starter";

    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select(
        "code, name, staff_seats_included, locations_included, active_clients_limit, sms_included, email_included, whatsapp_included, ai_calls_included"
      )
      .eq("code", planCode)
      .maybeSingle();

    if (planRow) {
      setLimits({
        plan_code: planRow.code,
        plan_name: planRow.name,
        staff_seats_included: planRow.staff_seats_included,
        locations_included: planRow.locations_included,
        active_clients_limit: planRow.active_clients_limit,
        sms_included: planRow.sms_included ?? 0,
        email_included: planRow.email_included ?? 0,
        whatsapp_included: planRow.whatsapp_included ?? 0,
        ai_calls_included: planRow.ai_calls_included ?? 0,
      });
    }

    const clinicId = activeClinic.clinic_id;
    const [staffRes, locationRes, clientRes] = await Promise.all([
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("active", true),
      supabase.from("locations").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("active", true),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).is("deleted_at", null),
    ]);

    setUsage({
      staff_count: staffRes.count ?? 0,
      location_count: locationRes.count ?? 0,
      active_client_count: clientRes.count ?? 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id, subscription?.plan_code]);

  useEffect(() => {
    const clinicId = activeClinic?.clinic_id;
    if (!clinicId) return;
    const channel = supabase.channel(`plan-limits-${clinicId}-${Math.random().toString(36).slice(2, 8)}`);
    (["staff", "locations", "clients"] as const).forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `clinic_id=eq.${clinicId}` },
        () => load()
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.clinic_id]);

  const atLimit = (count: number, cap: number | null) => cap !== null && count >= cap;
  const remaining = (count: number, cap: number | null) => (cap === null ? null : Math.max(0, cap - count));

  return {
    limits,
    usage,
    loading,
    atSeatLimit: atLimit(usage?.staff_count ?? 0, limits?.staff_seats_included ?? null),
    atLocationLimit: atLimit(usage?.location_count ?? 0, limits?.locations_included ?? null),
    atClientLimit: atLimit(usage?.active_client_count ?? 0, limits?.active_clients_limit ?? null),
    seatsRemaining: remaining(usage?.staff_count ?? 0, limits?.staff_seats_included ?? null),
    locationsRemaining: remaining(usage?.location_count ?? 0, limits?.locations_included ?? null),
    clientsRemaining: remaining(usage?.active_client_count ?? 0, limits?.active_clients_limit ?? null),
    canUseWhatsApp: (limits?.whatsapp_included ?? 0) > 0,
    canUseAI: (limits?.ai_calls_included ?? 0) > 0,
    refresh: load,
  };
}
