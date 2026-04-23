import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { CalendarDays, Mail, Pencil, Phone, Plus, Search, Tag, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/clients")({
  component: ClientsPage,
});

type Client = Tables<"clients">;

interface ClientFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  tags: string;
  notes: string;
}

const emptyForm: ClientFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  tags: "",
  notes: "",
};

function ClientsPage() {
  const { activeClinic } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyForm);

  const loadClients = async () => {
    if (!activeClinic) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Could not load clients");
      setClients([]);
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, [activeClinic?.clinic_id]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => {
      const haystack = [
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        ...(client.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [clients, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      date_of_birth: client.date_of_birth ?? "",
      tags: (client.tags ?? []).join(", "),
      notes: client.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic || !form.first_name.trim()) return;
    setSaving(true);

    const payload = {
      clinic_id: activeClinic.clinic_id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      date_of_birth: form.date_of_birth || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: form.notes.trim() || null,
    };

    const result = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("clients").insert(payload);

    if (result.error) {
      toast.error(editing ? "Could not update client" : "Could not create client");
    } else {
      toast.success(editing ? "Client updated" : "Client created");
      setFormOpen(false);
      await loadClients();
    }
    setSaving(false);
  };

  const deleteClient = async (client: Client) => {
    if (!activeClinic || !confirm(`Delete ${client.first_name} ${client.last_name ?? ""}?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error("Could not delete client");
    else {
      toast.success("Client deleted");
      await loadClients();
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Client CRM</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage profiles, contact details, tags, and care notes.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" /> Add client
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Total clients" value={clients.length.toString()} icon={<Users className="h-4.5 w-4.5" />} />
        <Metric label="Tagged profiles" value={clients.filter((c) => (c.tags ?? []).length > 0).length.toString()} icon={<Tag className="h-4.5 w-4.5" />} />
        <Metric label="With birthdays" value={clients.filter((c) => c.date_of_birth).length.toString()} icon={<CalendarDays className="h-4.5 w-4.5" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, phone, tags…"
              className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <span className="text-xs text-muted-foreground">{filteredClients.length} shown</span>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {[0, 1, 2].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl font-semibold">No clients yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create your first client profile to start building treatment history and CRM records.</p>
            <Button onClick={openCreate} className="mt-5 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="h-4 w-4" /> Add first client
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredClients.map((client) => <ClientRow key={client.id} client={client} onEdit={openEdit} onDelete={deleteClient} />)}
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-elevated">
            <div className="border-b border-border p-5">
              <h2 className="font-display text-2xl font-semibold">{editing ? "Edit client" : "Add client"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Keep contact, segmentation, and clinical context in one record.</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="First name" required value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
              <Field label="Last name" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(value) => setForm({ ...form, date_of_birth: value })} />
              <Field label="Tags" placeholder="VIP, Botox, Follow-up" value={form.tags} onChange={(value) => setForm({ ...form, tags: value })} />
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {saving ? "Saving…" : editing ? "Save changes" : "Create client"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
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

function ClientRow({ client, onEdit, onDelete }: { client: Client; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return (
    <article className="grid gap-4 p-4 transition hover:bg-surface/60 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow">
          {client.first_name.slice(0, 1)}{client.last_name?.slice(0, 1) ?? ""}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-medium">{fullName}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(client.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{tag}</span>)}
          </div>
        </div>
      </div>
      <div className="grid gap-1 text-sm text-muted-foreground">
        {client.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email}</span>}
        {client.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone}</span>}
        {!client.email && !client.phone && <span>No contact details</span>}
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(client)} aria-label={`Edit ${fullName}`}><Pencil className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(client)} aria-label={`Delete ${fullName}`} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </article>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
