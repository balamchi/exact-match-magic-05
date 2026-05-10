CREATE TABLE public.member_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.membership_subscriptions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mpt_subscription ON public.member_portal_tokens (subscription_id);
CREATE INDEX idx_mpt_clinic ON public.member_portal_tokens (clinic_id);

ALTER TABLE public.member_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Anonymous (public link) can read live tokens
CREATE POLICY "Public can read live portal tokens"
ON public.member_portal_tokens FOR SELECT
TO anon, authenticated
USING (revoked_at IS NULL AND expires_at > now());

-- Clinic owners/admins manage tokens for their clinic
CREATE POLICY "Clinic admins manage portal tokens"
ON public.member_portal_tokens FOR ALL
TO authenticated
USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]))
WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));