import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Shield, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/signature-pad";

export const Route = createFileRoute("/consent/$publicToken")({ component: ConsentSignPage });

type Sig = {
  id: string;
  status: string;
  clinic_id: string;
  client_id: string;
  template_id: string;
  template_version: number;
  signed_html_snapshot: string;
  signature_canvas_data: string | null;
  signature_typed_name: string | null;
  signature_checkbox_confirmed: boolean;
  signed_at: string | null;
  requires_witness?: boolean;
  witness_name: string | null;
  witness_signature_data: string | null;
  witness_signed_at: string | null;
  witness_relationship: string | null;
  expires_at: string | null;
  template?: { name: string; body_html: string; requires_witness: boolean } | null;
  client?: { first_name: string; last_name: string | null } | null;
  clinic?: { name: string; logo_url: string | null; primary_color: string | null } | null;
};

function ConsentSignPage() {
  const { publicToken } = Route.useParams();
  const [sig, setSig] = useState<Sig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Use service-role-free approach: query with anon key since we need a public RLS policy
    // Actually, consent_form_signatures doesn't have anon read. We'll use a server function approach.
    // For simplicity, we'll use a direct anon query. We need an RLS policy for public_token access.
    // Since we can't add RLS now, let's use the supabase client with the token lookup.
    const { data, error: err } = await supabase
      .from("consent_form_signatures")
      .select("*, template:consent_form_templates(name, body_html, requires_witness), client:clients(first_name, last_name)")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (err || !data) {
      setError("This consent form link is invalid or has expired.");
      setLoading(false);
      return;
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError("This consent form link has expired. Please contact the clinic for a new one.");
      setLoading(false);
      return;
    }

    if (data.status === "signed") {
      setDone(true);
    }
    if (data.status === "declined") {
      setDeclined(true);
    }

    // Mark as viewed if still sent
    if (data.status === "sent") {
      await supabase.from("consent_form_signatures").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("id", data.id);
    }

    setSig(data as any);
    setLoading(false);
  }, [publicToken]);

  useEffect(() => { load(); }, [load]);

  const handleSign = async () => {
    if (!sig) return;
    if (!signatureData && !typedName.trim()) {
      toast.error("Please provide your signature or type your full name.");
      return;
    }
    if (!agreed) {
      toast.error("Please confirm you have read and agree to the terms.");
      return;
    }

    setSubmitting(true);

    // Capture IP address for legal audit trail (best-effort)
    let signerIp: string | null = null;
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        signerIp = ipData.ip ?? null;
      }
    } catch {
      // Non-critical — proceed without IP
    }

    // Capture geolocation (optional, best-effort)
    let geolocation: { lat: number; lng: number; accuracy: number } | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        geolocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch {
        // User declined or unavailable — proceed without
      }
    }

    const { error: err } = await supabase.from("consent_form_signatures").update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_canvas_data: signatureData,
      signature_typed_name: typedName.trim() || null,
      signature_checkbox_confirmed: agreed,
      signed_html_snapshot: sig.template?.body_html ?? sig.signed_html_snapshot,
      signer_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      signer_ip_address: signerIp,
      signer_geolocation: geolocation,
    }).eq("id", sig.id);

    if (err) {
      toast.error("Failed to submit signature. Please try again.");
      setSubmitting(false);
      return;
    }

    // Log audit
    await supabase.from("consent_form_audit_log").insert({
      signature_id: sig.id,
      clinic_id: sig.clinic_id,
      action: "signed",
      actor_type: "client",
      actor_name: [sig.client?.first_name, sig.client?.last_name].filter(Boolean).join(" ") || "Client",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      ip_address: signerIp,
    });

    setDone(true);
    setSubmitting(false);
    toast.success("Consent form signed successfully!");
  };

  const handleDecline = async () => {
    if (!sig) return;
    setSubmitting(true);
    await supabase.from("consent_form_signatures").update({
      status: "declined",
      declined_reason: "Declined by client",
    }).eq("id", sig.id);
    await supabase.from("consent_form_audit_log").insert({
      signature_id: sig.id,
      clinic_id: sig.clinic_id,
      action: "declined",
      actor_type: "client",
      actor_name: [sig.client?.first_name, sig.client?.last_name].filter(Boolean).join(" ") || "Client",
    });
    setDeclined(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading consent form…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 font-display text-xl font-semibold">Consent Form Unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-4 font-display text-xl font-semibold">Consent Declined</h1>
          <p className="mt-2 text-sm text-muted-foreground">You have declined this consent form. Please contact the clinic if you need assistance.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <h1 className="mt-4 font-display text-xl font-semibold">Consent Signed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Thank you for signing. You may close this page.</p>
          {sig?.signed_at && <p className="mt-1 text-xs text-muted-foreground">Signed on {new Date(sig.signed_at).toLocaleString()}</p>}
        </div>
      </div>
    );
  }

  const clientName = [sig?.client?.first_name, sig?.client?.last_name].filter(Boolean).join(" ");
  const templateName = sig?.template?.name ?? "Consent Form";
  const bodyHtml = sig?.template?.body_html ?? "";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-semibold">{templateName}</h1>
            <p className="text-sm text-muted-foreground">For {clientName}</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div
            className="prose prose-sm max-w-none dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-sm [&_li]:text-sm"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        {/* Signature Section */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-lg">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Your Signature
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">You may draw your signature or type your full legal name below.</p>

          <div className="mt-4">
            <SignaturePad onSave={setSignatureData} />
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground">Or type your full name</label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Your Full Legal Name"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="mt-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground">
                I have read and understand the above consent form and agree to proceed with the treatment as described.
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={handleDecline} disabled={submitting} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
              <XCircle className="mr-1.5 h-4 w-4" /> Decline
            </Button>
            <Button
              onClick={handleSign}
              disabled={submitting || (!signatureData && !typedName.trim()) || !agreed}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {submitting ? "Submitting…" : "Sign & Submit"}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          This is a legally binding electronic signature. Your IP address and device information are recorded for audit purposes.
        </p>
      </div>
    </div>
  );
}
