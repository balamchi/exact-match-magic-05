import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv, SQUARE_API_VERSION } from "@/lib/square/config";

// Push a membership plan to the connected clinic's Square Catalog.
// Creates (or updates) a SUBSCRIPTION_PLAN object + one SUBSCRIPTION_PLAN_VARIATION
// matching the plan's price + cadence. Persists the resulting Square IDs
// onto public.memberships so future enrollments can reference them.

const SyncInput = z.object({ membership_id: z.string().uuid() });

type SquareCatalogObject = {
  id: string;
  version?: number;
  subscription_plan_data?: {
    name?: string;
    subscription_plan_variations?: Array<{ id: string; version?: number }>;
  };
};

export const syncPlanToSquare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SyncInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load membership (RLS-scoped to caller's clinic)
    const { data: m, error: mErr } = await supabase
      .from("memberships")
      .select("*")
      .eq("id", data.membership_id)
      .maybeSingle();
    if (mErr || !m) throw new Error("Membership not found");

    // Verify caller is owner/admin of the clinic
    const { data: roleRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", m.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can sync to Square.");
    }

    // Load Square connection (admin client to read tokens)
    const { data: conn } = await supabaseAdmin
      .from("clinic_square_connections")
      .select("access_token, location_id, currency, status")
      .eq("clinic_id", m.clinic_id)
      .maybeSingle();
    if (!conn || conn.status !== "active") {
      throw new Error("Square is not connected for this clinic. Connect it under Settings → Integrations.");
    }
    if (!conn.location_id) throw new Error("No Square location available on the connected account.");

    const cfg = getSquareEnv();
    const cadence = (m.billing_cadence ?? "MONTHLY") as
      | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
    const currency = conn.currency ?? "USD";
    const priceCents = Number(m.monthly_price_cents ?? 0);
    if (priceCents <= 0) throw new Error("Plan price must be greater than 0 to sync.");

    // Build catalog upsert body. We use deterministic client IDs prefixed with '#'
    // so the same call works for create and (idempotently) updates by id.
    const planClientId = m.square_plan_id ?? `#plan-${m.id}`;
    const variationClientId = m.square_plan_variation_id ?? `#variation-${m.id}`;
    const idempotencyKey = `mplan-${m.id}-${Date.now()}`;

    const planObject = {
      type: "SUBSCRIPTION_PLAN",
      id: planClientId,
      present_at_all_locations: false,
      present_at_location_ids: [conn.location_id],
      subscription_plan_data: {
        name: m.name.slice(0, 255),
        eligible_item_ids: [],
        subscription_plan_variations: [
          {
            type: "SUBSCRIPTION_PLAN_VARIATION",
            id: variationClientId,
            present_at_all_locations: false,
            present_at_location_ids: [conn.location_id],
            subscription_plan_variation_data: {
              name: `${m.name} — ${cadence.toLowerCase()}`.slice(0, 255),
              phases: [
                ...(Number(m.trial_days ?? 0) > 0
                  ? [
                      {
                        cadence: "DAILY",
                        periods: Number(m.trial_days),
                        recurring_price_money: { amount: 0, currency },
                        ordinal: 0,
                      },
                    ]
                  : []),
                {
                  cadence,
                  recurring_price_money: { amount: priceCents, currency },
                  ordinal: Number(m.trial_days ?? 0) > 0 ? 1 : 0,
                },
              ],
            },
          },
        ],
      },
    };

    const upsertRes = await fetch(`${cfg.apiBase}/v2/catalog/object`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify({ idempotency_key: idempotencyKey, object: planObject }),
    });

    if (!upsertRes.ok) {
      const txt = await upsertRes.text();
      console.error("Square catalog upsert failed:", upsertRes.status, txt);
      await supabaseAdmin
        .from("memberships")
        .update({ square_sync_error: `Square ${upsertRes.status}: ${txt.slice(0, 240)}` })
        .eq("id", m.id);
      throw new Error(`Square rejected the plan (${upsertRes.status}). See details in plan card.`);
    }

    const body = (await upsertRes.json()) as {
      catalog_object?: SquareCatalogObject;
      id_mappings?: Array<{ client_object_id: string; object_id: string }>;
    };

    // Resolve final IDs (Square returns mappings for '#'-prefixed client IDs)
    const resolveId = (clientId: string): string => {
      if (!clientId.startsWith("#")) return clientId;
      const m = body.id_mappings?.find((x) => x.client_object_id === clientId);
      return m?.object_id ?? clientId;
    };
    const finalPlanId = resolveId(planClientId);
    const finalVariationId =
      body.catalog_object?.subscription_plan_data?.subscription_plan_variations?.[0]?.id ??
      resolveId(variationClientId);

    const { error: updErr } = await supabaseAdmin
      .from("memberships")
      .update({
        square_plan_id: finalPlanId,
        square_plan_variation_id: finalVariationId,
        square_synced_at: new Date().toISOString(),
        square_sync_error: null,
      })
      .eq("id", m.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, square_plan_id: finalPlanId, square_plan_variation_id: finalVariationId };
  });
