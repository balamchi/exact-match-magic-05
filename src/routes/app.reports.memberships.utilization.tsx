import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReportShell } from "@/components/report-shell";
import { ReportTable } from "@/components/report-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { num, pct } from "@/lib/reports/format";

export const Route = createFileRoute("/app/reports/memberships/utilization")({ component: Util });

interface Sub { id: string; status: string; tier_id?: string | null; client_id: string | null; created_at: string }
interface Appt { client_id: string | null; status: string; starts_at: string }

function Util() {
  const { activeClinic } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [s, a] = await Promise.all([
        supabase.from("membership_subscriptions" as never)
          .select("id, status, client_id, created_at")
          .eq("clinic_id", activeClinic.clinic_id)
          .eq("status", "active"),
        supabase.from("appointments")
          .select("client_id, status, starts_at")
          .eq("clinic_id", activeClinic.clinic_id)
          .gte("starts_at", since),
      ]);
      setSubs((s.data ?? []) as Sub[]);
      setAppts((a.data ?? []) as Appt[]);
      setLoading(false);
    })();
  }, [activeClinic]);

  const memberClientIds = new Set(subs.map((s) => s.client_id).filter(Boolean) as string[]);
  const visited30 = new Set(appts.filter((a) => a.status === "completed" && a.client_id && memberClientIds.has(a.client_id)).map((a) => a.client_id as string));
  const utilizationRate = memberClientIds.size ? (visited30.size / memberClientIds.size) * 100 : 0;
  const dormant = memberClientIds.size - visited30.size;

  const rows = Array.from(memberClientIds).map((cid) => {
    const visits = appts.filter((a) => a.client_id === cid && a.status === "completed").length;
    return { client_id: cid, visits };
  }).sort((a, b) => a.visits - b.visits).slice(0, 50);

  return (
    <>
      <div className="px-4 pt-4 md:px-6"><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/app/reports"><ArrowLeft className="h-4 w-4" />Reports</Link></Button></div>
      <ReportShell
        title="Member Utilization"
        description="How actively members are using their memberships (30 days)"
        primaryKpi={{ label: "Utilization rate", value: pct(utilizationRate) }}
        secondaryKpis={[
          { label: "Active members", value: num(memberClientIds.size) },
          { label: "Visited (30d)", value: num(visited30.size) },
          { label: "Dormant", value: num(dormant) },
        ]}
      >
        <ReportTable
          loading={loading}
          columns={[
            { key: "c", header: "Client", cell: (r: typeof rows[number]) => r.client_id?.slice(0, 8) ?? "—" },
            { key: "v", header: "Visits in 30d", align: "right", cell: (r) => r.visits },
          ]}
          rows={rows}
          empty="No active members"
        />
      </ReportShell>
    </>
  );
}
