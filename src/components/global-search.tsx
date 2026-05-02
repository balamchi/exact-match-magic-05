import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Activity, BarChart3, Bot, CalendarDays, Calendar, CheckSquare, ClipboardCheck,
  CreditCard, FileText, Gift, HeartPulse, Images, Inbox, MapPin, Package,
  Search, Send, Settings, Shield, Sparkles, Star, Share2, Syringe,
  ListChecks, Stethoscope, Target, Ticket, UserCog, Users, Zap, Boxes,
  BadgeCheck, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  to: string;
}

const PAGES: SearchResult[] = [
  { id: "dashboard", label: "Dashboard", icon: Activity, to: "/app/dashboard" },
  { id: "reports", label: "Reports", icon: BarChart3, to: "/app/reports" },
  { id: "ai", label: "AI Assistant", icon: Bot, to: "/app/ai" },
  { id: "booking", label: "Booking", icon: CalendarDays, to: "/app/booking" },
  { id: "calendar", label: "Calendar", icon: Calendar, to: "/app/calendar" },
  { id: "checkin", label: "Check-In", icon: ClipboardCheck, to: "/app/checkin" },
  { id: "consent", label: "Consent Forms", icon: Shield, to: "/app/consent" },
  { id: "clients", label: "Clients", icon: Users, to: "/app/clients" },
  { id: "services", label: "Services", icon: HeartPulse, to: "/app/services" },
  { id: "staff", label: "Staff", icon: UserCog, to: "/app/staff" },
  { id: "locations", label: "Locations", icon: MapPin, to: "/app/locations" },
  { id: "leads", label: "Leads", icon: Target, to: "/app/leads" },
  { id: "pos", label: "POS & Payments", icon: CreditCard, to: "/app/pos" },
  { id: "invoices", label: "Invoices", icon: FileText, to: "/app/invoices" },
  { id: "coupons", label: "Coupons", icon: Ticket, to: "/app/coupons" },
  { id: "giftcards", label: "Gift Cards", icon: Gift, to: "/app/giftcards" },
  { id: "packages", label: "Packages", icon: Package, to: "/app/packages" },
  { id: "memberships", label: "Memberships", icon: BadgeCheck, to: "/app/memberships" },
  { id: "loyalty", label: "Loyalty", icon: Sparkles, to: "/app/loyalty" },
  { id: "inventory", label: "Inventory", icon: Boxes, to: "/app/inventory" },
  { id: "inbox", label: "Inbox", icon: Inbox, to: "/app/inbox" },
  { id: "marketing", label: "Campaigns", icon: Send, to: "/app/marketing" },
  { id: "automations", label: "Automations", icon: Zap, to: "/app/automations" },
  { id: "reviews", label: "Reviews", icon: Star, to: "/app/reviews" },
  { id: "referrals", label: "Referrals", icon: Share2, to: "/app/referrals" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, to: "/app/tasks" },
  { id: "injection", label: "Injection Mapping", icon: Syringe, to: "/app/injection-mapping" },
  { id: "treatment", label: "Treatment Plans", icon: ListChecks, to: "/app/treatment-plans" },
  { id: "beforeafter", label: "Before / After", icon: Images, to: "/app/before-after" },
  { id: "soap", label: "SOAP Notes", icon: Stethoscope, to: "/app/soap-notes" },
  { id: "settings", label: "Settings", icon: Settings, to: "/app/settings" },
  { id: "billing", label: "Billing", icon: CreditCard, to: "/app/settings/billing" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { activeClinic } = useAuth();

  // ⌘K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Live client search
  useEffect(() => {
    if (!query || query.length < 2 || !activeClinic) {
      setClients([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone")
        .eq("clinic_id", activeClinic.clinic_id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(8);
      if (data) {
        setClients(
          data.map((c) => ({
            id: c.id,
            label: [c.first_name, c.last_name].filter(Boolean).join(" "),
            sublabel: c.email || c.phone || undefined,
            icon: Users,
            to: `/app/clients/${c.id}`,
          }))
        );
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, activeClinic?.clinic_id]);

  const select = useCallback(
    (to: string) => {
      setOpen(false);
      setQuery("");
      navigate({ to } as any);
    },
    [navigate]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-surface ps-3 pe-3 text-sm text-muted-foreground transition hover:border-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">Search clients, pages…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search clients, pages, or actions…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {clients.length > 0 && (
            <CommandGroup heading="Clients">
              {clients.map((c) => {
                const Icon = c.icon;
                return (
                  <CommandItem key={c.id} value={c.label} onSelect={() => select(c.to)}>
                    <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{c.label}</div>
                      {c.sublabel && <div className="truncate text-xs text-muted-foreground">{c.sublabel}</div>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          <CommandGroup heading="Pages">
            {PAGES.filter(
              (p) => !query || p.label.toLowerCase().includes(query.toLowerCase())
            ).map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.id} value={p.label} onSelect={() => select(p.to)}>
                  <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{p.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
