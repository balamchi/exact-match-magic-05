// Starts a 14-day free trial for a clinic without requiring payment method.
// Creates a local subscriptions row with status='trialing' and no paddle IDs.
// When the user later checks out, the webhook upserts on paddle_subscription_id
// and replaces the placeholder via clinic_id+environment match in handler.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { clinicId, planCode, environment } = await req.json();
    if (!clinicId || !planCode || !environment) {
      return new Response(JSON.stringify({ error: "Missing clinicId, planCode, or environment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a member of the clinic
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: member } = await admin
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member || !["owner", "admin"].includes(member.role)) {
      return new Response(JSON.stringify({ error: "Only owners or admins can start a trial" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a subscription already exists for this clinic+env
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id, status, trial_ends_at, paddle_subscription_id")
      .eq("clinic_id", clinicId)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && (existing.paddle_subscription_id?.startsWith("trial_") === false || existing.status === "active")) {
      return new Response(JSON.stringify({ error: "Subscription already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate plan exists
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("code")
      .eq("code", planCode)
      .maybeSingle();
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const placeholderId = `trial_${clinicId}_${environment}`;

    const { error: upsertError } = await admin.from("subscriptions").upsert(
      {
        clinic_id: clinicId,
        plan_code: planCode,
        paddle_subscription_id: placeholderId,
        paddle_customer_id: `trial_customer_${clinicId}`,
        product_id: `clinicpro_${planCode}`,
        price_id: `${planCode}_monthly`,
        status: "trialing",
        billing_interval: "monthly",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        environment,
        updated_at: now.toISOString(),
      },
      { onConflict: "paddle_subscription_id" }
    );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        trial_ends_at: trialEnd.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("start-trial error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
