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

interface Send { id: string; template_name: string | null; status: string; created_at: string; metadata: Record<string, unknown> | null }
interface Campaign { id: string; name: string; channel: string; status: string; sent_count: number | null; open_count: number | null; click_count: number | null; created_at: string }

function Campaigns() {
  const { activeClinic } = useAuth();
  const range = useReportRange();
  const [sends, setSends] = useState<Send[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const fromIso = range.range.from.toISOString();
      const toIso = range.range.to.toISOString();
      // email_send_log is global (no clinic_id); filter by metadata.clinic_id when present.
      const [sendsRes, campRes] = await Promise.all([
        supabase.from("email_send_log")
          .select("id, template_name, status, created_at, metadata")
          .gte("created_at", fromIso).lte("created_at", toIso).limit(2000),
        supabase.from("marketing_campaigns")
          .select("id, name, channel, status, sent_count, open_count, click_count, created_at")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("created_at", fromIso).lte("created_at", toIso),
      ]);
      const allSends = ((sendsRes.data ?? []) as unknown) as Send[];
      const cid = activeClinic.clinic_id;
      const filtered = allSends.filter((s) => {
        const meta = s.metadata as Record<string, unknown> | null;
        return !meta?.clinic_id || meta.clinic_id === cid;
      });
      setSends(filtered);
      setCampaigns(((campRes.data ?? []) as unknown) as Campaign[]);
      setLoading(false);
    })();
  }, [activeClinic, range.range]);

  const transactionalSent = sends.filter((s) => s.status === "sent" || s.status === "delivered").length;
  const totalSent = transactionalSent + campaigns.reduce((n, c) => n + (c.sent_count ?? 0), 0);
  const totalOpened = campaigns.reduce((n, c) => n + (c.open_count ?? 0), 0);
  const totalClicked = campaigns.reduce((n, c) => n + (c.click_count ?? 0), 0);

  const rows = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    status: c.status,
    sent: c.sent_count ?? 0,
    opened: c.open_count ?? 0,
    clicked: c.click_count ?? 0,
    openRate: c.sent_count ? ((c.open_count ?? 0) / c.sent_count) * 100 : 0,
    clickRate: c.sent_count ? ((c.click_count ?? 0) / c.sent_count) * 100 : 0,
  })).sort((a, b) => b.sent - a.sent);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Campaign Performance"
        description="Marketing campaign engagement plus transactional email volume"
        rangeControl={range}
        primaryKpi={{ label: "Emails sent", value: num(totalSent) }}
        secondaryKpis={[
          { label: "Campaign open rate", value: pct(rows.reduce((s, r) => s + r.sent, 0) ? (totalOpened / rows.reduce((s, r) => s + r.sent, 0)) * 100 : 0) },
          { label: "Campaign click rate", value: pct(rows.reduce((s, r) => s + r.sent, 0) ? (totalClicked / rows.reduce((s, r) => s + r.sent, 0)) * 100 : 0) },
          { label: "Transactional", value: num(transactionalSent) },
        ]}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "n", header: "Campaign", cell: (r: typeof rows[number]) => r.name },
            { key: "ch", header: "Channel", cell: (r) => r.channel },
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
