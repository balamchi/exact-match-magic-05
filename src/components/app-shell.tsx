import { ReactNode, useEffect, useState } from "react";
import { GlobalSearch } from "@/components/global-search";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, CalendarDays, Calendar, Shield, Users,
  Ticket, Gift, Package, Boxes, Send, Zap, CheckSquare, Flame,
  Bell, Plus, Settings, LogOut, ChevronDown, Sparkles,
  HeartPulse, UserCog, Menu, Languages, Brain, Globe,
  MapPin, CreditCard, FileText, ClipboardCheck, Inbox, BadgeCheck,
  Star, Share2, Syringe, ListChecks, Images, Stethoscope, Bot,
  Phone, BookOpen, Sun, Moon, MessageSquareText, HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

type Badge = { kind: "count"; value: number } | { kind: "pill"; label: string; tone: "new" | "live" };
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: Badge;
  phase4?: boolean;
  beta?: boolean;
}
interface NavGroup {
  section: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: NavItem[];
}

const NAV_PINNED: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: Activity },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/clients", label: "Clients", icon: Users },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/leads", label: "Leads", icon: Flame },
];

const NAV_GROUPS: NavGroup[] = [
  {
    section: "Front Desk",
    icon: ClipboardCheck,
    items: [
      { to: "/app/checkin", label: "Check-In Board", icon: ClipboardCheck },
      { to: "/app/booking", label: "Booking Widget", icon: CalendarDays },
      { to: "/app/consent", label: "Consent Forms", icon: Shield },
    ],
  },
  {
    section: "Catalog",
    icon: HeartPulse,
    items: [
      { to: "/app/services", label: "Services", icon: HeartPulse },
      { to: "/app/staff", label: "Staff", icon: UserCog },
      { to: "/app/locations", label: "Locations", icon: MapPin },
      { to: "/app/inventory", label: "Inventory", icon: Boxes, beta: true },
    ],
  },
  {
    section: "Revenue",
    icon: CreditCard,
    items: [
      { to: "/app/pos", label: "POS & Payments", icon: CreditCard, beta: true },
      { to: "/app/invoices", label: "Invoices", icon: FileText },
      { to: "/app/memberships", label: "Memberships", icon: BadgeCheck },
      { to: "/app/giftcards", label: "Gift Cards", icon: Gift },
      { to: "/app/packages", label: "Packages", icon: Package },
      { to: "/app/coupons", label: "Coupons", icon: Ticket },
      { to: "/app/loyalty", label: "Loyalty", icon: Sparkles, beta: true },
    ],
  },
  {
    section: "Marketing",
    icon: Send,
    items: [
      { to: "/app/whatsapp", label: "WhatsApp", icon: Phone, beta: true },
      { to: "/app/communication/templates", label: "Templates", icon: MessageSquareText },
      { to: "/app/marketing", label: "Campaigns", icon: Send, beta: true },
      { to: "/app/automations", label: "Automations", icon: Zap, beta: true },
      { to: "/app/reviews", label: "Reviews", icon: Star },
      { to: "/app/referrals", label: "Referrals", icon: Share2 },
      { to: "/app/email-log", label: "Email Log", icon: Bell },
    ],
  },
  {
    section: "Clinical",
    icon: Stethoscope,
    items: [
      { to: "/app/clinical/soap-notes", label: "SOAP Notes", icon: Stethoscope },
      { to: "/app/clinical/treatment-plans", label: "Treatment Plans", icon: ListChecks },
      { to: "/app/clinical/consent-forms", label: "Consent Forms", icon: FileText },
      { to: "/app/injection-mapping", label: "Injection Mapping", icon: Syringe, beta: true },
      { to: "/app/before-after", label: "Before / After", icon: Images },
    ],
  },
  {
    section: "Reports",
    icon: BarChart3,
    items: [
      { to: "/app/reports", label: "All Reports", icon: BarChart3 },
      { to: "/app/tasks", label: "Tasks", icon: CheckSquare, beta: true },
    ],
  },
  {
    section: "AI",
    icon: Brain,
    items: [
      { to: "/app/ai", label: "AI Assistant", icon: Bot, phase4: true },
      { to: "/app/ai-optimizer", label: "Schedule Optimizer", icon: Brain, phase4: true },
    ],
  },
  {
    section: "Integrations",
    icon: Globe,
    items: [
      { to: "/app/quickbooks", label: "QuickBooks", icon: BookOpen, phase4: true },
      { to: "/app/api-settings", label: "API & Webhooks", icon: Globe, phase4: true },
    ],
  },
];

const NAV_BOTTOM: NavItem[] = [
  { to: "/app/feature-status", label: "Feature Status", icon: Sparkles },
  { to: "/app/help", label: "Help", icon: HelpCircle },
  { to: "/app/settings", label: "Settings", icon: Settings },
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
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>

      <MobileBottomNav />

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
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = window.localStorage.getItem("clinicpro:sidebar-expanded");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        window.localStorage.setItem("clinicpro:sidebar-expanded", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Auto-expand any group that contains the current route
  useEffect(() => {
    setExpandedSections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of NAV_GROUPS) {
        if (group.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"))) {
          if (!next[group.section]) {
            next[group.section] = true;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const renderItem = (item: NavItem) => {
    const active = pathname === item.to || pathname.startsWith(item.to + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
          active
            ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-sidebar-accent-foreground shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.15)]"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
        )}
      >
        {active && (
          <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-fuchsia-500 glow-purple" />
        )}
        <Icon
          className={cn(
            "h-[16px] w-[16px] shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
          )}
          strokeWidth={active ? 2.25 : 2}
        />
        <span className={cn("truncate", active ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
        {item.beta && (
          <span
            title="Beta"
            className="ms-auto inline-flex items-center rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300"
          >
            Beta
          </span>
        )}
        {item.phase4 && (
          <span
            title="Coming in Phase 4"
            className="ms-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300"
          >
            4
          </span>
        )}
        {item.badge && <NavBadge badge={item.badge} active={active} />}
      </Link>
    );
  };

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
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3 [scrollbar-width:thin]">
        {/* Pinned daily-use items */}
        <div className="mb-2 space-y-0.5">
          {NAV_PINNED.map(renderItem)}
        </div>

        <div className="my-3 border-t border-sidebar-border/60" />

        {/* Collapsible sections */}
        <div className="space-y-0.5">
          {NAV_GROUPS.map((group) => {
            const isOpen = expandedSections[group.section] ?? !!group.defaultOpen;
            const SectionIcon = group.icon;
            return (
              <div key={group.section}>
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 transition hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon className="h-3.5 w-3.5" />
                    {group.section}
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="mt-1 mb-2 space-y-0.5 ps-2">
                    {group.items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="my-3 border-t border-sidebar-border/60" />

        {/* Bottom items */}
        <div className="space-y-0.5">
          {NAV_BOTTOM.map(renderItem)}
        </div>
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
  const { theme, toggle: toggleTheme } = useTheme();
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

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="hidden sm:inline-flex"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

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
