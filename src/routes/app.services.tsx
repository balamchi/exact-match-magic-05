import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, DollarSign, Download, Edit3, FolderPlus, HeartPulse, Plus, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/services")({ component: ServicesPage });

type Service = Tables<"services">;

interface ServiceForm {
  name: string; category: string; duration_minutes: string; price_cents: string; active: boolean; deposit_required: boolean; deposit_cents: string;
}

const emptyForm: ServiceForm = { name: "", category: "", duration_minutes: "60", price_cents: "0", active: true, deposit_required: false, deposit_cents: "0" };

const formSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(160, "Name is too long"),
  category: z.string().trim().max(120).optional(),
  duration_minutes: z.coerce.number().int().min(5, "Minimum 5 minutes").max(720, "Maximum 12 hours"),
  price_cents: z.coerce.number().min(0, "Price cannot be negative"),
  active: z.boolean(),
});

function formatMoney(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function ServicesPage() {
  const { activeClinic } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all");
  // Category management
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const currency = activeClinic?.clinic.currency ?? "CAD";

  const load = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase.from("services").select("*").eq("clinic_id", activeClinic.clinic_id).order("category", { ascending: true }).order("name", { ascending: true });
    if (error) { toast.error("Could not load services"); setServices([]); }
    else setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeClinic?.clinic_id]);

  const categories = useMemo(() => {
    const set = new Set(services.map(s => s.category?.trim() || "Uncategorized"));
    return Array.from(set).sort((a, b) => a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b));
  }, [services]);

  const filtered = useMemo(() => {
    let list = services;
    if (catFilter !== "all") list = list.filter(s => (s.category?.trim() || "Uncategorized") === catFilter);
    const needle = query.trim().toLowerCase();
    if (needle) list = list.filter(s => [s.name, s.category].filter(Boolean).join(" ").toLowerCase().includes(needle));
    return list;
  }, [services, query, catFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const service of filtered) {
      const key = service.category?.trim() || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(service);
    }
    return Array.from(map.entries()).sort(([a], [b]) => { if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b); });
  }, [filtered]);

  const stats = useMemo(() => {
    const active = services.filter(s => s.active);
    const avg = active.length ? active.reduce((sum, s) => sum + (s.price_cents ?? 0), 0) / active.length : 0;
    return { active: active.length, avgCents: Math.round(avg), categories: categories.length };
  }, [services, categories]);

  const openCreate = (cat?: string) => { setEditing(null); setForm({ ...emptyForm, category: cat ?? "" }); setOpen(true); };
  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({ name: service.name, category: service.category ?? "", duration_minutes: String(service.duration_minutes), price_cents: String((service.price_cents ?? 0) / 100), active: service.active, deposit_required: (service as any).deposit_required ?? false, deposit_cents: String(((service as any).deposit_cents ?? 0) / 100) });
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    setSaving(true);
    const payload = { clinic_id: activeClinic.clinic_id, name: parsed.data.name, category: parsed.data.category?.trim() || null, duration_minutes: parsed.data.duration_minutes, price_cents: Math.round(parsed.data.price_cents * 100), active: parsed.data.active, deposit_required: form.deposit_required, deposit_cents: Math.round(Number(form.deposit_cents || 0) * 100) };
    const result = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("services").insert(payload);
    if (result.error) toast.error(result.error.message);
    else { toast.success(editing ? "Service updated" : "Service created"); setOpen(false); await load(); }
    setSaving(false);
  };

  const remove = async (service: Service) => {
    if (!activeClinic || !confirm(`Delete "${service.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", service.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else { toast.success("Service deleted"); await load(); }
  };

  // Export
  const exportServices = () => {
    const csv = ["name,category,duration_minutes,price,active", ...services.map(s => `"${s.name.replace(/"/g,'""')}","${(s.category ?? '').replace(/"/g,'""')}",${s.duration_minutes},${(s.price_cents ?? 0) / 100},${s.active}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "services.csv"; a.click();
  };

  // Import
  const importServices = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClinic) return;
    const text = await file.text();
    const lines = text.split("\n").slice(1).filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      const parts = line.match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) ?? [];
      if (!parts[0]) continue;
      await supabase.from("services").insert({
        clinic_id: activeClinic.clinic_id, name: parts[0], category: parts[1] || null,
        duration_minutes: parseInt(parts[2]) || 60, price_cents: Math.round(parseFloat(parts[3] || "0") * 100), active: parts[4] !== "false",
      });
      count++;
    }
    toast.success(`Imported ${count} services`);
    await load();
    e.target.value = "";
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    // Adding category = just pre-fill the form with that category
    openCreate(newCatName.trim());
    setCatOpen(false);
    setNewCatName("");
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Service menu</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Services</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Build your bookable treatment menu — categories, durations, and pricing.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportServices} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <label>
            <input type="file" accept=".csv" className="hidden" onChange={importServices} />
            <Button variant="outline" className="gap-2" asChild><span><Upload className="h-4 w-4" /> Import</span></Button>
          </label>
          <Button variant="outline" onClick={() => setCatOpen(true)} className="gap-2"><FolderPlus className="h-4 w-4" /> Add Category</Button>
          <Button onClick={() => openCreate()} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New service</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Active services" value={stats.active.toString()} icon={<HeartPulse className="h-4.5 w-4.5" />} />
        <MetricCard label="Categories" value={stats.categories.toString()} icon={<Sparkles className="h-4.5 w-4.5" />} />
        <MetricCard label="Average price" value={formatMoney(stats.avgCents, currency)} icon={<DollarSign className="h-4.5 w-4.5" />} />
      </section>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <button onClick={() => setCatFilter("all")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition", catFilter === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>All ({services.length})</button>
          {categories.map(cat => {
            const count = services.filter(s => (s.category?.trim() || "Uncategorized") === cat).length;
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition", catFilter === cat ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{cat} ({count})</button>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services or categories…" className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>
        {loading ? (
          <div className="grid gap-3 p-4">{[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><HeartPulse className="h-6 w-6" /></div>
            <h2 className="font-display text-xl font-semibold">No services yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add your first treatment to start building your bookable service menu.</p>
            <Button onClick={() => openCreate()} className="mt-5 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Add first service</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([category, items]) => (
              <div key={category} className="p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{category}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{items.length} {items.length === 1 ? "service" : "services"}</span>
                    <Button variant="ghost" size="sm" onClick={() => openCreate(category)} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
                  </div>
                </div>
                <ul className="grid gap-2">
                  {items.map(service => (
                    <li key={service.id} className="grid items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:bg-surface/80 md:grid-cols-[1fr_auto_auto_auto]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-medium">{service.name}</h4>
                          {!service.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Inactive</span>}
                          {(service as any).deposit_required && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Deposit {formatMoney((service as any).deposit_cents ?? 0, currency)}</span>}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {service.duration_minutes} min</span>
                      <span className="font-medium">{formatMoney(service.price_cents ?? 0, currency)}</span>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(service)} aria-label={`Edit ${service.name}`}><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(service)} aria-label={`Delete ${service.name}`} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Service form modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="border-b border-border p-5">
              <h2 className="font-display text-2xl font-semibold">{editing ? "Edit service" : "New service"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Define what gets booked, how long it takes, and what it costs.</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Service name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Botox forehead, Hydrafacial…" />
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</span>
                <div className="flex gap-2">
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Injectables, Skin, Wellness…" list="cat-list" className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
                  <datalist id="cat-list">{categories.filter(c => c !== "Uncategorized").map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <Field label="Duration (minutes)" type="number" required value={form.duration_minutes} onChange={(v) => setForm({ ...form, duration_minutes: v })} />
              <Field label={`Price (${currency})`} type="number" step="0.01" required value={form.price_cents} onChange={(v) => setForm({ ...form, price_cents: v })} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-5 w-5 accent-primary" /><span className="text-sm">Active and bookable</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.deposit_required} onChange={(e) => setForm({ ...form, deposit_required: e.target.checked })} className="h-5 w-5 accent-primary" /><span className="text-sm">Require deposit</span></label>
              {form.deposit_required && <Field label={`Deposit amount (${currency})`} type="number" step="0.01" value={form.deposit_cents} onChange={(v) => setForm({ ...form, deposit_cents: v })} />}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">{saving ? "Saving…" : editing ? "Save changes" : "Create service"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Add Category modal */}
      {catOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Add Category</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create a new service category and add the first service.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setCatOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category name</span>
                <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Injectables, Laser, Wellness…" className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
              </label>
              {categories.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Existing categories</span>
                  <div className="flex flex-wrap gap-1.5">{categories.map(c => <span key={c} className="rounded-full border border-border bg-surface/40 px-2.5 py-0.5 text-xs">{c}</span>)}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button variant="ghost" onClick={() => setCatOpen(false)}>Cancel</Button>
              <Button onClick={addCategory} disabled={!newCatName.trim()} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">Create & Add Service</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder, step }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; step?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} required={required} step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}
