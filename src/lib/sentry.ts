import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const SENTRY_ENV = (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? "development";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!SENTRY_DSN) {
    // No DSN configured — skip silently in local dev.
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: SENTRY_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip patient PII from breadcrumbs and error context.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  initialized = true;
}

export function setSentryUser(userId: string | null, clinicId: string | null) {
  if (!initialized) return;
  if (!userId) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: userId });
  Sentry.setTag("clinic_id", clinicId ?? "none");
}

export { Sentry };
