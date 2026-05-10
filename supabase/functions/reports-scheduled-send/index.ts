// Scheduled report digest sender. Triggered by pg_cron every 15 min,
// or invoked directly with { id } to send one immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nextSendAt(cadence: string, time: string, dow: number | null, dom: number | null): Date {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(h, m);
  if (cadence === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (cadence === "weekly") {
    const d = dow ?? 1;
    const diff = (d - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= now) next.setDate(next.getDate() + 7);
  } else {
    next.setDate(dom ?? 1);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  return next;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let onlyId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.id) onlyId = body.id;
  } catch { /* ignore */ }

  let q = supabase.from("scheduled_reports").select("*").eq("active", true);
  if (onlyId) q = q.eq("id", onlyId);
  else q = q.lte("next_send_at", new Date().toISOString());

  const { data: due } = await q;
  const items = due ?? [];

  let sent = 0;
  let failed = 0;

  for (const r of items) {
    try {
      // Fetch a small snapshot of clinic data for the digest.
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: appts } = await supabase.from("appointments")
        .select("price_cents, status, client_id")
        .eq("clinic_id", r.clinic_id)
        .gte("starts_at", since);

      const revenue = (appts ?? []).filter((a) => a.status === "completed")
        .reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
      const completed = (appts ?? []).filter((a) => a.status === "completed").length;
      const noShows = (appts ?? []).filter((a) => a.status === "no_show").length;
      const noShowRate = appts?.length ? Math.round((noShows / appts.length) * 100) : 0;

      const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0b">
        <h1 style="font-size:20px;margin:0 0 8px">${r.name}</h1>
        <p style="color:#666;margin:0 0 24px">Last 7 days</p>
        <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:12px">
          <div style="font-size:11px;text-transform:uppercase;color:#888">Revenue</div>
          <div style="font-size:28px;font-weight:600">$${revenue.toLocaleString()}</div>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1;border:1px solid #eee;border-radius:12px;padding:16px">
            <div style="font-size:11px;text-transform:uppercase;color:#888">Completed</div>
            <div style="font-size:22px;font-weight:600">${completed}</div>
          </div>
          <div style="flex:1;border:1px solid #eee;border-radius:12px;padding:16px">
            <div style="font-size:11px;text-transform:uppercase;color:#888">No-show rate</div>
            <div style="font-size:22px;font-weight:600">${noShowRate}%</div>
          </div>
        </div>
        <p style="color:#999;font-size:12px;margin-top:32px">Sent by ClinicPro</p>
      </body></html>`;

      // Enqueue via the existing email queue.
      for (const recipient of r.recipients) {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: recipient,
            subject: `${r.name} — your digest`,
            html,
            from: "ClinicPro <hello@notify.clinicpro.io>",
          },
        });
      }

      const next = nextSendAt(r.cadence, String(r.send_time).slice(0, 5), r.send_day_of_week, r.send_day_of_month);
      await supabase.from("scheduled_reports").update({
        last_sent_at: new Date().toISOString(),
        next_send_at: next.toISOString(),
      }).eq("id", r.id);

      await supabase.from("scheduled_report_log").insert({
        scheduled_report_id: r.id,
        status: "sent",
        recipients_count: r.recipients.length,
      });
      sent++;
    } catch (e) {
      failed++;
      await supabase.from("scheduled_report_log").insert({
        scheduled_report_id: r.id,
        status: "failed",
        recipients_count: 0,
        error_message: String(e),
      });
    }
  }

  return new Response(JSON.stringify({ processed: items.length, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
