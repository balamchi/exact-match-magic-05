import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv } from "@/lib/square/config";
import { getActiveSquareConnection, sqHeaders } from "@/lib/square/token.server";

// Enroll a client in a membership plan via Square Subscriptions.
// Flow:
//   1. Validate caller is staff/admin/owner of the clinic.
//   2. Look up clinic Square connection + membership (must be Square-synced).
//   3. Ensure client has a Square Customer record (create if missing).
//   4. Attach a card on file from a Web Payments SDK source token (nonce).
//   5. Create the Square Subscription (start_date today, on the plan variation).
//   6. Persist a membership_subscriptions row mirroring Square state.

const EnrollInput = z.object({
  membership_id: z.string().uuid(),
  client_id: z.string().uuid(),
  card_source_id: z.string().min(4).max(2048), // Square Web Payments nonce (cnon:*)
});


export const enrollMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EnrollInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Membership + client (RLS-scoped to caller's clinic)
    const { data: m, error: mErr } = await supabase
      .from("memberships")
      .select("id, clinic_id, name, square_plan_variation_id, monthly_price_cents, billing_cadence")
      .eq("id", data.membership_id)
      .maybeSingle();
    if (mErr || !m) throw new Error("Membership not found");
    if (!m.square_plan_variation_id) {
      throw new Error("This plan hasn't been synced to Square yet. Click Sync on the plan card first.");
    }

    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("id, clinic_id, first_name, last_name, email, phone, square_customer_id")
      .eq("id", data.client_id)
      .maybeSingle();
    if (cErr || !client) throw new Error("Client not found");
    if (client.clinic_id !== m.clinic_id) throw new Error("Client and plan belong to different clinics");

    // Caller must be staff+ for the clinic
    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", m.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow) throw new Error("Not a member of this clinic.");

    // Square connection (auto-refresh OAuth token if near expiry)
    const conn = await getActiveSquareConnection(m.clinic_id);
    if (!conn.location_id) throw new Error("No Square location on the connected account.");

    const cfg = getSquareEnv();
    const headers = sqHeaders(conn.access_token);

    // 1) Ensure Square customer
    let squareCustomerId = client.square_customer_id;
    if (!squareCustomerId) {
      const custRes = await fetch(`${cfg.apiBase}/v2/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          idempotency_key: `cust-${client.id}`,
          given_name: client.first_name ?? undefined,
          family_name: client.last_name ?? undefined,
          email_address: client.email ?? undefined,
          phone_number: client.phone ?? undefined,
          reference_id: client.id,
        }),
      });
      if (!custRes.ok) {
        const t = await custRes.text();
        throw new Error(`Square customer create failed (${custRes.status}): ${t.slice(0, 200)}`);
      }
      const cj = (await custRes.json()) as { customer?: { id: string } };
      squareCustomerId = cj.customer?.id ?? null;
      if (!squareCustomerId) throw new Error("Square did not return a customer id.");
      await supabaseAdmin
        .from("clients")
        .update({ square_customer_id: squareCustomerId })
        .eq("id", client.id);
    }

    // 2) Attach card on file from the Web Payments source token
    const cardRes = await fetch(`${cfg.apiBase}/v2/cards`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        idempotency_key: `card-${client.id}-${Date.now()}`,
        source_id: data.card_source_id,
        card: { customer_id: squareCustomerId },
      }),
    });
    if (!cardRes.ok) {
      const t = await cardRes.text();
      throw new Error(`Square card add failed (${cardRes.status}): ${t.slice(0, 200)}`);
    }
    const cj = (await cardRes.json()) as { card?: { id: string } };
    const cardId = cj.card?.id;
    if (!cardId) throw new Error("Square did not return a card id.");

    // 3) Create the subscription (starts today, no phase override → uses plan's phases incl. trial)
    const today = new Date().toISOString().slice(0, 10);
    const subRes = await fetch(`${cfg.apiBase}/v2/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        idempotency_key: `sub-${m.id}-${client.id}-${Date.now()}`,
        location_id: conn.location_id,
        plan_variation_id: m.square_plan_variation_id,
        customer_id: squareCustomerId,
        card_id: cardId,
        start_date: today,
      }),
    });
    if (!subRes.ok) {
      const t = await subRes.text();
      throw new Error(`Square subscription create failed (${subRes.status}): ${t.slice(0, 200)}`);
    }
    const sj = (await subRes.json()) as {
      subscription?: {
        id: string;
        status?: string;
        charged_through_date?: string;
        start_date?: string;
      };
    };
    const sub = sj.subscription;
    if (!sub?.id) throw new Error("Square did not return a subscription id.");

    // 4) Persist mirror row
    const statusMap: Record<string, string> = {
      ACTIVE: "active",
      PENDING: "pending",
      CANCELED: "canceled",
      DEACTIVATED: "expired",
      PAUSED: "paused",
    };
    const internalStatus = statusMap[sub.status ?? "ACTIVE"] ?? "active";

    const { error: insErr } = await supabaseAdmin.from("membership_subscriptions").insert({
      clinic_id: m.clinic_id,
      membership_id: m.id,
      client_id: client.id,
      square_subscription_id: sub.id,
      square_customer_id: squareCustomerId,
      square_card_id: cardId,
      status: internalStatus,
      started_at: sub.start_date ? `${sub.start_date}T00:00:00Z` : new Date().toISOString(),
      next_billing_at: sub.charged_through_date ? `${sub.charged_through_date}T00:00:00Z` : null,
    });
    if (insErr) {
      // Subscription was created in Square but mirror failed — return id so support can reconcile.
      console.error("Mirror insert failed:", insErr);
      throw new Error(
        `Square subscription created (${sub.id}) but local record failed: ${insErr.message}`,
      );
    }

    // Bump member_count on the membership for at-a-glance KPI
    const { data: cur } = await supabaseAdmin
      .from("memberships")
      .select("member_count")
      .eq("id", m.id)
      .maybeSingle();
    if (cur) {
      await supabaseAdmin
        .from("memberships")
        .update({ member_count: Number(cur.member_count ?? 0) + 1 })
        .eq("id", m.id);
    }

    return { ok: true, square_subscription_id: sub.id, status: internalStatus };
  });

