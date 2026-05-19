import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
// Force rebuild for env injection
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/locale-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";
import { initSentry, Sentry } from "@/lib/sentry";

if (typeof window !== "undefined") {
  initSentry();
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { httpEquiv: "Cache-Control", content: "no-cache, no-store, must-revalidate" },
      { httpEquiv: "Pragma", content: "no-cache" },
      { httpEquiv: "Expires", content: "0" },
      { title: "ClinicPro — Run a clinic, not software." },
      {
        name: "description",
        content:
          "The operating system for modern clinics. Booking, payments, marketing, consent forms, AI insights — pre-loaded with 322 services and 73 forms. From $39/mo USD. 7-day free trial.",
      },
      { name: "author", content: "Divan Group" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#9333EA" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ClinicPro" },
      { name: "msapplication-TileColor", content: "#9333EA" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ClinicPro" },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: "ClinicPro — Run a clinic, not software." },
      { property: "og:description", content: "The operating system for modern clinics. Booking, payments, marketing, consent forms, AI insights — pre-loaded with 322 services and 73 forms." },
      { property: "og:image", content: "https://clinicpro.io/og-image.png" },
      { property: "og:url", content: "https://clinicpro.io" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@clinicpro_io" },
      { name: "twitter:title", content: "ClinicPro — Run a clinic, not software." },
      { name: "twitter:description", content: "All-in-one for aesthetic, beauty, dental & wellness clinics." },
      { name: "twitter:image", content: "https://clinicpro.io/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@500;600;700&family=Caveat:wght@500;700&family=Vazirmatn:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('clinicpro:theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}}catch(e){}})()` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error: _error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <h1 className="font-display text-xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We've been notified. Please try again or contact support if it persists.
            </p>
            <button
              onClick={resetError}
              className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    >
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <Outlet />
            <Toaster />
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}
// Trigger fresh production build - 20260504T234141Z
