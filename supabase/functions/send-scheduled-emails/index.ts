// Scheduled email sender. Triggered by pg_cron every 5 minutes.
// Reads from scheduled_emails table where send_at <= now() AND sent_at IS NULL AND failed_at IS NULL.
// Calls POST /lovable/email/transactional/send for each row using service role bearer.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

function appBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || "https://www.clinicpro.io";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: pending, error: readError } = await supabase
    .from("scheduled_emails")
    .select("id, template_name, recipient_email, template_data, attempts")
    .is("sent_at", null)
    .is("failed_at", null)
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (readError) {
    console.error("Failed to read pending scheduled_emails", readError);
    return new Response(JSON.stringify({ error: "Read failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!pending?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sendRouteUrl = `${appBaseUrl()}/lovable/email/transactional/send`;
  let succeeded = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const res = await fetch(sendRouteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          templateName: row.template_name,
          recipientEmail: row.recipient_email,
          templateData: row.template_data,
          idempotencyKey: `scheduled_${row.id}`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown");
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      await supabase
        .from("scheduled_emails")
        .update({ sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq("id", row.id);
      succeeded++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("Scheduled email send failed", { id: row.id, error: errMsg });

      const newAttempts = row.attempts + 1;
      const updatePatch: Record<string, unknown> = {
        attempts: newAttempts,
        error_message: errMsg.slice(0, 1000),
      };
      if (newAttempts >= MAX_ATTEMPTS) {
        updatePatch.failed_at = new Date().toISOString();
      }

      await supabase.from("scheduled_emails").update(updatePatch).eq("id", row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: pending.length, succeeded, failed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
