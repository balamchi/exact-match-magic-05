import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { to, body, channel = "sms" } = await req.json();
    if (!to || !body) throw new Error("Missing 'to' or 'body'");

    const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");
    const TWILIO_WHATSAPP = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!TWILIO_SID || !TWILIO_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Twilio is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromNumber = channel === "whatsapp"
      ? `whatsapp:${TWILIO_WHATSAPP || TWILIO_FROM}`
      : TWILIO_FROM;

    const toNumber = channel === "whatsapp" ? `whatsapp:${to}` : to;

    if (!fromNumber) throw new Error("No Twilio sender number configured");

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const params = new URLSearchParams({ To: toNumber!, From: fromNumber!, Body: body });

    const resp = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Twilio error:", result);
      throw new Error(result.message || "Failed to send message");
    }

    return new Response(
      JSON.stringify({ sid: result.sid, status: result.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-sms error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
