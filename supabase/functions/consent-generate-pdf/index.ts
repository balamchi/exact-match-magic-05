import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET") return new Response(JSON.stringify({ status: "ok", function: "consent-generate-pdf" }), { headers: CORS });

  try {
    const { signatureId } = await req.json();
    if (!signatureId) {
      return new Response(JSON.stringify({ error: "signatureId required" }), { status: 400, headers: CORS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: sig, error: sigErr } = await supabase
      .from("consent_form_signatures")
      .select("*, template:consent_form_templates(name, body_html), client:clients(first_name, last_name, email, phone)")
      .eq("id", signatureId)
      .single();

    if (sigErr || !sig) {
      return new Response(JSON.stringify({ error: "Signature not found" }), { status: 404, headers: CORS });
    }

    const { data: auditLog } = await supabase
      .from("consent_form_audit_log")
      .select("*")
      .eq("signature_id", signatureId)
      .order("created_at", { ascending: true });

    const { data: clinic } = await supabase
      .from("clinics")
      .select("name, email, phone, address")
      .eq("id", sig.clinic_id)
      .single();

    const clientName = `${sig.client?.first_name ?? ""} ${sig.client?.last_name ?? ""}`.trim();
    const signedDate = sig.signed_at
      ? new Date(sig.signed_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
      : "Not signed";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${sig.template?.name ?? "Consent Form"}</title>
<style>
  @page { margin: 1in; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { border-bottom: 3px solid #9333EA; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #9333EA; margin: 0; font-size: 24px; }
  .clinic-info { color: #666; font-size: 13px; margin-top: 4px; }
  .patient-info { background: #f8f8fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .patient-info p { margin: 4px 0; font-size: 14px; }
  .patient-info strong { display: inline-block; width: 140px; color: #555; }
  .consent-body { border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
  .consent-body h2, .consent-body h3 { color: #333; }
  .signature-section { background: #faf8ff; border: 2px solid #9333EA33; border-radius: 8px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; }
  .signature-section h2 { color: #9333EA; margin-top: 0; }
  .sig-img { max-height: 100px; border: 1px solid #ddd; border-radius: 4px; }
  .audit-section { background: #f0f0f4; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 12px; page-break-inside: avoid; }
  .audit-section h2 { color: #333; font-size: 16px; margin-top: 0; }
  .audit-entry { padding: 6px 0; border-bottom: 1px solid #e0e0e0; }
  .audit-entry:last-child { border-bottom: none; }
  .footer { text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${sig.template?.name ?? "Consent Form"}</h1>
    <div class="clinic-info">
      ${clinic?.name ?? "Clinic"}<br>
      ${clinic?.email ?? ""}${clinic?.phone ? ` · ${clinic.phone}` : ""}
    </div>
  </div>

  <div class="patient-info">
    <p><strong>Patient:</strong> ${clientName}</p>
    <p><strong>Email:</strong> ${sig.client?.email ?? "N/A"}</p>
    <p><strong>Status:</strong> ${(sig.status ?? "—").toUpperCase()}</p>
    <p><strong>Signed:</strong> ${signedDate}</p>
    <p><strong>Document Version:</strong> v${sig.template_version ?? 1}</p>
  </div>

  <div class="consent-body">
    <h2>Consent Document</h2>
    ${sig.signed_html_snapshot ?? sig.template?.body_html ?? ""}
  </div>

  <div class="signature-section">
    <h2>Patient Signature</h2>
    ${sig.signature_canvas_data ? `<img src="${sig.signature_canvas_data}" alt="Signature" class="sig-img">` : ""}
    ${sig.signature_typed_name ? `<p><strong>Typed Name:</strong> ${sig.signature_typed_name}</p>` : ""}
    <p><strong>Acknowledged:</strong> ${sig.signature_checkbox_confirmed ? "✓ Yes" : "✗ No"}</p>
    ${sig.witness_name ? `
      <hr style="margin: 16px 0; border-color: #ddd;">
      <h3>Witness Signature</h3>
      ${sig.witness_signature_data ? `<img src="${sig.witness_signature_data}" alt="Witness Signature" class="sig-img">` : ""}
      <p><strong>Name:</strong> ${sig.witness_name}</p>
      <p><strong>Relationship:</strong> ${sig.witness_relationship ?? "N/A"}</p>
      <p><strong>Date:</strong> ${sig.witness_signed_at ? new Date(sig.witness_signed_at).toLocaleString() : "N/A"}</p>
    ` : ""}
  </div>

  <div class="audit-section">
    <h2>Legal Audit Trail</h2>
    <p><strong>IP Address:</strong> ${sig.signer_ip_address ?? "Not captured"}</p>
    <p><strong>User Agent:</strong> ${sig.signer_user_agent ?? "Not captured"}</p>
    ${sig.signer_geolocation ? `<p><strong>Geolocation:</strong> ${JSON.stringify(sig.signer_geolocation)}</p>` : ""}
    <br>
    <p><strong>Activity Log:</strong></p>
    ${(auditLog ?? []).map((log: any) => `
      <div class="audit-entry">
        ${new Date(log.created_at).toLocaleString()} — 
        <strong>${(log.action ?? "").toUpperCase()}</strong> by ${log.actor_name} (${log.actor_type})
      </div>
    `).join("")}
  </div>

  <div class="footer">
    Generated by ClinicPro · ${new Date().toLocaleString()} · Document ID: ${sig.id}
  </div>
</body>
</html>`;

    return new Response(
      JSON.stringify({
        html,
        filename: `consent-${clientName.replace(/\s/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`,
      }),
      { status: 200, headers: CORS },
    );
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
