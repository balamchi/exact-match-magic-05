import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DollarSign, Receipt, CreditCard, FileText,
  Users, Repeat, UserPlus,
  UserCog, Wallet,
  Award, Flame, TrendingUp, Crown,
  Megaphone, Mail,
  Boxes, PackageMinus, CalendarX,
} from "lucide-react";
import { ReportCard } from "@/components/report-card";
import { ReportDatePicker } from "@/components/report-date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SavedPresetsList } from "@/components/saved-presets-list";
import { ScheduledReportsList } from "@/components/scheduled-reports-list";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import {
  bucketByDay, sumRevenue, deltaPercent, calculateLTV, calculateNetMRR,
  type AppointmentLite, type SubscriptionLite,
} from "@/lib/reports/calculations";

export const Route = createFileRoute("/app/reports/")({ component: ReportsLibrary });

const money = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

interface CardData {
  primary: string;
  trend?: { value: number; direction: "up" | "down" | "flat" };
  sparkline?: number[];
}

function ReportsLibrary() {
  const { activeClinic } = useAuth();
  const { presetId, setPresetId, range, compare, setCompare } = useReportRange();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Record<string, CardData>>({});

  useEffect(() => {
    if (!activeClinic) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ms = range.to.getTime() - range.from.getTime();
      const prevFrom = new Date(range.from.getTime() - ms - 1).toISOString();
      const prevTo = new Date(range.from.getTime() - 1).toISOString();
      const fromIso = range.from.toISOString();
      const toIso = range.to.toISOString();

      const [apptsRes, prevApptsRes, invoicesRes, subsRes, plansRes, inventoryRes] = await Promise.all([
        supabase.from("appointments")
          .select("id, client_id, staff_id, starts_at, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", fromIso).lte("starts_at", toIso),
        supabase.from("appointments")
          .select("id, client_id, staff_id, starts_at, status, price_cents")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", prevFrom).lte("starts_at", prevTo),
        supabase.from("invoices")
          .select("id, total_cents, status")
          .eq("clinic_id", activeClinic.clinic_id),
        supabase.from("membership_subscriptions")
          .select("id, status, canceled_at, created_at, membership_id")
          .eq("clinic_id", activeClinic.clinic_id),
        supabase.from("memberships")
          .select("id, monthly_price_cents, billing_cadence")
          .eq("clinic_id", activeClinic.clinic_id),
        supabase.from("inventory_items")
          .select("id, stock_quantity, reorder_threshold, unit_cost_cents")
          .eq("clinic_id", activeClinic.clinic_id),
      ]);

      if (cancelled) return;

      const appts = (apptsRes.data ?? []) as AppointmentLite[];
      const prevAppts = (prevApptsRes.data ?? []) as AppointmentLite[];
      const invoices = (invoicesRes.data ?? []) as { total_cents: number | null; status: string }[];
      const subsRaw = (subsRes.data ?? []) as unknown as Array<{
        id: string; status: string; canceled_at: string | null; created_at: string; membership_id: string;
      }>;
      const plans = new Map(((plansRes.data ?? []) as Array<{ id: string; monthly_price_cents: number | null; billing_cadence: string | null }>).map((p) => [p.id, p]));
      const subs: SubscriptionLite[] = subsRaw.map((s) => {
        const p = plans.get(s.membership_id);
        return {
          id: s.id, status: s.status, canceled_at: s.canceled_at, created_at: s.created_at,
          monthly_price_cents: p?.monthly_price_cents ?? 0,
          billing_cadence: p?.billing_cadence ?? "MONTHLY",
        };
      });
      const inventory = (inventoryRes.data ?? []) as { stock_quantity: number | null; reorder_threshold: number | null; unit_cost_cents: number | null }[];

      const days = Math.max(1, Math.round(ms / 86_400_000));
      const series = bucketByDay(appts, Math.min(days, 30));

      const revenue = sumRevenue(appts);
      const prevRevenue = sumRevenue(prevAppts);
      const revDelta = deltaPercent(revenue, prevRevenue);

      const ar = invoices
        .filter((i) => i.status === "unpaid" || i.status === "overdue")
        .reduce((s, i) => s + (i.total_cents ?? 0), 0) / 100;

      const ltv = calculateLTV(appts);
      const mrr = calculateNetMRR(subs);

      const noShows = appts.filter((a) => a.status === "no_show").length;
      const noShowRate = appts.length ? (noShows / appts.length) * 100 : 0;

      const lowStock = inventory.filter((i) => (i.stock_quantity ?? 0) <= (i.reorder_threshold ?? 0)).length;
      const stockValue = inventory.reduce((s, i) => s + (i.stock_quantity ?? 0) * (i.unit_cost_cents ?? 0), 0) / 100;

      const newCards: Record<string, CardData> = {
        revenue: {
          primary: money(revenue),
          trend: { value: revDelta, direction: revDelta > 0.5 ? "up" : revDelta < -0.5 ? "down" : "flat" },
          sparkline: series.map((s) => s.revenue),
        },
        "ar-aging": { primary: money(ar) },
        ltv: { primary: money(ltv) },
        mrr: { primary: money(mrr) },
        "no-shows": {
          primary: `${noShowRate.toFixed(1)}%`,
          trend: { value: noShowRate, direction: noShowRate > 5 ? "up" : "flat" },
        },
        stock: { primary: `${lowStock} low · ${money(stockValue)}` },
      };
      setCards(newCards);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeClinic, range]);

  const base = "/app/reports";

  const sections: { title: string; reports: Array<Parameters<typeof ReportCard>[0]> }[] = [
    {
      title: "Financial",
      reports: [
        { href: `${base}/financial/revenue`, title: "Revenue", icon: DollarSign,
          primaryMetric: cards.revenue?.primary ?? "—", trend: cards.revenue?.trend, sparkline: cards.revenue?.sparkline, loading },
        { href: `${base}/financial/ar-aging`, title: "AR Aging", icon: Receipt,
          primaryMetric: cards["ar-aging"]?.primary ?? "—", loading },
        { href: `${base}/financial/payment-methods`, title: "Payment Methods", icon: CreditCard,
          primaryMetric: "—", loading },
        { href: `${base}/financial/tax-summary`, title: "Tax Summary", icon: FileText,
          primaryMetric: "—", loading },
      ],
    },
    {
      title: "Clients",
      reports: [
        { href: `${base}/clients/lifetime-value`, title: "Lifetime Value", icon: Crown,
          primaryMetric: cards.ltv?.primary ?? "—", loading },
        { href: `${base}/clients/retention`, title: "Retention", icon: Repeat,
          primaryMetric: "—", loading },
        { href: `${base}/clients/acquisition`, title: "Acquisition", icon: UserPlus,
          primaryMetric: "—", loading },
      ],
    },
    {
      title: "Staff",
      reports: [
        { href: `${base}/staff/performance`, title: "Performance", icon: UserCog,
          primaryMetric: "—", loading },
        { href: `${base}/staff/commissions`, title: "Commissions", icon: Wallet,
          primaryMetric: "—", loading },
      ],
    },
    {
      title: "Services & Memberships",
      reports: [
        { href: `${base}/services/profitability`, title: "Profitability", icon: TrendingUp,
          primaryMetric: "—", loading },
        { href: `${base}/services/heat-map`, title: "Heat Map", icon: Flame,
          primaryMetric: "—", loading },
        { href: `${base}/memberships/mrr`, title: "MRR", icon: Award,
          primaryMetric: cards.mrr?.primary ?? "—", loading },
        { href: `${base}/memberships/utilization`, title: "Member Util.", icon: Users,
          primaryMetric: "—", loading },
      ],
    },
    {
      title: "Marketing",
      reports: [
        { href: `${base}/marketing/channels`, title: "Channel ROI", icon: Megaphone,
          primaryMetric: "—", loading },
        { href: `${base}/marketing/campaigns`, title: "Campaigns", icon: Mail,
          primaryMetric: "—", loading },
      ],
    },
    {
      title: "Inventory & Operations",
      reports: [
        { href: `${base}/inventory/stock`, title: "Stock Levels", icon: Boxes,
          primaryMetric: cards.stock?.primary ?? "—", loading },
        { href: `${base}/inventory/cogs`, title: "COGS", icon: PackageMinus,
          primaryMetric: "—", loading },
        { href: `${base}/operations/no-shows`, title: "No-shows", icon: CalendarX,
          primaryMetric: cards["no-shows"]?.primary ?? "—", trend: cards["no-shows"]?.trend, inverseTrend: true, loading },
      ],
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Insights into every part of your clinic</p>
        </div>
        <ReportDatePicker
          presetId={presetId} onPresetChange={setPresetId}
          compare={compare} onCompareChange={setCompare}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-6 pt-4">
          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {s.reports.map((r) => <ReportCard key={r.href} {...r} />)}
              </div>
            </section>
          ))}
        </TabsContent>
        <TabsContent value="saved" className="pt-4"><SavedPresetsList /></TabsContent>
        <TabsContent value="scheduled" className="pt-4"><ScheduledReportsList /></TabsContent>
      </Tabs>
    </div>
  );
}
