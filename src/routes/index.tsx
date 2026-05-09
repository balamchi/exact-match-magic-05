import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Sparkles,
  CreditCard,
  Send,
  FileText,
  Target,
  BarChart3,
  Globe,
  Check,
  Star,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ClinicPro — Run a clinic, not software." },
      {
        name: "description",
        content:
          "The operating system for modern clinics. Booking, payments, marketing, consent forms, AI insights — pre-loaded with 322 services and 73 forms. Free 14-day trial. From $69/mo.",
      },
      { name: "keywords", content: "clinic software, medical spa software, aesthetic clinic CRM, beauty salon booking, dental practice management, clinic operating system, MedSpa CRM, BeautyTech, ClinicTech" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "ClinicPro — Run a clinic, not software." },
      {
        property: "og:description",
        content: "The operating system for modern clinics. Pre-loaded with 322 services and 73 consent forms. Ready in 10 minutes.",
      },
      { property: "og:url", content: "https://clinicpro.io" },
      { property: "og:image", content: "https://clinicpro.io/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "ClinicPro" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@clinicpro_io" },
      { name: "twitter:title", content: "ClinicPro — Run a clinic, not software." },
      { name: "twitter:description", content: "The operating system for modern clinics." },
      { name: "twitter:image", content: "https://clinicpro.io/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clinicpro.io/" }],
  }),
});

/* ------------------------------ Brand mark ------------------------------ */
function Mark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="inline-flex items-center justify-center rounded-[9px] shadow-glow"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #9333EA, #D946EF)",
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 120 120" fill="none" aria-hidden>
        <path d="M60 18 L66 50 L98 60 L66 70 L60 102 L54 70 L22 60 L54 50 Z" fill="white" />
      </svg>
    </div>
  );
}

