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

const sqHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "Square-Version": SQUARE_API_VERSION,
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

    // Square connection
    const { data: conn } = await supabaseAdmin
      .from("clinic_square_connections")
      .select("access_token, location_id, status")
      .eq("clinic_id", m.clinic_id)
      .maybeSingle();
    if (!conn || conn.status !== "active") {
      throw new Error("Square is not connected for this clinic.");
    }
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
      const { data: conn } = await supabaseAdmin
        .from("clinic_square_connections")
        .select("access_token")
        .eq("clinic_id", row.clinic_id)
        .maybeSingle();
      if (conn?.access_token) {
        const cfg = getSquareEnv();
        const res = await fetch(
          `${cfg.apiBase}/v2/subscriptions/${row.square_subscription_id}/cancel`,
          { method: "POST", headers: sqHeaders(conn.access_token) },
        );
        if (!res.ok) {
          const t = await res.text();
          console.warn("Square cancel returned non-OK; proceeding to mark local canceled:", res.status, t);
        }
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
