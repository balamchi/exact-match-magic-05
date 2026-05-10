// Server-only helper: resolve a clinic's Square access token, auto-refreshing
// the OAuth token if it's within REFRESH_WINDOW_MS of expiring. Square access
// tokens expire after ~30 days; refresh tokens last ~365 days.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv, SQUARE_API_VERSION } from "@/lib/square/config";

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // refresh if <7d to expiry

export type ActiveSquareConnection = {
  access_token: string;
  refresh_token: string | null;
  merchant_id: string;
  location_id: string | null;
  currency: string | null;
  status: string;
};

export async function getActiveSquareConnection(
  clinicId: string,
): Promise<ActiveSquareConnection> {
  const { data: row, error } = await supabaseAdmin
    .from("clinic_square_connections")
    .select(
      "access_token, refresh_token, token_expires_at, merchant_id, location_id, currency, status",
    )
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Square is not connected for this clinic.");
  if (row.status !== "active") throw new Error("Square connection is not active.");

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const needsRefresh =
    !!row.refresh_token && (!expiresAt || expiresAt - Date.now() < REFRESH_WINDOW_MS);

  if (!needsRefresh) {
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      merchant_id: row.merchant_id,
      location_id: row.location_id,
      currency: row.currency,
      status: row.status,
    };
  }

  const cfg = getSquareEnv();
  const res = await fetch(`${cfg.apiBase}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION },
    body: JSON.stringify({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Square refresh failed:", res.status, t);
    // Mark as needing reconnect, but still return the existing token so the
    // current request can attempt to proceed (Square may still accept it).
    await supabaseAdmin
      .from("clinic_square_connections")
      .update({ status: "needs_reauth" })
      .eq("clinic_id", clinicId);
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      merchant_id: row.merchant_id,
      location_id: row.location_id,
      currency: row.currency,
      status: row.status,
    };
  }

  const tok = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    merchant_id: string;
  };

  await supabaseAdmin
    .from("clinic_square_connections")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? row.refresh_token,
      token_expires_at: tok.expires_at,
      last_refreshed_at: new Date().toISOString(),
      status: "active",
    })
    .eq("clinic_id", clinicId);

  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? row.refresh_token,
    merchant_id: tok.merchant_id ?? row.merchant_id,
    location_id: row.location_id,
    currency: row.currency,
    status: "active",
  };
}

export const sqHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "Square-Version": SQUARE_API_VERSION,
});
