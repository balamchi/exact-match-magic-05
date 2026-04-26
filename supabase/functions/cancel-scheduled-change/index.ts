import { createClient } from "npm:@supabase/supabase-js@2";
import { getPaddleClient, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { clinicId, environment } = await req.json();
    if (!clinicId) throw new Error("clinicId required");
    const env: PaddleEnv = environment === "live" ? "live" : "sandbox";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: member } = await admin
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Forbidden: only owners/admins can manage billing");
    }

    const { data: sub } = await admin
      .from("subscriptions")
      .select("paddle_subscription_id")
      .eq("clinic_id", clinicId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.paddle_subscription_id || sub.paddle_subscription_id.startsWith("trial_")) {
      throw new Error("No active subscription found");
    }

    const paddle = getPaddleClient(env);
    // Setting scheduledChange to null clears any pending change.
    await paddle.subscriptions.update(sub.paddle_subscription_id, {
      scheduledChange: null,
    } as any);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cancel-scheduled-change error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
