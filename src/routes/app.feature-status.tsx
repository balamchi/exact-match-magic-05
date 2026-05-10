import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/feature-status")({
  component: FeatureStatusPage,
});

type Status = "live" | "beta" | "phase4" | "planned";

const statusMeta: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  live: {
    label: "Live",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  beta: {
    label: "Beta",
    icon: Sparkles,
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  phase4: {
    label: "Phase 4",
    icon: Clock,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  planned: {
    label: "Planned",
    icon: AlertCircle,
    className: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  },
};

type Module = {
  name: string;
  href?: string;
  status: Status;
  note?: string;
};

const groups: { title: string; modules: Module[] }[] = [
  {
    title: "Operations",
    modules: [
      { name: "Calendar & Booking", href: "/app/dashboard", status: "live" },
      { name: "Clients", href: "/app/clients", status: "live" },
      { name: "Services", href: "/app/services", status: "live" },
      { name: "Staff", href: "/app/staff", status: "live" },
      { name: "Locations", href: "/app/locations", status: "live" },
      { name: "Tasks", href: "/app/tasks", status: "beta", note: "Core flows ready; bulk ops still in polish." },
      { name: "Live Check-in / Waitlist", href: "/app/checkin", status: "beta", note: "Live updates work; kiosk mode coming." },
    ],
  },
  {
    title: "Clinical",
    modules: [
      { name: "SOAP Notes", href: "/app/clinical/soap-notes", status: "live" },
      { name: "Treatment Plans", href: "/app/clinical/treatment-plans", status: "live" },
      { name: "Consent Forms", href: "/app/clinical/consent-forms", status: "live" },
      { name: "Before/After Photos", href: "/app/before-after", status: "live" },
      { name: "Injection Mapping", href: "/app/injection-mapping", status: "beta", note: "Mapping editor live; reporting in progress." },
    ],
  },
  {
    title: "Revenue",
    modules: [
      { name: "Invoices", href: "/app/invoices", status: "live" },
      { name: "Point of Sale", href: "/app/pos", status: "beta", note: "Card terminal hand-off lands with payments rollout." },
      { name: "Memberships", href: "/app/memberships", status: "live" },
      { name: "Packages", href: "/app/packages", status: "live" },
      { name: "Gift Cards", href: "/app/giftcards", status: "live" },
      { name: "Coupons", href: "/app/coupons", status: "live" },
      { name: "Loyalty", href: "/app/loyalty", status: "live" },
      { name: "Inventory", href: "/app/inventory", status: "beta", note: "Stock + reorder live; barcode scan in Phase 4." },
    ],
  },
  {
    title: "Communication",
    modules: [
      { name: "Inbox (Email & Web)", href: "/app/inbox", status: "live" },
      { name: "Inbox (SMS)", status: "phase4", note: "Read incoming today; outbound activates with carrier integration." },
      { name: "WhatsApp Business", href: "/app/whatsapp", status: "phase4", note: "Compose and conversations work; sending activates with WABA approval." },
      { name: "Templates", href: "/app/communication/templates", status: "live" },
      { name: "Reviews", href: "/app/reviews", status: "live" },
      { name: "Marketing campaigns", href: "/app/marketing", status: "phase4", note: "Audience builder + send queue arriving in Phase 4." },
    ],
  },
  {
    title: "Growth",
    modules: [
      { name: "Leads", href: "/app/leads", status: "live" },
      { name: "Referrals", href: "/app/referrals", status: "live" },
      { name: "Reports", href: "/app/reports", status: "live" },
      { name: "AI Assistant", href: "/app/ai", status: "beta", note: "Conversational insights; deeper actions land in Phase 4." },
      { name: "Automations", href: "/app/automations", status: "phase4", note: "Trigger builder is preview-only; runtime ships in Phase 4." },
    ],
  },
  {
    title: "Admin",
    modules: [
      { name: "Settings", href: "/app/settings", status: "live" },
      { name: "Billing", href: "/app/settings/billing", status: "live" },
      { name: "QuickBooks Online sync", href: "/app/quickbooks", status: "phase4", note: "OAuth + entity mapping land with the Phase 4 finance pack." },
    ],
  },
];

function FeatureStatusPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Transparency</p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl sm:text-4xl font-semibold tracking-tight">
          Feature status
        </h1>
        <p className="mt-2 max-w-[95vw] sm:max-w-2xl text-sm text-muted-foreground">
          Honest snapshot of what's shipping today, what's in beta, and what's still on the
          Phase 4 roadmap. We'd rather you know.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {(Object.keys(statusMeta) as Status[]).map((s) => {
            const m = statusMeta[s];
            const Icon = m.icon;
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${m.className}`}
              >
                <Icon className="h-3 w-3" /> {m.label}
              </span>
            );
          })}
        </div>
      </header>

      <div className="space-y-6">
        {groups.map((g) => (
          <section
            key={g.title}
            className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5"
          >
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
              {g.title}
            </h2>
            <ul className="divide-y divide-border/60">
              {g.modules.map((mod) => {
                const meta = statusMeta[mod.status];
                const Icon = meta.icon;
                const Wrapper: any = mod.href ? Link : "div";
                const wrapperProps = mod.href
                  ? { to: mod.href, className: "group flex items-start justify-between gap-3 py-2.5 transition hover:bg-muted/40 rounded-lg -mx-2 px-2" }
                  : { className: "flex items-start justify-between gap-3 py-2.5 -mx-2 px-2" };
                return (
                  <li key={mod.name}>
                    <Wrapper {...wrapperProps}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {mod.name}
                        </div>
                        {mod.note ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{mod.note}</p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.className}`}
                      >
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </Wrapper>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Have a question about a specific module? <Link to="/app/help" className="underline">Talk to us</Link>.
      </p>
    </div>
  );
}
