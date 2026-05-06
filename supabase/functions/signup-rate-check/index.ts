import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ allowed: false, reason: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP from headers (set by edge runtime)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "0.0.0.0";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Check IP rate
    const { count: ipCount } = await supabaseAdmin
      .from("signup_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("attempted_at", oneHourAgo);

    if ((ipCount ?? 0) >= 5) {
      const retryAfter = 3600; // 1 hour
      return new Response(
        JSON.stringify({ allowed: false, reason: "Too many signup attempts. Please try again later.", retryAfter }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check email rate
    const { count: emailCount } = await supabaseAdmin
      .from("signup_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("attempted_at", oneHourAgo);

    if ((emailCount ?? 0) >= 3) {
      const retryAfter = 3600;
      return new Response(
        JSON.stringify({ allowed: false, reason: "Too many signup attempts for this email. Please try again later.", retryAfter }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the attempt
    await supabaseAdmin.from("signup_attempts").insert({
      ip_address: ip,
      email: email.toLowerCase(),
    });

    return new Response(JSON.stringify({ allowed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("signup-rate-check error:", err);
    // Fail open — don't block signup if rate check itself fails
    return new Response(JSON.stringify({ allowed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
