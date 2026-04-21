import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, CalendarDays, Users, Shield, BarChart3, Zap, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  { icon: CalendarDays, title: "Smart booking", desc: "Online scheduling with deposits, waitlists, and automated reminders." },
  { icon: Users, title: "Unified CRM", desc: "Every client, treatment, photo, and note in one searchable record." },
  { icon: Shield, title: "Digital consent", desc: "Send, sign, and store consent forms with audit-ready compliance." },
  { icon: BarChart3, title: "Powerful reports", desc: "Revenue, retention, staff performance — every metric that matters." },
  { icon: Zap, title: "Automations", desc: "Follow-ups, recalls, and review requests run themselves." },
  { icon: Globe, title: "Multilingual", desc: "English, Persian, French, Arabic, Spanish — from day one." },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">ClinicPro</span>
          </Link>
          <nav className="flex items-center gap-2">
            {!loading && user ? (
              <Link
                to="/app/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/auth/sign-in" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
                  Sign in
                </Link>
                <Link
                  to="/auth/sign-up"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Now in private beta — Toronto · Montreal · Dubai · LA
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl md:text-7xl">
            The operating system for{" "}
            <span className="bg-gradient-to-r from-primary to-[oklch(0.78_0.18_320)] bg-clip-text text-transparent">
              modern clinics.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
            Replace 8–12 separate tools with one unified platform built specifically for medical aesthetic,
            dental, and beauty clinics.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-elevated"
            >
              See what's inside
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/50 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Everything in one place</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Built for the clinic, not bolted on.</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/40">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© 2026 ClinicPro · Divan Group</span>
          <span className="font-signature text-base text-foreground/70">crafted with care</span>
        </div>
      </footer>
    </div>
  );
}
