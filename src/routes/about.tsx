import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart, Users, Globe, Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — ClinicPro" },
      { name: "description", content: "ClinicPro was built by clinic owners, for clinic owners. Learn about our mission to simplify clinic operations worldwide." },
      { property: "og:title", content: "About — ClinicPro" },
      { property: "og:description", content: "Our mission to simplify clinic operations worldwide." },
    ],
  }),
});

const VALUES = [
  { icon: Heart, title: "Clinic-First", desc: "Every feature is designed around real clinic workflows — not generic business software adapted after the fact." },
  { icon: Shield, title: "Security & Compliance", desc: "HIPAA-ready architecture with row-level security, encrypted data at rest, and audit-ready consent tracking." },
  { icon: Globe, title: "Global Reach", desc: "Multi-language (5 languages), multi-currency, and multi-location support from day one." },
  { icon: Users, title: "Built Together", desc: "Our roadmap is shaped by 200+ clinic owners who use ClinicPro daily and share feedback weekly." },
];

const TIMELINE = [
  { year: "2024", title: "The idea", desc: "Frustrated by using 12 separate tools to run a single clinic, we started building ClinicPro." },
  { year: "2025", title: "Launch", desc: "ClinicPro launched with booking, CRM, payments, and clinical tools. First 100 clinics onboarded." },
  { year: "2026", title: "AI & Scale", desc: "AI Schedule Optimizer, visual automations, multi-language support, and 1,000+ clinics worldwide." },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-xl font-bold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
            ClinicPro
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/about" className="text-sm font-medium text-primary">About</Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-primary shadow-glow">Start free trial</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">About ClinicPro</p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">
            Built by clinic owners,{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">for clinic owners.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            We believe running a world-class clinic shouldn't require a dozen disconnected tools, a dedicated IT team, 
            and weeks of training. ClinicPro is the operating system that brings everything together in one beautiful, 
            fast, dark-themed dashboard.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="font-display text-2xl font-bold mb-8">Our Values</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border/50 bg-card/60 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="font-display text-2xl font-bold mb-10">Our Journey</h2>
          <div className="space-y-8">
            {TIMELINE.map((t, i) => (
              <div key={t.year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow">
                    {t.year.slice(2)}
                  </div>
                  {i < TIMELINE.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
                </div>
                <div className="pb-8">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t.year}</p>
                  <h3 className="mt-1 text-lg font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-20 text-center">
        <h2 className="font-display text-3xl font-bold">Join 1,000+ clinics worldwide</h2>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          Start your 14-day free trial. No credit card required.
        </p>
        <div className="mt-6">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary shadow-glow gap-2">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
