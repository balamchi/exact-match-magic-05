import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  ShieldOff,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { fetchEmailLog } from "@/lib/email/server-fns";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/email-log")({
  component: EmailLogPage,
});

type Range = "24h" | "7d" | "30d" | "all";
type StatusFilter = "all" | "sent" | "failed" | "suppressed" | "pending";

interface Row {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

function statusBadge(status: string) {
  if (status === "sent")
    return (
      <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15">
        Sent
      </Badge>
    );
  if (status === "dlq" || status === "failed" || status === "bounced")
    return (
      <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15">
        Failed
      </Badge>
    );
  if (status === "suppressed" || status === "complained")
    return (
      <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15">
        Suppressed
      </Badge>
    );
  return (
    <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15">
      Pending
    </Badge>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EmailLogPage() {
  const { activeClinic } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [template, setTemplate] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
    pending: 0,
  });
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const isPrivileged = useMemo(
    () => hasPermission(activeClinic?.role, "reports.read"),
    [activeClinic],
  );

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUnauthorized(true);
        return;
      }
      const result = await fetchEmailLog({
        data: {
          range,
          status,
          template: template === "all" ? null : template,
          limit: 100,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (result.unauthorized) {
        setUnauthorized(true);
        return;
      }
      setUnauthorized(false);
      setRows(result.rows);
      setStats(result.stats);
      setTemplates(result.templates);
    } catch (err) {
      console.error("Failed to load email log", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPrivileged) {
      setLoading(false);
      setUnauthorized(true);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, status, template, isPrivileged]);

  if (unauthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Email log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery history for transactional emails sent from this clinic.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <ShieldOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Restricted</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only clinic owners and admins can view email delivery logs. Contact your
            clinic owner if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Email log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery history for transactional emails sent from this clinic.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={Mail} loading={loading} />
        <StatCard label="Delivered" value={stats.sent} icon={CheckCircle2} loading={loading} />
        <StatCard label="Failed" value={stats.failed} icon={AlertTriangle} loading={loading} />
        <StatCard label="Suppressed" value={stats.suppressed} icon={ShieldOff} loading={loading} />
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          {(["24h", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r === "24h" ? "24 hours" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "All time"}
            </button>
          ))}
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No emails match this filter yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={`${r.message_id ?? i}`}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {r.template_name}
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.recipient_email}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs text-rose-300/90">
                      {r.error_message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing the latest status per email (deduplicated). Suppressed addresses won&rsquo;t
        receive future emails until removed from the suppression list.
      </p>
    </div>
  );
}
