import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Shield, FileText, Send, Eye, CheckCircle2, Clock, XCircle, Pencil, Trash2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/clinical/consent-forms/")({ component: ConsentFormsDashboard });

function ConsentFormsDashboard() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const [templates, setTemplates] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Template editor
  const [tmplOpen, setTmplOpen] = useState(false);
  const [editTmpl, setEditTmpl] = useState<any | null>(null);
  const [tmplName, setTmplName] = useState("");
  const [tmplBody, setTmplBody] = useState("");
  const [tmplWitness, setTmplWitness] = useState(false);
  const [tmplLegal, setTmplLegal] = useState(false);
  const [tmplSaving, setTmplSaving] = useState(false);

  // Send for signature
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendClientId, setSendClientId] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [sending, setSending] = useState(false);

  // View signed
  const [viewSig, setViewSig] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [tmplRes, sigRes] = await Promise.all([
      supabase.from("consent_form_templates").select("*").eq("clinic_id", clinicId).order("name"),
      supabase.from("consent_form_signatures").select("*, template:consent_form_templates(name), client:clients(first_name, last_name, email)")
        .eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (tmplRes.error) toast.error("Failed to load templates");
    setTemplates(tmplRes.data ?? []);
    setSignatures((sigRes.data ?? []) as any[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  // Load clients when send dialog opens
  useEffect(() => {
    if (!sendOpen || !clinicId) return;
    supabase.from("clients").select("id, first_name, last_name, email").eq("clinic_id", clinicId).order("first_name").limit(500).then(({ data }) => setClients(data ?? []));
  }, [sendOpen, clinicId]);

  const pending = signatures.filter(s => s.status === "sent" || s.status === "viewed");
  const signed = signatures.filter(s => s.status === "signed");

  const statusIcon = (s: string) => s === "signed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    s === "declined" || s === "revoked" ? <XCircle className="h-4 w-4 text-red-400" /> :
    <Clock className="h-4 w-4 text-amber-400" />;

  // Template save
  const saveTmpl = async () => {
    if (!clinicId || !tmplName.trim()) return;
    setTmplSaving(true);
    if (editTmpl) {
      const { error } = await supabase.from("consent_form_templates").update({
        name: tmplName.trim(),
        body_html: tmplBody,
        requires_witness: tmplWitness,
        is_legal_template: tmplLegal,
        version: (editTmpl.version ?? 1) + 1,
      }).eq("id", editTmpl.id);
      if (error) toast.error("Failed to update template"); else toast.success("Template updated");
    } else {
      const { error } = await supabase.from("consent_form_templates").insert({
        clinic_id: clinicId,
        name: tmplName.trim(),
        body_html: tmplBody,
        requires_witness: tmplWitness,
        is_legal_template: tmplLegal,
      });
      if (error) toast.error("Failed to create template"); else toast.success("Template created");
    }
    setTmplSaving(false);
    setTmplOpen(false);
    load();
  };

  const openNewTmpl = () => {
    setEditTmpl(null);
    setTmplName("");
    setTmplBody("<h2>Treatment Consent</h2>\n<p>I, the undersigned, consent to the following treatment...</p>\n<h3>Risks & Complications</h3>\n<ul>\n<li>Temporary redness or swelling</li>\n<li>Bruising at the injection site</li>\n</ul>\n<h3>Post-Treatment Care</h3>\n<p>Follow all post-treatment instructions provided by your clinician.</p>");
    setTmplWitness(false);
    setTmplLegal(false);
    setTmplOpen(true);
  };

  const openEditTmpl = (t: any) => {
    setEditTmpl(t);
    setTmplName(t.name);
    setTmplBody(t.body_html ?? "");
    setTmplWitness(t.requires_witness);
    setTmplLegal(t.is_legal_template);
    setTmplOpen(true);
  };

  // Send for signature
  const handleSend = async () => {
    if (!clinicId || !sendTemplateId || !sendClientId) return;
    setSending(true);
    const tmpl = templates.find(t => t.id === sendTemplateId);
    const { data: sigData, error } = await supabase.from("consent_form_signatures").insert({
      clinic_id: clinicId,
      template_id: sendTemplateId,
      template_version: tmpl?.version ?? 1,
      client_id: sendClientId,
      status: "sent",
      sent_at: new Date().toISOString(),
      signed_html_snapshot: tmpl?.body_html ?? "",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).select("id, public_token").single();

    if (error) {
      toast.error("Failed to send consent form");
      setSending(false);
      return;
    }

    // Copy link
    const url = `${window.location.origin}/consent/${sigData.public_token}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    toast.success("Consent form sent! Link copied to clipboard.");
    setSending(false);
    setSendOpen(false);
    load();
  };

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
    return name.includes(clientSearch.toLowerCase()) || c.email?.toLowerCase().includes(clientSearch.toLowerCase());
  });

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/consent/${token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); } catch { toast.error("Failed to copy"); }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Clinical Compliance</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Consent Forms</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">DocuSign-style e-signatures with full audit trail.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewTmpl} className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
          <Button onClick={() => setSendOpen(true)} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Send className="h-4 w-4" /> Send for Signature</Button>
        </div>
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
            <TabsTrigger value="all">All ({signatures.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-4 space-y-2">
            {templates.length === 0 ? <Empty text="No consent templates yet. Create one to get started." /> : templates.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">v{t.version} · {t.is_active ? "Active" : "Inactive"}{t.requires_witness ? " · Witness required" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {t.is_legal_template && <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">Legal</span>}
                  <Button variant="ghost" size="sm" onClick={() => openEditTmpl(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSendTemplateId(t.id); setSendOpen(true); }}><Send className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="pending" className="mt-4 space-y-2">
            {pending.length === 0 ? <Empty text="No pending signatures." /> : pending.map((s: any) => <SigRow key={s.id} sig={s} icon={statusIcon(s.status)} onView={() => setViewSig(s)} onCopy={() => copyLink(s.public_token)} />)}
          </TabsContent>
          <TabsContent value="signed" className="mt-4 space-y-2">
            {signed.length === 0 ? <Empty text="No signed consents yet." /> : signed.map((s: any) => <SigRow key={s.id} sig={s} icon={statusIcon(s.status)} onView={() => setViewSig(s)} onCopy={() => copyLink(s.public_token)} />)}
          </TabsContent>
          <TabsContent value="all" className="mt-4 space-y-2">
            {signatures.length === 0 ? <Empty text="No consent records." /> : signatures.map((s: any) => <SigRow key={s.id} sig={s} icon={statusIcon(s.status)} onView={() => setViewSig(s)} onCopy={() => copyLink(s.public_token)} />)}
          </TabsContent>
        </Tabs>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTmpl ? "Edit Template" : "New Consent Template"}</DialogTitle>
            <DialogDescription>Define the consent form content that clients will sign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Template Name</Label>
              <input value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder="e.g. Botox Consent Form"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <Label>Form Body (HTML)</Label>
              <textarea value={tmplBody} onChange={e => setTmplBody(e.target.value)} rows={12}
                className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tmplWitness} onChange={e => setTmplWitness(e.target.checked)} className="h-4 w-4 rounded" />
                Requires witness signature
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tmplLegal} onChange={e => setTmplLegal(e.target.checked)} className="h-4 w-4 rounded" />
                Legal template (cannot be deleted)
              </label>
            </div>
            {tmplBody && (
              <div>
                <Label>Preview</Label>
                <div className="mt-1 rounded-lg border border-border bg-white p-4 prose prose-sm max-w-none dark:bg-card dark:prose-invert" dangerouslySetInnerHTML={{ __html: tmplBody }} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTmplOpen(false)}>Cancel</Button>
              <Button onClick={saveTmpl} disabled={tmplSaving || !tmplName.trim()} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {tmplSaving ? "Saving…" : editTmpl ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send for Signature Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send for Signature</DialogTitle>
            <DialogDescription>Choose a template and client to send a consent form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Consent Template</Label>
              <select value={sendTemplateId} onChange={e => setSendTemplateId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30">
                <option value="">Select template…</option>
                {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
              </select>
            </div>
            <div>
              <Label>Client</Label>
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients…"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
                {filteredClients.slice(0, 50).map(c => (
                  <button key={c.id} type="button" onClick={() => setSendClientId(c.id)}
                    className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition flex items-center justify-between",
                      sendClientId === c.id && "bg-primary/10 text-primary")}>
                    <span>{c.first_name} {c.last_name ?? ""}</span>
                    {c.email && <span className="text-xs text-muted-foreground truncate ml-2">{c.email}</span>}
                  </button>
                ))}
                {filteredClients.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">No clients found</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending || !sendTemplateId || !sendClientId}
                className="bg-gradient-primary text-primary-foreground shadow-glow gap-2">
                <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send & Copy Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Signed Consent Dialog */}
      <Dialog open={!!viewSig} onOpenChange={() => setViewSig(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewSig?.template?.name ?? "Consent Form"}</DialogTitle>
            <DialogDescription>
              {[viewSig?.client?.first_name, viewSig?.client?.last_name].filter(Boolean).join(" ")} · {viewSig?.status} · {viewSig?.signed_at ? new Date(viewSig.signed_at).toLocaleString() : "Not yet signed"}
            </DialogDescription>
          </DialogHeader>
          {viewSig && (
            <div className="mt-4 space-y-4">
              {viewSig.signed_html_snapshot && (
                <div className="rounded-lg border border-border bg-white p-4 prose prose-sm max-w-none dark:bg-card dark:prose-invert" dangerouslySetInnerHTML={{ __html: viewSig.signed_html_snapshot }} />
              )}
              {viewSig.signature_canvas_data && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Signature</p>
                  <img src={viewSig.signature_canvas_data} alt="Signature" className="rounded-lg border border-border max-h-32" />
                </div>
              )}
              {viewSig.signature_typed_name && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Typed Name</p>
                  <p className="font-medium">{viewSig.signature_typed_name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{viewSig.status}</span></div>
                <div><span className="text-muted-foreground">Template Version:</span> <span className="font-medium">v{viewSig.template_version}</span></div>
                {viewSig.sent_at && <div><span className="text-muted-foreground">Sent:</span> <span className="font-medium">{new Date(viewSig.sent_at).toLocaleString()}</span></div>}
                {viewSig.viewed_at && <div><span className="text-muted-foreground">Viewed:</span> <span className="font-medium">{new Date(viewSig.viewed_at).toLocaleString()}</span></div>}
                {viewSig.signed_at && <div><span className="text-muted-foreground">Signed:</span> <span className="font-medium">{new Date(viewSig.signed_at).toLocaleString()}</span></div>}
                {viewSig.signer_ip_address && <div><span className="text-muted-foreground">IP:</span> <span className="font-mono font-medium">{viewSig.signer_ip_address}</span></div>}
              </div>
              {viewSig.status === "signed" && (
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={async () => {
                    try {
                      toast.info("Generating PDF…");
                      const { data, error } = await supabase.functions.invoke("consent-generate-pdf", {
                        body: { signatureId: viewSig.id },
                      });
                      if (error) throw error;
                      // Audit trail
                      await supabase.from("consent_form_audit_log").insert({
                        signature_id: viewSig.id,
                        clinic_id: viewSig.clinic_id,
                        action: "downloaded",
                        actor_type: "clinic_staff",
                        actor_name: "Staff",
                      });
                      const blob = new Blob([data.html], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const printWindow = window.open(url, "_blank");
                      if (printWindow) {
                        printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
                      }
                      toast.success("PDF ready! Use browser's Save as PDF option.");
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to generate PDF");
                    }
                  }}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SigRow({ sig, icon, onView, onCopy }: { sig: any; icon: React.ReactNode; onView: () => void; onCopy: () => void }) {
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
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onCopy} title="Copy signing link"><Copy className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onView}><Eye className="h-3.5 w-3.5" /></Button>
      </div>
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
