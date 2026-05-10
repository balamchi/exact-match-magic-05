import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  HelpCircle,
  BookOpen,
  Calendar,
  Users,
  CreditCard,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  Zap,
  BarChart3,
  Mail,
  Smartphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/help")({
  component: HelpCenterPage,
});

type FaqItem = { q: string; a: string };
type FaqCategory = { title: string; icon: React.ElementType; items: FaqItem[] };

const FAQ_DATA: FaqCategory[] = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { q: "How do I add my first staff member?", a: "Go to Staff from the sidebar, click 'Add staff', fill in their name, title, and calendar color. They'll appear on your booking calendar immediately." },
      { q: "How do I set up my services?", a: "Navigate to Services, click 'Add service', set the name, duration, price, and category. You can also use the onboarding wizard to load 60+ starter services." },
      { q: "How do I customize my booking page?", a: "Go to Settings → Booking to customize your public booking page. Your clients can book at /book/your-clinic-slug." },
      { q: "Can I import existing client data?", a: "Currently, clients can be added manually via the Clients page. Bulk import via CSV is on our roadmap." },
    ],
  },
  {
    title: "Appointments & Calendar",
    icon: Calendar,
    items: [
      { q: "How do I block off time on the calendar?", a: "Click any empty slot on the calendar to create a 'blocked' time entry. You can set recurring blocks for lunch breaks or meetings." },
      { q: "What appointment statuses are available?", a: "Appointments can be: Pending, Confirmed, Checked-In, In Progress, Completed, Cancelled, or No-Show. Each status has its own color." },
      { q: "How do clients receive appointment reminders?", a: "Automated email reminders are sent 24 hours before the appointment. You can configure additional reminders in Settings → Automations." },
      { q: "Can clients book online?", a: "Yes! Share your booking link (/book/your-slug) with clients. They can select a service, staff member, date/time, and confirm their booking." },
    ],
  },
  {
    title: "Clients & CRM",
    icon: Users,
    items: [
      { q: "How do I add medical alerts for a client?", a: "Open the client's profile, scroll to the Medical section, and add conditions, allergies, and medications. These show as a warning banner on their profile." },
      { q: "What is the lead pipeline?", a: "The lead pipeline (Kanban board) tracks potential clients through stages: New Lead → Contacted → Consultation → Converted. Drag cards between stages." },
      { q: "How do I merge duplicate clients?", a: "Duplicate detection and merging is coming soon. For now, manually update the correct record and delete the duplicate." },
    ],
  },
  {
    title: "Payments & Billing",
    icon: CreditCard,
    items: [
      { q: "How do I process a payment?", a: "Complete an appointment, then click 'Checkout' to generate an invoice. Payments are processed through your connected payment provider." },
      { q: "How do gift cards work?", a: "Go to Gift Cards to create and manage gift cards. Clients can purchase them, and they can be redeemed at checkout against any service." },
      { q: "How do I create a coupon?", a: "Navigate to Coupons, click 'New coupon', set the discount (percentage or fixed), usage limits, and expiry date." },
      { q: "What currencies are supported?", a: "ClinicPro supports multiple currencies. Set your default currency in Settings → General. Each location can have its own tax rate." },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { q: "What reports are available?", a: "Seven report categories: Revenue, Clients, Services, Staff Performance, Inventory, Marketing, and Retention. Each includes KPI cards and trend charts." },
      { q: "Can I export report data?", a: "Export functionality is coming soon. Currently, you can view all metrics directly in the Reports dashboard." },
      { q: "How is revenue calculated?", a: "Revenue is calculated from completed appointment invoices within the selected date range, broken down by service category and staff member." },
    ],
  },
  {
    title: "Automations & Marketing",
    icon: Zap,
    items: [
      { q: "What automations come pre-built?", a: "10 starter automations including appointment reminders, post-treatment follow-ups, birthday greetings, no-show follow-ups, review requests, and rebook nudges." },
      { q: "How do email campaigns work?", a: "Go to Campaigns to create email marketing campaigns. Select your audience, design your email, and schedule or send immediately." },
      { q: "Can I send SMS messages?", a: "SMS integration is on our roadmap. Currently, automated communications are sent via email." },
    ],
  },
  {
    title: "Account & Security",
    icon: Shield,
    items: [
      { q: "How do I add another admin?", a: "Go to Settings → Team, invite a new user by email. You can assign them an Owner, Admin, or Staff role with different permission levels." },
      { q: "Is my data secure?", a: "Yes. All data is encrypted in transit and at rest. Row-level security ensures each clinic can only access their own data. We follow HIPAA-aware best practices." },
      { q: "How do I change my password?", a: "Go to Settings → Account and click 'Change password'. You'll need to enter your current password and your new password." },
    ],
  },
];

function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("Getting Started");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_DATA;
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const totalQuestions = FAQ_DATA.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="mx-auto max-w-[95vw] sm:max-w-3xl space-y-7 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5 text-primary" />
          Help center
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">How can we help?</h1>
        <p className="max-w-[95vw] sm:max-w-xl text-sm text-muted-foreground">
          Browse {totalQuestions} frequently asked questions or search for what you need.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles…"
          className="h-12 pl-11 text-base"
        />
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/20 py-12 text-center">
            <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No results found. Try different keywords.</p>
          </div>
        ) : (
          filtered.map((cat) => {
            const Icon = cat.icon;
            const isOpen = openCategory === cat.title || query.trim().length > 0;
            return (
              <div key={cat.title} className="overflow-hidden rounded-xl border border-border/60 bg-card/30 backdrop-blur">
                <button
                  onClick={() => setOpenCategory(isOpen && !query ? null : cat.title)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cat.title}</p>
                      <p className="text-xs text-muted-foreground">{cat.items.length} question{cat.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/40">
                    {cat.items.map((item) => {
                      const qOpen = openQuestion === item.q;
                      return (
                        <div key={item.q} className="border-b border-border/20 last:border-0">
                          <button
                            onClick={() => setOpenQuestion(qOpen ? null : item.q)}
                            className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-card/40"
                          >
                            <p className={cn("text-sm", qOpen ? "font-semibold text-primary" : "text-foreground")}>
                              {item.q}
                            </p>
                            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition", qOpen && "rotate-90")} />
                          </button>
                          {qOpen && (
                            <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact */}
      <section className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4 sm:p-6 text-center">
        <Mail className="mx-auto mb-2 h-6 w-6 text-primary" />
        <h2 className="text-lg font-semibold">Still need help?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact our support team and we'll get back to you within 24 hours.
        </p>
        <Button className="mt-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow">
          <Mail className="mr-1.5 h-4 w-4" /> Contact support
        </Button>
      </section>
    </div>
  );
}
