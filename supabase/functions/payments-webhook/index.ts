import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook, EventName, type PaddleEnv } from "../_shared/paddle.ts";

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
  // products are named like "clinicpro_starter" -> plan_code "starter"
  const match = productExternalId.match(/^clinicpro_(.+)$/);
  return match ? match[1] : productExternalId;
}

function billingIntervalFromPrice(priceExternalId: string | undefined): string {
  if (!priceExternalId) return "monthly";
  if (priceExternalId.endsWith("_annual")) return "annual";
  return "monthly";
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, startedAt } = data;

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
  if (!planCode) {
    console.warn("Could not derive plan_code from product", productExternalId);
    return;
  }

  const trialEndsAt = status === "trialing" ? currentBillingPeriod?.endsAt : null;

  // Remove trial placeholder row for this clinic+env so the real Paddle row replaces it.
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
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" }
  );
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;

  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  const productExternalId = item?.product?.importMeta?.externalId;

  const update: Record<string, any> = {
    status: status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === "cancel",
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
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
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
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
