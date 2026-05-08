import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, CheckCircle, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reviews/$publicToken")({ component: PublicReviewPage });

interface RequestData {
  id: string;
  clinic_id: string;
  client_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface ClinicData {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface ReviewSettings {
  smart_filter_enabled: boolean;
  google_business_url: string | null;
  internal_thank_you_message: string | null;
  negative_feedback_alert_email: string | null;
}

function PublicReviewPage() {
  const { publicToken } = Route.useParams();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const presetRating = Number(searchParams.get("rating")) || 0;

  const [request, setRequest] = useState<RequestData | null>(null);
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"rate" | "feedback" | "done">("rate");
  const [rating, setRating] = useState(presetRating > 0 && presetRating <= 5 ? presetRating : 0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState("Thank you for your feedback!");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Fetch request by token
      const { data: reqData, error: reqErr } = await supabase
        .from("review_requests")
        .select("id, clinic_id, client_id, status, sent_at, created_at")
        .eq("public_token", publicToken)
        .maybeSingle();

      if (reqErr || !reqData) {
        setError("This review link is invalid or has expired.");
        setLoading(false);
        return;
      }

      if (reqData.status === "completed") {
        setError("You've already submitted a review. Thank you!");
        setLoading(false);
        return;
      }

      // Check expiry (30 days)
      const sentDate = new Date(reqData.sent_at || reqData.created_at);
      if (Date.now() - sentDate.getTime() > 30 * 86400000) {
        setError("This review link has expired.");
        setLoading(false);
        return;
      }

      setRequest(reqData as RequestData);

      // Mark as opened
      await supabase.from("review_requests").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", reqData.id);

      // Fetch clinic info + settings
      const [clinicRes, settingsRes] = await Promise.all([
        supabase.from("clinics").select("name, logo_url, primary_color").eq("id", reqData.clinic_id).single(),
        supabase.from("review_settings").select("smart_filter_enabled, google_business_url, internal_thank_you_message, negative_feedback_alert_email").eq("clinic_id", reqData.clinic_id).maybeSingle(),
      ]);

      setClinic(clinicRes.data as ClinicData | null);
      if (settingsRes.data) {
        setSettings(settingsRes.data as ReviewSettings);
        if (settingsRes.data.internal_thank_you_message) setThankYou(settingsRes.data.internal_thank_you_message);
      }

      if (presetRating > 0 && presetRating <= 5) {
        setStep("feedback");
      }

      setLoading(false);
    })();
  }, [publicToken]);

  function handleRatingSelect(r: number) {
    setRating(r);
    setStep("feedback");
  }

  async function submitReview(redirectToGoogle = false) {
    if (!request || !rating) return;
    setSubmitting(true);

    const { data: insertedReview, error: insertErr } = await supabase.from("reviews").insert({
      clinic_id: request.clinic_id,
      client_id: request.client_id,
      request_id: request.id,
      reviewer_name: "Client",
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
      source: redirectToGoogle ? "google" : "internal",
      platform: redirectToGoogle ? "google" : "internal",
      responded: false,
      is_responded: false,
      is_published: true,
      posted_at: new Date().toISOString(),
    }).select("id").single();

    if (insertErr) {
      setSubmitting(false);
      return;
    }

    // Mark request completed
    await supabase.from("review_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", request.id);

    // Negative review alert — send email to clinic if rating <= 3
    if (rating <= 3 && settings?.negative_feedback_alert_email) {
      try {
        // Lookup client name
        const { data: clientData } = await supabase.from("clients").select("first_name, last_name").eq("id", request.client_id).maybeSingle();
        const clientName = clientData ? [clientData.first_name, clientData.last_name].filter(Boolean).join(" ") : "Unknown";

        // Send alert email via Lovable transactional endpoint
        const sendRes = await fetch("/lovable/email/transactional/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: "negative-review-alert",
            recipientEmail: settings.negative_feedback_alert_email,
            idempotencyKey: `neg-review-${insertedReview?.id}`,
            templateData: {
              clinicName: clinic?.name ?? "Your Clinic",
              rating,
              title: title.trim() || undefined,
              body: body.trim() || undefined,
              clientName,
              submittedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
            },
          }),
        });
        if (!sendRes.ok) {
          const errText = await sendRes.text();
          console.error("Negative review alert email failed:", sendRes.status, errText);
        } else {
          // Trigger queue processor
          await fetch("/lovable/email/queue/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).catch((err) => console.warn("Queue processor trigger failed (non-fatal):", err));
        }
      } catch (emailErr) {
        console.error("Negative review alert email failed (non-critical):", emailErr);
      }
    }

    setStep("done");
    setSubmitting(false);

    if (redirectToGoogle && settings?.google_business_url) {
      window.open(settings.google_business_url, "_blank");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Clinic branding */}
        <div className="mb-8 text-center">
          {clinic?.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name} className="mx-auto h-12 object-contain" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <h1 className="mt-3 font-display text-2xl font-semibold">{clinic?.name ?? "Your Clinic"}</h1>
        </div>

        {step === "rate" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <h2 className="font-display text-xl font-semibold">How was your experience?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tap a star to rate your visit</p>
            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => handleRatingSelect(n)} className="group">
                  <Star className={cn("h-12 w-12 transition-all group-hover:scale-110", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 group-hover:text-amber-300")} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "feedback" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            {/* Show selected rating */}
            <div className="mb-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("h-6 w-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              ))}
            </div>

            {/* High rating + smart filter → offer Google */}
            {rating >= 4 && settings?.smart_filter_enabled ? (
              <div className="text-center">
                <h2 className="font-display text-xl font-semibold">Wonderful! 🎉</h2>
                <p className="mt-2 text-sm text-muted-foreground">Would you share your experience publicly?</p>

                <div className="mt-4 space-y-2">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Tell us more about your experience (optional)…"
                    rows={3}
                  />
                </div>

                <div className="mt-6 space-y-2">
                  {settings.google_business_url && (
                    <Button onClick={() => submitReview(true)} disabled={submitting} className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-glow">
                      <ExternalLink className="h-4 w-4" /> Post on Google
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => submitReview(false)} disabled={submitting} className="w-full">
                    Just leave internal review
                  </Button>
                </div>
              </div>
            ) : rating <= 3 && settings?.smart_filter_enabled ? (
              /* Low rating → internal feedback */
              <div>
                <h2 className="text-center font-display text-xl font-semibold">We're sorry to hear that</h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">Help us improve — your feedback goes directly to our team.</p>
                <div className="mt-4 space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What could we improve?" />
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us more…" rows={4} />
                </div>
                <Button onClick={() => submitReview(false)} disabled={submitting || !body.trim()} className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow">
                  {submitting ? "Submitting…" : "Submit feedback"}
                </Button>
              </div>
            ) : (
              /* Smart filter disabled → generic form */
              <div>
                <h2 className="text-center font-display text-xl font-semibold">Share your experience</h2>
                <div className="mt-4 space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us about your visit…" rows={4} />
                </div>
                <Button onClick={() => submitReview(false)} disabled={submitting} className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow">
                  {submitting ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            )}

            <button onClick={() => { setStep("rate"); setRating(0); }} className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-foreground">
              ← Change rating
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Thank you!</h2>
            <p className="mt-2 text-sm text-muted-foreground">{thankYou}</p>
          </div>
        )}
      </div>
    </div>
  );
}
