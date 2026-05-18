import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Crown, Download, Mail, Pencil, Phone, Plus, Search, Shield, Tag, Trash2, Upload, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { LimitGate, UsageMeter } from "@/components/limit-gate";

export const Route = createFileRoute("/app/clients")({
  component: ClientsPage,
});

type Client = Record<string, any>;

interface ClientFormState {
  first_name: string; last_name: string; preferred_name: string; pronouns: string; date_of_birth: string; gender: string;
  email: string; phone: string; address_line1: string; address_line2: string; city: string; state_province: string; postal_code: string; country: string; preferred_language: string;
  emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string;
  medical_conditions: string[]; allergies: string[]; current_medications: string; previous_treatments: string; pregnancy_status: string; smoking_status: string; skin_type: string; medical_alerts: string;
  source: string; tags: string; marketing_consent: boolean; sms_consent: boolean; email_consent: boolean;
  notes: string; notes_internal: string; vip_status: boolean;
}

const emptyForm: ClientFormState = {
  first_name: "", last_name: "", preferred_name: "", pronouns: "", date_of_birth: "", gender: "",
  email: "", phone: "", address_line1: "", address_line2: "", city: "", state_province: "", postal_code: "", country: "Canada", preferred_language: "en",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
  medical_conditions: [], allergies: [], current_medications: "", previous_treatments: "", pregnancy_status: "", smoking_status: "", skin_type: "", medical_alerts: "",
  source: "", tags: "", marketing_consent: false, sms_consent: false, email_consent: false,
  notes: "", notes_internal: "", vip_status: false,
};

const FORM_TABS = ["Personal", "Contact", "Medical", "Marketing", "Notes"] as const;
type FormTab = typeof FORM_TABS[number];

const MEDICAL_CONDITIONS = ["Diabetes", "Hypertension", "Heart disease", "Bleeding disorder", "Autoimmune disease", "Cancer history", "Keloid scarring"];
const ALLERGY_OPTIONS = ["Latex", "Lidocaine", "Sulfa", "Penicillin"];
const SOURCE_OPTIONS = ["instagram", "google", "referral", "walk-in", "tiktok", "website", "other"];
const PRONOUNS_OPTIONS = ["She/Her", "He/Him", "They/Them", "Other"];
const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const SKIN_TYPES = ["Type I", "Type II", "Type III", "Type IV", "Type V", "Type VI"];
const PREGNANCY_OPTIONS = [
  { value: "not_pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Pregnant" },
  { value: "breastfeeding", label: "Breastfeeding" },
  { value: "na", label: "N/A" },
];

