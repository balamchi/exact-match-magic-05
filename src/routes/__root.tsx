import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

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
      { title: "ClinicPro — The Operating System for Modern Clinics" },
      {
        name: "description",
        content:
          "ClinicPro replaces 8–12 separate tools with a single platform built for medical aesthetic, dental, and beauty clinics. Booking, CRM, consent, payments, and more.",
      },
      { name: "author", content: "Divan Group" },
      { property: "og:title", content: "ClinicPro — The Operating System for Modern Clinics" },
      { property: "og:description", content: "Pixel Perfect is a web application that precisely replicates a given screenshot, building a complete, functional interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClinicPro — The Operating System for Modern Clinics" },
      { name: "description", content: "Pixel Perfect is a web application that precisely replicates a given screenshot, building a complete, functional interface." },
      { name: "twitter:description", content: "Pixel Perfect is a web application that precisely replicates a given screenshot, building a complete, functional interface." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/64ea00ac-1885-45d5-8627-f6ca465bde36/id-preview-3c408641--0ca7d476-8ff5-4600-a39f-324134b46513.lovable.app-1776918790464.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/64ea00ac-1885-45d5-8627-f6ca465bde36/id-preview-3c408641--0ca7d476-8ff5-4600-a39f-324134b46513.lovable.app-1776918790464.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@500;600;700&family=Caveat:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
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
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" />
    </AuthProvider>
  );
}
