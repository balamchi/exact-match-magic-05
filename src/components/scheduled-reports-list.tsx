import { useEffect, useState } from "react";
import { Mail, Trash2, Send, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Sched {
  id: string; name: string; cadence: string; recipients: string[]; active: boolean;
  next_send_at: string; report_keys: string[]; send_time: string;
}

export function ScheduledReportsList() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Sched[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data } = await supabase.from("scheduled_reports" as never)
      .select("id, name, cadence, recipients, active, next_send_at, report_keys, send_time")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("next_send_at", { ascending: true });
    setRows(((data ?? []) as unknown) as Sched[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [activeClinic]);

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("scheduled_reports" as never).update({ active: !active } as never).eq("id", id);
    toast.success(active ? "Paused" : "Resumed");
    void load();
  };
  const remove = async (id: string) => {
    await supabase.from("scheduled_reports" as never).delete().eq("id", id);
    toast.success("Deleted");
    setRows(rows.filter((r) => r.id !== id));
  };
  const sendNow = async (id: string) => {
    const { error } = await supabase.functions.invoke("reports-scheduled-send", { body: { id } });
    if (error) toast.error("Send failed"); else toast.success("Sent!");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <h3 className="mt-3 font-medium">No scheduled emails</h3>
        <p className="mt-1 text-sm text-muted-foreground">Open a report and click Schedule to set up a digest.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{r.name} {!r.active && <span className="ml-2 text-xs text-muted-foreground">(paused)</span>}</div>
            <div className="text-xs text-muted-foreground">
              {r.cadence} · {r.recipients.length} recipient(s) · Next: {new Date(r.next_send_at).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => sendNow(r.id)}><Send className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => toggle(r.id, r.active)}>
              {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
