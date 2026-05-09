import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
  Timer,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/checkin")({ component: CheckinPage });

type CheckinRow = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  status: string;
  notes: string | null;
  checked_in_at: string;
  seated_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type StatusKey = "waiting" | "seated" | "completed" | "cancelled";

const STATUS_META: Record<
  StatusKey,
  { label: string; tone: string; dot: string; icon: typeof Clock }
> = {
  waiting: {
    label: "Waiting",
    tone: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    icon: Clock,
  },
  seated: {
    label: "Seated",
    tone: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
    icon: UserCheck,
  },
  completed: {
    label: "Completed",
    tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    dot: "bg-rose-400",
    icon: XCircle,
  },
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesSince(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function formatWait(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function CheckinPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | StatusKey | "all">("active");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState<CheckinRow | null>(null);
  const [, forceTick] = useState(0);

  // tick every 30s so wait times refresh live
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("checked_in_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data as CheckinRow[]) ?? []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`checkins-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins", filter: `clinic_id=eq.${clinicId}` },
        load,
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);


  const counts = useMemo(() => {
    const c = { waiting: 0, seated: 0, completed: 0, cancelled: 0, total: rows.length };
    rows.forEach((r) => {
      if (r.status in c) (c as any)[r.status] += 1;
    });
    return c;
  }, [rows]);

  const longestWait = useMemo(() => {
    const waiting = rows.filter((r) => r.status === "waiting");
    if (waiting.length === 0) return 0;
    return Math.max(...waiting.map((r) => minutesSince(r.checked_in_at)));
  }, [rows]);

  const avgSeatTime = useMemo(() => {
    const seated = rows.filter(
      (r) => (r.status === "seated" || r.status === "completed") && r.seated_at,
    );
    if (seated.length === 0) return 0;
    const total = seated.reduce((acc, r) => {
      const wait =
        (new Date(r.seated_at!).getTime() - new Date(r.checked_in_at).getTime()) / 60000;
      return acc + Math.max(0, wait);
    }, 0);
    return Math.round(total / seated.length);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && r.status !== "waiting" && r.status !== "seated") return false;
      if (filter !== "active" && filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.client_name.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const handleStatusChange = async (row: CheckinRow, next: StatusKey) => {
    const patch: Partial<CheckinRow> = { status: next };
    if (next === "seated" && !row.seated_at) patch.seated_at = new Date().toISOString();
    if (next === "completed" && !row.completed_at)
      patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("checkins").update(patch).eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(`Marked as ${STATUS_META[next].label.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Front desk
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Live waitlist
          </h1>
          <p className="mt-1 max-w-[95vw] sm:max-w-2xl text-sm text-muted-foreground">
            Track who has arrived, who's seated, and who's been seen. Updates in real time across
            every device on the front desk.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setComposeOpen(true);
          }}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" /> Check in client
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Waiting"
          value={counts.waiting.toString()}
          accent="text-amber-300"
          icon={<Clock className="h-4 w-4" />}
          sub={
            longestWait > 0
              ? `Longest ${formatWait(longestWait)}`
              : "No one waiting"
          }
        />
        <KpiCard
          label="In treatment"
          value={counts.seated.toString()}
          accent="text-sky-300"
          icon={<UserCheck className="h-4 w-4" />}
          sub={`Avg seat time ${avgSeatTime}m`}
        />
        <KpiCard
          label="Seen today"
          value={counts.completed.toString()}
          accent="text-emerald-300"
          icon={<CheckCircle2 className="h-4 w-4" />}
          sub={`${counts.total} total today`}
        />
        <KpiCard
          label="Cancelled"
          value={counts.cancelled.toString()}
          accent="text-rose-300"
          icon={<XCircle className="h-4 w-4" />}
          sub="No-shows + walkouts"
        />
      </div>

      {/* Long-wait alert */}
      {longestWait >= 20 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-sm">
            <span className="font-medium text-amber-200">Long wait detected.</span>{" "}
            <span className="text-amber-200/70">
              A client has been waiting {formatWait(longestWait)}. Consider seating them or
              sending an apology message.
            </span>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, status, or notes…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
          {([
            ["active", "Active"],
            ["waiting", "Waiting"],
            ["seated", "Seated"],
            ["completed", "Completed"],
            ["all", "All"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                filter === key
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <Card className="border-border/60 bg-card/40 backdrop-blur">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading waitlist…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium text-foreground">Queue is clear</div>
              <p className="mt-1 text-sm text-muted-foreground">
                No one matches this filter. Check someone in to populate the waitlist.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((row) => {
              const status = (row.status as StatusKey) ?? "waiting";
              const meta = STATUS_META[status] ?? STATUS_META.waiting;
              const Icon = meta.icon;
              const wait = minutesSince(row.checked_in_at);
              const isUrgent = status === "waiting" && wait >= 20;

              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 p-4 transition hover:bg-muted/20 sm:flex-row sm:items-center sm:gap-4"
                >
                  {/* Status dot + name */}
                  <div className="flex items-center gap-3 sm:w-72">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                    <div className="min-w-0">
                      <button
                        onClick={() => {
                          setEditing(row);
                          setComposeOpen(true);
                        }}
                        className="block truncate text-left font-medium text-foreground hover:text-primary"
                      >
                        {row.client_name}
                      </button>
                      {row.notes && (
                        <div className="truncate text-xs text-muted-foreground">
                          {row.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Times */}
                  <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                    <TimeCell label="In" value={fmtTime(row.checked_in_at)} />
                    <TimeCell label="Seated" value={fmtTime(row.seated_at)} />
                    <TimeCell label="Out" value={fmtTime(row.completed_at)} />
                    <div
                      className={cn(
                        "flex items-center gap-1.5 font-medium",
                        isUrgent ? "text-amber-300" : "text-muted-foreground",
                      )}
                    >
                      <Timer className="h-3 w-3" />
                      {status === "waiting"
                        ? `Waiting ${formatWait(wait)}`
                        : status === "seated" && row.seated_at
                          ? `In room ${formatWait(minutesSince(row.seated_at))}`
                          : status === "completed" && row.completed_at && row.seated_at
                            ? `${formatWait(
                                Math.max(
                                  0,
                                  Math.floor(
                                    (new Date(row.completed_at).getTime() -
                                      new Date(row.seated_at).getTime()) /
                                      60000,
                                  ),
                                ),
                              )} visit`
                            : "—"}
                    </div>
                  </div>

                  {/* Status chip + actions */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("gap-1.5 border", meta.tone)}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>

                    {status === "waiting" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(row, "seated")}
                        className="border-sky-500/30 text-sky-200 hover:bg-sky-500/10"
                      >
                        Seat <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    {status === "seated" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(row, "completed")}
                        className="border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
                      >
                        Complete <CheckCircle2 className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    {(status === "waiting" || status === "seated") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusChange(row, "cancelled")}
                        className="text-muted-foreground hover:text-rose-300"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        editing={editing}
        clinicId={clinicId}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-card/40 p-4 backdrop-blur">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className={cn("mt-2 font-display text-2xl sm:text-3xl font-semibold", accent)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="font-mono text-foreground/90">{value}</span>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  editing,
  clinicId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CheckinRow | null;
  clinicId: string | null;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<StatusKey>("waiting");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.client_name ?? "");
      setStatus((editing?.status as StatusKey) ?? "waiting");
      setNotes(editing?.notes ?? "");
    }
  }, [open, editing]);

  const submit = async () => {
    if (!clinicId) return;
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const patch: Partial<CheckinRow> = {
          client_name: name.trim(),
          status,
          notes: notes.trim() || null,
        };
        if (status === "seated" && !editing.seated_at)
          patch.seated_at = new Date().toISOString();
        if (status === "completed" && !editing.completed_at)
          patch.completed_at = new Date().toISOString();
        const { error } = await supabase.from("checkins").update(patch).eq("id", editing.id);
        if (error) throw error;
        toast.success("Check-in updated");
      } else {
        const { error } = await supabase.from("checkins").insert({
          clinic_id: clinicId,
          client_name: name.trim(),
          status,
          notes: notes.trim() || null,
        });
        if (error) throw error;
        toast.success(`${name.trim()} checked in`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit check-in" : "Check in client"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the visit status or notes."
              : "Add a walk-in or arriving appointment to the live queue."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ci-name">Client name</Label>
            <Input
              id="ci-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_META) as StatusKey[]).map((key) => {
                const meta = STATUS_META[key];
                const Icon = meta.icon;
                const active = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                      active
                        ? "border-primary/50 bg-gradient-primary/10 text-foreground shadow-glow"
                        : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-notes">Notes</Label>
            <Textarea
              id="ci-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Service, room, or any front-desk note…"
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Check in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
