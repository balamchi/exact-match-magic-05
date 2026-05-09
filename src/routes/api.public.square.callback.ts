import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSquareEnv, SQUARE_API_VERSION } from "@/lib/square/config";

// GET /api/public/square/callback?code=xxx&state=xxx
// Exchanges code for tokens, fetches merchant info, persists to clinic_square_connections, then redirects to /app/settings?tab=integrations&square=connected.

export const Route = createFileRoute("/api/public/square/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        const origin = url.origin;

        if (errorParam) return redirectBack(origin, "error", errorParam);
        if (!code || !state) return redirectBack(origin, "error", "missing_params");

        const cfg = getSquareEnv();
        const clinicId = await verifyState(state, cfg.appSecret);
        if (!clinicId) return redirectBack(origin, "error", "invalid_state");

        // Exchange code for tokens
        const tokenRes = await fetch(`${cfg.apiBase}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION },
          body: JSON.stringify({
            client_id: cfg.appId,
            client_secret: cfg.appSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: cfg.redirectUri,
          }),
        });

        if (!tokenRes.ok) {
          const txt = await tokenRes.text();
          console.error("Square token exchange failed:", tokenRes.status, txt);
          return redirectBack(origin, "error", "token_exchange_failed");
        }
        const tok = (await tokenRes.json()) as {
          access_token: string;
          refresh_token: string;
          expires_at: string;
          merchant_id: string;
        };

        // Fetch merchant info for business name / currency / country
        let businessName: string | null = null;
        let country: string | null = null;
        let currency = "CAD";
        let locationId: string | null = null;
        try {
          const merchRes = await fetch(`${cfg.apiBase}/v2/merchants/${tok.merchant_id}`, {
            headers: { Authorization: `Bearer ${tok.access_token}`, "Square-Version": SQUARE_API_VERSION },
          });
          if (merchRes.ok) {
            const m = (await merchRes.json()) as { merchant?: { business_name?: string; country?: string; currency?: string; main_location_id?: string } };
            businessName = m.merchant?.business_name ?? null;
            country = m.merchant?.country ?? null;
            currency = m.merchant?.currency ?? currency;
            locationId = m.merchant?.main_location_id ?? null;
          }
        } catch (e) {
          console.warn("Could not fetch merchant info:", e);
        }

        // If no main_location_id from merchant, fetch first location
        if (!locationId) {
          try {
            const locRes = await fetch(`${cfg.apiBase}/v2/locations`, {
              headers: { Authorization: `Bearer ${tok.access_token}`, "Square-Version": SQUARE_API_VERSION },
            });
            if (locRes.ok) {
              const l = (await locRes.json()) as { locations?: Array<{ id: string }> };
              locationId = l.locations?.[0]?.id ?? null;
            }
          } catch {}
        }

        // Upsert into clinic_square_connections (one row per clinic; UNIQUE on clinic_id)
        const { error } = await supabaseAdmin
          .from("clinic_square_connections")
          .upsert(
            {
              clinic_id: clinicId,
              merchant_id: tok.merchant_id,
              access_token: tok.access_token,
              refresh_token: tok.refresh_token,
              token_expires_at: tok.expires_at,
              location_id: locationId,
              business_name: businessName,
              country,
              currency,
              status: "active",
              last_refreshed_at: new Date().toISOString(),
            },
            { onConflict: "clinic_id" },
          );

        if (error) {
          console.error("Failed to save Square connection:", error);
          return redirectBack(origin, "error", "save_failed");
        }

        return redirectBack(origin, "connected", businessName ?? tok.merchant_id);
      },
    },
  },
});

function redirectBack(origin: string, status: "connected" | "error", detail: string) {
  const u = new URL("/app/settings", origin);
  u.searchParams.set("tab", "integrations");
  u.searchParams.set("square", status);
  u.searchParams.set("detail", detail);
  return Response.redirect(u.toString(), 302);
}

async function verifyState(state: string, secret: string): Promise<string | null> {
  try {
    const [b64Clinic, b64Sig] = state.split(".");
    if (!b64Clinic || !b64Sig) return null;
    const clinicId = atob(b64Clinic);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expected = await crypto.subtle.sign("HMAC", key, enc.encode(clinicId));
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected)));
    if (expectedB64 !== b64Sig) return null;
    return clinicId;
  } catch {
    return null;
  }
}
