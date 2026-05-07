import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Shield, FileText, Send, Eye, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/clinical/consent-forms/")({ component: ConsentFormsDashboard });

function ConsentFormsDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [templates, setTemplates] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [tmplRes, sigRes] = await Promise.all([
      supabase.from("consent_form_templates").select("*").eq("clinic_id", clinicId).order("name"),
      supabase.from("consent_form_signatures").select("*, template:consent_form_templates(name), client:clients(first_name, last_name)")
        .eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (tmplRes.error) toast.error("Failed to load templates");
    setTemplates(tmplRes.data ?? []);
    setSignatures((sigRes.data ?? []) as any[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const pending = signatures.filter(s => s.status === "sent" || s.status === "viewed");
  const signed = signatures.filter(s => s.status === "signed");
  const statusIcon = (s: string) => s === "signed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    s === "declined" || s === "revoked" ? <XCircle className="h-4 w-4 text-red-400" /> :
    <Clock className="h-4 w-4 text-amber-400" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical Compliance</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Consent Forms</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">DocuSign-style e-signatures with full audit trail. Legally compliant consent management.</p>
        </div>
        <Button className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Send for Signature</Button>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Templates" value={templates.length} />
        <StatCard icon={<Send className="h-4 w-4" />} label="Pending" value={pending.length} accent />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Signed" value={signed.length} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Total" value={signatures.length} />
      </section>

      {loading ? <div className="space-y-3">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : (
        <Tabs defaultValue="templates">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="signed">Signed ({signed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-4 space-y-2">
            {templates.length === 0 ? <Empty text="No consent templates yet." /> : templates.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">v{t.version} · {t.is_active ? "Active" : "Inactive"}{t.requires_witness ? " · Witness required" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.is_legal_template && <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">Legal</span>}
                  <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="pending" className="mt-4 space-y-2">
            {pending.length === 0 ? <Empty text="No pending signatures." /> : pending.map((s: any) => <SigRow key={s.id} sig={s} icon={statusIcon(s.status)} />)}
          </TabsContent>
          <TabsContent value="signed" className="mt-4 space-y-2">
            {signed.length === 0 ? <Empty text="No signed consents yet." /> : signed.map((s: any) => <SigRow key={s.id} sig={s} icon={statusIcon(s.status)} />)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SigRow({ sig, icon }: { sig: any; icon: React.ReactNode }) {
  const clientName = [sig.client?.first_name, sig.client?.last_name].filter(Boolean).join(" ") || "Unknown";
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="font-medium text-sm">{sig.template?.name ?? "Consent"}</div>
          <div className="text-[11px] text-muted-foreground">{clientName} · {new Date(sig.created_at).toLocaleDateString()} · {sig.status}</div>
        </div>
      </div>
      <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", accent && "text-primary")}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