/* ------------------------------ Buttons ------------------------------ */
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl px-[18px] py-[10px] text-sm font-semibold text-foreground transition shadow-[0_4px_20px_-4px_rgba(147,51,234,0.5)] hover:shadow-[0_6px_24px_-4px_rgba(147,51,234,0.7)] hover:-translate-y-px [background:linear-gradient(135deg,#9333EA,#7E22CE)] hover:[background:linear-gradient(135deg,#A855F7,#9333EA)]";
const btnPrimaryLg =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-foreground transition shadow-[0_4px_20px_-4px_rgba(147,51,234,0.5)] hover:shadow-[0_6px_24px_-4px_rgba(147,51,234,0.7)] hover:-translate-y-px [background:linear-gradient(135deg,#9333EA,#7E22CE)] hover:[background:linear-gradient(135deg,#A855F7,#9333EA)]";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-foreground/[0.05] px-6 py-3.5 text-[15px] font-semibold text-foreground transition hover:bg-foreground/[0.08]";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl px-[18px] py-[10px] text-sm font-medium text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground";

/* ------------------------------ Data ------------------------------ */
const PAINS = [
  "15+ hours/week chasing no-shows and rescheduling appointments",
  "$4–8k/month leaking from broken booking widgets and unconfirmed deposits",
  "Paper consent forms that expose clinics to legal liability",
  "No central inbox — texts, emails, WhatsApp messages get lost",
  "Marketing tools and clinic software don't talk to each other",
  "Most CRMs ship empty — months of setup before first booking",
  "Existing tools cost $400–600/mo and still need 4 add-ons",
];

const FEATURES = [
  { icon: Calendar, title: "AI-Powered Booking", desc: "Online booking widget that fills your calendar 24/7. AI optimization fills gaps automatically. Multi-provider, multi-location, group classes — all included.", meta: "VS BOULEVARD — 100% PARITY" },
  { icon: Users, title: "Smart CRM with Memory", desc: "Every client. Every visit. Every formula. Auto-tags by behavior, predicts churn, surfaces VIPs. Family linking, document vault, photo galleries — all in one profile.", meta: "VS MINDBODY — BEATS ON SPEED" },
  { icon: CreditCard, title: "Integrated Payments", desc: "Card processing, tap-to-pay, Apple/Google Pay. Deposits, BNPL, gift cards, packages, memberships — collect the way clients want to pay.", meta: "2.7% + 30¢ TRANSACTION FEE" },
  { icon: Send, title: "Marketing on Autopilot", desc: "SMS, email, and WhatsApp campaigns from one inbox. 43 automation templates ready: birthday gifts, win-back, review requests, lead response. Zero setup.", meta: "WHATSAPP — UNIQUE FEATURE" },
  { icon: FileText, title: "73 Consent Forms Ready", desc: "Botox, fillers, laser, PMU, dental, derm, wellness — all consent forms drafted by lawyers, e-signature ready, multi-language (EN/FA/AR/FR/ES).", meta: "SHIP READY · LEGAL COMPLIANT" },
  { icon: Target, title: "Clinical Tools (Aesthetic Edition)", desc: "Injection mapping with overlay photos. SOAP notes with voice transcription. Treatment plans. Before/after galleries. Batch/lot tracking for compliance.", meta: "MEDICAL-GRADE FEATURES" },
  { icon: BarChart3, title: "40+ Reports + AI Insights", desc: "Revenue, retention, marketing ROI, staff performance — instant. AI surfaces churn risks, no-show predictions, and revenue opportunities you'd miss.", meta: "BENCHMARK VS PEERS" },
  { icon: Globe, title: "Multi-Location, Multi-Language", desc: "One account for all locations. Five languages including Persian and Arabic with full RTL support — uniquely built for North America, UK, and Middle East markets.", meta: "5 LANGUAGES · RTL READY" },
  { icon: Sparkles, title: "AI Throughout", desc: "Smart copy generator. Churn prediction. Schedule optimizer. Voice-to-SOAP transcription. Review response drafter. AI is built in — not bolted on.", meta: "POWERED BY AI" },
];

const COMPARISON_ROWS: Array<{ feature: string; mb: string; bd: string; fr: string; vg: string; us: string; mbT?: "yes"|"no"|"meh"|"plain"; bdT?: "yes"|"no"|"meh"|"plain"; frT?: "yes"|"no"|"meh"|"plain"; vgT?: "yes"|"no"|"meh"|"plain" }> = [
  { feature: "Pre-loaded services & forms", mb: "No", bd: "No", fr: "No", vg: "No", us: "322 + 73", mbT: "no", bdT: "no", frT: "no", vgT: "no" },
  { feature: "AI-powered scheduling", mb: "Limited", bd: "Yes", fr: "No", vg: "No", us: "Yes", mbT: "meh", bdT: "yes", frT: "no", vgT: "no" },
  { feature: "WhatsApp Business", mb: "Limited", bd: "No", fr: "Limited", vg: "No", us: "Native", mbT: "meh", bdT: "no", frT: "meh", vgT: "no" },
  { feature: "Multi-language (EN/FA/AR/FR/ES)", mb: "EN only", bd: "EN only", fr: "15+ langs", vg: "EN only", us: "5 + RTL", mbT: "no", bdT: "no", frT: "meh", vgT: "no" },
  { feature: "Injection mapping", mb: "No", bd: "Yes", fr: "No", vg: "No", us: "Yes", mbT: "no", bdT: "yes", frT: "no", vgT: "no" },
  { feature: "SOAP notes + EMR", mb: "Limited", bd: "Yes", fr: "No", vg: "No", us: "Yes", mbT: "meh", bdT: "yes", frT: "no", vgT: "no" },
  { feature: "Built-in AI insights", mb: "Limited", bd: "Yes", fr: "No", vg: "No", us: "GPT-4", mbT: "meh", bdT: "yes", frT: "no", vgT: "no" },
  { feature: "Multi-vertical (med spa + dental + wellness)", mb: "No", bd: "No", fr: "No", vg: "No", us: "Yes", mbT: "no", bdT: "no", frT: "no", vgT: "no" },
  { feature: "Setup time", mb: "Weeks", bd: "Days", fr: "Days", vg: "Days", us: "10 min", mbT: "plain", bdT: "plain", frT: "plain", vgT: "plain" },
  { feature: "Starting price (per location)", mb: "$199/mo", bd: "$176/mo", fr: "Free*", vg: "$50/mo", us: "$69/mo", mbT: "plain", bdT: "plain", frT: "plain", vgT: "plain" },
];

const PLANS = [
  { name: "Starter", tag: "For solo or small clinics", price: "$69", annual: "$59", annualTotal: "$708", per: "/mo", featured: false, features: ["Up to 3 staff members", "1 location", "Online booking + Calendar", "CRM with 322 services pre-loaded", "SMS + Email (1,000 messages)", "10 consent form templates", "Integrated payments + deposits", "Basic reports"] },
  { name: "Professional", tag: "For established clinics", price: "$199", annual: "$169", annualTotal: "$2,028", per: "/mo", featured: true, features: ["Up to 10 staff members", "Up to 3 locations", "Everything in Starter, plus:", "All 73 consent forms", "43 marketing automations", "WhatsApp Business integration", "5,000 SMS · 25,000 emails", "Injection mapping (Aesthetic)", "Gift cards + Memberships + Loyalty", "Advanced reports + Benchmarking"] },
  { name: "Growth", tag: "For multi-location & franchises", price: "$449", annual: "$379", annualTotal: "$4,548", per: "/mo", featured: false, features: ["Unlimited staff", "Unlimited locations", "Everything in Professional, plus:", "AI Assistant", "Smart scheduling", "Voice-to-SOAP transcription", "Predictive churn analysis", "Custom report builder", "API access + webhooks", "Priority support"] },
  { name: "Enterprise", tag: "For franchises & networks", price: "Custom", annual: "Custom", annualTotal: "", per: "", featured: false, features: ["Everything in Growth, plus:", "White-label option", "Custom integrations", "Dedicated account manager", "SLA + 99.99% uptime guarantee", "HIPAA + SOC 2 compliance pack", "Custom training + onboarding", "Volume pricing on transactions"] },
];

const TESTIMONIALS = [
  { stars: 5, quote: "ClinicPro replaced 4 tools and saved us $200/month while giving us 3x the features. The 73 pre-loaded consent forms alone saved weeks of legal work.", author: "Dr. Maria", role: "Owner, Roda Clinic, Toronto", initials: "MR" },
  { stars: 5, quote: "I run clinics in Toronto and Dubai. ClinicPro is the only platform that properly supports Persian and Arabic with right-to-left layouts. WhatsApp integration alone justified switching.", author: "Dr. Ahmad", role: "Founder, Dr. Ariana Aesthetics, Dubai", initials: "DA" },
  { stars: 5, quote: "Took my first booking 12 minutes after signing up. The Botox annual package template alone has driven $48k in pre-paid revenue this quarter.", author: "Lana", role: "Owner, Lavista Cosmetic, Toronto", initials: "LA" },
];

const CLINIC_NAMES = ["Roda Clinic", "Lavista Cosmetic", "Dr. Ariana Aesthetics", "Glow Med Spa", "Zenith Dental"];

/* ------------------------------ Page ------------------------------ */
function Landing() {
  const { user, loading } = useAuth();
  const ctaHref = !loading && user ? "/app/dashboard" : "/auth/sign-up";
  const [demoOpen, setDemoOpen] = useState(false);
  const [pricingInterval, setPricingInterval] = useState<"monthly" | "annual">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 70% -100px, rgba(147, 51, 234, 0.15), transparent 60%), radial-gradient(ellipse 600px 400px at 0% 80%, rgba(217, 70, 239, 0.08), transparent 60%)",
        }}
      />

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-[18px] sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-[22px] font-bold tracking-tight">ClinicPro</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Features</a>
            <a href="#vs" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Compare</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Pricing</a>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {!loading && user ? (
              <Link to="/app/dashboard" className={btnPrimary}>Open dashboard <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <>
                <Link to="/auth/sign-in" className={btnGhost}>Sign in</Link>
                <Link to="/auth/sign-up" className={btnPrimary}>Start free trial</Link>
              </>
            )}
          </div>
          {/* Mobile hamburger */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <div className="space-y-1.5">
              <span className={`block h-0.5 w-5 bg-foreground transition ${mobileMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition ${mobileMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-foreground transition ${mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/60 bg-background/95 px-5 pb-6 pt-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-muted-foreground">Features</a>
              <a href="#vs" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-muted-foreground">Compare</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-muted-foreground">Pricing</a>
              <div className="mt-2 flex flex-col gap-2">
                {!loading && user ? (
                  <Link to="/app/dashboard" className={`${btnPrimary} w-full justify-center`}>Open dashboard</Link>
                ) : (
                  <>
                    <Link to="/auth/sign-in" className={`${btnGhost} w-full justify-center border border-border`}>Sign in</Link>
                    <Link to="/auth/sign-up" className={`${btnPrimary} w-full justify-center`}>Start free trial</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative z-10 px-5 pb-20 pt-[120px] sm:px-8 max-md:pt-16 max-md:pb-10">
        <div className="mx-auto max-w-[980px] text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-[oklch(0.7_0.22_300)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-glow" />
            </span>
            Trusted by clinics in Toronto · Dubai · LA · London
          </div>
          <h1 className="font-display text-[clamp(2.5rem,8vw,96px)] font-bold leading-[1] tracking-[-0.035em]">
            Run a clinic,<br />
            not{" "}
            <em
              className="italic text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #A855F7, #D946EF)", WebkitBackgroundClip: "text" }}
            >
              software
            </em>
            .
          </h1>
          <p className="mx-auto mt-7 max-w-[720px] text-[clamp(1rem,2.5vw,22px)] leading-[1.5] text-zinc-300">
            The operating system clinics use to manage everything — booking, payments, marketing, consent forms,
            injection mapping, AI insights. Pre-loaded with 322 services and 73 forms. Ready in 10 minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to={ctaHref} className={`${btnPrimaryLg} w-full sm:w-auto`}>Start free 14-day trial <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={() => setDemoOpen(true)} className={`${btnSecondary} w-full sm:w-auto`}>Watch 2-min demo</button>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {["No credit card required", "Setup in 10 minutes", "Migrate from Boulevard or Mindbody free"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-success/40 bg-success/15 text-[9px] font-bold text-success">
                  <Check className="h-2 w-2" strokeWidth={4} />
                </span>
                {t}
              </span>
            ))}
          </div>

          {/* Hero dashboard mock */}
          <div className="relative mx-auto mt-16 rounded-[24px] p-0.5 [background:linear-gradient(135deg,rgba(147,51,234,0.15),rgba(217,70,239,0.1))] shadow-[0_50px_100px_-20px_rgba(147,51,234,0.4)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 -z-10"
              style={{ background: "radial-gradient(ellipse at center, rgba(147,51,234,0.2), transparent 60%)" }}
            />
            <div className="overflow-hidden rounded-[22px] bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 bg-card px-5 py-3.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c940]" />
                <div className="flex-1 text-center font-mono text-xs text-muted-foreground">app.clinicpro.io/dashboard</div>
              </div>
              <div className="grid min-h-[320px] grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:min-h-[480px] sm:p-8">
                <MockStat icon={Calendar} num="47" label="Today's appointments" trend="↑ 12% vs avg" />
                <MockStat icon={DollarSign} num="$14,280" label="Today's revenue" trend="↑ 34% vs avg" />
                <MockStat icon={Users} num="2,847" label="Active clients" trend="↑ 234 this month" />
                <MockStat icon={TrendingUp} num="73%" label="Rebook rate" trend="Industry: 58%" />
                <div className="col-span-2 rounded-2xl border border-primary/30 p-5 sm:col-span-4 [background:linear-gradient(135deg,rgba(217,70,239,0.1),rgba(147,51,234,0.05))]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] [background:linear-gradient(135deg,#D946EF,#9333EA)]">
                      <Sparkles className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="text-start">
                      <div className="font-display text-lg font-bold">AI Insights</div>
                      <div className="mt-1 text-sm leading-relaxed text-zinc-300">
                        12 clients at risk of churning. Activate win-back campaign — estimated recovery:{" "}
                        <strong className="text-success">$4,200</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <Section>
        <SectionLabel>The real cost of messy software</SectionLabel>
        <SectionTitle>Most clinics waste 15 hours a week on admin.</SectionTitle>
        <SectionSub>If you're using 6 disconnected tools to run your clinic, you're not running a clinic — you're running a software stack. ClinicPro replaces all of it.</SectionSub>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-surface">
            <div className="border-b border-border/60 bg-[rgba(244,63,94,0.05)] px-7 py-6">
              <h3 className="font-display text-xl font-semibold">What clinic owners told us</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">From 100+ interviews with med spa owners across North America</p>
            </div>
            <ul>
              {PAINS.map((p) => (
                <li key={p} className="flex items-center gap-3.5 border-b border-border/60 px-7 py-[18px] last:border-b-0">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.1)] text-sm font-bold text-[#F43F5E]">!</span>
                  <span className="text-sm text-zinc-300">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-primary/30 p-10 lg:sticky lg:top-24 [background:linear-gradient(135deg,rgba(147,51,234,0.08),rgba(217,70,239,0.04))]">
            <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.7_0.22_300)]">ClinicPro fixes this</div>
            <h3 className="font-display text-3xl font-bold leading-[1.1] tracking-tight">
              One platform. Pre-loaded. Profitable from day one.
            </h3>
            <p className="mt-4 text-zinc-300">
              Booking, payments, CRM, marketing, consent forms, injection mapping, inventory, AI — in one operating system designed by clinic owners, for clinic owners.
            </p>
            <div className="my-6 grid grid-cols-2 gap-3">
              {[
                { num: "10 min", lab: "Time to first booking" },
                { num: "322", lab: "Services pre-loaded" },
                { num: "73", lab: "Consent forms ready" },
                { num: "$4,200", lab: "Avg recovered/mo via AI" },
              ].map((s) => (
                <div key={s.lab} className="rounded-xl border border-border/60 bg-foreground/[0.03] p-4">
                  <div className="font-display text-[28px] font-bold text-[oklch(0.7_0.22_300)]">{s.num}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.lab}</div>
                </div>
              ))}
            </div>
            <Link to={ctaHref} className={`${btnPrimaryLg} w-full`}>Try ClinicPro free <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </Section>

      {/* BUILT BY CLINIC OPERATORS */}
      <Section id="trust">
        <SectionLabel>Built by clinic operators</SectionLabel>
        <SectionTitle>Built by clinic operators, for clinic operators.</SectionTitle>

        {/* Logo strip */}
        <div className="mb-16">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Join clinics from</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {CLINIC_NAMES.map((name) => (
              <span key={name} className="text-sm font-semibold text-muted-foreground/50">{name}</span>
            ))}
          </div>
        </div>

        {/* Founder section */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full [background:linear-gradient(135deg,#9333EA,#D946EF)]">
              <span className="font-display text-6xl font-bold text-foreground">SB</span>
            </div>
            <h3 className="mt-6 font-display text-2xl font-bold">Shahab Balamchi</h3>
            <p className="mt-1 text-sm text-muted-foreground">Founder & CEO · Divan Digital Corp</p>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold leading-tight max-md:text-3xl">Built by clinic operators, for clinic operators.</h3>
            <p className="mt-6 text-lg leading-relaxed text-zinc-300">
              Built by Shahab Balamchi, founder of Divan Digital Corp. We've managed marketing and operations for 50+ medical aesthetic, dental, and wellness clinics across Toronto, Montreal, Dubai, and Los Angeles since 2019.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">
              We built ClinicPro because every clinic we worked with said the same thing: their software was the bottleneck, not their growth. So we replaced six tools with one operating system.
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="group rounded-2xl border border-primary/20 bg-background p-8 transition hover:border-primary/40 hover:shadow-[0_0_30px_-10px_rgba(147,51,234,0.3)]"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full [background:linear-gradient(135deg,#9333EA,#D946EF)]">
                  <span className="text-xs font-bold text-foreground">{t.initials}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <SectionLabel>Everything you need</SectionLabel>
        <SectionTitle>One platform. Eight major features. Zero compromises.</SectionTitle>
        <SectionSub>Each feature is at parity with — or better than — what the leading single-purpose tools offer. Stop paying for 6 subscriptions.</SectionSub>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-[20px] border border-border/60 bg-surface p-8 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "radial-gradient(circle at 100% 0%, rgba(147,51,234,0.08), transparent 50%)" }}
              />
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-[oklch(0.7_0.22_300)]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-[22px] font-bold leading-tight">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="mt-4 border-t border-border/60 pt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">
                {f.meta}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* COMPARISON */}
      <Section id="vs">
        <SectionLabel>How we compare</SectionLabel>
        <SectionTitle>More features. Better experience. Better price.</SectionTitle>
        <SectionSub>We took the best of every clinic SaaS, removed the bloat, added what was missing, and priced it fairly.</SectionSub>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-3xl border border-border/60 bg-surface md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Feature","Mindbody","Boulevard","Fresha","Vagaro"].map((h) => (
                    <th key={h} className="border-b border-border/60 bg-foreground/[0.03] px-5 py-[18px] text-start text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{h}</th>
                  ))}
                  <th className="border-b border-border/60 bg-primary/[0.08] px-5 py-[18px] text-start text-xs font-semibold uppercase tracking-[0.1em] text-[oklch(0.7_0.22_300)]">ClinicPro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((r) => (
                  <tr key={r.feature}>
                    <td className="border-b border-border/60 px-5 py-[18px] font-semibold text-foreground">{r.feature}</td>
                    <CompCell value={r.mb} tone={r.mbT} />
                    <CompCell value={r.bd} tone={r.bdT} />
                    <CompCell value={r.fr} tone={r.frT} />
                    <CompCell value={r.vg} tone={r.vgT} />
                    <td className="border-b border-border/60 bg-primary/[0.04] px-5 py-[18px] font-bold text-success">{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card view */}
        <div className="space-y-4 md:hidden">
          {COMPARISON_ROWS.map((r) => (
            <div key={r.feature} className="rounded-2xl border border-border/60 bg-surface p-5">
              <div className="mb-3 font-semibold text-foreground">{r.feature}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Mindbody</span><span className={r.mbT === "no" ? "text-muted-foreground/50" : ""}>{r.mb}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Boulevard</span><span className={r.bdT === "no" ? "text-muted-foreground/50" : ""}>{r.bd}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fresha</span><span className={r.frT === "no" ? "text-muted-foreground/50" : ""}>{r.fr}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vagaro</span><span className={r.vgT === "no" ? "text-muted-foreground/50" : ""}>{r.vg}</span></div>
                <div className="flex justify-between border-t border-border/60 pt-2">
                  <span className="font-semibold text-[oklch(0.7_0.22_300)]">ClinicPro</span>
                  <span className="font-bold text-success">{r.us}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* PRICING */}
      <Section id="pricing">
        <SectionLabel>Simple, fair pricing</SectionLabel>
        <SectionTitle>Pay for what you need. Nothing you don't.</SectionTitle>
        <SectionSub>14-day free trial on every plan. No credit card required. Cancel anytime.</SectionSub>

        {/* Founding member banner */}
        <div className="mb-12 overflow-hidden rounded-2xl p-px [background:linear-gradient(135deg,#9333EA,#D946EF)]">
          <div className="rounded-[15px] px-8 py-6 text-center [background:linear-gradient(135deg,rgba(147,51,234,0.3),rgba(217,70,239,0.2))]">
            <div className="font-display text-xl font-bold text-foreground sm:text-2xl">🔒 Founding Member Pricing — Locked Forever</div>
            <p className="mt-2 text-sm text-zinc-200">
              First 100 clinics get <strong>$49/$149/$349</strong> per month locked in for life. No price increases, ever.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground/10 px-4 py-1.5 text-sm font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              95 / 100 spots remaining
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setPricingInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                pricingInterval === "monthly" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricingInterval("annual")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                pricingInterval === "annual" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              Annual <span className="ms-1 text-[10px] uppercase tracking-wider text-success">Save 15%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const displayPrice = p.name === "Enterprise" ? "Custom" : (pricingInterval === "monthly" ? p.price : p.annual);
            const savingsPerYear = p.name !== "Enterprise" && pricingInterval === "annual"
              ? (parseInt(p.price.replace("$", "")) * 12) - parseInt(p.annualTotal.replace(/[$,]/g, ""))
              : 0;
            return (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "relative rounded-3xl border border-primary/40 p-8 shadow-[0_30px_60px_-20px_rgba(147,51,234,0.4)] [background:linear-gradient(180deg,rgba(147,51,234,0.08),var(--surface))]"
                    : "relative rounded-3xl border border-border/60 bg-surface p-8"
                }
              >
                {p.featured && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground [background:linear-gradient(135deg,#9333EA,#D946EF)]">
                    Most Popular
                  </div>
                )}
                <div className="font-display text-[22px] font-bold">{p.name}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{p.tag}</div>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-[48px] font-bold leading-none">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">{p.per}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground/70">
                  {p.name === "Enterprise" ? "Talk to sales for pricing" : (
                    pricingInterval === "annual"
                      ? `Billed ${p.annualTotal} yearly`
                      : "Billed monthly · per location"
                  )}
                </div>
                {savingsPerYear > 0 && (
                  <div className="mt-2 inline-flex rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                    Save ${savingsPerYear}/year
                  </div>
                )}
                <Link
                  to={p.name === "Enterprise" ? "/contact" : ctaHref}
                  className={`mt-6 w-full ${p.featured ? btnPrimary : btnSecondary.replace("py-3.5", "py-2.5").replace("text-[15px]", "text-sm")}`}
                >
                  {p.name === "Enterprise" ? "Book a call" : "Start free trial"}
                </Link>
                <ul className="mt-6 border-t border-border/60 pt-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 py-1.5 text-[13px] text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section id="cta">
        <div className="relative overflow-hidden rounded-[32px] border border-primary/30 px-8 py-16 text-center sm:px-12 sm:py-20 [background:linear-gradient(135deg,rgba(147,51,234,0.15),rgba(217,70,239,0.1))]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2"
            style={{ background: "radial-gradient(circle, rgba(147,51,234,0.3), transparent 60%)" }}
          />
          <h2 className="relative font-display text-[clamp(2rem,5vw,64px)] font-bold leading-[1.05] tracking-tight">
            Your front desk is asleep at 9pm.<br className="hidden sm:block" />Your bookings shouldn't be.
          </h2>
          <p className="relative mx-auto mt-6 max-w-[560px] text-lg text-zinc-300">
            Start your free 14-day trial. No credit card. Be live in 10 minutes.
          </p>
          <div className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to={ctaHref} className={`${btnPrimaryLg} w-full sm:w-auto`}>Start free trial <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={() => setDemoOpen(true)} className={`${btnSecondary} w-full sm:w-auto`}>Book a demo</button>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border/60 px-5 pb-10 pt-20 sm:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Mark />
                <span className="font-display text-[22px] font-bold tracking-tight">ClinicPro</span>
              </div>
              <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
                The operating system for modern clinics. Built by clinic owners. Trusted across Toronto, Dubai, LA, and London.
              </p>
            </div>
            <FooterCol
              title="Product"
              items={[
                { label: "Features", href: "#features" },
                { label: "Compare", href: "#vs" },
                { label: "Pricing", href: "/pricing" },
                { label: "Integrations", href: "/integrations" },
                { label: "Roadmap", href: "/roadmap" },
              ]}
              open={openFooterSection === "Product"}
              onToggle={() => setOpenFooterSection(openFooterSection === "Product" ? null : "Product")}
            />
            <FooterCol
              title="Resources"
              items={[
                { label: "Blog", href: "/blog" },
                { label: "Customer stories", href: "/customers" },
                { label: "Help center", href: "/help" },
                { label: "API docs", href: "/docs" },
                { label: "Migration guide", href: "/migrate" },
              ]}
              open={openFooterSection === "Resources"}
              onToggle={() => setOpenFooterSection(openFooterSection === "Resources" ? null : "Resources")}
            />
            <FooterCol
              title="Company"
              items={[
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Careers", href: "/careers" },
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Refunds", href: "/refunds" },
              ]}
              open={openFooterSection === "Company"}
              onToggle={() => setOpenFooterSection(openFooterSection === "Company" ? null : "Company")}
            />
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-8 text-[13px] text-muted-foreground/80 sm:flex-row sm:items-center">
            <div>© 2026 ClinicPro · Built by Divan Digital Corp · Toronto, Canada</div>
            <div className="font-signature text-base text-foreground/70">Discipline · Consistency · Creativity</div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDemoOpen(false)}>
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDemoOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-foreground/10">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl [background:linear-gradient(135deg,#9333EA,#D946EF)]">
                <Sparkles className="h-8 w-8 text-foreground" />
              </div>
            </div>
            <h3 className="font-display text-2xl font-bold">Demo video coming soon</h3>
            <p className="mt-3 text-muted-foreground">
              We're putting the finishing touches on our product walkthrough. In the meantime, book a personal demo with our founder.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/auth/sign-up" className={`${btnPrimaryLg} w-full justify-center`} onClick={() => setDemoOpen(false)}>
                Book a 15-min demo <ArrowRight className="h-4 w-4" />
              </Link>
              <button onClick={() => setDemoOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "ClinicPro",
                url: "https://clinicpro.io",
                description: "The operating system for modern clinics.",
                foundingDate: "2024",
                founder: { "@type": "Person", name: "Shahab Balamchi" },
                parentOrganization: { "@type": "Organization", name: "Divan Digital Corp" },
                address: { "@type": "PostalAddress", addressLocality: "Toronto", addressCountry: "CA" },
              },
              {
                "@type": "SoftwareApplication",
                name: "ClinicPro",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                offers: [
                  { "@type": "Offer", name: "Starter", price: "69", priceCurrency: "USD", billingIncrement: "P1M" },
                  { "@type": "Offer", name: "Professional", price: "199", priceCurrency: "USD", billingIncrement: "P1M" },
                  { "@type": "Offer", name: "Growth", price: "449", priceCurrency: "USD", billingIncrement: "P1M" },
                ],
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://clinicpro.io" },
                  { "@type": "ListItem", position: 2, name: "Features", item: "https://clinicpro.io/features" },
                  { "@type": "ListItem", position: 3, name: "Pricing", item: "https://clinicpro.io/pricing" },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */
function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative z-10 px-5 py-[120px] sm:px-8 max-md:py-16">
      <div className="mx-auto max-w-[1280px]">{children}</div>
    </section>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.7_0.22_300)]">
      {children}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 max-w-[880px] font-display text-[clamp(2rem,5vw,64px)] font-bold leading-[1.05] tracking-[-0.025em]">
      {children}
    </h2>
  );
}
function SectionSub({ children }: { children: React.ReactNode }) {
  return <p className="mb-14 max-w-[720px] text-[clamp(1rem,2vw,19px)] leading-[1.6] text-muted-foreground">{children}</p>;
}

function MockStat({ icon: Icon, num, label, trend }: { icon: typeof Calendar; num: string; label: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-5 text-start">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15 text-[oklch(0.7_0.22_300)]">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="font-display text-[28px] font-bold">{num}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[11px] font-semibold text-success">{trend}</div>
    </div>
  );
}

function CompCell({ value, tone }: { value: string; tone?: "yes"|"no"|"meh"|"plain" }) {
  const cls =
    tone === "yes" ? "font-bold text-success" :
    tone === "no" ? "text-muted-foreground/70" :
    tone === "meh" ? "text-muted-foreground/70" :
    "text-foreground";
  return <td className={`border-b border-border/60 px-5 py-[18px] ${cls}`}>{value}</td>;
}

function FooterCol({ title, items, open, onToggle }: { title: string; items: { label: string; href: string }[]; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center justify-between md:pointer-events-none">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/70">{title}</h4>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition md:hidden ${open ? "rotate-180" : ""}`} />
      </button>
      <ul className={`space-y-2.5 ${open ? "block" : "hidden md:block"}`}>
        {items.map((i) => (
          <li key={i.label}>
            {i.href.startsWith("#") || i.href.startsWith("mailto:") ? (
              <a href={i.href} className="text-sm text-muted-foreground transition hover:text-foreground">{i.label}</a>
            ) : (
              <Link to={i.href} className="text-sm text-muted-foreground transition hover:text-foreground">{i.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
