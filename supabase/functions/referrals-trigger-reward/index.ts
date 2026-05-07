import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is a clinic admin
    const userToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { referral_id } = body;
    if (!referral_id) {
      return new Response(JSON.stringify({ error: "referral_id required" }), { status: 400, headers: CORS });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Fetch referral
    const { data: referral, error: refErr } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", referral_id)
      .single();

    if (refErr || !referral) {
      return new Response(JSON.stringify({ error: "Referral not found" }), { status: 404, headers: CORS });
    }

    // Verify user has access to this clinic
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", referral.clinic_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
    }

    // Fetch referral settings
    const { data: refSettings } = await supabase
      .from("referral_settings")
      .select("*")
      .eq("clinic_id", referral.clinic_id)
      .maybeSingle();

    if (!refSettings) {
      return new Response(JSON.stringify({ error: "Referral settings not configured" }), { status: 400, headers: CORS });
    }

    // Calculate reward
    let rewardAmountCents = 0;
    let notes = "";
    switch (refSettings.reward_type) {
      case "credit":
        rewardAmountCents = refSettings.reward_value * 100;
        notes = `$${refSettings.reward_value} credit reward (manual)`;
        break;
      case "percentage":
        notes = `${refSettings.reward_value}% discount reward (manual)`;
        break;
      case "free_service":
        if (refSettings.reward_service_id) {
          const { data: svc } = await supabase.from("services").select("price_cents, name").eq("id", refSettings.reward_service_id).maybeSingle();
          if (svc) { rewardAmountCents = svc.price_cents; notes = `Free service: ${svc.name} (manual)`; }
        }
        break;
      default:
        notes = refSettings.reward_description ?? "Custom reward (manual)";
    }

    // Update referral status
    await supabase.from("referrals").update({
      status: "first_appointment_completed",
      reward_unlocked_at: new Date().toISOString(),
    }).eq("id", referral.id);

    // Insert reward for referrer
    if (referral.referrer_client_id) {
      await supabase.from("referral_rewards").insert({
        clinic_id: referral.clinic_id,
        referral_id: referral.id,
        recipient_client_id: referral.referrer_client_id,
        reward_type: refSettings.reward_type,
        amount_cents: rewardAmountCents,
        status: "available",
        notes,
      });
    }

    // Update referral code usage
    if (referral.referrer_code_id) {
      const { data: codeData } = await supabase.from("referral_codes").select("times_used, total_rewards_earned_cents").eq("id", referral.referrer_code_id).maybeSingle();
      if (codeData) {
        await supabase.from("referral_codes").update({
          times_used: (codeData.times_used ?? 0) + 1,
          total_rewards_earned_cents: (codeData.total_rewards_earned_cents ?? 0) + rewardAmountCents,
        }).eq("id", referral.referrer_code_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, rewardAmountCents, notes }), { headers: CORS });
  } catch (err) {
    console.error("referrals-trigger-reward error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
