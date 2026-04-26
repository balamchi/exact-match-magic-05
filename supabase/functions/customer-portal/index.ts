import { createClient } from "npm:@supabase/supabase-js@2";
import { getPaddleClient, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase: any = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { clinicId } = await req.json();
    if (!clinicId) throw new Error("clinicId is required");

    // Verify user is a member of this clinic
    const { data: member } = await supabase
      .from("clinic_members")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member) throw new Error("Access denied");

    // Use service role to read subscription (RLS-safe lookup)
    const adminClient: any = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) throw new Error("No subscription found");

    const env = (sub.environment as PaddleEnv) || "sandbox";
    const paddle = getPaddleClient(env);
    const portal = await paddle.customerPortalSessions.create(sub.paddle_customer_id as string, [
      sub.paddle_subscription_id as string,
    ]);

    return new Response(
      JSON.stringify({
        overviewUrl: portal.urls.general.overview,
        subscriptionUrls: portal.urls.subscriptions,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("customer-portal error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
