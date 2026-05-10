import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText, Plus, Search, Send, CheckCircle2, AlertCircle, X, DollarSign,
  Clock, TrendingUp, Download, Copy, Ban, Calendar as CalendarIcon, User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invoices")({ component: InvoicesPage });

interface Invoice {
  id: string;
  clinic_id: string;
  invoice_number: string | null;
  client_id: string | null;
  client_name: string;
  total_cents: number;
  status: string;
  issued_on: string;
  due_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: "Draft", color: "border-slate-500/30 bg-slate-500/10 text-slate-300", dot: "bg-slate-400" },
  sent: { label: "Sent", color: "border-sky-500/30 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
  paid: { label: "Paid", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
  overdue: { label: "Overdue", color: "border-rose-500/30 bg-rose-500/10 text-rose-300", dot: "bg-rose-400" },
  voided: { label: "Voided", color: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400", dot: "bg-zinc-500" },
};

type Filter = "all" | "draft" | "sent" | "paid" | "overdue" | "voided";

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function isOverdue(inv: Invoice) {
  return inv.status === "sent" && inv.due_on && new Date(inv.due_on) < new Date();
}

function daysFromNow(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.round(ms / 86400000);
}

function InvoicesPage() {
  const { activeClinic } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!activeClinic) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("issued_on", { ascending: false });
      setInvoices(data ?? []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`invoices-${activeClinic.clinic_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `clinic_id=eq.${activeClinic.clinic_id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeClinic]);

  // Auto-mark overdue in memory (display only)
  const decorated = useMemo(() => invoices.map((i) => isOverdue(i) ? { ...i, status: "overdue" } : i), [invoices]);

  const stats = useMemo(() => {
    const outstanding = decorated.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.total_cents, 0);
    const overdueAmt = decorated.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total_cents, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const paidThisMonth = decorated.filter((i) => i.status === "paid" && new Date(i.issued_on) >= monthStart).reduce((s, i) => s + i.total_cents, 0);
    const draftCount = decorated.filter((i) => i.status === "draft").length;
    return { outstanding, overdueAmt, paidThisMonth, draftCount };
  }, [decorated]);

  const filtered = useMemo(() => {
    let list = decorated;
    if (filter !== "all") list = list.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.client_name.toLowerCase().includes(q) ||
        (i.invoice_number ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [decorated, filter, search]);

  const selected = useMemo(() => decorated.find((i) => i.id === selectedId) ?? filtered[0] ?? null, [decorated, selectedId, filtered]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Invoice marked ${status}`);
  }

  async function duplicate(inv: Invoice) {
    const num = inv.invoice_number ? `${inv.invoice_number}-COPY` : null;
    const { error } = await supabase.from("invoices").insert({
      clinic_id: inv.clinic_id,
      invoice_number: num,
      client_id: inv.client_id,
      client_name: inv.client_name,
      total_cents: inv.total_cents,
      status: "draft",
      issued_on: new Date().toISOString().slice(0, 10),
      due_on: inv.due_on,
      notes: inv.notes,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice duplicated as draft");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Billing</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl sm:text-4xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Track outstanding balances, age receivables, and reconcile paid invoices.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowCompose(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New invoice
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<DollarSign className="h-4.5 w-4.5" />} label="Outstanding" value={money(stats.outstanding)} hint={`${decorated.filter((i) => ["sent", "overdue"].includes(i.status)).length} open`} accent="primary" />
        <Kpi icon={<AlertCircle className="h-4.5 w-4.5" />} label="Overdue" value={money(stats.overdueAmt)} hint={`${decorated.filter((i) => i.status === "overdue").length} past due`} accent="rose" />
        <Kpi icon={<TrendingUp className="h-4.5 w-4.5" />} label="Paid this month" value={money(stats.paidThisMonth)} hint="Cleared" accent="emerald" />
        <Kpi icon={<FileText className="h-4.5 w-4.5" />} label="Drafts" value={stats.draftCount.toString()} hint="Awaiting send" accent="slate" />
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-[95vw] sm:max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or invoice #…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "draft", "sent", "overdue", "paid", "voided"] as const).map((f) => {
            const count = f === "all" ? decorated.length : decorated.filter((i) => i.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                  filter === f ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : STATUS_META[f]?.label} <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-pane */}
      <section className="grid min-h-[520px] gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No invoices match</p>
              <p className="text-xs text-muted-foreground">Create your first invoice to start tracking receivables.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((inv) => {
                    const meta = STATUS_META[inv.status] ?? STATUS_META.draft;
                    const dueIn = inv.due_on ? daysFromNow(inv.due_on) : null;
                    const active = selected?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedId(inv.id)}
                        className={cn("cursor-pointer transition hover:bg-surface/50", active && "bg-surface/70")}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-medium">{inv.invoice_number || `#${inv.id.slice(0, 6)}`}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(inv.issued_on).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="truncate font-medium">{inv.client_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{money(inv.total_cents)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", meta.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {dueIn === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : inv.status === "paid" || inv.status === "voided" ? (
                            <span className="text-muted-foreground">{new Date(inv.due_on!).toLocaleDateString()}</span>
                          ) : dueIn < 0 ? (
                            <span className="font-medium text-rose-300">{Math.abs(dueIn)}d overdue</span>
                          ) : dueIn <= 7 ? (
                            <span className="font-medium text-amber-300">In {dueIn}d</span>
                          ) : (
                            <span className="text-muted-foreground">In {dueIn}d</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select an invoice to view details.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{selected.invoice_number || `#${selected.id.slice(0, 8)}`}</div>
                    <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{money(selected.total_cents)}</div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", STATUS_META[selected.status]?.color)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[selected.status]?.dot)} />
                    {STATUS_META[selected.status]?.label}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <DetailRow icon={<User className="h-3.5 w-3.5" />} label="Client" value={selected.client_name} />
                <DetailRow icon={<CalendarIcon className="h-3.5 w-3.5" />} label="Issued" value={new Date(selected.issued_on).toLocaleDateString(undefined, { dateStyle: "long" })} />
                <DetailRow
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Due"
                  value={selected.due_on ? new Date(selected.due_on).toLocaleDateString(undefined, { dateStyle: "long" }) : "Not set"}
                />
                {selected.notes && (
                  <div className="rounded-xl border border-border bg-surface/40 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</div>
                    <p className="text-sm leading-relaxed">{selected.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-surface/20 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selected.status === "draft" && (
                    <button onClick={() => updateStatus(selected.id, "sent")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow hover:opacity-90">
                      <Send className="h-3.5 w-3.5" /> Send to client
                    </button>
                  )}
                  {(selected.status === "sent" || selected.status === "overdue") && (
                    <button onClick={() => updateStatus(selected.id, "paid")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow hover:opacity-90">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark as paid
                    </button>
                  )}
                  <button onClick={() => { setEditing(selected); setShowCompose(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface/70">
                    Edit
                  </button>
                  <button onClick={() => duplicate(selected)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface/70">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button onClick={() => toast.info("PDF export coming soon")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface/70">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  {selected.status !== "voided" && selected.status !== "paid" && (
                    <button onClick={() => updateStatus(selected.id, "voided")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15">
                      <Ban className="h-3.5 w-3.5" /> Void
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showCompose && activeClinic && (
        <ComposeModal
          clinicId={activeClinic.clinic_id}
          editing={editing}
          onClose={() => { setShowCompose(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent: "primary" | "rose" | "emerald" | "slate" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-300",
    emerald: "bg-emerald-500/10 text-emerald-300",
    slate: "bg-slate-500/10 text-slate-300",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", colors[accent])}>{icon}</div>
      <div className="mt-4 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right text-sm font-medium">{value}</div>
    </div>
  );
}

function ComposeModal({ clinicId, editing, onClose }: { clinicId: string; editing: Invoice | null; onClose: () => void }) {
  const [number, setNumber] = useState(editing?.invoice_number ?? "");
  const [client, setClient] = useState(editing?.client_name ?? "");
  const [amount, setAmount] = useState(editing ? (editing.total_cents / 100).toFixed(2) : "");
  const [status, setStatus] = useState(editing?.status ?? "draft");
  const [issued, setIssued] = useState(editing?.issued_on ?? new Date().toISOString().slice(0, 10));
  const [due, setDue] = useState(editing?.due_on ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.trim() || !amount) return;
    setSaving(true);
    const payload = {
      clinic_id: clinicId,
      invoice_number: number.trim() || null,
      client_name: client.trim(),
      total_cents: Math.round(parseFloat(amount) * 100),
      status,
      issued_on: issued,
      due_on: due || null,
      notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id)
      : await supabase.from("invoices").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Invoice updated" : "Invoice created");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-[95vw] sm:max-w-lg rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{editing ? "Edit invoice" : "New invoice"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Track an amount owed to your clinic.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Invoice #">
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-0001" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Client" full>
            <input value={client} onChange={(e) => setClient(e.target.value)} required placeholder="Client name" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          </Field>
          <Field label="Amount (CAD)">
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-primary/50" />
          </Field>
          <Field label="Issued on">
            <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          </Field>
          <Field label="Due on" full>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary/50" />
          </Field>
          <Field label="Notes" full>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-primary/50" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface/70">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : editing ? "Save changes" : "Create invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={cn("block", full && "sm:col-span-2")}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
