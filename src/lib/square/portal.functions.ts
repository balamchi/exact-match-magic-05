import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/client-auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv } from "@/lib/square/config";
import { getActiveSquareConnection, sqHeaders } from "@/lib/square/token.server";

// Member self-service portal (Phase 11).
// Tokens are random 36-char strings stored on `member_portal_tokens`. Public
// route /portal/membership/$token reads them via anon RLS (live tokens only).

function randomToken(): string {
  // 32 bytes -> 64 hex chars; use 36-char slice for readability
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── Admin: create / refresh a portal token ── */
export const createPortalToken = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscription_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error } = await supabase
      .from("membership_subscriptions")
      .select("id, clinic_id")
      .eq("id", data.subscription_id)
      .maybeSingle();
    if (error || !sub) throw new Error("Subscription not found");

    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", sub.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can issue portal links.");
    }

    // Revoke any existing live tokens for this sub, then create a new one.
    await supabaseAdmin
      .from("member_portal_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("subscription_id", sub.id)
      .is("revoked_at", null);

    const token = randomToken();
    const { error: insErr } = await supabaseAdmin
      .from("member_portal_tokens")
      .insert({ subscription_id: sub.id, clinic_id: sub.clinic_id, token });
    if (insErr) throw new Error(insErr.message);

    return { token };
  });

/* ── Public: load subscription details for a token ── */
export const getPortalSubscription = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const { data: tok } = await supabaseAdmin
      .from("member_portal_tokens")
      .select("id, subscription_id, expires_at, revoked_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!tok || tok.revoked_at || new Date(tok.expires_at).getTime() < Date.now()) {
      throw new Error("This portal link is invalid or has expired.");
    }

    await supabaseAdmin
      .from("member_portal_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tok.id);

    const { data: sub } = await supabaseAdmin
      .from("membership_subscriptions")
      .select(
        "id, status, started_at, next_billing_at, canceled_at, last_charge_at, last_charge_status, failed_charge_count, clients(first_name,last_name,email), memberships(name,monthly_price_cents,benefits,billing_cadence), clinics(name)",
      )
      .eq("id", tok.subscription_id)
      .maybeSingle();
    if (!sub) throw new Error("Subscription no longer exists.");

    const { data: charges } = await supabaseAdmin
      .from("membership_charges")
      .select("id, amount_cents, currency, status, charged_at, failure_reason")
      .eq("subscription_id", tok.subscription_id)
      .order("charged_at", { ascending: false, nullsFirst: false })
      .limit(12);

    return { subscription: sub, charges: charges ?? [] };
  });

/* ── Public: cancel via portal ── */
export const cancelViaPortal = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ token: z.string().min(8), reason: z.string().max(500).optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: tok } = await supabaseAdmin
      .from("member_portal_tokens")
      .select("id, subscription_id, revoked_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!tok || tok.revoked_at || new Date(tok.expires_at).getTime() < Date.now()) {
      throw new Error("This portal link is invalid or has expired.");
    }

    const { data: sub } = await supabaseAdmin
      .from("membership_subscriptions")
      .select("id, clinic_id, square_subscription_id, status")
      .eq("id", tok.subscription_id)
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found.");
    if (sub.status === "canceled") return { ok: true, alreadyCanceled: true };

    if (sub.square_subscription_id) {
      try {
        const conn = await getActiveSquareConnection(sub.clinic_id);
        const cfg = getSquareEnv();
        const res = await fetch(
          `${cfg.apiBase}/v2/subscriptions/${sub.square_subscription_id}/cancel`,
          { method: "POST", headers: sqHeaders(conn.access_token) },
        );
        if (!res.ok) {
          console.warn(
            "Square cancel via portal non-OK:",
            res.status,
            await res.text(),
          );
        }
      } catch (e) {
        console.warn("Square cancel via portal skipped:", e);
      }
    }

    await supabaseAdmin
      .from("membership_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        canceled_reason: data.reason ?? "Canceled by member via portal",
        cancel_at_period_end: true,
      })
      .eq("id", sub.id);

    // One-time link: revoke the token after a successful cancellation.
    await supabaseAdmin
      .from("member_portal_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", tok.id);

    return { ok: true };
  });
