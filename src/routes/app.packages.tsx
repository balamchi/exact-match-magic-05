import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package as PackageIcon,
  Plus,
  Search,
  Sparkles,
  Calendar,
  TrendingUp,
  Layers,
  Tag,
  CheckCircle2,
  PauseCircle,
  Pencil,
  Copy,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/packages")({ component: PackagesPage });

type PackageRow = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  sessions: number;
  price_cents: number;
  expires_after_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Recipe = {
  name: string;
  description: string;
  sessions: number;
  price_cents: number;
  expires_after_days: number | null;
};

const RECIPES: Recipe[] = [
  {
    name: "Botox 3-Pack",
    description: "Three botox touch-up sessions over the year. Lock in pricing.",
    sessions: 3,
    price_cents: 99000,
    expires_after_days: 365,
  },
  {
    name: "Hydrafacial Series",
    description: "Six-session glow plan, one per month.",
    sessions: 6,
    price_cents: 84000,
    expires_after_days: 240,
  },
  {
    name: "Laser Hair Removal — Full",
    description: "Eight-session course covering one large area.",
    sessions: 8,
    price_cents: 168000,
    expires_after_days: 540,
  },
  {
    name: "New Client Starter",
    description: "Three intro treatments at a soft-launch price.",
    sessions: 3,
    price_cents: 29900,
    expires_after_days: 120,
  },
];

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtPerSession(cents: number, sessions: number) {
  if (!sessions) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
  }).format(cents / 100 / sessions);
}

function PackagesPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [seed, setSeed] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setRows((data as PackageRow[]) ?? []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`packages-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packages", filter: `clinic_id=eq.${clinicId}` },
        load,
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const totalValue = rows.reduce((s, r) => s + (r.price_cents ?? 0), 0);
    const avgSessions =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((s, r) => s + (r.sessions ?? 0), 0) / rows.length);
    const bestValue = rows
      .filter((r) => r.sessions > 0)
      .sort((a, b) => a.price_cents / a.sessions - b.price_cents / b.sessions)[0];
    return { active, totalValue, avgSessions, bestValue };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && !r.active) return false;
      if (filter === "paused" && r.active) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const openNew = (recipe?: Recipe) => {
    setEditing(null);
    setSeed(recipe ?? null);
    setComposeOpen(true);
  };

  const openEdit = (row: PackageRow) => {
    setEditing(row);
    setSeed(null);
    setComposeOpen(true);
  };

  const togglePackage = async (row: PackageRow) => {
    const { error } = await supabase
      .from("packages")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(row.active ? "Package paused" : "Package activated");
  };

  const duplicate = async (row: PackageRow) => {
    if (!clinicId) return;
    const { error } = await supabase.from("packages").insert({
      clinic_id: clinicId,
      name: `${row.name} (copy)`,
      description: row.description,
      sessions: row.sessions,
      price_cents: row.price_cents,
      expires_after_days: row.expires_after_days,
      active: false,
    });
    if (error) toast.error(error.message);
    else toast.success("Package duplicated as draft");
  };

  const remove = async (row: PackageRow) => {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("packages").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Package deleted");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <PackageIcon className="h-3.5 w-3.5" />
            Prepaid care
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            Packages & series
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build prepaid bundles with session counts, locked-in pricing, and expiry windows.
            Sell once, deliver over months — the system tracks every redemption.
          </p>
        </div>
        <Button
          onClick={() => openNew()}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" /> New package
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Active packages"
          value={stats.active.toString()}
          sub={`${rows.length - stats.active} paused`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="text-emerald-300"
        />
        <KpiCard
          label="Catalogue value"
          value={fmtMoney(stats.totalValue)}
          sub="Sum of all packages"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="text-sky-300"
        />
        <KpiCard
          label="Avg sessions"
          value={stats.avgSessions.toString()}
          sub="Per package"
          icon={<Layers className="h-4 w-4" />}
          accent="text-violet-300"
        />
        <KpiCard
          label="Best per session"
          value={
            stats.bestValue
              ? fmtPerSession(stats.bestValue.price_cents, stats.bestValue.sessions)
              : "—"
          }
          sub={stats.bestValue?.name ?? "Add a package"}
          icon={<Tag className="h-4 w-4" />}
          accent="text-amber-300"
        />
      </div>

      {/* Recipe library */}
      {rows.length === 0 && !loading && (
        <Card className="border-border/60 bg-card/40 p-6 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Start from a template
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a proven structure — you can rename and reprice everything.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RECIPES.map((r) => (
              <button
                key={r.name}
                onClick={() => openNew(r)}
                className="group rounded-xl border border-border/60 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:shadow-glow"
              >
                <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                  {r.name}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.description}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {r.sessions} sessions
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {fmtMoney(r.price_cents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
          {([
            ["all", "All"],
            ["active", "Active"],
            ["paused", "Paused"],
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

      {/* Grid */}
      {loading ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
          Loading packages…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
            <PackageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium text-foreground">No packages yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Build your first prepaid bundle from a template above."
                : "Adjust the filter or search to see more."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const perSession = row.sessions > 0 ? row.price_cents / row.sessions : 0;
            return (
              <Card
                key={row.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur transition hover:border-primary/30",
                  !row.active && "opacity-60",
                )}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3 p-5">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => openEdit(row)}
                      className="text-left font-semibold text-foreground hover:text-primary"
                    >
                      {row.name}
                    </button>
                    {row.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {row.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 gap-1 border",
                      row.active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-border/60 bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {row.active ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <PauseCircle className="h-3 w-3" />
                    )}
                    {row.active ? "Live" : "Paused"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 border-y border-border/40 bg-background/40 px-5 py-4">
                  <Stat
                    icon={<Layers className="h-3 w-3" />}
                    label="Sessions"
                    value={row.sessions.toString()}
                  />
                  <Stat
                    icon={<Tag className="h-3 w-3" />}
                    label="Per visit"
                    value={fmtMoney(perSession)}
                  />
                  <Stat
                    icon={<Calendar className="h-3 w-3" />}
                    label="Expires"
                    value={
                      row.expires_after_days
                        ? `${row.expires_after_days}d`
                        : "Never"
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-display text-2xl font-semibold text-foreground">
                      {fmtMoney(row.price_cents)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total package
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(row)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => duplicate(row)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => togglePackage(row)}
                      title={row.active ? "Pause" : "Activate"}
                    >
                      {row.active ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(row)}
                      title="Delete"
                      className="text-muted-foreground hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        editing={editing}
        seed={seed}
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
      <div className={cn("mt-2 font-display text-2xl font-semibold", accent)}>{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  editing,
  seed,
  clinicId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PackageRow | null;
  seed: Recipe | null;
  clinicId: string | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState(1);
  const [priceDollars, setPriceDollars] = useState("0");
  const [expiresDays, setExpiresDays] = useState<string>("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setSessions(editing.sessions);
      setPriceDollars((editing.price_cents / 100).toFixed(2));
      setExpiresDays(editing.expires_after_days?.toString() ?? "");
      setActive(editing.active);
    } else if (seed) {
      setName(seed.name);
      setDescription(seed.description);
      setSessions(seed.sessions);
      setPriceDollars((seed.price_cents / 100).toFixed(2));
      setExpiresDays(seed.expires_after_days?.toString() ?? "");
      setActive(true);
    } else {
      setName("");
      setDescription("");
      setSessions(1);
      setPriceDollars("0");
      setExpiresDays("");
      setActive(true);
    }
  }, [open, editing, seed]);

  const cents = Math.round(parseFloat(priceDollars || "0") * 100);
  const perSessionPreview =
    sessions > 0 && cents > 0 ? fmtMoney(cents / sessions) : "—";

  const submit = async () => {
    if (!clinicId) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (sessions < 1) {
      toast.error("Must have at least 1 session");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sessions,
        price_cents: cents,
        expires_after_days: expiresDays.trim() ? parseInt(expiresDays, 10) : null,
        active,
      };
      if (editing) {
        const { error } = await supabase
          .from("packages")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Package updated");
      } else {
        const { error } = await supabase
          .from("packages")
          .insert({ clinic_id: clinicId, ...payload });
        if (error) throw error;
        toast.success("Package created");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle>
          <DialogDescription>
            Bundle multiple sessions of one service at a locked-in price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">Name</Label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hydrafacial 6-Pack"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included, ideal candidate, etc."
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pkg-sessions">Sessions</Label>
              <Input
                id="pkg-sessions"
                type="number"
                min={1}
                value={sessions}
                onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-price">Total price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="pkg-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-exp">Expires (days)</Label>
              <Input
                id="pkg-exp"
                type="number"
                min={1}
                placeholder="Never"
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Effective per session</span>
              <span className="font-mono font-semibold text-primary">
                {perSessionPreview}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
            <div>
              <Label htmlFor="pkg-active" className="cursor-pointer">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Live packages can be sold at point of sale.
              </p>
            </div>
            <Switch id="pkg-active" checked={active} onCheckedChange={setActive} />
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
            {saving ? "Saving…" : editing ? "Save changes" : "Create package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
