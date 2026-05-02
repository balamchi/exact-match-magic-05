import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Images,
  Plus,
  Search,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Trash2,
  X,
  Calendar,
  ImageOff,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/before-after")({
  component: BeforeAfterPage,
});

type PhotoRow = {
  id: string;
  clinic_id: string;
  client_id: string | null;
  client_name: string;
  treatment: string | null;
  taken_on: string;
  before_url: string | null;
  after_url: string | null;
  consent_given: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const TREATMENT_PRESETS = [
  "Botox",
  "Filler",
  "Lip enhancement",
  "Microneedling",
  "Laser resurfacing",
  "Chemical peel",
  "Hydrafacial",
  "PRP",
];

const photoSchema = z.object({
  client_name: z.string().trim().min(1, "Client name is required").max(160),
  treatment: z.string().trim().max(160).optional().or(z.literal("")),
  taken_on: z.string().min(1, "Date is required"),
  before_url: z.string().trim().max(500).optional().or(z.literal("")),
  after_url: z.string().trim().max(500).optional().or(z.literal("")),
  consent_given: z.boolean(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type PhotoFormState = {
  client_name: string;
  treatment: string;
  taken_on: string;
  before_url: string;
  after_url: string;
  consent_given: boolean;
  notes: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm: PhotoFormState = {
  client_name: "",
  treatment: "",
  taken_on: todayISO(),
  before_url: "",
  after_url: "",
  consent_given: false,
  notes: "",
};

function BeforeAfterPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? null;
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "consented" | "pending" | "complete">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<PhotoRow | null>(null);
  const [form, setForm] = useState<PhotoFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("before_after_photos")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("taken_on", { ascending: false });
      if (!isMounted) return;
      if (error) {
        toast.error("Failed to load photos", { description: error.message });
      } else {
        setRows((data ?? []) as PhotoRow[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`before-after-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "before_after_photos", filter: `clinic_id=eq.${clinicId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = [r.client_name, r.treatment, r.notes].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "consented" && !r.consent_given) return false;
      if (filter === "pending" && r.consent_given) return false;
      if (filter === "complete" && !(r.before_url && r.after_url)) return false;
      return true;
    });
  }, [rows, search, filter]);

  const metrics = useMemo(() => {
    const consented = rows.filter((r) => r.consent_given).length;
    const last30 = rows.filter(
      (r) => new Date(r.taken_on).getTime() >= Date.now() - 30 * 86_400_000,
    ).length;
    const complete = rows.filter((r) => r.before_url && r.after_url).length;
    const treatments = new Set(rows.map((r) => r.treatment).filter(Boolean)).size;
    return { consented, last30, complete, treatments };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setComposerOpen(true);
  };

  const openEdit = (p: PhotoRow) => {
    setEditing(p);
    setForm({
      client_name: p.client_name,
      treatment: p.treatment ?? "",
      taken_on: p.taken_on?.slice(0, 10) ?? todayISO(),
      before_url: p.before_url ?? "",
      after_url: p.after_url ?? "",
      consent_given: p.consent_given,
      notes: p.notes ?? "",
    });
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const parsed = photoSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    const payload = {
      client_name: parsed.data.client_name,
      treatment: parsed.data.treatment || null,
      taken_on: parsed.data.taken_on,
      before_url: parsed.data.before_url || null,
      after_url: parsed.data.after_url || null,
      consent_given: parsed.data.consent_given,
      notes: parsed.data.notes || null,
    };

    if (editing) {
      const { error } = await supabase.from("before_after_photos").update(payload).eq("id", editing.id);
      if (error) toast.error("Failed to update", { description: error.message });
      else {
        toast.success("Photo set updated");
        closeComposer();
      }
    } else {
      const { error } = await supabase
        .from("before_after_photos")
        .insert({ ...payload, clinic_id: clinicId });
      if (error) toast.error("Failed to save", { description: error.message });
      else {
        toast.success("Photo set added");
        closeComposer();
      }
    }
    setSubmitting(false);
  };

  const toggleConsent = async (p: PhotoRow) => {
    const { error } = await supabase
      .from("before_after_photos")
      .update({ consent_given: !p.consent_given })
      .eq("id", p.id);
    if (error) toast.error("Failed to update", { description: error.message });
    else toast.success(p.consent_given ? "Consent revoked" : "Consent recorded");
  };

  const handleDelete = async (p: PhotoRow) => {
    if (!confirm(`Delete photo set for ${p.client_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("before_after_photos").delete().eq("id", p.id);
    if (error) toast.error("Failed to delete", { description: error.message });
    else toast.success("Photo set deleted");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Camera className="h-3.5 w-3.5" />
            Photo library
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Before &amp; After</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Capture transformation stories with consent baked in. Use these comparisons in consults, marketing, and
            clinical reviews.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Add photo set
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="With consent"
          value={metrics.consented.toString()}
          icon={ShieldCheck}
          accent="from-emerald-500/20 to-teal-500/10"
        />
        <MetricCard
          label="Complete pairs"
          value={metrics.complete.toString()}
          icon={ArrowLeftRight}
          accent="from-violet-500/20 to-indigo-500/10"
        />
        <MetricCard
          label="Last 30 days"
          value={metrics.last30.toString()}
          icon={Calendar}
          accent="from-sky-500/20 to-cyan-500/10"
        />
        <MetricCard
          label="Treatments tracked"
          value={metrics.treatments.toString()}
          icon={Sparkles}
          accent="from-amber-500/20 to-orange-500/10"
        />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, treatment, notes…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "consented", label: "Consented" },
              { key: "pending", label: "Pending consent" },
              { key: "complete", label: "Complete pairs" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
          Loading photo sets…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Images className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No photo sets {filter !== "all" ? `(${filter})` : "yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture transformation pairs to power consults, social proof, and clinical review.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add photo set
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-glow"
            >
              {/* Image diptych */}
              <button
                type="button"
                onClick={() => setLightbox(p)}
                className="grid w-full grid-cols-2 gap-px bg-border/40 text-left"
              >
                <PhotoTile url={p.before_url} label="Before" />
                <PhotoTile url={p.after_url} label="After" />
              </button>

              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{p.client_name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.treatment || "Untagged treatment"} ·{" "}
                      {new Date(p.taken_on).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConsent(p)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      p.consent_given
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
                    )}
                    title={p.consent_given ? "Consent on file" : "Consent missing"}
                  >
                    {p.consent_given ? (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Consent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </button>
                </div>

                {p.notes && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-destructive/80 hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Composer */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card/95 px-6 py-4 backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold">{editing ? "Edit photo set" : "Add photo set"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing ? "Update transformation details and consent." : "Capture before/after for a treatment."}
                </p>
              </div>
              <button
                onClick={closeComposer}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Input
                    id="client"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="Sarah Johnson"
                    maxLength={160}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taken">Taken on *</Label>
                  <Input
                    id="taken"
                    type="date"
                    value={form.taken_on}
                    onChange={(e) => setForm({ ...form, taken_on: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment">Treatment</Label>
                <Input
                  id="treatment"
                  value={form.treatment}
                  onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                  placeholder="e.g. Lip filler — 1.0ml"
                  maxLength={160}
                />
                <div className="flex flex-wrap gap-1.5">
                  {TREATMENT_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, treatment: t })}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs transition",
                        form.treatment === t
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="before">Before image</Label>
                  {form.before_url && (
                    <div className="overflow-hidden rounded-lg border border-border/60">
                      <img src={form.before_url} alt="Before preview" className="h-32 w-full object-cover" />
                    </div>
                  )}
                  <input
                    id="before"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "before")}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="after">After image</Label>
                  {form.after_url && (
                    <div className="overflow-hidden rounded-lg border border-border/60">
                      <img src={form.after_url} alt="After preview" className="h-32 w-full object-cover" />
                    </div>
                  )}
                  <input
                    id="after"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "after")}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Clinical notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Volume, technique, follow-up timing…"
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.consent_given}
                  onChange={(e) => setForm({ ...form, consent_given: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Photo consent on file</div>
                  <div className="text-xs text-muted-foreground">
                    Required before sharing externally — for marketing, social, or referral use.
                  </div>
                </div>
              </label>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur">
                <Button type="button" variant="ghost" onClick={closeComposer}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editing ? "Save changes" : "Add photo set"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 rounded-lg border border-border/60 bg-card/80 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid w-full max-w-6xl gap-4 md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
            <LightboxPanel url={lightbox.before_url} label="Before" />
            <LightboxPanel url={lightbox.after_url} label="After" />
            <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{lightbox.client_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {lightbox.treatment || "Untagged"} ·{" "}
                    {new Date(lightbox.taken_on).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge variant={lightbox.consent_given ? "default" : "secondary"}>
                  {lightbox.consent_given ? "Consent on file" : "No consent"}
                </Badge>
              </div>
              {lightbox.notes && <p className="mt-2 text-sm text-muted-foreground">{lightbox.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoTile({ url, label }: { url: string | null; label: string }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-background/40">
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
          <ImageOff className="h-8 w-8" />
        </div>
      )}
      <div className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/90 backdrop-blur">
        {label}
      </div>
    </div>
  );
}

function LightboxPanel({ url, label }: { url: string | null; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      <div className="absolute left-3 top-3 z-10 rounded-md bg-background/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-foreground backdrop-blur">
        {label}
      </div>
      {url ? (
        <img src={url} alt={label} className="h-[70vh] w-full object-contain" />
      ) : (
        <div className="flex h-[70vh] w-full items-center justify-center text-muted-foreground/50">
          <ImageOff className="h-12 w-12" />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Images;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl", accent)} />
      <div className="relative space-y-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
          <Icon className="h-4.5 w-4.5 text-foreground/80" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
