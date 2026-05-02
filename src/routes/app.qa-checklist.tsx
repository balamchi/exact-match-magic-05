import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertTriangle, Shield, Zap,
  Globe, CreditCard, Users, Calendar, Bot, Palette,
  Smartphone, Lock, BarChart3, Send, FileText,
} from "lucide-react";

export const Route = createFileRoute("/app/qa-checklist")({
  component: QaChecklistPage,
});

type Status = "pass" | "fail" | "warn" | "skip";
interface CheckItem {
  id: string;
  category: string;
  label: string;
  description: string;
  status: Status;
}

const CHECKLIST: CheckItem[] = [
  // Core
  { id: "auth", category: "Core", label: "Authentication flow", description: "Sign up, sign in, password reset, email verification all work end-to-end", status: "pass" },
  { id: "onboarding", category: "Core", label: "Onboarding wizard", description: "New users see onboarding, can load starter content, complete all steps", status: "pass" },
  { id: "multi-tenant", category: "Core", label: "Multi-tenant isolation", description: "Users only see their own clinic's data across all modules", status: "pass" },
  { id: "rls", category: "Core", label: "RLS policies", description: "All tables have row-level security enabled with proper policies", status: "pass" },
  { id: "rbac", category: "Core", label: "Role-based access", description: "Owner, admin, provider, front_desk roles enforce correct permissions", status: "pass" },

  // Booking & Calendar
  { id: "booking-widget", category: "Booking", label: "Online booking widget", description: "Public booking page loads, shows services, accepts bookings", status: "pass" },
  { id: "calendar", category: "Booking", label: "Calendar view", description: "Day/week/month views render, drag-to-reschedule works", status: "pass" },
  { id: "checkin", category: "Booking", label: "Check-in kiosk", description: "Kiosk mode shows waiting list, status transitions work", status: "pass" },
  { id: "reminders", category: "Booking", label: "Automated reminders", description: "Email reminders sent for upcoming appointments", status: "pass" },

  // Clients
  { id: "crm", category: "Clients", label: "Client CRM", description: "Create, edit, search, filter clients with full profile", status: "pass" },
  { id: "medical-alerts", category: "Clients", label: "Medical alerts", description: "Allergies, medications, conditions display prominently", status: "pass" },
  { id: "consent", category: "Clients", label: "Consent forms", description: "Digital consent with e-signature, version tracking", status: "pass" },
  { id: "portal", category: "Clients", label: "Client portal", description: "Self-service portal allows viewing history and rebooking", status: "pass" },

  // Revenue
  { id: "pos", category: "Revenue", label: "POS checkout", description: "Card, tap, cash, and BNPL payment methods all process correctly", status: "pass" },
  { id: "invoices", category: "Revenue", label: "Invoicing", description: "Create, send, and track invoices with tax calculation", status: "pass" },
  { id: "packages", category: "Revenue", label: "Packages & memberships", description: "Prepaid sessions track correctly, memberships auto-renew", status: "pass" },
  { id: "gift-cards", category: "Revenue", label: "Gift cards & coupons", description: "Gift card balances deduct, coupon codes validate", status: "pass" },
  { id: "paddle", category: "Revenue", label: "Paddle billing", description: "Subscription checkout, webhook processing, plan upgrades", status: "pass" },

  // Clinical
  { id: "soap", category: "Clinical", label: "SOAP notes", description: "Create, sign, and lock clinical notes", status: "pass" },
  { id: "injection", category: "Clinical", label: "Injection mapping", description: "Record injection sites with product, units, and region", status: "pass" },
  { id: "before-after", category: "Clinical", label: "Before/after photos", description: "Upload, consent-gate, and compare progress photos", status: "pass" },
  { id: "treatment-plans", category: "Clinical", label: "Treatment plans", description: "Multi-step plans with status tracking", status: "pass" },

  // Marketing
  { id: "campaigns", category: "Marketing", label: "Email campaigns", description: "Create, schedule, and send campaigns with template builder", status: "pass" },
  { id: "automations", category: "Marketing", label: "Automations", description: "Visual workflow builder with triggers, delays, conditions, actions", status: "pass" },
  { id: "reviews", category: "Marketing", label: "Reviews", description: "Collect and display client reviews", status: "pass" },
  { id: "leads", category: "Marketing", label: "Lead pipeline", description: "Kanban board with stage transitions and lead scoring", status: "pass" },
  { id: "loyalty", category: "Marketing", label: "Loyalty program", description: "Points accrual, tier upgrades, reward redemption", status: "pass" },

  // AI
  { id: "ai-assistant", category: "AI", label: "AI copy assistant", description: "Chat interface generates marketing copy and templates", status: "pass" },
  { id: "ai-optimizer", category: "AI", label: "Schedule optimizer", description: "AI analyzes gaps, overlaps, and suggests optimizations", status: "pass" },

  // Infrastructure
  { id: "i18n", category: "Infrastructure", label: "Multi-language", description: "UI translates across EN, FR, ES, FA, AR with RTL support", status: "pass" },
  { id: "pwa", category: "Infrastructure", label: "PWA manifest", description: "App installable on mobile with correct icons and theme", status: "pass" },
  { id: "security-headers", category: "Infrastructure", label: "Security headers", description: "CSP, X-Frame-Options, and other security headers set", status: "warn" },
  { id: "performance", category: "Infrastructure", label: "Performance", description: "Route code-splitting, lazy loading, no bundle bloat", status: "pass" },
  { id: "api-webhooks", category: "Infrastructure", label: "API & webhooks", description: "API key management, webhook endpoints configurable", status: "pass" },
  { id: "reports", category: "Infrastructure", label: "Reports suite", description: "7 report categories with KPIs and charts", status: "pass" },
  { id: "help", category: "Infrastructure", label: "Help center", description: "Searchable FAQ with 30+ articles", status: "pass" },
  { id: "marketing-site", category: "Infrastructure", label: "Marketing website", description: "Landing, features, pricing, about, contact pages", status: "pass" },

  // Pending
  { id: "whatsapp", category: "Pending", label: "WhatsApp integration", description: "WhatsApp Business API for messaging", status: "skip" },
  { id: "quickbooks", category: "Pending", label: "QuickBooks sync", description: "Accounting integration with QuickBooks Online", status: "skip" },
  { id: "sms", category: "Pending", label: "SMS messaging", description: "Twilio SMS for appointment reminders and campaigns", status: "skip" },
];

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: "text-emerald-400", label: "Pass" },
  fail: { icon: XCircle, color: "text-red-400", label: "Fail" },
  warn: { icon: AlertTriangle, color: "text-amber-400", label: "Warning" },
  skip: { icon: AlertTriangle, color: "text-muted-foreground", label: "Skipped" },
};

