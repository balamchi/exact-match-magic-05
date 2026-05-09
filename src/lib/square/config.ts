// Square API configuration shared between server routes and server functions.
// Reads from process.env at call-time only (never module-scope) so client bundles never see secrets.

export const SQUARE_API_VERSION = "2025-01-23";

export function getSquareEnv() {
  const env = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();
  const isProd = env === "production";
  return {
    isProd,
    apiBase: isProd ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com",
    appId: process.env.SQUARE_APPLICATION_ID ?? "",
    appSecret: process.env.SQUARE_APPLICATION_SECRET ?? "",
    redirectUri: process.env.SQUARE_REDIRECT_URI ?? "",
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
  };
}

export const SQUARE_OAUTH_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "CUSTOMERS_READ",
  "CUSTOMERS_WRITE",
  "ITEMS_READ",
  "ITEMS_WRITE",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
  "SUBSCRIPTIONS_READ",
  "SUBSCRIPTIONS_WRITE",
  "INVOICES_READ",
  "INVOICES_WRITE",
].join("+");
