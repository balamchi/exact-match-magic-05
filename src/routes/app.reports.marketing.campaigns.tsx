import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useReportRange } from "@/lib/reports/hooks";
import { num, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/marketing/campaigns")({ component: Campaigns });

interface EmailLog { id: string; subject: string | null; status: string; sent_at: string | null; opened_at?: string | null; clicked_at?: string | null }

function Campaigns() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("email_log" as never)
        .select("id, subject, status, sent_at, opened_at, clicked_at")
        .eq("clinic_id", activeClinic.clinic_id)
        .gte("sent_at", range.range.from.toISOString())
        .lte("sent_at", range.range.to.toISOString())
        .limit(1000);
      setLogs(((data ?? []) as unknown) as EmailLog[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const sent = logs.filter((l) => l.status === "sent" || l.sent_at).length;
  const opened = logs.filter((l) => l.opened_at).length;
  const clicked = logs.filter((l) => l.clicked_at).length;

  // Group by subject as proxy for campaign
  const byCampaign = new Map<string, { sent: number; opened: number; clicked: number }>();
  for (const l of logs) {
    const k = l.subject ?? "Unlabeled";
    const c = byCampaign.get(k) ?? { sent: 0, opened: 0, clicked: 0 };
    c.sent++;
    if (l.opened_at) c.opened++;
    if (l.clicked_at) c.clicked++;
    byCampaign.set(k, c);
  }
  const rows = Array.from(byCampaign.entries()).map(([subject, v]) => ({
    subject, ...v,
    openRate: v.sent ? (v.opened / v.sent) * 100 : 0,
    clickRate: v.sent ? (v.clicked / v.sent) * 100 : 0,
  })).sort((a, b) => b.sent - a.sent).slice(0, 50);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Campaign Performance"
        description="Email campaign engagement"
        rangeControl={range}
        primaryKpi={{ label: "Emails sent", value: num(sent) }}
        secondaryKpis={[
          { label: "Open rate", value: pct(sent ? (opened / sent) * 100 : 0) },
          { label: "Click rate", value: pct(sent ? (clicked / sent) * 100 : 0) },
        ]}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "s", header: "Subject", cell: (r: typeof rows[number]) => r.subject },
            { key: "se", header: "Sent", align: "right", cell: (r) => r.sent },
            { key: "o", header: "Open", align: "right", cell: (r) => pct(r.openRate) },
            { key: "c", header: "Click", align: "right", cell: (r) => pct(r.clickRate) },
          ]}
          rows={rows}
          empty="No campaigns sent in period"
        />
      </ReportShell>
    </>
  );
}
