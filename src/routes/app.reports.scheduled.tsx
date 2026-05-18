import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Plus, Search, Edit3, Trash2, Power, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/reports/scheduled")({
  component: ScheduledReportsPage,
});

type ScheduleRow = {
  id: string;
  clinic_id: string;
  user_id: string;
  preset_id: string | null;
  report_keys: string[];
  recipients: string[];
  name: string;
  cadence: string;
  send_time: string;
  send_day_of_week: number | null;
  send_day_of_month: number | null;
  timezone: string;
  active: boolean;
  next_send_at: string;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const REPORT_OPTIONS: { key: string; label: string }[] = [
  { key: "revenue", label: "Revenue summary" },
  { key: "no_shows", label: "No-shows & cancellations" },
  { key: "client_retention", label: "Client retention" },
  { key: "client_acquisition", label: "New client acquisition" },
  { key: "client_ltv", label: "Client lifetime value" },
  { key: "ar_aging", label: "AR aging" },
  { key: "payment_methods", label: "Payment methods" },
  { key: "tax_summary", label: "Tax summary" },
  { key: "memberships_mrr", label: "Memberships MRR" },
  { key: "memberships_utilization", label: "Memberships utilization" },
  { key: "staff_performance", label: "Staff performance" },
  { key: "staff_commissions", label: "Staff commissions" },
  { key: "services_profitability", label: "Services profitability" },
  { key: "services_heatmap", label: "Services heat-map" },
  { key: "inventory_stock", label: "Inventory stock levels" },
  { key: "inventory_cogs", label: "Inventory COGS" },
  { key: "marketing_campaigns", label: "Marketing campaigns" },
  { key: "marketing_channels", label: "Marketing channels" },
];

const TIMEZONE_OPTIONS = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Tehran",
  "Australia/Sydney",
  "UTC",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function ScheduledReportsPage() {
  const { activeClinic, session } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const userId = session?.user?.id ?? null;
  const canManage = hasPermission(activeClinic?.role, "reports.export");
  const canRead = hasPermission(activeClinic?.role, "reports.read");

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    cadence: "weekly" as "daily" | "weekly" | "monthly",
    send_time: "09:00",
    send_day_of_week: 1,
    send_day_of_month: 1,
    timezone: "America/Toronto",
    report_keys: [] as string[],
    recipients: "" as string,
    active: true,
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead || !clinicId || !userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("user_id", userId)
        .order("name");
      if (!active) return;
      if (error) toast.error(error.message);
      else setRows((data as ScheduleRow[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clinicId, userId, canRead]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.active) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q);
    });
  }, [rows, search, showInactive]);

  const openCreate = () => {
    if (!canManage) return toast.error("You don't have permission to manage schedules.");
    setEditingId(null);
    setForm({
      name: "",
      cadence: "weekly",
      send_time: "09:00",
      send_day_of_week: 1,
      send_day_of_month: 1,
      timezone: activeClinic?.clinic?.timezone ?? "America/Toronto",
      report_keys: [],
      recipients: session?.user?.email ?? "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: ScheduleRow) => {
    if (!canManage) return toast.error("You don't have permission to manage schedules.");
    setEditingId(row.id);
    setForm({
      name: row.name,
      cadence: row.cadence as "daily" | "weekly" | "monthly",
      send_time: row.send_time?.slice(0, 5) ?? "09:00",
      send_day_of_week: row.send_day_of_week ?? 1,
      send_day_of_month: row.send_day_of_month ?? 1,
      timezone: row.timezone,
      report_keys: row.report_keys ?? [],
      recipients: (row.recipients ?? []).join(", "),
      active: row.active,
    });
    setDialogOpen(true);
  };

  const toggleReportKey = (key: string) => {
    setForm((f) => ({
      ...f,
      report_keys: f.report_keys.includes(key)
        ? f.report_keys.filter((k) => k !== key)
        : [...f.report_keys, key],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return toast.error("You don't have permission.");
    if (!clinicId || !userId) return;
    if (!form.name.trim()) return toast.error("Name is required.");
    if (form.report_keys.length === 0) return toast.error("Select at least 1 report.");

    const recipients = form.recipients.split(",").map((e) => e.trim()).filter(Boolean);
    if (recipients.length === 0) return toast.error("Add at least 1 recipient email.");

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const badEmail = recipients.find((e) => !emailRe.test(e));
    if (badEmail) return toast.error(`Invalid email: ${badEmail}`);

    const next = computeNextSendAt(
      form.cadence,
      form.send_time,
      form.send_day_of_week,
      form.send_day_of_month,
    );

    const payload = {
      clinic_id: clinicId,
      user_id: userId,
      name: form.name.trim(),
      cadence: form.cadence,
      send_time: form.send_time,
      send_day_of_week: form.cadence === "weekly" ? form.send_day_of_week : null,
      send_day_of_month: form.cadence === "monthly" ? form.send_day_of_month : null,
      timezone: form.timezone,
      report_keys: form.report_keys,
      recipients,
      active: form.active,
      next_send_at: next.toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("scheduled_reports").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r)));
      toast.success("Schedule updated");
    } else {
      const { data, error } = await supabase.from("scheduled_reports").insert(payload).select().single();
      if (error) return toast.error(error.message);
      if (data) setRows((prev) => [...prev, data as ScheduleRow]);
      toast.success("Schedule created");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId || !canManage) return;
    const { error } = await supabase.from("scheduled_reports").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    toast.success("Schedule deleted");
    setDeleteId(null);
  };

  const toggleActive = async (row: ScheduleRow) => {
    if (!canManage) return toast.error("You don't have permission.");
    const newActive = !row.active;
    const { error } = await supabase.from("scheduled_reports").update({ active: newActive }).eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: newActive } : r)));
    toast.success(newActive ? "Schedule activated" : "Schedule paused");
  };

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Restricted</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to view scheduled reports. Contact your clinic admin if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-semibold">Scheduled reports</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Have key reports emailed to you on a regular schedule — daily, weekly, or monthly.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New schedule
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search schedules…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 px-1">
          <Switch id="show-inactive-sched" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="show-inactive-sched" className="text-sm">Show paused</Label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 px-4 sm:px-6 py-16 text-center">
          <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {rows.length === 0 ? "No scheduled reports yet" : "No schedules match your filter"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {rows.length === 0
              ? "Schedule reports to be emailed automatically — a weekly revenue digest every Monday, monthly tax summary, etc."
              : "Try clearing your search or toggling Show paused."}
          </p>
          {canManage && rows.length === 0 && (
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create your first schedule</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{row.name}</h3>
                    {!row.active && (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Paused</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cadenceLabel(row)}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />
                      {row.recipients?.length ?? 0} recipient{(row.recipients?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span>{row.report_keys?.length ?? 0} report{(row.report_keys?.length ?? 0) === 1 ? "" : "s"}</span>
                    {row.last_sent_at && <span>Last sent {new Date(row.last_sent_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(row)} className="text-xs">
                      <Power className="mr-1 h-3 w-3" />{row.active ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(row.report_keys ?? []).slice(0, 6).map((k) => {
                  const opt = REPORT_OPTIONS.find((o) => o.key === k);
                  return <Badge key={k} variant="outline" className="text-xs">{opt?.label ?? k}</Badge>;
                })}
                {(row.report_keys?.length ?? 0) > 6 && (
                  <Badge variant="outline" className="text-xs">+{(row.report_keys?.length ?? 0) - 6} more</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit schedule" : "New scheduled report"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Schedule name *</Label>
              <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Weekly Revenue Digest" required autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-cadence">Cadence *</Label>
                <select id="s-cadence" value={form.cadence}
                  onChange={(e) => setForm({ ...form, cadence: e.target.value as "daily" | "weekly" | "monthly" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-time">Send time *</Label>
                <Input id="s-time" type="time" value={form.send_time}
                  onChange={(e) => setForm({ ...form, send_time: e.target.value })} required />
              </div>
            </div>

            {form.cadence === "weekly" && (
              <div className="space-y-1.5">
                <Label htmlFor="s-dow">Day of week *</Label>
                <select id="s-dow" value={form.send_day_of_week}
                  onChange={(e) => setForm({ ...form, send_day_of_week: parseInt(e.target.value) })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            )}

            {form.cadence === "monthly" && (
              <div className="space-y-1.5">
                <Label htmlFor="s-dom">Day of month *</Label>
                <Input id="s-dom" type="number" min={1} max={28} value={form.send_day_of_month}
                  onChange={(e) => setForm({ ...form, send_day_of_month: parseInt(e.target.value) || 1 })} />
                <p className="text-xs text-muted-foreground">Use 1–28 to avoid month-end edge cases.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="s-tz">Timezone *</Label>
              <select id="s-tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-recipients">Recipients * (comma-separated emails)</Label>
              <Input id="s-recipients" value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                placeholder="me@example.com, colleague@example.com" required />
            </div>

            <div className="space-y-2">
              <Label>Reports to include * (pick at least 1)</Label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-2">
                {REPORT_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                    <input type="checkbox" checked={form.report_keys.includes(opt.key)}
                      onChange={() => toggleReportKey(opt.key)} className="rounded border-input" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{form.report_keys.length} selected</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="s-active" checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
              <Label htmlFor="s-active" className="text-sm">Active (start sending immediately)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? "Save changes" : "Create schedule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Future emails will stop being sent. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function cadenceLabel(row: ScheduleRow): string {
  const time = row.send_time?.slice(0, 5) ?? "—";
  if (row.cadence === "daily") return `Daily at ${time}`;
  if (row.cadence === "weekly") {
    const day = DAYS_OF_WEEK.find((d) => d.value === row.send_day_of_week)?.label ?? "Monday";
    return `Every ${day} at ${time}`;
  }
  if (row.cadence === "monthly") {
    return `Day ${row.send_day_of_month ?? 1} of every month at ${time}`;
  }
  return row.cadence;
}

function computeNextSendAt(
  cadence: string,
  time: string,
  dow: number | null,
  dom: number | null,
): Date {
  const [h, m] = time.split(":").map(Number);
  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(h ?? 9, m ?? 0);

  if (cadence === "daily") {
    if (next <= new Date()) next.setDate(next.getDate() + 1);
  } else if (cadence === "weekly") {
    const target = dow ?? 1;
    const diff = (target - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= new Date()) next.setDate(next.getDate() + 7);
  } else {
    next.setDate(dom ?? 1);
    if (next <= new Date()) next.setMonth(next.getMonth() + 1);
  }
  return next;
}
