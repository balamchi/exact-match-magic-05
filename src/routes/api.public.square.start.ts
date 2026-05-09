import { createFileRoute } from "@tanstack/react-router";
import { getSquareEnv, SQUARE_OAUTH_SCOPES } from "@/lib/square/config";

// GET /api/public/square/start?clinic_id=xxx
// Redirects the browser to Square's OAuth authorize page.
// `state` carries the clinic_id (signed via shared secret) so the callback can verify it.

export const Route = createFileRoute("/api/public/square/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clinicId = url.searchParams.get("clinic_id");
        if (!clinicId) return new Response("Missing clinic_id", { status: 400 });

        const cfg = getSquareEnv();
        if (!cfg.appId || !cfg.redirectUri) {
          return new Response("Square not configured", { status: 500 });
        }

        // Sign state: base64(clinic_id).hmac
        const state = await signState(clinicId, cfg.appSecret);

        const authUrl = new URL(`${cfg.apiBase}/oauth2/authorize`);
        authUrl.searchParams.set("client_id", cfg.appId);
        // Square expects '+' separated scopes; URLSearchParams encodes them as %20 — set raw.
        const params = `client_id=${encodeURIComponent(cfg.appId)}&scope=${SQUARE_OAUTH_SCOPES}&session=false&state=${encodeURIComponent(state)}`;
        return Response.redirect(`${cfg.apiBase}/oauth2/authorize?${params}`, 302);
      },
    },
  },
});

async function signState(clinicId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(clinicId));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${btoa(clinicId)}.${sigB64}`;
}
