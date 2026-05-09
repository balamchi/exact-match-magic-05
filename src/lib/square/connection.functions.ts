import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv } from "@/lib/square/config";

// Disconnect: revoke at Square + delete row.
// Caller must be owner/admin of the clinic.
export const disconnectSquare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is owner/admin
    const { data: roleRow, error: roleErr } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", data.clinic_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (roleErr || !roleRow || (roleRow.role !== "owner" && roleRow.role !== "admin")) {
      throw new Error("Only clinic owners/admins can disconnect Square.");
    }

    // Fetch token (use admin client; row may be RLS-hidden from non-admin paths but we already verified role)
    const { data: conn } = await supabaseAdmin
      .from("clinic_square_connections")
      .select("access_token, merchant_id")
      .eq("clinic_id", data.clinic_id)
      .maybeSingle();

    if (conn) {
      const cfg = getSquareEnv();
      try {
        await fetch(`${cfg.apiBase}/oauth2/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Client ${cfg.appSecret}`,
          },
          body: JSON.stringify({ access_token: conn.access_token, merchant_id: conn.merchant_id }),
        });
      } catch (e) {
        console.warn("Square revoke call failed (continuing with local disconnect):", e);
      }
    }

    const { error } = await supabaseAdmin
      .from("clinic_square_connections")
      .delete()
      .eq("clinic_id", data.clinic_id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// Returns connection metadata for a clinic (no secrets).
export const getSquareConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("clinic_square_connections")
      .select("merchant_id, business_name, country, currency, status, connected_at, location_id, token_expires_at")
      .eq("clinic_id", data.clinic_id)
      .maybeSingle();
    return { connection: row };
  });

// Returns the public Web Payments SDK config for a clinic
// (application_id + location_id + environment). No secrets included.
export const getSquarePaymentsConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("clinic_square_connections")
      .select("location_id, status")
      .eq("clinic_id", data.clinic_id)
      .maybeSingle();
    if (!row || row.status !== "active" || !row.location_id) {
      throw new Error("Square is not connected for this clinic.");
    }
    const cfg = getSquareEnv();
    if (!cfg.appId) throw new Error("Square application id not configured.");
    return {
      applicationId: cfg.appId,
      locationId: row.location_id,
      environment: cfg.isProd ? "production" : "sandbox",
    };
  });