function ClientsPage() {
  const { activeClinic } = useAuth();
  const canWriteClients = hasPermission(activeClinic?.role, "clients.write");
  const canDeleteClients = hasPermission(activeClinic?.role, "clients.delete");
  const canExportClients = hasPermission(activeClinic?.role, "clients.export");
  const { limits, usage, atClientLimit } = usePlanLimits();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [formTab, setFormTab] = useState<FormTab>("Personal");

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

  useEffect(() => { loadClients(); }, [activeClinic?.clinic_id]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => {
      const haystack = [client.first_name, client.last_name, client.email, client.phone, ...(client.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [clients, query]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormTab("Personal"); setFormOpen(true); };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      first_name: client.first_name ?? "", last_name: client.last_name ?? "", preferred_name: client.preferred_name ?? "", pronouns: client.pronouns ?? "",
      date_of_birth: client.date_of_birth ?? "", gender: client.gender ?? "",
      email: client.email ?? "", phone: client.phone ?? "", address_line1: client.address_line1 ?? "", address_line2: client.address_line2 ?? "",
      city: client.city ?? "", state_province: client.state_province ?? "", postal_code: client.postal_code ?? "", country: client.country ?? "Canada", preferred_language: client.preferred_language ?? "en",
      emergency_contact_name: client.emergency_contact_name ?? "", emergency_contact_phone: client.emergency_contact_phone ?? "", emergency_contact_relationship: client.emergency_contact_relationship ?? "",
      medical_conditions: client.medical_conditions ?? [], allergies: client.allergies ?? [],
      current_medications: client.current_medications ?? "", previous_treatments: client.previous_treatments ?? "",
      pregnancy_status: client.pregnancy_status ?? "", smoking_status: client.smoking_status ?? "", skin_type: client.skin_type ?? "", medical_alerts: client.medical_alerts ?? "",
      source: client.source ?? "", tags: (client.tags ?? []).join(", "),
      marketing_consent: client.marketing_consent ?? false, sms_consent: client.sms_consent ?? false, email_consent: client.email_consent ?? false,
      notes: client.notes ?? "", notes_internal: client.notes_internal ?? "", vip_status: client.vip_status ?? false,
    });
    setFormTab("Personal");
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeClinic || !form.first_name.trim()) return;
    if (!canWriteClients) { toast.error("You don't have permission to modify clients"); return; }
    if (!editing && atClientLimit) {
      toast.error(`Your ${limits?.plan_name ?? "current"} plan allows only ${limits?.active_clients_limit} active clients. Upgrade to add more.`);
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      clinic_id: activeClinic.clinic_id,
      first_name: form.first_name.trim(), last_name: form.last_name.trim() || null,
      preferred_name: form.preferred_name.trim() || null, pronouns: form.pronouns || null,
      date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      email: form.email.trim() || null, phone: form.phone.trim() || null,
      address_line1: form.address_line1.trim() || null, address_line2: form.address_line2.trim() || null,
      city: form.city.trim() || null, state_province: form.state_province.trim() || null,
      postal_code: form.postal_code.trim() || null, country: form.country || "Canada", preferred_language: form.preferred_language || "en",
      emergency_contact_name: form.emergency_contact_name.trim() || null, emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
      medical_conditions: form.medical_conditions.length > 0 ? form.medical_conditions : null,
      allergies: form.allergies.length > 0 ? form.allergies : null,
      current_medications: form.current_medications.trim() || null, previous_treatments: form.previous_treatments.trim() || null,
      pregnancy_status: form.pregnancy_status || null, smoking_status: form.smoking_status || null, skin_type: form.skin_type || null,
      medical_alerts: form.medical_alerts.trim() || null,
      source: form.source || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      marketing_consent: form.marketing_consent, sms_consent: form.sms_consent, email_consent: form.email_consent,
      notes: form.notes.trim() || null, notes_internal: form.notes_internal.trim() || null, vip_status: form.vip_status,
    };
    const result = editing
      ? await supabase.from("clients").update(payload as any).eq("id", editing.id).eq("clinic_id", activeClinic.clinic_id)
      : await supabase.from("clients").insert(payload as any);
    if (result.error) toast.error(editing ? "Could not update client" : "Could not create client");
    else { toast.success(editing ? "Client updated" : "Client created"); setFormOpen(false); await loadClients(); }
    setSaving(false);
  };

  const deleteClient = async (client: Client) => {
    if (!canDeleteClients) { toast.error("You don't have permission to delete clients"); return; }
    if (!activeClinic || !confirm(`Delete ${client.first_name} ${client.last_name ?? ""}?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id).eq("clinic_id", activeClinic.clinic_id);
    if (error) toast.error("Could not delete client");
    else { toast.success("Client deleted"); await loadClients(); }
  };

  const calcAge = (dob: string) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
  };

  // Export
  const exportClients = () => {
    if (!canExportClients) { toast.error("You don't have permission to export clients"); return; }
    const headers = ["first_name","last_name","email","phone","date_of_birth","gender","city","tags","vip_status"];
    const csv = [headers.join(","), ...clients.map(c =>
      headers.map(h => {
        const v = c[h];
        if (Array.isArray(v)) return `"${v.join(";")}"`;
        return `"${String(v ?? '').replace(/"/g,'""')}"`;
      }).join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "clients.csv"; a.click();
  };

  // Import
  const importClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canWriteClients) { toast.error("You don't have permission to import clients"); e.target.value = ""; return; }
    if (atClientLimit) { toast.error(`Your ${limits?.plan_name ?? "current"} plan allows only ${limits?.active_clients_limit} active clients. Upgrade to import more.`); e.target.value = ""; return; }
    const file = e.target.files?.[0];
    if (!file || !activeClinic) return;
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "")) ?? [];
      const row: Record<string, any> = { clinic_id: activeClinic.clinic_id };
      headers.forEach((h, idx) => {
        const val = values[idx]?.trim();
        if (!val) return;
        if (h === "tags") row[h] = val.split(";").map(t => t.trim()).filter(Boolean);
        else if (h === "vip_status") row[h] = val === "true";
        else row[h] = val;
      });
      if (!row.first_name) continue;
      await supabase.from("clients").insert(row as any);
      count++;
    }
    toast.success(`Imported ${count} clients`);
    await loadClients();
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Client CRM</p>
          <h1 className="mt-1 font-display text-2xl sm:text-4xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage profiles, contact details, tags, and care notes.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canExportClients && (
            <Button variant="outline" onClick={exportClients} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          )}
          {canWriteClients && (
            <label>
              <input type="file" accept=".csv" className="hidden" onChange={importClients} />
              <Button variant="outline" className="gap-2" asChild><span><Upload className="h-4 w-4" /> Import</span></Button>
            </label>
          )}
          {canWriteClients && (
            <Button onClick={openCreate} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="h-4 w-4" /> Add client
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Total clients" value={clients.length.toString()} icon={<Users className="h-4.5 w-4.5" />} />
        <Metric label="VIP clients" value={clients.filter((c) => c.vip_status).length.toString()} icon={<Crown className="h-4.5 w-4.5" />} />
        <Metric label="With birthdays" value={clients.filter((c) => c.date_of_birth).length.toString()} icon={<CalendarDays className="h-4.5 w-4.5" />} />
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, tags…" className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <span className="text-xs text-muted-foreground">{filteredClients.length} shown</span>
        </div>
        {loading ? (
          <div className="grid gap-3 p-4">{[0, 1, 2].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 sm:px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-6 w-6" /></div>
            <h2 className="font-display text-xl font-semibold">No clients yet</h2>
            <p className="mt-1 max-w-[95vw] sm:max-w-sm text-sm text-muted-foreground">Create your first client profile to start building treatment history and CRM records.</p>
            {canWriteClients && <Button onClick={openCreate} className="mt-5 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Add first client</Button>}
          </div>
        ) : (
          <div className="divide-y divide-border">{filteredClients.map((client) => <ClientRow key={client.id} client={client} onEdit={openEdit} onDelete={deleteClient} canEdit={canWriteClients} canDelete={canDeleteClients} />)}</div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex max-h-[92vh] w-full max-w-[95vw] sm:max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-elevated">
            <div className="border-b border-border p-5">
              <h2 className="font-display text-2xl font-semibold">{editing ? "Edit client" : "New client"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Complete client profile with medical, contact, and marketing info.</p>
            </div>
            <div className="flex gap-1 border-b border-border px-5 pt-2">
              {FORM_TABS.map((tab) => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)} className={cn("rounded-t-lg px-4 py-2 text-sm font-medium transition", formTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>{tab}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {formTab === "Personal" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="First name *" required value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
                  <Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
                  <Field label="Preferred name" value={form.preferred_name} onChange={(v) => setForm({ ...form, preferred_name: v })} placeholder="Nickname" />
                  <SelectField label="Pronouns" value={form.pronouns} onChange={(v) => setForm({ ...form, pronouns: v })} options={PRONOUNS_OPTIONS} />
                  <div>
                    <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
                    {form.date_of_birth && <span className="mt-1 block text-xs text-muted-foreground">{calcAge(form.date_of_birth)} years old</span>}
                  </div>
                  <SelectField label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={GENDER_OPTIONS} />
                </div>
              )}
              {formTab === "Contact" && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                    <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                    <Field label="Address line 1" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} />
                    <Field label="Address line 2" value={form.address_line2} onChange={(v) => setForm({ ...form, address_line2: v })} />
                    <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                    <Field label="State / Province" value={form.state_province} onChange={(v) => setForm({ ...form, state_province: v })} />
                    <Field label="Postal code" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
                    <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
                    <SelectField label="Preferred language" value={form.preferred_language} onChange={(v) => setForm({ ...form, preferred_language: v })} options={["en", "es", "fr", "fa", "ar"]} optionLabels={["English", "Español", "Français", "فارسی", "العربية"]} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Emergency Contact</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Name" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
                      <Field label="Phone" type="tel" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
                      <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(v) => setForm({ ...form, emergency_contact_relationship: v })} placeholder="Spouse, Parent…" />
                    </div>
                  </div>
                </div>
              )}
              {formTab === "Medical" && (
                <div className="space-y-5">
                  <div>
                    <span className="mb-2 block text-xs font-medium text-muted-foreground">Medical conditions</span>
                    <div className="flex flex-wrap gap-2">
                      {MEDICAL_CONDITIONS.map((c) => (
                        <label key={c} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm cursor-pointer hover:bg-surface/60">
                          <input type="checkbox" checked={form.medical_conditions.includes(c)} onChange={(e) => { const next = e.target.checked ? [...form.medical_conditions, c] : form.medical_conditions.filter((x) => x !== c); setForm({ ...form, medical_conditions: next }); }} className="accent-primary" />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-muted-foreground">Allergies</span>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGY_OPTIONS.map((a) => (
                        <label key={a} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm cursor-pointer hover:bg-surface/60">
                          <input type="checkbox" checked={form.allergies.includes(a)} onChange={(e) => { const next = e.target.checked ? [...form.allergies, a] : form.allergies.filter((x) => x !== a); setForm({ ...form, allergies: next }); }} className="accent-primary" />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Field label="Medical alerts" value={form.medical_alerts} onChange={(v) => setForm({ ...form, medical_alerts: v })} placeholder="Any critical alerts…" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Pregnancy status</span>
                      <div className="flex flex-wrap gap-2">
                        {PREGNANCY_OPTIONS.map((o) => (
                          <label key={o.value} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name="pregnancy" value={o.value} checked={form.pregnancy_status === o.value} onChange={() => setForm({ ...form, pregnancy_status: o.value })} className="accent-primary" />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Smoking status</span>
                      <div className="flex flex-wrap gap-2">
                        {["Non-smoker", "Smoker", "Former"].map((s) => (
                          <label key={s} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name="smoking" value={s} checked={form.smoking_status === s} onChange={() => setForm({ ...form, smoking_status: s })} className="accent-primary" />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <SelectField label="Skin type (Fitzpatrick)" value={form.skin_type} onChange={(v) => setForm({ ...form, skin_type: v })} options={SKIN_TYPES} />
                  <TextareaField label="Current medications" value={form.current_medications} onChange={(v) => setForm({ ...form, current_medications: v })} />
                  <TextareaField label="Previous treatments" value={form.previous_treatments} onChange={(v) => setForm({ ...form, previous_treatments: v })} />
                </div>
              )}
              {formTab === "Marketing" && (
                <div className="space-y-5">
                  <SelectField label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={SOURCE_OPTIONS} />
                  <Field label="Tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="VIP, Botox, Filler…" />
                  <div className="space-y-3">
                    <span className="block text-xs font-medium text-muted-foreground">Communication consent</span>
                    <CheckboxField label="Email marketing" checked={form.email_consent} onChange={(v) => setForm({ ...form, email_consent: v })} />
                    <CheckboxField label="SMS marketing" checked={form.sms_consent} onChange={(v) => setForm({ ...form, sms_consent: v })} />
                    <CheckboxField label="General marketing" checked={form.marketing_consent} onChange={(v) => setForm({ ...form, marketing_consent: v })} />
                  </div>
                </div>
              )}
              {formTab === "Notes" && (
                <div className="space-y-4">
                  <TextareaField label="Client notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Notes visible in client record…" />
                  <TextareaField label="Internal notes (staff only)" value={form.notes_internal} onChange={(v) => setForm({ ...form, notes_internal: v })} placeholder="Private notes, never visible to client…" />
                  <CheckboxField label="⭐ Mark as VIP" checked={form.vip_status} onChange={(v) => setForm({ ...form, vip_status: v })} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">{saving ? "Saving…" : editing ? "Save changes" : "Create client"}</Button>
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
      <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ClientRow({ client, onEdit, onDelete, canEdit, canDelete }: { client: Client; onEdit: (c: Client) => void; onDelete: (c: Client) => void; canEdit: boolean; canDelete: boolean }) {
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return (
    <article className="group grid gap-4 p-4 transition hover:bg-surface/60 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
      <Link to="/app/clients/$clientId" params={{ clientId: client.id }} className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow">
          {client.first_name?.slice(0, 1)}{client.last_name?.slice(0, 1) ?? ""}
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate font-medium group-hover:text-primary">
            {fullName}
            {client.vip_status && <Crown className="h-3.5 w-3.5 text-amber-400" />}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(client.tags ?? []).slice(0, 3).map((tag: string) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{tag}</span>)}
          </div>
        </div>
      </Link>
      <div className="grid gap-1 text-sm text-muted-foreground">
        {client.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email}</span>}
        {client.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone}</span>}
        {!client.email && !client.phone && <span>No contact details</span>}
      </div>
      <div className="flex justify-end gap-1">
        {canEdit && <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => onEdit(client)}><Pencil className="h-4 w-4" /></Button>}
        {canDelete && <Button aria-label="Action" type="button" variant="ghost" size="icon" onClick={() => onDelete(client)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </article>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, optionLabels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; optionLabels?: string[] }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
        <option value="">Select…</option>
        {options.map((o, i) => <option key={o} value={o}>{optionLabels ? optionLabels[i] : o}</option>)}
      </select>
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
