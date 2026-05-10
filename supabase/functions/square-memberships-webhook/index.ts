// Production Square webhooks endpoint (Deno edge function).
// Mirrors the TanStack route at /api/public/square/webhook with the same
// signature verification and event handling. Used because edge functions
// give a stable, low-latency public endpoint independent of app deploys.

// @ts-ignore deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUB_STATUS_MAP: Record<string, string> = {
  ACTIVE: "active",
  PENDING: "pending",
  CANCELED: "canceled",
  DEACTIVATED: "expired",
  PAUSED: "paused",
};

async function verifySignature(
  notificationUrl: string,
  body: string,
  signatureB64: string,
  key: string,
): Promise<boolean> {
  if (!key || !signatureB64) return false;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(notificationUrl + body));
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expectedB64 === signatureB64;
}

// @ts-ignore deno
Deno.serve(async (req: Request) => {
  // @ts-ignore deno
  const env = Deno.env;
  const signatureKey = env.get("SQUARE_WEBHOOK_SIGNATURE_KEY") ?? "";
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const body = await req.text();
  const url = req.url;

  if (signatureKey && !(await verifySignature(url, body, signature, signatureKey))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = createClient(env.get("SUPABASE_URL")!, env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const type: string = event?.type ?? "";
  const obj = event?.data?.object ?? {};

  try {
    if (type === "subscription.created" || type === "subscription.updated") {
      const sub = obj.subscription;
      if (!sub?.id) return new Response("ok");
      const status = SUB_STATUS_MAP[sub.status ?? ""] ?? "active";
      const update: Record<string, unknown> = {
        status,
        next_billing_at: sub.charged_through_date
          ? `${sub.charged_through_date}T00:00:00Z`
          : null,
        updated_at: new Date().toISOString(),
      };
      if (status === "canceled") update.canceled_at = new Date().toISOString();
      await supabase
        .from("membership_subscriptions")
        .update(update)
        .eq("square_subscription_id", sub.id);
    } else if (type === "invoice.payment_made") {
      const invoice = obj.invoice;
      if (!invoice?.id || !invoice?.subscription_id) return new Response("ok");
      const { data: subRow } = await supabase
        .from("membership_subscriptions")
        .select("id, clinic_id")
        .eq("square_subscription_id", invoice.subscription_id)
        .maybeSingle();
      if (!subRow) return new Response("ok");
      const payments = invoice.payment_requests ?? [];
      const totalCents = payments.reduce((sum: number, p: any) => {
        const amt =
          p?.computed_amount_money?.amount ?? p?.total_completed_amount_money?.amount ?? 0;
        return sum + Number(amt ?? 0);
      }, 0);
      const currency =
        invoice.payment_requests?.[0]?.computed_amount_money?.currency ??
        invoice.payment_requests?.[0]?.total_completed_amount_money?.currency ??
        "USD";
      await supabase.from("membership_charges").upsert(
        {
          clinic_id: subRow.clinic_id,
          subscription_id: subRow.id,
          square_invoice_id: invoice.id,
          amount_cents: totalCents,
          currency,
          status: "paid",
          charged_at: new Date().toISOString(),
        },
        { onConflict: "square_invoice_id", ignoreDuplicates: false },
      );
      await supabase
        .from("membership_subscriptions")
        .update({
          last_charge_at: new Date().toISOString(),
          last_charge_status: "succeeded",
          failed_charge_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subRow.id);
    } else if (type === "invoice.failed" || type === "invoice.canceled") {
      const invoice = obj.invoice;
      if (!invoice?.id || !invoice?.subscription_id) return new Response("ok");
      const { data: subRow } = await supabase
        .from("membership_subscriptions")
        .select("id, clinic_id, failed_charge_count")
        .eq("square_subscription_id", invoice.subscription_id)
        .maybeSingle();
      if (!subRow) return new Response("ok");
      await supabase.from("membership_charges").upsert(
        {
          clinic_id: subRow.clinic_id,
          subscription_id: subRow.id,
          square_invoice_id: invoice.id,
          amount_cents: 0,
          currency: "USD",
          status: "failed",
          failure_reason: invoice.status ?? "PAYMENT_FAILED",
          charged_at: new Date().toISOString(),
        },
        { onConflict: "square_invoice_id", ignoreDuplicates: false },
      );
      await supabase
        .from("membership_subscriptions")
        .update({
          last_charge_at: new Date().toISOString(),
          last_charge_status: "failed",
          failed_charge_count: Number(subRow.failed_charge_count ?? 0) + 1,
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subRow.id);
    }
  } catch (e) {
    console.error("square-memberships-webhook error:", type, e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
