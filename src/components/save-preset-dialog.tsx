import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REPORT_PRESETS } from "@/lib/reports/hooks";
import type { CustomReportConfig } from "@/lib/reports/builder-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportKey: string;
  reportTitle: string;
  presetId: string;
  compare: boolean;
  /** When provided, the preset is saved as a custom-builder config instead of a canned-report preset. */
  customConfig?: CustomReportConfig;
}

export function SavePresetDialog({
  open, onOpenChange, reportKey, reportTitle, presetId, compare, customConfig,
}: Props) {
  const { activeClinic, user } = useAuth();
  const [name, setName] = useState(`${reportTitle} view`);
  const [saving, setSaving] = useState(false);
  const presetLabel = REPORT_PRESETS.find((p) => p.id === presetId)?.label ?? "Last 30 days";

  const handleSave = async () => {
    if (!activeClinic || !user || !name.trim()) return;
    setSaving(true);
    const config = customConfig
      ? { custom: true, builder: customConfig, presetId, compare }
      : { presetId, compare };
    const { error } = await supabase.from("report_presets" as never).insert({
      clinic_id: activeClinic.clinic_id,
      user_id: user.id,
      report_key: customConfig ? "custom" : reportKey,
      name: name.trim(),
      config,
    } as never);
    setSaving(false);
    if (error) { toast.error("Could not save preset"); return; }
    toast.success("Preset saved", { description: "Find it under the Saved tab on Reports." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save this view</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset-name">Name</Label>
            <Input id="preset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q4 Revenue Review" />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">This will save:</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Report: {reportTitle}</li>
              <li>Date range: {presetLabel}</li>
              <li>Comparison: {compare ? "Previous period" : "None"}</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>Save preset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
