import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook, WebhookAuthError, EventName, type PaddleEnv } from "../_shared/paddle.ts";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

function planCodeFromProduct(productExternalId: string | undefined): string | null {
  if (!productExternalId) return null;
  const match = productExternalId.match(/^clinicpro_(.+)$/);
  return match ? match[1] : productExternalId;
}

function billingIntervalFromPrice(priceExternalId: string | undefined): string {
  if (!priceExternalId) return "monthly";
  if (priceExternalId.endsWith("_annual")) return "annual";
  return "monthly";
}

function planNameFromCode(code: string | null | undefined): string {
  if (!code) return "your plan";
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function appBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || "https://www.clinicpro.io";
}

async function findClinicForSubscription(
  paddleSubscriptionId: string,
  env: PaddleEnv
): Promise<{ clinic_id: string; plan_code: string | null } | null> {
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("clinic_id, plan_code")
    .eq("paddle_subscription_id", paddleSubscriptionId)
    .eq("environment", env)
    .maybeSingle();
  return data ?? null;
}

async function findClinicOwnerEmail(clinicId: string): Promise<string | null> {
  const { data: member } = await getSupabase()
    .from("clinic_members")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner")
    .maybeSingle();
  if (!member?.user_id) return null;
  const { data: userData } = await getSupabase().auth.admin.getUserById(member.user_id);
  return userData?.user?.email ?? null;
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, startedAt, scheduledChange } = data;

  const clinicId = customData?.clinicId;
  if (!clinicId) {
    console.error("No clinicId in customData for subscription", id);
    return;
  }

  const item = items[0];
  const priceExternalId = item.price.importMeta?.externalId;
  const productExternalId = item.product.importMeta?.externalId;
  if (!priceExternalId || !productExternalId) {
    console.warn("Skipping subscription: missing importMeta.externalId", {
      rawPriceId: item.price.id,
      rawProductId: item.product.id,
    });
    return;
  }

  const planCode = planCodeFromProduct(productExternalId);
  if (!planCode) return;

  const trialEndsAt = status === "trialing" ? currentBillingPeriod?.endsAt : null;

  await getSupabase()
    .from("subscriptions")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("environment", env)
    .like("paddle_subscription_id", "trial_%");

  await getSupabase().from("subscriptions").upsert(
    {
      clinic_id: clinicId,
      plan_code: planCode,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productExternalId,
      price_id: priceExternalId,
      status: status,
      billing_interval: billingIntervalFromPrice(priceExternalId),
      trial_started_at: status === "trialing" ? startedAt : null,
      trial_ends_at: trialEndsAt,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      scheduled_change_action: scheduledChange?.action ?? null,
      scheduled_change_effective_at: scheduledChange?.effectiveAt ?? null,
      scheduled_change_meta: scheduledChange ?? null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" }
  );
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;

  const { data: prev } = await getSupabase()
    .from("subscriptions")
    .select("status, plan_code, clinic_id")
    .eq("paddle_subscription_id", id)
    .eq("environment", env)
    .maybeSingle();

  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  const productExternalId = item?.product?.importMeta?.externalId;

  const update: Record<string, any> = {
    status: status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === "cancel",
    scheduled_change_action: scheduledChange?.action ?? null,
    scheduled_change_effective_at: scheduledChange?.effectiveAt ?? null,
    scheduled_change_meta: scheduledChange ?? null,
    updated_at: new Date().toISOString(),
  };

  if (priceExternalId) {
    update.price_id = priceExternalId;
    update.billing_interval = billingIntervalFromPrice(priceExternalId);
  }
  if (productExternalId) {
    update.product_id = productExternalId;
    const planCode = planCodeFromProduct(productExternalId);
    if (planCode) update.plan_code = planCode;
  }

  await getSupabase()
    .from("subscriptions")
    .update(update)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  if (status === "past_due" && prev && prev.status !== "past_due" && prev.clinic_id) {
    await sendDunningEmail(prev.clinic_id, prev.plan_code).catch((e) =>
      console.error("dunning email failed", e)
    );
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      scheduled_change_action: null,
      scheduled_change_effective_at: null,
      scheduled_change_meta: null,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

async function persistTransaction(data: any, env: PaddleEnv, statusOverride?: string) {
  const { id, subscriptionId, customerId, items, details, invoiceNumber, invoiceId, billedAt, origin, status } = data;

  let clinicId: string | null = null;
  let planCode: string | null = null;
  if (subscriptionId) {
    const sub = await findClinicForSubscription(subscriptionId, env);
    clinicId = sub?.clinic_id ?? null;
    planCode = sub?.plan_code ?? null;
  }
  if (!clinicId) {
    console.warn("transaction has no matching subscription, skipping persist", { id, subscriptionId });
    return null;
  }

  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId ?? null;

  const totals = details?.totals;
  const amountCents = totals?.total ? parseInt(totals.total, 10) : 0;
  const currency = totals?.currencyCode || data?.currencyCode || "USD";

  const finalStatus = statusOverride || status || "unknown";
  const invoicePdfUrl = finalStatus === "completed" && invoiceId
    ? `https://my.paddle.com/invoice/${invoiceId}`
    : null;

  const { error } = await getSupabase()
    .from("payment_transactions")
    .upsert(
      {
        clinic_id: clinicId,
        paddle_transaction_id: id,
        paddle_subscription_id: subscriptionId ?? null,
        paddle_customer_id: customerId ?? null,
        plan_code: planCode,
        price_id: priceExternalId,
        amount_cents: amountCents,
        currency: currency,
        status: finalStatus,
        origin: origin ?? null,
        invoice_number: invoiceNumber ?? null,
        invoice_pdf_url: invoicePdfUrl,
        error_reason: data?.payments?.[0]?.errorCode ?? null,
        billed_at: billedAt ?? null,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_transaction_id,environment" }
    );
  if (error) console.error("persistTransaction upsert error", error);
  return { clinicId, planCode, amountCents, currency };
}

async function sendDunningEmail(clinicId: string, planCode: string | null) {
  const ownerEmail = await findClinicOwnerEmail(clinicId);
  if (!ownerEmail) {
    console.warn("No owner email found for clinic", clinicId);
    return;
  }
  const { data: clinic } = await getSupabase()
    .from("clinics")
    .select("name")
    .eq("id", clinicId)
    .maybeSingle();

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    console.error("dunning email skipped — missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const sendUrl = `${appBaseUrl()}/lovable/email/transactional/send`;
  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        templateName: "payment-failed",
        recipientEmail: ownerEmail,
        templateData: {
          clinicName: clinic?.name ?? "your clinic",
          planName: planNameFromCode(planCode),
          billingPortalUrl: `${appBaseUrl()}/app/settings/billing`,
        },
        idempotencyKey: `dunning_${clinicId}_${planCode ?? "unknown"}`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error("dunning email send failed", {
        status: res.status,
        body: errText.slice(0, 500),
        clinicId,
      });
    }
  } catch (e) {
    console.error("dunning email request failed", e);
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  if (!event) throw new Error("Invalid webhook event");

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await persistTransaction(event.data, env, "completed");
      break;
    case EventName.TransactionPaymentFailed:
      await persistTransaction(event.data, env, "payment_failed");
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof WebhookAuthError) {
      console.error("Webhook auth error:", (e as Error).message);
      return new Response("Unauthorized", { status: 401 });
    }
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
