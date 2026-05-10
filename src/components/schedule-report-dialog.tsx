import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportKey: string;
  reportTitle: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeNextSendAt(cadence: string, time: string, dow: number, dom: number, tz: string): Date {
  // Simple UTC-based approximation; cron checks every 15min.
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(h, m);
  if (cadence === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (cadence === "weekly") {
    const diff = (dow - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= now) next.setDate(next.getDate() + 7);
  } else {
    next.setDate(dom);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  void tz;
  return next;
}

export function ScheduleReportDialog({ open, onOpenChange, reportKey, reportTitle }: Props) {
  const { activeClinic, user } = useAuth();
  const [name, setName] = useState(`${reportTitle} digest`);
  const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dow, setDow] = useState(1);
  const [dom, setDom] = useState(1);
  const [time, setTime] = useState("09:00");
  const [recipients, setRecipients] = useState<string[]>(user?.email ? [user.email] : []);
  const [recipientInput, setRecipientInput] = useState("");
  const [saving, setSaving] = useState(false);

  const tz = activeClinic?.clinic.timezone ?? "America/Toronto";
  const nextSend = useMemo(() => computeNextSendAt(cadence, time, dow, dom, tz), [cadence, time, dow, dom, tz]);

  const addRecipient = () => {
    const v = recipientInput.trim().toLowerCase();
    if (v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && !recipients.includes(v)) {
      setRecipients([...recipients, v]);
      setRecipientInput("");
    }
  };

  const handleSave = async () => {
    if (!activeClinic || !user || !name.trim() || recipients.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from("scheduled_reports" as never).insert({
      clinic_id: activeClinic.clinic_id,
      user_id: user.id,
      report_keys: [reportKey],
      name: name.trim(),
      cadence,
      send_time: time + ":00",
      send_day_of_week: cadence === "weekly" ? dow : null,
      send_day_of_month: cadence === "monthly" ? dom : null,
      timezone: tz,
      recipients,
      next_send_at: nextSend.toISOString(),
      active: true,
    } as never);
    setSaving(false);
    if (error) { toast.error("Could not schedule"); return; }
    toast.success("Scheduled!", { description: `First email arrives ${nextSend.toLocaleString()}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Schedule email digest</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <RadioGroup value={cadence} onValueChange={(v) => setCadence(v as "daily" | "weekly" | "monthly")} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="daily" id="c-d" /><Label htmlFor="c-d" className="font-normal">Daily</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="weekly" id="c-w" /><Label htmlFor="c-w" className="font-normal">Weekly</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="monthly" id="c-m" /><Label htmlFor="c-m" className="font-normal">Monthly</Label></div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {cadence === "weekly" && (
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={String(dow)} onValueChange={(v) => setDow(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {cadence === "monthly" && (
              <div className="space-y-2">
                <Label>Day of month</Label>
                <Select value={String(dom)} onValueChange={(v) => setDom(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 28 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Time ({tz})</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Send to</Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
              />
              <Button type="button" variant="outline" onClick={addRecipient}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipients.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button type="button" onClick={() => setRecipients(recipients.filter((x) => x !== r))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <span className="text-muted-foreground">Next email:</span>{" "}
            <span className="font-medium">{nextSend.toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || recipients.length === 0 || !name.trim()}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
