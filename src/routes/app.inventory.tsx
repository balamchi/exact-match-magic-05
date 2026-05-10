import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BetaBadge } from "@/components/beta-badge";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Boxes, X, AlertTriangle, CalendarClock, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { cn } from "@/lib/utils";

type Item = Tables<"inventory_items">;

interface Draft {
  sku: string;
  name: string;
  supplier: string;
  stock_quantity: string;
  reorder_threshold: string;
  unit_cost: string;
  expires_at: string;
  active: boolean;
}

const emptyDraft: Draft = { sku: "", name: "", supplier: "", stock_quantity: "0", reorder_threshold: "0", unit_cost: "0", expires_at: "", active: true };

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function expirySoon(date: string | null) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (ms < 0) return "expired";
  if (ms < 1000 * 60 * 60 * 24 * 30) return "soon";
  return null;
}

export const Route = createFileRoute("/app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const { activeClinic } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expiring">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("name", { ascending: true });
    if (error) toast.error("Could not load inventory");
    setItems(data ?? []);
    setLoading(false);
  }, [activeClinic?.clinic_id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("inventory_items", activeClinic?.clinic_id, load);

  const lowStock = items.filter((i) => i.active && i.stock_quantity <= i.reorder_threshold);
  const expiring = items.filter((i) => expirySoon(i.expires_at) === "soon");
  const expired = items.filter((i) => expirySoon(i.expires_at) === "expired");
  const totalValue = items.reduce((s, i) => s + i.stock_quantity * i.unit_cost_cents, 0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = items;
    if (filter === "low") list = lowStock;
    if (filter === "expiring") list = [...expiring, ...expired];
    if (!needle) return list;
    return list.filter((i) => [i.sku, i.name, i.supplier].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [items, query, filter, lowStock, expiring, expired]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setDraft({
      sku: item.sku ?? "",
      name: item.name,
      supplier: item.supplier ?? "",
      stock_quantity: String(item.stock_quantity),
      reorder_threshold: String(item.reorder_threshold),
      unit_cost: String(item.unit_cost_cents / 100),
      expires_at: item.expires_at ?? "",
      active: item.active,
    });
    setOpen(true);
  };

  const adjustStock = async (item: Item, delta: number) => {
    if (!activeClinic) return;
    const next = Math.max(0, item.stock_quantity + delta);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, stock_quantity: next } : i)));
    const { error } = await supabase.from("inventory_items").update({ stock_quantity: next }).eq("id", item.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) {
      toast.error("Could not update stock");
      await load();
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeClinic) return;
    if (!draft.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      clinic_id: activeClinic.clinic_id,
      sku: draft.sku.trim() || null,
      name: draft.name.trim(),
      supplier: draft.supplier.trim() || null,
      stock_quantity: Math.max(0, Math.round(Number(draft.stock_quantity || 0))),
      reorder_threshold: Math.max(0, Math.round(Number(draft.reorder_threshold || 0))),
      unit_cost_cents: Math.max(0, Math.round(Number(draft.unit_cost || 0) * 100)),
      expires_at: draft.expires_at || null,
      active: draft.active,
    };
    const res = editing
      ? await supabase.from("inventory_items").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("inventory_items").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success(editing ? "Item updated" : "Item added");
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !activeClinic) return;
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Item deleted");
      setOpen(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Stock control</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl sm:text-4xl font-semibold tracking-tight">Inventory<BetaBadge /></h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Track products, suppliers, and reorder thresholds with live alerts.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> New item
        </Button>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Items" value={items.length.toString()} icon={<Boxes className="h-4.5 w-4.5" />} />
        <Metric label="Low stock" value={lowStock.length.toString()} icon={<AlertTriangle className="h-4.5 w-4.5" />} accent={lowStock.length > 0} onClick={() => setFilter("low")} />
        <Metric label="Expiring" value={(expiring.length + expired.length).toString()} icon={<CalendarClock className="h-4.5 w-4.5" />} accent={expired.length > 0} onClick={() => setFilter("expiring")} />
        <Metric label="Stock value" value={money(totalValue)} icon={<Boxes className="h-4.5 w-4.5" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-[95vw] sm:max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU, supplier…"
              className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            {(["all", "low", "expiring"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
                  filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : f === "low" ? "Low stock" : "Expiring"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading inventory…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Boxes className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No items match the current filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Unit cost</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isLow = item.active && item.stock_quantity <= item.reorder_threshold;
                const exp = expirySoon(item.expires_at);
                return (
                  <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-surface/30">
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(item)} className="text-left">
                        <div className="font-medium">{item.name}</div>
                        {item.sku && <div className="text-[11px] text-muted-foreground">SKU {item.sku}</div>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.supplier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjustStock(item, -1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className={cn("min-w-8 text-center font-mono text-sm", isLow && "text-rose-300")}>
                          {item.stock_quantity}
                        </span>
                        <button onClick={() => adjustStock(item, 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground">
                          <Plus className="h-3 w-3" />
                        </button>
                        {isLow && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            <ArrowDown className="h-3 w-3" /> Low
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">reorder ≤ {item.reorder_threshold}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{money(item.unit_cost_cents)}</td>
                    <td className="px-4 py-3">
                      {item.expires_at ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                          exp === "expired" && "border-rose-500/40 bg-rose-500/10 text-rose-300",
                          exp === "soon" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
                          !exp && "border-border text-muted-foreground"
                        )}>
                          {new Date(item.expires_at).toLocaleDateString()}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(item)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-2xl font-semibold">{editing ? "Edit item" : "New item"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Track stock, costs, and expiration.</p>
              </div>
              <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="SKU" value={draft.sku} onChange={(v) => setDraft({ ...draft, sku: v })} />
              <Field label="Supplier" value={draft.supplier} onChange={(v) => setDraft({ ...draft, supplier: v })} />
              <Field label="Unit cost (CAD)" type="number" value={draft.unit_cost} onChange={(v) => setDraft({ ...draft, unit_cost: v })} />
              <Field label="Stock quantity" type="number" value={draft.stock_quantity} onChange={(v) => setDraft({ ...draft, stock_quantity: v })} />
              <Field label="Reorder threshold" type="number" value={draft.reorder_threshold} onChange={(v) => setDraft({ ...draft, reorder_threshold: v })} />
              <Field label="Expires" type="date" value={draft.expires_at} onChange={(v) => setDraft({ ...draft, expires_at: v })} />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-4 w-4 rounded border-input" />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-5">
              <div>
                {editing && (
                  <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">Delete</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, accent, onClick }: { label: string; value: string; icon: React.ReactNode; accent?: boolean; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={cn("rounded-2xl border bg-card p-5 text-left shadow-card transition", accent ? "border-rose-500/40" : "border-border", onClick && "hover:border-primary/40")}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent ? "bg-rose-500/15 text-rose-300" : "bg-primary/10 text-primary")}>{icon}</div>
      <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Tag>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
