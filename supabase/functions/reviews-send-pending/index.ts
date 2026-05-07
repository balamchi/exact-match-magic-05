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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Find pending review requests that are due
    const { data: pendingRequests, error: fetchErr } = await supabase
      .from("review_requests")
      .select("id, clinic_id, client_id, public_token, scheduled_send_at")
      .eq("status", "pending")
      .lte("scheduled_send_at", new Date().toISOString())
      .limit(50);

    if (fetchErr) {
      console.error("Fetch pending requests failed:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: CORS });
    }

    let sentCount = 0;

    for (const req of pendingRequests ?? []) {
      try {
        // Fetch client info
        const { data: client } = await supabase
          .from("clients")
          .select("first_name, email")
          .eq("id", req.client_id)
          .single();

        if (!client?.email) {
          // No email — mark as failed
          await supabase.from("review_requests").update({ status: "failed" }).eq("id", req.id);
          continue;
        }

        // Fetch clinic name
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", req.clinic_id)
          .single();

        // Enqueue review request email
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            templateName: "review-request",
            recipientEmail: client.email,
            idempotencyKey: `review-req-${req.id}`,
            data: {
              firstName: client.first_name,
              clinicName: clinic?.name ?? "Your Clinic",
              publicToken: req.public_token,
              siteUrl: supabaseUrl.replace(".supabase.co", ""),
            },
          },
        });

        // Mark as sent
        await supabase.from("review_requests").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", req.id);

        sentCount++;
      } catch (err) {
        console.error(`Failed to send review request ${req.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), { headers: CORS });
  } catch (err) {
    console.error("reviews-send-pending error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
