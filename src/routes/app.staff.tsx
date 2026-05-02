import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserCog,
  Plus,
  Search,
  Users,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Edit3,
  Trash2,
  X,
  Calendar,
  Briefcase,
  PowerOff,
  Power,
  Palette,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/staff")({
  component: StaffPage,
});

type StaffRow = {
  id: string;
  clinic_id: string;
  display_name: string;
  title: string | null;
  color: string | null;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

const COLOR_PALETTE = [
  { name: "Violet", value: "#a78bfa" },
  { name: "Sky", value: "#60a5fa" },
  { name: "Emerald", value: "#34d399" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Pink", value: "#f472b6" },
  { name: "Lime", value: "#a3e635" },
  { name: "Orange", value: "#fb923c" },
  { name: "Indigo", value: "#818cf8" },
];

const ROLE_TEMPLATES = [
  { title: "Lead Injector", icon: Stethoscope, hint: "Provider · prescribing" },
  { title: "Aesthetician", icon: Sparkles, hint: "Facials · skincare" },
  { title: "Nurse Practitioner", icon: ShieldCheck, hint: "Provider · advanced" },
  { title: "Front Desk", icon: Users, hint: "Reception · scheduling" },
];

const PROVIDER_KEYWORDS = ["provider", "injector", "doctor", "physician", "nurse", "np", "rn", "aesthetician", "therapist"];

const isProvider = (title: string | null) => {
  if (!title) return false;
  const t = title.toLowerCase();
  return PROVIDER_KEYWORDS.some((k) => t.includes(k));
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

function StaffPage() {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [composer, setComposer] = useState<StaffRow | "new" | null>(null);

  const load = async () => {
    if (!activeClinic) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("display_name", { ascending: true });
    if (error) toast.error("Couldn't load staff");
    else setRows((data ?? []) as StaffRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    if (!activeClinic) return;
    const ch = supabase
      .channel(`staff-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff",
          filter: `clinic_id=eq.${activeClinic.clinic_id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeClinic?.clinic_id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "inactive" && r.active) return false;
      if (!q) return true;
      return (
        r.display_name.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const totalStaff = rows.length;
  const activeStaff = rows.filter((r) => r.active).length;
  const providers = rows.filter((r) => r.active && isProvider(r.title)).length;
  const linkedAccounts = rows.filter((r) => r.user_id).length;

  const toggleActive = async (row: StaffRow) => {
    const { error } = await supabase
      .from("staff")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success(row.active ? `${row.display_name} deactivated` : `${row.display_name} reactivated`);
  };

  const remove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.display_name} from staff?`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else toast.success("Staff member removed");
  };

  return (
    <div className="space-y-7 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            Team roster
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Staff</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage providers, front desk, and support team. Calendar colors flow
            through to your booking grid — no manual reassignment needed.
          </p>
        </div>
        <Button
          onClick={() => setComposer("new")}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add staff
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total team"
          value={totalStaff.toLocaleString()}
          sub={`${activeStaff} active`}
          icon={<Users className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Providers"
          value={providers.toLocaleString()}
          sub="Booking-eligible roles"
          icon={<Stethoscope className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Linked accounts"
          value={linkedAccounts.toLocaleString()}
          sub={`${totalStaff - linkedAccounts} pending invite`}
          icon={<ShieldCheck className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Inactive"
          value={(totalStaff - activeStaff).toLocaleString()}
          sub="Hidden from booking"
          icon={<PowerOff className="h-4 w-4" />}
          accent="rose"
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, title…"
            className="h-10 pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-card/30 p-0.5">
          {(["active", "all", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                statusFilter === s
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border/60 bg-card/30" />
          ))}
        </section>
      ) : filtered.length === 0 ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/20 backdrop-blur">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">No staff match your filter</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query || statusFilter !== "all"
                  ? "Try clearing your filters"
                  : "Add your first team member to start scheduling"}
              </p>
            </div>
            {!query && statusFilter === "active" && rows.length === 0 && (
              <Button size="sm" onClick={() => setComposer("new")} className="mt-2">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add staff
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((row) => {
            const color = row.color || "#a78bfa";
            const provider = isProvider(row.title);
            return (
              <article
                key={row.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur transition hover:border-primary/40",
                  !row.active && "opacity-60"
                )}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: color }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-background ring-2"
                    style={{ background: color, boxShadow: `0 0 24px -4px ${color}80`, '--tw-ring-color': `${color}40` } as React.CSSProperties}
                  >
                    {initials(row.display_name)}
                    {provider && (
                      <span
                        className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background"
                        title="Provider"
                      >
                        <Crown className="h-3 w-3 text-amber-300" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold tracking-tight">
                      {row.display_name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {row.title || "No title"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {provider && (
                        <Badge
                          variant="outline"
                          className="border-emerald-400/30 bg-emerald-400/10 text-[10px] uppercase tracking-wider text-emerald-200"
                        >
                          Provider
                        </Badge>
                      )}
                      {row.user_id ? (
                        <Badge
                          variant="outline"
                          className="border-sky-400/30 bg-sky-400/10 text-[10px] uppercase tracking-wider text-sky-200"
                        >
                          <ShieldCheck className="mr-1 h-2.5 w-2.5" />
                          Account
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground"
                        >
                          Pending invite
                        </Badge>
                      )}
                      {!row.active && (
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground"
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1 border-t border-border/40 pt-3 opacity-0 transition group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setComposer(row)}
                    className="h-7 flex-1 text-xs"
                  >
                    <Edit3 className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Link to="/app/staff/hr/$staffId" params={{ staffId: row.id }}>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      <Briefcase className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(row)}
                    className="h-7 px-2 text-xs"
                    title={row.active ? "Deactivate" : "Reactivate"}
                  >
                    {row.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(row)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {composer && activeClinic && (
        <ComposerModal
          row={composer === "new" ? null : composer}
          clinicId={activeClinic.clinic_id}
          onClose={() => setComposer(null)}
        />
      )}
    </div>
  );
}

const KPI_ACCENTS = {
  violet: "from-violet-500/20 via-violet-500/5 ring-violet-400/30 text-violet-300",
  emerald: "from-emerald-500/20 via-emerald-500/5 ring-emerald-400/30 text-emerald-300",
  amber: "from-amber-500/20 via-amber-500/5 ring-amber-400/30 text-amber-300",
  rose: "from-rose-500/20 via-rose-500/5 ring-rose-400/30 text-rose-300",
} as const;

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: keyof typeof KPI_ACCENTS;
}) {
  const tone = KPI_ACCENTS[accent];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br to-transparent p-4", tone.split(" ").slice(0, 2).join(" "))}>
      <div className="flex items-start justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/40 ring-1", tone.split(" ").slice(2).join(" "))}>
          {icon}
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

const staffSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(160),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  color: z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Color must be #RRGGBB").max(32),
  active: z.boolean(),
});

function ComposerModal({
  row,
  clinicId,
  onClose,
}: {
  row: StaffRow | null;
  clinicId: string;
  onClose: () => void;
}) {
  const editing = !!row;
  const [displayName, setDisplayName] = useState(row?.display_name ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [color, setColor] = useState(row?.color ?? "#a78bfa");
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = staffSchema.safeParse({
        display_name: displayName,
        title: title || "",
        color,
        active,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check your inputs");
        return;
      }
      const payload = {
        clinic_id: clinicId,
        display_name: parsed.data.display_name,
        title: parsed.data.title || null,
        color: parsed.data.color,
        active: parsed.data.active,
      };
      if (editing && row) {
        const { error } = await supabase.from("staff").update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Staff updated");
      } else {
        const { error } = await supabase.from("staff").insert(payload);
        if (error) throw error;
        toast.success("Staff added");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't save staff");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border/40 px-5 py-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {editing ? "Edit staff" : "New staff"}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {editing ? row?.display_name : "Add team member"}
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          {!editing && (
            <div className="space-y-1.5">
              <Label className="text-xs">Quick start</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLE_TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  const active = title === tpl.title;
                  return (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => setTitle(tpl.title)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition",
                        active
                          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
                          : "border-border/60 bg-background/40 hover:border-primary/40"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{tpl.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{tpl.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dr. Maya Chen"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lead Injector, Front Desk…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Calendar color
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map((c) => {
                const active = color.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "relative h-9 w-9 rounded-full ring-2 transition",
                      active ? "ring-foreground ring-offset-2 ring-offset-card" : "ring-transparent hover:ring-border"
                    )}
                    style={{ background: c.value }}
                    title={c.name}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center text-background">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#a78bfa"
                className="h-8 max-w-[140px] font-mono text-xs"
              />
              <div
                className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 px-2.5 text-xs"
                style={{ background: `${color}20`, borderColor: `${color}50` }}
              >
                <Calendar className="h-3 w-3" />
                <span style={{ color }}>Calendar preview</span>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive staff are hidden from booking and the calendar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                active ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition",
                  active ? "left-[1.375rem]" : "left-0.5"
                )}
              />
            </button>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Add staff"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
