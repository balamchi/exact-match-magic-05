import { createClient } from "npm:@supabase/supabase-js@2";
import { getPaddleClient, gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Resolve human-readable external_id (e.g. "professional_monthly") -> Paddle internal price id
async function resolvePriceId(env: PaddleEnv, externalId: string): Promise<string> {
  const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(externalId)}`);
  const json = await res.json();
  if (!json.data?.length) throw new Error(`Price not found: ${externalId}`);
  return json.data[0].id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const { clinicId, newPriceId, mode, environment } = await req.json();
    if (!clinicId || !newPriceId || !mode) throw new Error("Missing clinicId, newPriceId or mode");
    if (mode !== "upgrade" && mode !== "downgrade") throw new Error("mode must be upgrade|downgrade");
    const env: PaddleEnv = environment === "live" ? "live" : "sandbox";

    const supabase = getSupabase();

    // Verify caller is owner/admin of this clinic
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Forbidden: only owners/admins can change plans");
    }

    // Find the active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) throw new Error("No subscription found");
    if (sub.paddle_subscription_id?.startsWith("trial_")) {
      throw new Error("Add a payment method first to change plans");
    }

    // Resolve target price → Paddle internal id
    const paddlePriceId = await resolvePriceId(env, newPriceId);

    const paddle = getPaddleClient(env);

    // Upgrade = immediate prorated charge. Downgrade = scheduled at end of period.
    const updated = await paddle.subscriptions.update(sub.paddle_subscription_id, {
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      prorationBillingMode: mode === "upgrade" ? "prorated_immediately" : "do_not_bill",
      ...(mode === "downgrade" ? { onPaymentFailure: "prevent_change" } : {}),
    } as any);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        nextBilledAt: (updated as any)?.nextBilledAt ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("change-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
