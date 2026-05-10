import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Clock, TrendingUp, Users, Calendar, Sparkles,
  ArrowRight, CheckCircle2, AlertTriangle, Lightbulb, BarChart3,
} from "lucide-react";
import { Phase4Badge, ComingSoonBanner } from "@/components/beta-badge";

export const Route = createFileRoute("/app/ai-optimizer")({
  component: AiOptimizerPage,
});

interface Suggestion {
  id: string;
  type: "gap" | "overlap" | "demand" | "efficiency";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  savings: string;
  actionLabel: string;
}

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    type: "gap",
    title: "Fill Tuesday 2–4 PM gap",
    description: "Your Tuesdays consistently have a 2-hour gap between 2–4 PM. Consider offering a 15% discount for Botox consultations during this window to increase utilization.",
    impact: "high",
    savings: "+$1,200/mo potential",
    actionLabel: "Create promo",
  },
  {
    id: "2",
    type: "overlap",
    title: "Reduce double-booking risk on Fridays",
    description: "Dr. Smith has 3 overlapping appointments every Friday afternoon. Extend buffer time from 10 to 20 minutes between injectable sessions.",
    impact: "high",
    savings: "−23% client wait time",
    actionLabel: "Adjust buffers",
  },
  {
    id: "3",
    type: "demand",
    title: "HydraFacial demand spike predicted",
    description: "Based on seasonal trends and last year's data, HydraFacial bookings increase 40% in the next 3 weeks. Consider adding extra availability for estheticians.",
    impact: "medium",
    savings: "+$2,800 projected",
    actionLabel: "Open slots",
  },
  {
    id: "4",
    type: "efficiency",
    title: "Consolidate short appointments",
    description: "You have 12 standalone 15-minute follow-ups spread across the week. Batching them into two dedicated 1-hour blocks would free 4 hours of prime appointment time.",
    impact: "medium",
    savings: "+4 hrs/week freed",
    actionLabel: "Batch follow-ups",
  },
  {
    id: "5",
    type: "gap",
    title: "Morning slots underutilized",
    description: "Only 34% of 8–10 AM slots are booked. Your VIP clients prefer mornings — send a targeted campaign offering priority morning booking.",
    impact: "low",
    savings: "+$600/mo potential",
    actionLabel: "Send campaign",
  },
  {
    id: "6",
    type: "demand",
    title: "Staff rebalancing opportunity",
    description: "Nurse Jessica is at 95% capacity while Nurse Karen is at 62%. Reassigning 3 weekly chemical peel slots would balance workload and reduce overtime.",
    impact: "high",
    savings: "−$400/mo overtime",
    actionLabel: "Rebalance",
  },
];

const METRICS = [
  { label: "Schedule Utilization", value: "73%", change: "+5%", icon: Calendar },
  { label: "Avg Wait Time", value: "8 min", change: "−3 min", icon: Clock },
  { label: "Revenue/Hour", value: "$187", change: "+$22", icon: TrendingUp },
  { label: "No-Show Rate", value: "4.2%", change: "−1.8%", icon: Users },
];

const typeConfig: Record<string, { color: string; icon: typeof Brain }> = {
  gap: { color: "text-amber-400", icon: AlertTriangle },
  overlap: { color: "text-red-400", icon: Clock },
  demand: { color: "text-emerald-400", icon: TrendingUp },
  efficiency: { color: "text-blue-400", icon: Lightbulb },
};

const impactColors = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function AiOptimizerPage() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);

  const suggestions = MOCK_SUGGESTIONS.filter((s) => !dismissed.has(s.id));

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 2000);
  };

  return (
    <div className="space-y-8">
      <ComingSoonBanner
        title="AI Schedule Optimizer — coming in Phase 4"
        description="The interface and analytics preview below are illustrative. Real recommendations and actions activate when Phase 4 ships."
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Schedule Optimizer
            <Phase4Badge />
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered recommendations to maximize bookings, reduce gaps, and optimize staff schedules
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing}>
          <Sparkles className="h-4 w-4 mr-2" />
          {analyzing ? "Analyzing…" : "Run Analysis"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="bg-card/60 border-border/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <m.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-emerald-400">{m.change}</span>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmap placeholder */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Weekly Utilization Heatmap
          </CardTitle>
          <CardDescription>Darker cells = higher booking density</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-1 text-[10px]">
            <div />
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-muted-foreground font-medium">{d}</div>
            ))}
            {["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"].map((hour, hi) => (
              <>
                <div key={hour} className="text-right text-muted-foreground pr-1 flex items-center justify-end">{hour}</div>
                {[0.9, 0.4, 0.7, 0.85, 0.95, 0.6, 0.2].map((base, di) => {
                  const val = Math.min(1, Math.max(0.05, base + (Math.sin(hi * di) * 0.3)));
                  return (
                    <div
                      key={`${hi}-${di}`}
                      className="aspect-square rounded-sm"
                      style={{ backgroundColor: `oklch(0.65 0.2 280 / ${val})` }}
                      title={`${Math.round(val * 100)}% utilized`}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Optimization Suggestions
          <Badge variant="outline" className="ml-2 text-xs">{suggestions.length} active</Badge>
        </h2>
        <div className="space-y-3">
          {suggestions.map((s) => {
            const cfg = typeConfig[s.type];
            return (
              <Card key={s.id} className="bg-card/60 border-border/40 hover:border-primary/30 transition-colors">
                <CardContent className="py-4 flex items-start gap-4">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{s.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${impactColors[s.impact]}`}>
                        {s.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                    <p className="text-xs text-emerald-400 font-medium mt-1">{s.savings}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setDismissed((p) => new Set(p).add(s.id))}>
                      Dismiss
                    </Button>
                    <Button size="sm">
                      {s.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {suggestions.length === 0 && (
            <Card className="bg-card/60 border-border/40">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-medium">All optimized!</p>
                <p className="text-sm text-muted-foreground">No pending suggestions. Run analysis again to check for new opportunities.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
