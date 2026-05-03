import { ReactNode, useEffect, useState } from "react";
import { GlobalSearch } from "@/components/global-search";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, CalendarDays, Calendar, Shield, Users, Target,
  Ticket, Gift, Package, Boxes, Send, Zap, CheckSquare,
  Bell, Plus, Settings, LogOut, ChevronDown, Sparkles,
  HeartPulse, UserCog, Menu, Languages, Brain, Globe,
  MapPin, CreditCard, FileText, ClipboardCheck, Inbox, BadgeCheck,
  Star, Share2, Syringe, ListChecks, Images, Stethoscope, Bot,
  Phone, BookOpen, Sun, Moon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocale, LOCALES } from "@/lib/locale-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrialBanner } from "@/components/trial-banner";

type Badge = { kind: "count"; value: number } | { kind: "pill"; label: string; tone: "new" | "live" };
interface NavItem { to: string; label: string; icon: LucideIcon; badge?: Badge; }
interface NavGroup { section: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    section: "Overview",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: Activity },
      { to: "/app/reports", label: "Reports", icon: BarChart3 },
      { to: "/app/ai", label: "AI Assistant", icon: Bot },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/app/booking", label: "Booking", icon: CalendarDays },
      { to: "/app/calendar", label: "Calendar", icon: Calendar },
      { to: "/app/checkin", label: "Check-In", icon: ClipboardCheck },
      { to: "/app/consent", label: "Consent Forms", icon: Shield },
      { to: "/app/clients", label: "Clients", icon: Users },
      { to: "/app/services", label: "Services", icon: HeartPulse },
      { to: "/app/staff", label: "Staff", icon: UserCog },
      { to: "/app/locations", label: "Locations", icon: MapPin },
      { to: "/app/leads", label: "Leads", icon: Target },
    ],
  },
  {
    section: "Revenue",
    items: [
      { to: "/app/pos", label: "POS & Payments", icon: CreditCard },
      { to: "/app/invoices", label: "Invoices", icon: FileText },
      { to: "/app/coupons", label: "Coupons", icon: Ticket },
      { to: "/app/giftcards", label: "Gift Cards", icon: Gift },
      { to: "/app/packages", label: "Packages", icon: Package },
      { to: "/app/memberships", label: "Memberships", icon: BadgeCheck },
      { to: "/app/loyalty", label: "Loyalty", icon: Sparkles },
      { to: "/app/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    section: "Growth",
    items: [
      { to: "/app/inbox", label: "Inbox", icon: Inbox },
      { to: "/app/whatsapp", label: "WhatsApp", icon: Phone },
      { to: "/app/marketing", label: "Campaigns", icon: Send },
      { to: "/app/automations", label: "Automations", icon: Zap },
      { to: "/app/reviews", label: "Reviews", icon: Star },
      { to: "/app/referrals", label: "Referrals", icon: Share2 },
      { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/app/email-log", label: "Email Log", icon: Bell },
    ],
  },
  {
    section: "Clinical",
    items: [
      { to: "/app/injection-mapping", label: "Injection Mapping", icon: Syringe },
      { to: "/app/treatment-plans", label: "Treatment Plans", icon: ListChecks },
      { to: "/app/before-after", label: "Before / After", icon: Images },
      { to: "/app/soap-notes", label: "SOAP Notes", icon: Stethoscope },
    ],
  },
  {
    section: "AI",
    items: [
      { to: "/app/ai-optimizer", label: "Schedule Optimizer", icon: Brain },
    ],
  },
  {
    section: "Admin",
    items: [
      { to: "/app/settings", label: "Settings", icon: Settings },
      { to: "/app/settings/billing", label: "Billing", icon: CreditCard },
      { to: "/app/quickbooks", label: "QuickBooks", icon: BookOpen },
      { to: "/app/api-settings", label: "API & Webhooks", icon: Globe },
    ],
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
}

function NavBadge({ badge, active }: { badge: Badge; active: boolean }) {
  if (badge.kind === "pill") {
    return (
      <span
        className={[
          "ms-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
          badge.tone === "new"
            ? "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-glow"
            : "bg-success/20 text-success",
        ].join(" ")}
      >
        {badge.label}
      </span>
    );
  }
  return (
    <span
      className={[
        "ms-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
        active
          ? "bg-primary/20 text-primary"
          : "bg-sidebar-accent/60 text-muted-foreground",
      ].join(" ")}
    >
      {formatCount(badge.value)}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dir } = useLocale();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar — pinned to inline-start (RTL flips automatically via flex order) */}
      <aside className="hidden w-64 shrink-0 border-sidebar-border bg-sidebar lg:flex lg:flex-col [dir=ltr]_&:border-r [dir=rtl]_&:border-l border-r rtl:border-l rtl:border-r-0">
        <SidebarContent onNavigate={() => undefined} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner />
        <Header onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side={dir === "rtl" ? "right" : "left"}
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { user, activeClinic, memberships, setActiveClinicId, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-fuchsia-500 shadow-glow ring-1 ring-primary/40">
          <Sparkles className="h-[18px] w-[18px] text-primary-foreground drop-shadow" strokeWidth={2.5} />
          <span className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-fuchsia-400 ring-2 ring-sidebar" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Clinic<span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text italic text-transparent">Pro</span>
          </span>
          <span className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
            {activeClinic?.clinic.name ?? "—"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="mb-1 flex items-center gap-2 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                {group.section}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-sidebar-border/60 to-transparent" />
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={[
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
                      active
                        ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-sidebar-accent-foreground shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.15)]"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                    ].join(" ")}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-fuchsia-500 glow-purple" />
                    )}
                    <Icon
                      className={[
                        "h-[16px] w-[16px] shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                      ].join(" ")}
                      strokeWidth={active ? 2.25 : 2}
                    />
                    <span className={["truncate", active ? "font-semibold" : "font-medium"].join(" ")}>
                      {item.label}
                    </span>
                    {item.badge && <NavBadge badge={item.badge} active={active} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-start transition-colors hover:border-sidebar-border hover:bg-sidebar-accent/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-primary-foreground ring-1 ring-primary/30">
                {initials}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-medium">{user?.email}</div>
                <div className="text-[11px] capitalize text-muted-foreground">{activeClinic?.role.replace("_", " ")}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            {memberships.length > 1 && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Switch clinic
                </DropdownMenuLabel>
                {memberships.map((m) => (
                  <DropdownMenuItem key={m.clinic_id} onClick={() => setActiveClinicId(m.clinic_id)}>
                    {m.clinic.name}
                    {m.clinic_id === activeClinic?.clinic_id && <span className="ms-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/app/settings" onClick={onNavigate}>
                <Settings className="me-2 h-4 w-4" />Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="me-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { locale, setLocale } = useLocale();
  const current = LOCALES.find((l) => l.code === locale);
  const { activeClinic } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClinic?.clinic_id) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("locations")
        .select("id,name,active")
        .eq("clinic_id", activeClinic.clinic_id)
        .eq("active", true)
        .order("name")
        .then(({ data }) => {
          if (data && data.length > 0) {
            setLocations(data);
            setActiveLocationId(data[0].id);
          }
        });
    });
  }, [activeClinic?.clinic_id]);

  const activeLocation = locations.find((l) => l.id === activeLocationId);

  const quickActions = [
    { label: "📅 Appointment", path: "/app/booking" },
    { label: "👤 Client", path: "/app/clients" },
    { label: "💳 Sale (POS)", path: "/app/pos" },
    { label: "📝 Consent Form", path: "/app/consent" },
    { label: "✉ Send Message", path: "/app/inbox" },
    { label: "🎁 Gift Card", path: "/app/giftcards" },
    { label: "📋 Task", path: "/app/tasks" },
  ];

  return (
    <header className="flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur sm:gap-3 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="max-w-md flex-1">
        <GlobalSearch />
      </div>

      {/* Location Switcher */}
      {locations.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 text-xs sm:inline-flex">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[100px] truncate">{activeLocation?.name ?? "All"}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Location
            </DropdownMenuLabel>
            {locations.map((loc) => (
              <DropdownMenuItem key={loc.id} onClick={() => setActiveLocationId(loc.id)}>
                <MapPin className="me-2 h-3.5 w-3.5" />
                {loc.name}
                {loc.id === activeLocationId && <span className="ms-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Language toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Language">
            <Languages className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Language
          </DropdownMenuLabel>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
              {l.label}
              {l.code === current?.code && <span className="ms-auto text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* LIVE indicator */}
      <div
        className="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success md:inline-flex cursor-default"
        title="Realtime sync is active across calendar, leads, tasks & inventory"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live
      </div>

      {/* Notifications bell */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="p-4 text-center text-xs text-muted-foreground">
            No new notifications
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* + New quick actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick create</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickActions.map((action) => (
            <DropdownMenuItem key={action.path} onClick={() => navigate({ to: action.path as any })}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
