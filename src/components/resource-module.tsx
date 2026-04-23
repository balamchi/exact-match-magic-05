import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

type FieldType = "text" | "email" | "tel" | "number" | "money" | "date" | "datetime" | "textarea" | "select" | "boolean";

export interface ResourceField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface ResourceModuleProps {
  title: string;
  eyebrow: string;
  description: string;
  table: string;
  icon: ReactNode;
  fields: ResourceField[];
  columns: string[];
  searchKeys: string[];
  defaults?: Record<string, unknown>;
  orderBy?: string;
  metrics?: { label: string; value: (rows: Record<string, unknown>[]) => string }[];
}

export function ResourceModule({ title, eyebrow, description, table, icon, fields, columns, searchKeys, defaults = {}, orderBy = "updated_at", metrics = [] }: ResourceModuleProps) {
  const { activeClinic } = useAuth();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  const initialForm = () => Object.fromEntries(fields.map((field) => [field.key, field.type === "boolean" ? Boolean(defaults[field.key]) : String(defaults[field.key] ?? "")])) as Record<string, string | boolean>;

  const loadRows = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order(orderBy, { ascending: false });
    if (error) {
      toast.error(`Could not load ${title.toLowerCase()}`);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [activeClinic?.clinic_id, table]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => searchKeys.map((key) => String(row[key] ?? "")).join(" ").toLowerCase().includes(needle));
  }, [query, rows, searchKeys]);

  const schema = useMemo(() => z.object(Object.fromEntries(fields.map((field) => {
    if (field.type === "boolean") return [field.key, z.boolean()];
    let rule: z.ZodType<string> = z.string().trim();
    if (field.required) rule = rule.pipe(z.string().min(1, `${field.label} is required`));
    if (field.max) rule = rule.pipe(z.string().max(field.max, `${field.label} is too long`));
    if (field.type === "email") rule = rule.refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email");
    return [field.key, rule];
  }))), [fields]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm());
    setOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((field) => {
      const value = row[field.key];
      if (field.type === "boolean") return [field.key, Boolean(value)];
      if (field.type === "money") return [field.key, String(Number(value ?? 0) / 100)];
      if (field.type === "datetime" && typeof value === "string") return [field.key, value.slice(0, 16)];
      return [field.key, String(value ?? "")];
    })) as Record<string, string | boolean>);
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(fields.map((field) => {
      const value = form[field.key];
      if (field.type === "boolean") return [field.key, Boolean(value)];
      if (field.type === "number") return [field.key, value === "" ? null : Number(value)];
      if (field.type === "money") return [field.key, Math.round(Number(value || 0) * 100)];
      return [field.key, String(value ?? "").trim() || null];
    }));
    const body = { ...payload, clinic_id: activeClinic.clinic_id };
    const result = editing
      ? await (supabase as any).from(table).update(body).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await (supabase as any).from(table).insert(body);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(editing ? `${title} updated` : `${title} created`);
      setOpen(false);
      await loadRows();
    }
    setSaving(false);
  };

  const remove = async (row: Record<string, unknown>) => {
    if (!activeClinic || !confirm("Delete this record?")) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", row.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Record deleted");
      await loadRows();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New</Button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Total records" value={rows.length.toString()} icon={icon} />
        {metrics.slice(0, 2).map((metric) => <Metric key={metric.label} label={metric.label} value={metric.value(rows)} icon={icon} />)}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3 text-left font-medium">{labelFor(fields, column)}</th>)}<th className="px-4 py-3 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr> : filtered.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-4 py-14 text-center text-muted-foreground">No records yet.</td></tr> : filtered.map((row) => (
                <tr key={String(row.id)} className="transition hover:bg-surface/60">
                  {columns.map((column) => <td key={column} className="px-4 py-3">{displayValue(row[column], fields.find((field) => field.key === column)?.type)}</td>)}
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(row)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated"><div className="border-b border-border p-5"><h2 className="font-display text-2xl font-semibold">{editing ? `Edit ${title}` : `New ${title}`}</h2></div><div className="grid gap-4 p-5 md:grid-cols-2">{fields.map((field) => <InputField key={field.key} field={field} value={form[field.key]} onChange={(value) => setForm({ ...form, [field.key]: value })} />)}</div><div className="flex justify-end gap-2 border-t border-border p-5"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">{saving ? "Saving…" : "Save"}</Button></div></form></div>}
    </div>
  );
}

function InputField({ field, value, onChange }: { field: ResourceField; value: string | boolean | undefined; onChange: (value: string | boolean) => void }) {
  const common = "h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";
  return <label className={field.type === "textarea" ? "md:col-span-2" : ""}><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.label}</span>{field.type === "textarea" ? <textarea rows={4} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} maxLength={field.max} placeholder={field.placeholder} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" /> : field.type === "select" ? <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={common}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "boolean" ? <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-primary" /> : <input type={field.type === "datetime" ? "datetime-local" : field.type === "money" ? "number" : field.type ?? "text"} required={field.required} min={field.min} maxLength={field.max} step={field.type === "money" ? "0.01" : undefined} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className={common} />}</label>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-card"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}

function labelFor(fields: ResourceField[], key: string) { return fields.find((field) => field.key === key)?.label ?? key.replaceAll("_", " "); }

function displayValue(value: unknown, type?: FieldType) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "Active" : "Inactive";
  if (type === "money") return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value) / 100);
  if (type === "datetime") return new Date(String(value)).toLocaleString();
  return String(value);
}