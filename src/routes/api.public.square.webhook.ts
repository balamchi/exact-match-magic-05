import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv } from "@/lib/square/config";

// Square signs webhooks with HMAC-SHA256(notification_url + body, signature_key) -> base64.
// Header: `x-square-hmacsha256-signature`. Subscription/Invoice/Payment events update mirror tables.

function verifySignature(notificationUrl: string, body: string, signature: string, key: string) {
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(notificationUrl + body).digest("base64");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const SUB_STATUS_MAP: Record<string, string> = {
  ACTIVE: "active",
  PENDING: "pending",
  CANCELED: "canceled",
  DEACTIVATED: "expired",
  PAUSED: "paused",
};

async function handleSubscriptionUpdated(sub: any) {
  if (!sub?.id) return;
  const status = SUB_STATUS_MAP[sub.status ?? ""] ?? "active";
  const update: {
    status: string;
    next_billing_at: string | null;
    updated_at: string;
    canceled_at?: string;
  } = {
    status,
    next_billing_at: sub.charged_through_date ? `${sub.charged_through_date}T00:00:00Z` : null,
    updated_at: new Date().toISOString(),
  };
  if (status === "canceled") update.canceled_at = new Date().toISOString();
  await supabaseAdmin
    .from("membership_subscriptions")
    .update(update)
    .eq("square_subscription_id", sub.id);
}

async function handleInvoicePaymentMade(invoice: any) {
  if (!invoice?.id || !invoice?.subscription_id) return;
  const { data: subRow } = await supabaseAdmin
    .from("membership_subscriptions")
    .select("id, clinic_id")
    .eq("square_subscription_id", invoice.subscription_id)
    .maybeSingle();
  if (!subRow) return;

  const payments = invoice.payment_requests ?? [];
  const totalCents = payments.reduce((sum: number, p: any) => {
    const amt = p?.computed_amount_money?.amount ?? p?.total_completed_amount_money?.amount ?? 0;
    return sum + Number(amt ?? 0);
  }, 0);
  const currency =
    invoice.payment_requests?.[0]?.computed_amount_money?.currency ??
    invoice.payment_requests?.[0]?.total_completed_amount_money?.currency ??
    "USD";

  await supabaseAdmin.from("membership_charges").upsert(
    {
      clinic_id: subRow.clinic_id,
      subscription_id: subRow.id,
      square_invoice_id: invoice.id,
      amount_cents: totalCents,
      currency,
      status: "paid",
      charged_at: new Date().toISOString(),
    },
    { onConflict: "square_invoice_id" },
  );

  await supabaseAdmin
    .from("membership_subscriptions")
    .update({
      last_charge_at: new Date().toISOString(),
      last_charge_status: "succeeded",
      failed_charge_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subRow.id);
}

async function handleInvoiceFailed(invoice: any) {
  if (!invoice?.id || !invoice?.subscription_id) return;
  const { data: subRow } = await supabaseAdmin
    .from("membership_subscriptions")
    .select("id, clinic_id, failed_charge_count")
    .eq("square_subscription_id", invoice.subscription_id)
    .maybeSingle();
  if (!subRow) return;

  await supabaseAdmin.from("membership_charges").upsert(
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
    { onConflict: "square_invoice_id" },
  );

  await supabaseAdmin
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

export const Route = createFileRoute("/api/public/square/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cfg = getSquareEnv();
        const body = await request.text();
        const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
        const notificationUrl = request.url;

        if (!verifySignature(notificationUrl, body, signature, cfg.webhookSignatureKey)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const type: string = event?.type ?? "";
        const data = event?.data?.object ?? {};

        try {
          switch (type) {
            case "subscription.created":
            case "subscription.updated":
              await handleSubscriptionUpdated(data.subscription);
              break;
            case "invoice.payment_made":
              await handleInvoicePaymentMade(data.invoice);
              break;
            case "invoice.failed":
            case "invoice.canceled":
              await handleInvoiceFailed(data.invoice);
              break;
            default:
              // Unhandled event types are accepted silently (200 OK) so Square doesn't retry.
              break;
          }
        } catch (e) {
          console.error("square webhook handler error:", type, e);
          return new Response("Handler error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
