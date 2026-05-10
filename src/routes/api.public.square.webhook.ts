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

async function enqueueEmail(templateName: string, recipientEmail: string, data: Record<string, unknown>) {
  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_email_queue",
    payload: { templateName, recipientEmail, data } as any,
  });
  if (error) console.warn(`${templateName} enqueue failed:`, error.message);
}

async function buildPortalUrl(subscriptionId: string, clinicId: string) {
  const { data: existing } = await supabaseAdmin
    .from("member_portal_tokens")
    .select("token, expires_at, revoked_at")
    .eq("subscription_id", subscriptionId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let token = existing?.token;
  if (!token || (existing?.expires_at && new Date(existing.expires_at).getTime() < Date.now())) {
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("member_portal_tokens").insert({
      clinic_id: clinicId,
      subscription_id: subscriptionId,
      token: newToken,
      expires_at: expires,
    });
    if (!error) token = newToken;
  }
  if (!token) return undefined;
  const base = process.env.VITE_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  return `${base.replace(/\/$/, "")}/portal/membership/${token}`;
}

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

  if (status === "canceled") {
    const { data: row } = await supabaseAdmin
      .from("membership_subscriptions")
      .select("clients(first_name,email), memberships(name), clinics(name), next_billing_at")
      .eq("square_subscription_id", sub.id)
      .maybeSingle();
    const client = (row as any)?.clients;
    if (client?.email) {
      const lastActive = (row as any)?.next_billing_at
        ? new Date((row as any).next_billing_at).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          })
        : undefined;
      await enqueueEmail("membership-canceled", client.email, {
        clientName: client.first_name ?? undefined,
        planName: (row as any)?.memberships?.name,
        clinicName: (row as any)?.clinics?.name,
        lastActiveDate: lastActive,
      });
    }
  }
}

async function handleInvoicePaymentMade(invoice: any) {
  if (!invoice?.id || !invoice?.subscription_id) return;
  const { data: subRow } = await supabaseAdmin
    .from("membership_subscriptions")
    .select(
      "id, clinic_id, next_billing_at, clients(first_name,email), memberships(name), clinics(name)",
    )
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
    { onConflict: "square_invoice_id", ignoreDuplicates: false },
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

  // Send success email to member
  const client = (subRow as any).clients;
  if (client?.email) {
    const nextBilling = invoice.next_payment_amount_money
      ? undefined
      : (subRow as any).next_billing_at
        ? new Date((subRow as any).next_billing_at).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          })
        : undefined;
    await enqueueEmail("membership-charge-success", client.email, {
      clientName: client.first_name ?? undefined,
      planName: (subRow as any).memberships?.name,
      amountCents: totalCents,
      nextBillingDate: nextBilling,
      clinicName: (subRow as any).clinics?.name,
    });
  }
}

async function handleInvoiceFailed(invoice: any) {
  if (!invoice?.id || !invoice?.subscription_id) return;
  const { data: subRow } = await supabaseAdmin
    .from("membership_subscriptions")
    .select(
      "id, clinic_id, failed_charge_count, clients(first_name,last_name,email), memberships(name,monthly_price_cents), clinics(name)",
    )
    .eq("square_subscription_id", invoice.subscription_id)
    .maybeSingle();
  if (!subRow) return;

  const failureReason = invoice.status ?? "PAYMENT_FAILED";

  await supabaseAdmin.from("membership_charges").upsert(
    {
      clinic_id: subRow.clinic_id,
      subscription_id: subRow.id,
      square_invoice_id: invoice.id,
      amount_cents: 0,
      currency: "USD",
      status: "failed",
      failure_reason: failureReason,
      charged_at: new Date().toISOString(),
    },
    { onConflict: "square_invoice_id", ignoreDuplicates: false },
  );

  const newFailCount = Number(subRow.failed_charge_count ?? 0) + 1;
  await supabaseAdmin
    .from("membership_subscriptions")
    .update({
      last_charge_at: new Date().toISOString(),
      last_charge_status: "failed",
      failed_charge_count: newFailCount,
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subRow.id);

  // Phase 10: dunning email to the member (membership-specific template)
  const client = (subRow as any).clients;
  const plan = (subRow as any).memberships;
  const clinic = (subRow as any).clinics;
  if (client?.email) {
    const portalUrl = await buildPortalUrl(subRow.id as string);
    await enqueueEmail("membership-charge-failed", client.email, {
      clientName: client.first_name ?? undefined,
      planName: plan?.name,
      amountCents: plan?.monthly_price_cents ?? 0,
      failureReason,
      updateCardUrl: portalUrl,
      clinicName: clinic?.name,
    });
  }
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