// Cancel an enrolled subscription in Square + mark mirror row canceled.
const CancelInput = z.object({ subscription_id: z.string().uuid() });

export const cancelMemberSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("membership_subscriptions")
      .select("id, clinic_id, membership_id, square_subscription_id, status")
      .eq("id", data.subscription_id)
      .maybeSingle();
    if (error || !row) throw new Error("Subscription not found");

    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", row.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can cancel memberships.");
    }

    if (row.square_subscription_id) {
      try {
        const conn = await getActiveSquareConnection(row.clinic_id);
        const cfg = getSquareEnv();
        const res = await fetch(
          `${cfg.apiBase}/v2/subscriptions/${row.square_subscription_id}/cancel`,
          { method: "POST", headers: sqHeaders(conn.access_token) },
        );
        if (!res.ok) {
          const t = await res.text();
          console.warn("Square cancel returned non-OK; proceeding to mark local canceled:", res.status, t);
        }
      } catch (e) {
        console.warn("Square cancel call skipped:", e);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("membership_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: true,
      })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

/* ─────────── Pause / Resume ─────────── */

const SubIdInput = z.object({ subscription_id: z.string().uuid() });

async function loadSubAndAuthorize(
  supabase: any,
  userId: string,
  subscriptionId: string,
) {
  const { data: row, error } = await supabase
    .from("membership_subscriptions")
    .select("id, clinic_id, square_subscription_id, status")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (error || !row) throw new Error("Subscription not found");

  const { data: roleRow } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", row.clinic_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
    throw new Error("Only clinic owners/admins can change membership status.");
  }
  return row as {
    id: string;
    clinic_id: string;
    square_subscription_id: string | null;
    status: string;
  };
}

export const pauseMemberSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = await loadSubAndAuthorize(context.supabase, context.userId, data.subscription_id);
    if (!row.square_subscription_id) throw new Error("Subscription is not in Square.");
    const conn = await getActiveSquareConnection(row.clinic_id);
    const cfg = getSquareEnv();
    const res = await fetch(
      `${cfg.apiBase}/v2/subscriptions/${row.square_subscription_id}/actions`,
      {
        method: "POST",
        headers: sqHeaders(conn.access_token),
        body: JSON.stringify({
          action: { type: "PAUSE", effective_date: new Date().toISOString().slice(0, 10) },
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Square pause failed (${res.status}): ${t.slice(0, 200)}`);
    }
    await supabaseAdmin
      .from("membership_subscriptions")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true };
  });

export const resumeMemberSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = await loadSubAndAuthorize(context.supabase, context.userId, data.subscription_id);
    if (!row.square_subscription_id) throw new Error("Subscription is not in Square.");
    const conn = await getActiveSquareConnection(row.clinic_id);
    const cfg = getSquareEnv();
    const res = await fetch(
      `${cfg.apiBase}/v2/subscriptions/${row.square_subscription_id}/actions`,
      {
        method: "POST",
        headers: sqHeaders(conn.access_token),
        body: JSON.stringify({
          action: { type: "RESUME", resume_effective_date: new Date().toISOString().slice(0, 10) },
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Square resume failed (${res.status}): ${t.slice(0, 200)}`);
    }
    await supabaseAdmin
      .from("membership_subscriptions")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true };
  });

/* ─────────── Retry failed charge ─────────── */

const RetryInput = z.object({ charge_id: z.string().uuid() });

