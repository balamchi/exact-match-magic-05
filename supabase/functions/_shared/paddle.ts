import { Environment, Paddle, EventName } from "npm:@paddle/paddle-node-sdk";

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };
export type PaddleEnv = "sandbox" | "live";

export class WebhookAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookAuthError";
  }
}

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/paddle";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PADDLE_SANDBOX_API_KEY")
    : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
    },
  } as any);
}

export async function gatewayFetch(env: PaddleEnv, path: string, init?: RequestInit): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelCaseKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(camelCaseKeys);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [toCamelCase(k), camelCaseKeys(v)])
    );
  }
  return val;
}

export async function verifyWebhook(req: Request, env: PaddleEnv): Promise<any> {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();

  if (!signature || !body) {
    console.error("Webhook auth failed: missing Paddle-Signature header or body");
    throw new WebhookAuthError("Missing signature or body");
  }

  // Parse ts=<timestamp>;h1=<hmac> from Paddle-Signature header
  const parts: Record<string, string> = {};
  for (const part of signature.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) parts[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const { ts, h1 } = parts;

  if (!ts || !h1) {
    console.error("Webhook auth failed: malformed Paddle-Signature header", { signature });
    throw new WebhookAuthError("Malformed Paddle-Signature header");
  }

  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp)) {
    console.error("Webhook auth failed: non-numeric timestamp", { ts });
    throw new WebhookAuthError("Non-numeric timestamp");
  }

  // Reject requests older than 5 minutes (replay attack prevention)
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSecs = Math.abs(nowSeconds - timestamp);
  if (ageSecs > 300) {
    console.error("Webhook auth failed: timestamp outside 5-minute window", { ts, nowSeconds, ageSecs });
    throw new WebhookAuthError("Timestamp expired");
  }

  // Compute HMAC-SHA256 of "<ts>:<body>" using the webhook secret
  const secret = getWebhookSecret(env);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}:${body}`));
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!timingSafeEqual(expectedHex, h1)) {
    console.error("Webhook auth failed: HMAC signature mismatch");
    throw new WebhookAuthError("Invalid signature");
  }

  // Signature valid — parse body and convert snake_case keys to camelCase
  return camelCaseKeys(JSON.parse(body));
}