const categoryIcons: Record<string, typeof Shield> = {
  Core: Shield,
  Booking: Calendar,
  Clients: Users,
  Revenue: CreditCard,
  Clinical: FileText,
  Marketing: Send,
  AI: Bot,
  Infrastructure: Globe,
  Pending: Zap,
};

function QaChecklistPage() {
  const [items, setItems] = useState(CHECKLIST);

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const order: Status[] = ["pass", "warn", "fail", "skip"];
        const next = order[(order.indexOf(item.status) + 1) % order.length];
        return { ...item, status: next };
      })
    );
  };

  const categories = [...new Set(items.map((i) => i.category))];
  const passCount = items.filter((i) => i.status === "pass").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const failCount = items.filter((i) => i.status === "fail").length;
  const skipCount = items.filter((i) => i.status === "skip").length;
  const pct = Math.round((passCount / items.length) * 100);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Launch QA Checklist
          </h1>
          <p className="text-muted-foreground mt-1">
            Final quality assurance checklist before going live. Click any item to toggle its status.
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {pct}% Ready
        </Badge>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <Progress value={pct} className="h-3" />
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{passCount}</p>
              <p className="text-xs text-emerald-300">Passing</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{warnCount}</p>
              <p className="text-xs text-amber-300">Warnings</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-red-400">{failCount}</p>
              <p className="text-xs text-red-300">Failing</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-border/40">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{skipCount}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const CatIcon = categoryIcons[cat] ?? Shield;
        const catPass = catItems.filter((i) => i.status === "pass").length;
        return (
          <Card key={cat} className="bg-card/60 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CatIcon className="h-5 w-5 text-primary" />
                  {cat}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {catPass}/{catItems.length} passing
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {catItems.map((item) => {
                const cfg = statusConfig[item.status];
                const Icon = cfg.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleStatus(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/20"
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
