import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  MessageSquareText, Plus, Edit, Trash2, Copy, Search, Sparkles, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/communication/templates")({ component: TemplatesPage });

type Category = "appointment" | "follow_up" | "marketing" | "support" | "reminder" | "review_request" | "birthday" | "general";
type Channel = "sms" | "whatsapp" | "email" | "web" | "instagram" | "facebook";

interface Template {
  id: string;
  clinic_id: string;
  name: string;
  category: Category;
  channel: Channel | null;
  body: string;
  use_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: { value: Category; label: string; tint: string }[] = [
  { value: "appointment", label: "Appointment", tint: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  { value: "reminder", label: "Reminder", tint: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { value: "follow_up", label: "Follow-Up", tint: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { value: "marketing", label: "Marketing", tint: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300" },
  { value: "support", label: "Support", tint: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  { value: "review_request", label: "Review Request", tint: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" },
  { value: "birthday", label: "Birthday", tint: "border-pink-500/40 bg-pink-500/10 text-pink-300" },
  { value: "general", label: "General", tint: "border-border bg-muted text-muted-foreground" },
];

const VARIABLES = [
  "{{first_name}}", "{{last_name}}", "{{clinic_name}}", "{{clinic_phone}}",
  "{{appointment_date}}", "{{appointment_time}}", "{{service_name}}",
  "{{review_link}}", "{{booking_link}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "{{first_name}}": "Sarah",
  "{{last_name}}": "Johnson",
  "{{clinic_name}}": "ClinicPro",
  "{{clinic_phone}}": "(555) 123-4567",
  "{{appointment_date}}": "Tuesday, May 12",
  "{{appointment_time}}": "2:00 PM",
  "{{service_name}}": "Botox Treatment",
  "{{review_link}}": "https://clinicpro.io/r/abc",
  "{{booking_link}}": "https://clinicpro.io/book",
};

function substitute(body: string): string {
  let result = body;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.split(key).join(value);
  }
  return result;
}

function TemplatesPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const load = useCallback(async () => {
    if (!clinicId) return;
    const { data } = await supabase.from("message_templates").select("*")
      .eq("clinic_id", clinicId).order("use_count", { ascending: false });
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);



  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [templates, categoryFilter, search]);

  const stats = useMemo(() => {
    const total = templates.length;
    const mostUsed = [...templates].sort((a, b) => b.use_count - a.use_count)[0];
    const byCategory = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, mostUsed, byCategory };
  }, [templates]);

  const handleSave = async () => {
    if (!editing || !clinicId) return;
    if (!editing.name?.trim() || !editing.body?.trim()) {
      toast.error("Name and body are required");
      return;
    }
    const payload = {
      clinic_id: clinicId,
      name: editing.name.trim(),
      category: editing.category ?? "general",
      channel: editing.channel ?? null,
      body: editing.body.trim(),
      is_active: true,
    };
    if (editing.id) {
      const { error } = await supabase.from("message_templates").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase.from("message_templates").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Template created");
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const handleDuplicate = async (t: Template) => {
    if (!clinicId) return;
    const { error } = await supabase.from("message_templates").insert({
      clinic_id: clinicId, name: `${t.name} (copy)`, category: t.category,
      channel: t.channel, body: t.body, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicated");
    load();
  };

  const insertVariable = (v: string) => {
    setEditing((prev) => prev ? { ...prev, body: (prev.body ?? "") + v } : prev);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <MessageSquareText className="h-3 w-3" /> Communication
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-4xl font-semibold tracking-tight">Message Templates</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pre-write replies, reminders, and campaigns to send with one click.
          </p>
        </div>
        <Button onClick={() => setEditing({ name: "", body: "Hi {{first_name}}, ", category: "general", channel: null })}
          className="gap-1.5 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="mt-1 font-mono text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Most Used</div>
          <div className="mt-1 truncate text-sm font-semibold">{stats.mostUsed?.name ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground">{stats.mostUsed?.use_count ?? 0} uses</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Categories</div>
          <div className="mt-1 font-mono text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-300">{templates.filter((t) => t.is_active).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..." className="ps-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setCategoryFilter("all")}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition",
              categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-sidebar-accent/40 text-muted-foreground hover:text-foreground")}>
            All ({templates.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = stats.byCategory[c.value] ?? 0;
            if (count === 0) return null;
            return (
              <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition",
                  categoryFilter === c.value ? "bg-primary text-primary-foreground" : "bg-sidebar-accent/40 text-muted-foreground hover:text-foreground")}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-12 text-center">
          <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No templates found</p>
          <p className="text-sm text-muted-foreground">Create your first template or adjust filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const cat = CATEGORIES.find((c) => c.value === t.category) ?? CATEGORIES[CATEGORIES.length - 1];
            return (
              <div key={t.id} className="flex flex-col rounded-xl border border-border bg-surface p-4 transition hover:border-primary/30">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-sm font-semibold">{t.name}</h3>
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", cat.tint)}>
                    {cat.label}
                  </span>
                </div>
                <p className="mb-3 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Used {t.use_count}×</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { navigator.clipboard.writeText(t.body); toast.success("Copied"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleDuplicate(t)} title="Duplicate">
                      <Sparkles className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(t)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Appointment Reminder" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={editing.category ?? "general"} onValueChange={(v) => setEditing({ ...editing, category: v as Category })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel</label>
                  <Select value={editing.channel ?? "all"} onValueChange={(v) => setEditing({ ...editing, channel: v === "all" ? null : v as Channel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
                <Textarea value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={5} placeholder="Hi {{first_name}}, ..." />
                <div className="mt-2 flex flex-wrap gap-1">
                  {VARIABLES.map((v) => (
                    <button key={v} type="button" onClick={() => insertVariable(v)}
                      className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-primary/40 hover:bg-primary/10">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Eye className="h-3 w-3" /> Preview with sample data
                </div>
                <p className="whitespace-pre-wrap text-sm">{substitute(editing.body ?? "")}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground hover:opacity-90">
              {editing?.id ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
