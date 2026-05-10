import { Home, Calendar, Users, MessageSquare, MoreHorizontal } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/app/dashboard", icon: Home, label: "Home" },
  { to: "/app/calendar", icon: Calendar, label: "Calendar" },
  { to: "/app/clients", icon: Users, label: "Clients" },
  { to: "/app/inbox", icon: MessageSquare, label: "Inbox" },
  { to: "/app/settings", icon: MoreHorizontal, label: "More" },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-safe lg:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
