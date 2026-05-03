
CREATE TABLE public.signed_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  client_id uuid,
  client_name text NOT NULL,
  consent_form_id uuid NOT NULL,
  consent_title text NOT NULL,
  consent_body text,
  signature_data text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signed_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read signed_consents" ON public.signed_consents FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members insert signed_consents" ON public.signed_consents FOR INSERT TO authenticated WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members update signed_consents" ON public.signed_consents FOR UPDATE TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins delete signed_consents" ON public.signed_consents FOR DELETE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));

CREATE TRIGGER set_signed_consents_updated_at BEFORE UPDATE ON public.signed_consents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
