import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar, Users, CreditCard, FileText, BarChart3, Shield,
  Zap, Bot, Syringe, Sparkles, Heart, Send, CheckCircle2,
  ArrowRight, Globe, Package, Star, Boxes, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
  head: () => ({
    meta: [
      { title: "Features — ClinicPro Clinic Management Platform" },
      { name: "description", content: "Explore 50+ features built for medical aesthetic, dental, and beauty clinics. Booking, CRM, payments, AI, clinical tools, and more." },
      { property: "og:title", content: "Features — ClinicPro" },
      { property: "og:description", content: "50+ features purpose-built for modern clinics." },
    ],
  }),
});

const CATEGORIES = [
  {
    title: "Scheduling & Booking",
    description: "Fill your calendar effortlessly",
    features: [
      { icon: Calendar, name: "Online Booking Widget", desc: "Let clients book 24/7 from your website or social media" },
      { icon: Clock, name: "AI Schedule Optimizer", desc: "AI finds gaps and suggests how to fill them" },
      { icon: Users, name: "Check-In & Kiosk Mode", desc: "Self-check-in with digital forms on a tablet" },
      { icon: Zap, name: "Automated Reminders", desc: "SMS + email reminders reduce no-shows by 60%" },
    ],
  },
  {
    title: "Client Management",
    description: "Know every client inside and out",
    features: [
      { icon: Users, name: "Full CRM", desc: "Client profiles with history, notes, tags, and preferences" },
      { icon: Heart, name: "Medical Alerts", desc: "Allergies, medications, and conditions always visible" },
      { icon: Star, name: "Loyalty & Rewards", desc: "Points-based loyalty program with tier upgrades" },
      { icon: Globe, name: "Self-Service Portal", desc: "Clients view history, rebook, and update their info" },
    ],
  },
  {
    title: "Revenue & Payments",
    description: "Get paid faster, earn more per visit",
    features: [
      { icon: CreditCard, name: "POS & Payments", desc: "Card, tap, cash, and Buy Now Pay Later in one screen" },
      { icon: FileText, name: "Invoices & Receipts", desc: "Professional invoices with tax calculation" },
      { icon: Package, name: "Packages & Memberships", desc: "Prepaid sessions and monthly membership plans" },
      { icon: Sparkles, name: "Gift Cards & Coupons", desc: "Digital gift cards and promo codes that drive referrals" },
    ],
  },
  {
    title: "Clinical Tools",
    description: "Purpose-built for aesthetic & medical",
    features: [
      { icon: Syringe, name: "Injection Mapping", desc: "Record injection sites, products, and units per region" },
      { icon: Shield, name: "Digital Consent Forms", desc: "E-signatures with version tracking and PDF export" },
      { icon: FileText, name: "SOAP Notes & EMR", desc: "Structured clinical notes with sign-off workflow" },
      { icon: Heart, name: "Before / After Gallery", desc: "Track visual progress with consent-gated photos" },
    ],
  },
  {
    title: "Marketing & Growth",
    description: "Grow your practice on autopilot",
    features: [
      { icon: Send, name: "Email Campaigns", desc: "Visual email builder with audience segmentation" },
      { icon: Zap, name: "Visual Automations", desc: "Drag-and-drop workflow builder for follow-ups" },
      { icon: Star, name: "Reviews & Reputation", desc: "Collect Google reviews and monitor your rating" },
      { icon: BarChart3, name: "Reports Suite", desc: "Revenue, clients, staff, inventory — 7 report categories" },
    ],
  },
  {
    title: "AI & Intelligence",
    description: "Let AI handle the busy work",
    features: [
      { icon: Bot, name: "AI Copy Assistant", desc: "Generate marketing copy, bios, and email templates" },
      { icon: Clock, name: "Schedule Optimizer", desc: "AI analyzes gaps, overlaps, and demand patterns" },
      { icon: Boxes, name: "Inventory Alerts", desc: "Smart reorder notifications before you run out" },
      { icon: Globe, name: "Multi-Language", desc: "Full UI in English, French, Spanish, Farsi, and Arabic" },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-xl font-bold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
            ClinicPro
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/features" className="text-sm font-medium text-primary">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary shadow-glow">Start free trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
          50+ features.{" "}
          <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">One platform.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Everything your clinic needs to book, treat, grow, and get paid — without juggling a dozen apps.
        </p>
      </section>

      {/* Feature Categories */}
      <section className="mx-auto max-w-7xl px-6 pb-24 space-y-16">
        {CATEGORIES.map((cat, ci) => (
          <div key={cat.title}>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold">{cat.title}</h2>
              <p className="text-muted-foreground">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cat.features.map((f) => (
                <div
                  key={f.name}
                  className="group rounded-2xl border border-border/50 bg-card/60 p-5 transition-all hover:border-primary/40 hover:shadow-glow"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-gradient-to-b from-primary/5 to-background py-20 text-center">
        <h2 className="font-display text-3xl font-bold">Ready to see it in action?</h2>
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
