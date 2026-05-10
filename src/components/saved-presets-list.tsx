import { useEffect, useState } from "react";

import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REPORT_PRESETS } from "@/lib/reports/hooks";

interface Preset {
  id: string;
  report_key: string;
  name: string;
  config: { presetId?: string; compare?: boolean };
  created_at: string;
}

export function SavedPresetsList() {
  const { activeClinic, user } = useAuth();
  const [rows, setRows] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeClinic || !user) return;
    setLoading(true);
    const { data } = await supabase.from("report_presets" as never)
      .select("id, report_key, name, config, created_at")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows(((data ?? []) as unknown) as Preset[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [activeClinic, user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("report_presets" as never).delete().eq("id", id);
    if (error) { toast.error("Could not delete"); return; }
    toast.success("Preset deleted");
    setRows(rows.filter((r) => r.id !== id));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Star className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <h3 className="mt-3 font-medium">No saved views yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Open any report and click Save to capture a view.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const cfg = (r.config ?? {}) as { presetId?: string; compare?: boolean; custom?: boolean };
        const presetLabel = REPORT_PRESETS.find((p) => p.id === cfg.presetId)?.label ?? "Last 30 days";
        const isCustom = !!cfg.custom || r.report_key === "custom";
        const href = isCustom
          ? `/app/reports/builder?preset=${r.id}`
          : `/app/reports/${r.report_key.replace(/\./g, "/")}`;
        return (
          <Card key={r.id} className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                {isCustom && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Custom</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {isCustom ? "Custom builder" : r.report_key} · {presetLabel}{cfg.compare ? " · vs previous" : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline"><a href={href}>Open</a></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
