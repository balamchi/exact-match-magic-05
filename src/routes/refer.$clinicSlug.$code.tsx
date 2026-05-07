import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, CheckCircle, Sparkles, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/refer/$clinicSlug/$code")({ component: PublicReferralPage });

function PublicReferralPage() {
  const { clinicSlug, code } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<{ id: string; name: string; logo_url: string | null; slug: string } | null>(null);
  const [codeData, setCodeData] = useState<{ id: string; client_id: string } | null>(null);
  const [referrerName, setReferrerName] = useState("");
  const [rewardDesc, setRewardDesc] = useState("");
  const [step, setStep] = useState<"form" | "done">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Find clinic by slug
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("id, name, logo_url, slug")
        .eq("slug", clinicSlug)
        .single();

      if (!clinicData) {
        setError("Clinic not found.");
        setLoading(false);
        return;
      }
      setClinic(clinicData);

      // Find referral code
      const { data: codeRow } = await supabase
        .from("referral_codes")
        .select("id, client_id")
        .eq("clinic_id", clinicData.id)
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (!codeRow) {
        setError("This referral code is invalid or inactive.");
        setLoading(false);
        return;
      }
      setCodeData(codeRow);

      // Get referrer name
      const { data: client } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("id", codeRow.client_id)
        .single();
      if (client) setReferrerName(`${client.first_name} ${client.last_name ?? ""}`.trim());

      // Get reward description
      const { data: settings } = await supabase
        .from("referral_settings")
        .select("reward_description, referee_reward_enabled, referee_reward_value, referee_reward_type")
        .eq("clinic_id", clinicData.id)
        .maybeSingle();
      if (settings?.referee_reward_enabled) {
        setRewardDesc(settings.reward_description || `$${settings.referee_reward_value} off your first visit`);
      }

      setLoading(false);
    })();
  }, [clinicSlug, code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinic || !codeData || !name.trim() || !email.trim()) return;
    setSubmitting(true);

    // Create lead with source=referral
    await supabase.from("leads").insert({
      clinic_id: clinic.id,
      name: name.trim(),
      first_name: name.trim().split(" ")[0] || name.trim(),
      last_name: name.trim().split(" ").slice(1).join(" ") || null,
      email: email.trim(),
      phone: phone.trim() || null,
      source: "referral",
      source_details: `Referred by ${referrerName} (code: ${code})`,
      stage: "new",
    });

    // Create referral row
    await supabase.from("referrals").insert({
      clinic_id: clinic.id,
      referrer_name: referrerName || "Unknown",
      referred_name: name.trim(),
      referred_email: email.trim(),
      referee_phone: phone.trim() || null,
      referrer_client_id: codeData.client_id,
      referrer_code_id: codeData.id,
      status: "invited",
      reward_cents: 0,
    });

    // Increment code usage
    await supabase.rpc("increment_referral_code_usage" as any, { code_id: codeData.id }).catch(() => {
      // If RPC doesn't exist, manually update
      supabase.from("referral_codes").update({ times_used: 1 }).eq("id", codeData.id); // best effort
    });

    setStep("done");
    setSubmitting(false);
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
          <Share2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
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
          <h1 className="mt-3 font-display text-2xl font-semibold">{clinic?.name}</h1>
        </div>

        {step === "form" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="text-center">
              <Share2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 font-display text-xl font-semibold">
                You've been referred{referrerName ? ` by ${referrerName}` : ""}!
              </h2>
              {rewardDesc && (
                <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  🎁 {rewardDesc}
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Sign up below to claim your reward and book your first appointment.
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {submitting ? "Signing up…" : "Claim my reward"}
              </Button>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 font-display text-2xl font-semibold">You're in!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll be in touch shortly. Book your first appointment to unlock your reward.
            </p>
            {clinic?.slug && (
              <a href={`/book/${clinic.slug}?ref=${code}`}>
                <Button className="mt-4 gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow">
                  <CalendarDays className="h-4 w-4" /> Book now
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