export const retryFailedCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RetryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: charge, error } = await supabase
      .from("membership_charges")
      .select(
        "id, clinic_id, subscription_id, amount_cents, currency, status, square_invoice_id",
      )
      .eq("id", data.charge_id)
      .maybeSingle();
    if (error || !charge) throw new Error("Charge not found");
    if (charge.status !== "failed") throw new Error("Only failed charges can be retried.");

    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", charge.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can retry charges.");
    }

    const { data: sub } = await supabaseAdmin
      .from("membership_subscriptions")
      .select("square_customer_id, square_card_id, square_subscription_id")
      .eq("id", charge.subscription_id)
      .maybeSingle();
    if (!sub?.square_customer_id || !sub?.square_card_id) {
      throw new Error("Subscription is missing customer/card on file.");
    }

    const conn = await getActiveSquareConnection(charge.clinic_id);
    const cfg = getSquareEnv();

    // Charge the card-on-file directly for the failed amount. Square will
    // emit invoice.payment_made if the underlying invoice subsequently settles,
    // but we also mirror the success locally on a 200.
    const payRes = await fetch(`${cfg.apiBase}/v2/payments`, {
      method: "POST",
      headers: sqHeaders(conn.access_token),
      body: JSON.stringify({
        idempotency_key: `retry-${charge.id}-${Date.now()}`,
        source_id: sub.square_card_id,
        customer_id: sub.square_customer_id,
        amount_money: {
          amount: charge.amount_cents,
          currency: charge.currency ?? "USD",
        },
        reference_id: charge.subscription_id,
        note: `Retry of failed membership charge ${charge.id}`,
      }),
    });

    if (!payRes.ok) {
      const t = await payRes.text();
      throw new Error(`Square retry failed (${payRes.status}): ${t.slice(0, 200)}`);
    }
    const pj = (await payRes.json()) as { payment?: { id: string; status?: string } };
    const paymentId = pj.payment?.id ?? null;

    await supabaseAdmin
      .from("membership_charges")
      .update({
        status: "paid",
        square_payment_id: paymentId,
        charged_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", charge.id);

    await supabaseAdmin
      .from("membership_subscriptions")
      .update({
        last_charge_at: new Date().toISOString(),
        last_charge_status: "paid",
        failed_charge_count: 0,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", charge.subscription_id);

    return { ok: true, payment_id: paymentId };
  });

/* ─────────── Change plan (upgrade / downgrade) ─────────── */

const ChangePlanInput = z.object({
  subscription_id: z.string().uuid(),
  new_membership_id: z.string().uuid(),
});

export const changeMemberPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ChangePlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("membership_subscriptions")
      .select("id, clinic_id, membership_id, square_subscription_id, status")
      .eq("id", data.subscription_id)
      .maybeSingle();
    if (error || !row) throw new Error("Subscription not found");
    if (!row.square_subscription_id) throw new Error("Subscription is not in Square.");
    if (row.membership_id === data.new_membership_id) {
      throw new Error("Member is already on this plan.");
    }

    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", row.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can change plans.");
    }

    const { data: target } = await supabase
      .from("memberships")
      .select("id, clinic_id, square_plan_variation_id, name")
      .eq("id", data.new_membership_id)
      .maybeSingle();
    if (!target) throw new Error("Target plan not found");
    if (target.clinic_id !== row.clinic_id) {
      throw new Error("Plans belong to different clinics.");
    }
    if (!target.square_plan_variation_id) {
      throw new Error("Target plan hasn't been synced to Square yet.");
    }

    const conn = await getActiveSquareConnection(row.clinic_id);
    const cfg = getSquareEnv();

    // Square swap-plan prorates automatically: the current period is closed and
    // a new invoice is generated for the new plan starting today.
    const swapRes = await fetch(
      `${cfg.apiBase}/v2/subscriptions/${row.square_subscription_id}/swap-plan`,
      {
        method: "POST",
        headers: sqHeaders(conn.access_token),
        body: JSON.stringify({
          new_plan_variation_id: target.square_plan_variation_id,
        }),
      },
    );
    if (!swapRes.ok) {
      const t = await swapRes.text();
      throw new Error(`Square swap-plan failed (${swapRes.status}): ${t.slice(0, 200)}`);
    }
    const sj = (await swapRes.json()) as {
      subscription?: { status?: string; charged_through_date?: string };
    };

    const statusMap: Record<string, string> = {
      ACTIVE: "active",
      PENDING: "pending",
      CANCELED: "canceled",
      DEACTIVATED: "expired",
      PAUSED: "paused",
    };
    const newStatus = statusMap[sj.subscription?.status ?? "ACTIVE"] ?? "active";

    await supabaseAdmin
      .from("membership_subscriptions")
      .update({
        membership_id: target.id,
        status: newStatus,
        next_billing_at: sj.subscription?.charged_through_date
          ? `${sj.subscription.charged_through_date}T00:00:00Z`
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    // Maintain member_count KPIs on both plans
    const { data: oldCount } = await supabaseAdmin
      .from("memberships")
      .select("member_count")
      .eq("id", row.membership_id)
      .maybeSingle();
    if (oldCount) {
      await supabaseAdmin
        .from("memberships")
        .update({ member_count: Math.max(0, Number(oldCount.member_count ?? 0) - 1) })
        .eq("id", row.membership_id);
    }
    const { data: newCount } = await supabaseAdmin
      .from("memberships")
      .select("member_count")
      .eq("id", target.id)
      .maybeSingle();
    if (newCount) {
      await supabaseAdmin
        .from("memberships")
        .update({ member_count: Number(newCount.member_count ?? 0) + 1 })
        .eq("id", target.id);
    }

    return { ok: true, status: newStatus };
  });
