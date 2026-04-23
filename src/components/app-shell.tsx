import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, CalendarDays, Calendar, Shield, Users, Target,
  Ticket, Gift, Package, Boxes, Send, Zap, CheckSquare,
  Search, Bell, Plus, Settings, LogOut, ChevronDown, Sparkles,
  HeartPulse, UserCog
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  {
    section: "OVERVIEW",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: Activity },
      { to: "/app/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { to: "/app/booking", label: "Booking", icon: CalendarDays },
      { to: "/app/calendar", label: "Calendar", icon: Calendar },
      { to: "/app/consent", label: "Consent Forms", icon: Shield },
      { to: "/app/clients", label: "Clients", icon: Users },
      { to: "/app/services", label: "Services", icon: HeartPulse },
      { to: "/app/staff", label: "Staff", icon: UserCog },
      { to: "/app/leads", label: "Leads", icon: Target },
    ],
  },
  {
    section: "REVENUE",
    items: [
      { to: "/app/coupons", label: "Coupons", icon: Ticket },
      { to: "/app/giftcards", label: "Gift Cards", icon: Gift },
      { to: "/app/packages", label: "Packages", icon: Package },
      { to: "/app/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    section: "GROWTH",
    items: [
      { to: "/app/marketing", label: "Marketing", icon: Send },
      { to: "/app/automations", label: "Automations", icon: Zap },
      { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, activeClinic, memberships, setActiveClinicId, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight">ClinicPro</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {activeClinic?.clinic.name ?? "—"}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.section}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={[
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary glow-purple" />
                      )}
                      <Icon className={["h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground"].join(" ")} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
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
                      {m.clinic_id === activeClinic?.clinic_id && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link to="/app/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients, appointments…"
              className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary glow-purple" />
          </Button>
          <Button className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="h-4 w-4" /> New
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
