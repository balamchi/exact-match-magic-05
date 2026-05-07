
-- ═══════════════════════════════════════════════════════════
-- CLINICAL DOCUMENTATION PACK — COMPREHENSIVE MIGRATION
-- ═══════════════════════════════════════════════════════════

-- ═══ ENUMS ═══
DO $$ BEGIN
  CREATE TYPE public.soap_note_status AS ENUM ('draft', 'finalized', 'amended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.treatment_plan_status AS ENUM ('proposed', 'accepted', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_session_status AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.photo_type AS ENUM ('before', 'after', 'progress', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_signature_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_audit_action AS ENUM ('created', 'sent', 'opened', 'viewed', 'signed', 'witness_signed', 'declined', 'revoked', 'downloaded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_actor_type AS ENUM ('clinic_staff', 'client', 'witness', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PART 1: SOAP NOTES
-- ═══════════════════════════════════════════════════════════

-- 1a. SOAP Templates
CREATE TABLE IF NOT EXISTS public.soap_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  subjective_template text NOT NULL DEFAULT '',
  objective_template text NOT NULL DEFAULT '',
  assessment_template text NOT NULL DEFAULT '',
  plan_template text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soap_templates_select" ON public.soap_templates FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "soap_templates_insert" ON public.soap_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "soap_templates_update" ON public.soap_templates FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "soap_templates_delete" ON public.soap_templates FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER tg_soap_templates_updated BEFORE UPDATE ON public.soap_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 1b. Rebuild soap_notes table
DROP TABLE IF EXISTS public.soap_notes CASCADE;

CREATE TABLE public.soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.soap_templates(id) ON DELETE SET NULL,
  provider_id uuid NOT NULL REFERENCES public.clinic_members(id) ON DELETE CASCADE,
  subjective text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT '',
  status public.soap_note_status NOT NULL DEFAULT 'draft',
  finalized_at timestamptz,
  finalized_by uuid REFERENCES public.clinic_members(id) ON DELETE SET NULL,
  amendment_reason text,
  amendment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soap_notes_select" ON public.soap_notes FOR SELECT TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "soap_notes_insert" ON public.soap_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "soap_notes_update" ON public.soap_notes FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "soap_notes_delete" ON public.soap_notes FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]) AND status = 'draft');

CREATE INDEX idx_soap_notes_clinic_client ON public.soap_notes(clinic_id, client_id, created_at DESC);
CREATE INDEX idx_soap_notes_clinic_appt ON public.soap_notes(clinic_id, appointment_id);
CREATE INDEX idx_soap_notes_clinic_provider ON public.soap_notes(clinic_id, provider_id);

CREATE TRIGGER tg_soap_notes_updated BEFORE UPDATE ON public.soap_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.soap_notes;


-- 1c. SOAP Note Amendments
CREATE TABLE public.soap_note_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.soap_notes(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  amended_by uuid NOT NULL REFERENCES public.clinic_members(id) ON DELETE CASCADE,
  amendment_reason text NOT NULL,
  previous_subjective text NOT NULL DEFAULT '',
  previous_objective text NOT NULL DEFAULT '',
  previous_assessment text NOT NULL DEFAULT '',
  previous_plan text NOT NULL DEFAULT '',
  new_subjective text NOT NULL DEFAULT '',
  new_objective text NOT NULL DEFAULT '',
  new_assessment text NOT NULL DEFAULT '',
  new_plan text NOT NULL DEFAULT '',
  amended_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_note_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amendments_select" ON public.soap_note_amendments FOR SELECT TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "amendments_insert" ON public.soap_note_amendments FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));

CREATE INDEX idx_amendments_note ON public.soap_note_amendments(note_id, amended_at DESC);


-- ═══════════════════════════════════════════════════════════
-- PART 2: TREATMENT PLANS
-- ═══════════════════════════════════════════════════════════

-- 2a. Treatment Plan Templates
CREATE TABLE IF NOT EXISTS public.treatment_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  default_session_count integer NOT NULL DEFAULT 1,
  default_session_interval_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_templates_select" ON public.treatment_plan_templates FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "tp_templates_insert" ON public.treatment_plan_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tp_templates_update" ON public.treatment_plan_templates FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tp_templates_delete" ON public.treatment_plan_templates FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER tg_tp_templates_updated BEFORE UPDATE ON public.treatment_plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 2b. Rebuild treatment_plans
DROP TABLE IF EXISTS public.treatment_plans CASCADE;

CREATE TABLE public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.treatment_plan_templates(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  provider_id uuid NOT NULL REFERENCES public.clinic_members(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  total_sessions_planned integer NOT NULL DEFAULT 1,
  sessions_completed integer NOT NULL DEFAULT 0,
  total_price_cents integer NOT NULL DEFAULT 0,
  paid_cents integer NOT NULL DEFAULT 0,
  status public.treatment_plan_status NOT NULL DEFAULT 'proposed',
  start_date date,
  end_date date,
  client_signed_at timestamptz,
  signature_data text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_select" ON public.treatment_plans FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "tp_insert" ON public.treatment_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tp_update" ON public.treatment_plans FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tp_delete" ON public.treatment_plans FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE INDEX idx_tp_clinic_client ON public.treatment_plans(clinic_id, client_id, status);
CREATE INDEX idx_tp_clinic_provider ON public.treatment_plans(clinic_id, provider_id);

CREATE TRIGGER tg_tp_updated BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 2c. Treatment Plan Sessions
CREATE TABLE public.treatment_plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1,
  scheduled_date date,
  completed_date date,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status public.plan_session_status NOT NULL DEFAULT 'scheduled',
  session_price_cents integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tps_select" ON public.treatment_plan_sessions FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "tps_insert" ON public.treatment_plan_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tps_update" ON public.treatment_plan_sessions FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tps_delete" ON public.treatment_plan_sessions FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE INDEX idx_tps_plan ON public.treatment_plan_sessions(plan_id, session_number);

CREATE TRIGGER tg_tps_updated BEFORE UPDATE ON public.treatment_plan_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 2d. Treatment Plan Photos
CREATE TABLE public.treatment_plan_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.treatment_plan_sessions(id) ON DELETE SET NULL,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type public.photo_type NOT NULL DEFAULT 'progress',
  taken_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT '',
  has_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_plan_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpp_select" ON public.treatment_plan_photos FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "tpp_insert" ON public.treatment_plan_photos FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider']::clinic_role[]));
CREATE POLICY "tpp_delete" ON public.treatment_plan_photos FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE INDEX idx_tpp_plan ON public.treatment_plan_photos(plan_id, taken_at DESC);


-- ═══════════════════════════════════════════════════════════
-- PART 3: CONSENT FORMS
-- ═══════════════════════════════════════════════════════════

-- 3a. Rebuild consent_forms → consent_form_templates
DROP TABLE IF EXISTS public.consent_forms CASCADE;

CREATE TABLE public.consent_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  body_html text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  requires_witness boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_legal_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cft_select" ON public.consent_form_templates FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "cft_insert" ON public.consent_form_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));
CREATE POLICY "cft_update" ON public.consent_form_templates FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));
CREATE POLICY "cft_delete" ON public.consent_form_templates FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]) AND is_legal_template = false);

CREATE TRIGGER tg_cft_updated BEFORE UPDATE ON public.consent_form_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 3b. Consent Form Signatures
CREATE TABLE public.consent_form_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.consent_form_templates(id) ON DELETE RESTRICT,
  template_version integer NOT NULL DEFAULT 1,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  signed_html_snapshot text NOT NULL DEFAULT '',
  signature_canvas_data text,
  signature_typed_name text,
  signature_checkbox_confirmed boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  signer_ip_address text,
  signer_user_agent text,
  signer_geolocation jsonb,
  device_fingerprint text,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  witness_name text,
  witness_signature_data text,
  witness_signed_at timestamptz,
  witness_relationship text,
  status public.consent_signature_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  declined_reason text,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.clinic_members(id) ON DELETE SET NULL,
  revocation_reason text,
  public_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_form_signatures ENABLE ROW LEVEL SECURITY;

-- Clinic staff can read/write
CREATE POLICY "cfs_select" ON public.consent_form_signatures FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "cfs_insert" ON public.consent_form_signatures FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider','front_desk']::clinic_role[]));
CREATE POLICY "cfs_update" ON public.consent_form_signatures FOR UPDATE TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

-- Anonymous access for public signing via public_token (handled via server route, not direct RLS)

CREATE INDEX idx_cfs_clinic_client ON public.consent_form_signatures(clinic_id, client_id);
CREATE INDEX idx_cfs_clinic_status ON public.consent_form_signatures(clinic_id, status);
CREATE INDEX idx_cfs_token ON public.consent_form_signatures(public_token);

CREATE TRIGGER tg_cfs_updated BEFORE UPDATE ON public.consent_form_signatures
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- 3c. Consent Form Audit Log
CREATE TABLE public.consent_form_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES public.consent_form_signatures(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  action public.consent_audit_action NOT NULL,
  actor_type public.consent_actor_type NOT NULL DEFAULT 'system',
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'System',
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_form_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfal_select" ON public.consent_form_audit_log FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "cfal_insert" ON public.consent_form_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE INDEX idx_cfal_sig ON public.consent_form_audit_log(signature_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('treatment-photos', 'treatment-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tp_photos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'treatment-photos');
CREATE POLICY "tp_photos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'treatment-photos');
CREATE POLICY "tp_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'treatment-photos');


-- ═══════════════════════════════════════════════════════════
-- SEED DATA: SOAP TEMPLATES (use a placeholder clinic_id — seeded per-clinic via app)
-- We insert these as "system" templates that the seed function will copy
-- ═══════════════════════════════════════════════════════════

-- We'll create a function to seed templates for a specific clinic
CREATE OR REPLACE FUNCTION public.seed_clinical_templates(p_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SOAP Templates
  INSERT INTO public.soap_templates (clinic_id, name, subjective_template, objective_template, assessment_template, plan_template, is_default)
  VALUES
  (p_clinic_id, 'Initial Consultation',
   E'Chief Complaint:\nHistory of Present Illness:\nPast Medical History:\nAllergies:\nCurrent Medications:\nSocial History:\nCosmetic Goals:',
   E'Vital Signs: BP ___ HR ___ \nGeneral Appearance:\nSkin Assessment (Fitzpatrick Type: __):\nFacial Analysis:\n  - Volume Loss:\n  - Rhytids:\n  - Skin Laxity:\n  - Pigmentation:\n  - Vascular:\nPhotographs: Taken ☐ Yes ☐ No',
   E'Assessment:\n1. \n2. \nContraindications Reviewed: ☐ None identified\nCandidate for: ☐ Neurotoxin ☐ Filler ☐ Laser ☐ Other',
   E'Treatment Plan:\n1. \nConsent: ☐ Obtained ☐ Deferred\nFollow-up: ☐ 2 weeks ☐ 4 weeks ☐ Other\nHome Care Instructions Provided: ☐ Yes',
   true),
  (p_clinic_id, 'Botox/Neurotoxin Injection',
   E'Chief Complaint: Patient presents for neurotoxin treatment.\nAreas of Concern:\nPrevious Treatments: ☐ First time ☐ Repeat (Last treatment date: ___)\nPrevious Adverse Reactions: ☐ None ☐ Yes (describe):\nPregnant/Nursing: ☐ No ☐ Yes\nGoals:',
   E'Treatment Areas & Units:\n  - Glabella: ___ units\n  - Forehead: ___ units\n  - Lateral Canthal Lines: ___ units L / ___ units R\n  - Other: ___ area ___ units\nProduct Used: ☐ Botox ☐ Dysport ☐ Xeomin ☐ Jeuveau\nLot #: ___  Expiry: ___\nTotal Units: ___\nInjection Sites Marked: ☐ Yes\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient is a candidate for neurotoxin injection.\nFitzpatrick Type: ___\nMuscle Assessment: ☐ Normal ☐ Asymmetry noted\nContraindications: ☐ None identified',
   E'Procedure: Neurotoxin injection performed per protocol.\nAnesthesia: ☐ None ☐ Topical ☐ Ice\nComplication During Procedure: ☐ None\nPost-Care Instructions: ☐ Provided verbally ☐ Written handout\n  - No lying down for 4 hours\n  - No vigorous exercise for 24 hours\n  - No facial massage for 24 hours\nFollow-up: 2 weeks for assessment\nNext Treatment: ~3-4 months',
   false),
  (p_clinic_id, 'Dermal Filler Injection',
   E'Chief Complaint: Patient presents for dermal filler treatment.\nAreas of Concern:\nPrevious Filler History: ☐ None ☐ Yes (product/area/date):\nAllergies (esp. lidocaine): ☐ None ☐ Yes:\nAnticoagulant Use: ☐ No ☐ Yes (specify):\nDental Procedures (recent/planned): ☐ No ☐ Yes:',
   E'Treatment Areas & Volume:\n  - Nasolabial Folds: ___ mL L / ___ mL R\n  - Cheeks/Midface: ___ mL L / ___ mL R\n  - Lips: ___ mL\n  - Chin: ___ mL\n  - Jawline: ___ mL L / ___ mL R\n  - Under-eye: ___ mL L / ___ mL R\n  - Other: ___\nProduct Used: ___ (brand/type)\nLot #: ___  Expiry: ___\nTotal Volume: ___ mL\nTechnique: ☐ Needle ☐ Cannula ☐ Both\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient is a candidate for dermal filler augmentation.\nFacial Analysis:\n  - Volume Deficit: ☐ Mild ☐ Moderate ☐ Severe\n  - Asymmetry: ☐ None ☐ Present\nVascular Anatomy Review: ☐ Completed\nContraindications: ☐ None identified',
   E'Procedure: Dermal filler injection performed.\nAnesthesia: ☐ Topical ☐ Dental block ☐ Product contains lidocaine\nAspiration (if needle): ☐ Performed ☐ N/A\nComplication: ☐ None ☐ Bruising ☐ Swelling ☐ Other\nEmergency Kit Available: ☐ Yes (Hyaluronidase)\nPost-Care Instructions Provided:\n  - Ice as needed\n  - Avoid heat/exercise 24-48h\n  - Sleep elevated first night\n  - Report any blanching, severe pain, or vision changes IMMEDIATELY\nFollow-up: 2 weeks\nNext Treatment: ___',
   false),
  (p_clinic_id, 'Laser Hair Removal',
   E'Chief Complaint: Patient presents for laser hair removal.\nTreatment Area(s):\nSession Number: ___ of ___\nSkin Reaction to Previous Session: ☐ None ☐ Mild erythema ☐ Other:\nSun Exposure Since Last Session: ☐ None ☐ Yes\nSelf-Tanner/Spray Tan: ☐ No ☐ Yes\nPhotosensitizing Medications: ☐ No ☐ Yes:',
   E'Fitzpatrick Type: ___\nHair Color: ☐ Black ☐ Dark Brown ☐ Light Brown ☐ Red ☐ Blonde ☐ Grey\nHair Density: ☐ Dense ☐ Moderate ☐ Sparse\nSkin Condition: ☐ Clear ☐ Tanned ☐ Lesions present\nDevice: ___\nSettings:\n  - Wavelength: ___ nm\n  - Fluence: ___ J/cm²\n  - Pulse Width: ___ ms\n  - Spot Size: ___ mm\n  - Cooling: ☐ Yes ☐ No\nTotal Pulses: ___\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient responding appropriately to treatment.\nHair Reduction Estimate: ___% since baseline\nSkin Tolerance: ☐ Good ☐ Fair\nContraindications: ☐ None identified',
   E'Procedure: Laser hair removal performed per protocol.\nEndpoint Achieved: ☐ Perifollicular edema ☐ Mild erythema\nImmediate Skin Response: ☐ Normal\nPost-Care:\n  - Avoid sun exposure 4-6 weeks\n  - Apply SPF 30+ daily\n  - No hot baths/saunas 48h\n  - Aloe vera as needed\nNext Session: ___ weeks\nRemaining Sessions: ___',
   false),
  (p_clinic_id, 'Laser Skin Resurfacing',
   E'Chief Complaint: Patient presents for laser skin resurfacing.\nConcerns: ☐ Fine lines ☐ Wrinkles ☐ Acne scars ☐ Pigmentation ☐ Texture ☐ Other:\nPrevious Laser History:\nRetinoid Use: ☐ Discontinued ___ weeks ago ☐ Not applicable\nHistory of HSV: ☐ No ☐ Yes (antiviral prescribed: ☐ Yes)\nHistory of Keloid/Hypertrophic Scarring: ☐ No ☐ Yes',
   E'Fitzpatrick Type: ___\nSkin Condition: ☐ Clear ☐ Active lesions\nTreatment Area: ☐ Full face ☐ Perioral ☐ Periorbital ☐ Other:\nDevice: ___\nSettings:\n  - Energy: ___ mJ\n  - Density: ___\n  - Passes: ___\n  - Pattern: ___\nAnesthesia: ☐ Topical (applied ___ min prior) ☐ Nerve block\nPhotographs: ☐ Pre ☐ Immediately Post',
   E'Assessment: Patient is a candidate for laser skin resurfacing.\nSkin Quality: ☐ Good ☐ Fair ☐ Compromised\nExpected Downtime: ___ days\nRisk Factors: ☐ PIH ☐ Scarring ☐ Infection',
   E'Procedure: Laser resurfacing performed per protocol.\nEndpoint: ☐ Appropriate tissue response achieved\nImmediate Post-Procedure:\n  - ☐ Petrolatum applied\n  - ☐ Cooling mask applied\nPrescriptions: ☐ Antiviral ☐ Antibiotic ☐ Other:\nPost-Care Instructions:\n  - Keep treated area moist\n  - No picking/scratching\n  - Strict sun avoidance\n  - Follow-up: 1 week\nNext Treatment (if series): ___',
   false),
  (p_clinic_id, 'Microneedling/PRP',
   E'Chief Complaint: Patient presents for microneedling ☐ with PRP ☐ without PRP.\nConcerns: ☐ Fine lines ☐ Acne scars ☐ Pore size ☐ Texture ☐ Hair loss ☐ Other:\nSession Number: ___ of ___\nActive Acne/Infection: ☐ No ☐ Yes\nBlood Thinners: ☐ No ☐ Yes:\nActive Cold Sore: ☐ No ☐ Yes',
   E'Fitzpatrick Type: ___\nTreatment Area: ☐ Full face ☐ Neck ☐ Décolletage ☐ Scalp ☐ Other:\nDevice: ___\nNeedle Depth: ___ mm (forehead) / ___ mm (cheeks) / ___ mm (other)\nPasses: ___\nPRP Prepared: ☐ Yes (Volume: ___ mL) ☐ No\nSerum Applied: ___\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient responding well to microneedling protocol.\nSkin Improvement: ☐ Improved ☐ Stable ☐ Needs reassessment\nContraindications: ☐ None identified',
   E'Procedure: Microneedling performed per protocol.\nPRP Application: ☐ During ☐ Post ☐ N/A\nImmediate Response: ☐ Pinpoint bleeding ☐ Erythema ☐ Expected\nPost-Care:\n  - No makeup 24 hours\n  - No active skincare (retinol, AHA/BHA) 5-7 days\n  - SPF 30+ daily\n  - Gentle cleanser only\nNext Session: ___ weeks',
   false),
  (p_clinic_id, 'Chemical Peel',
   E'Chief Complaint: Patient presents for chemical peel.\nConcerns: ☐ Acne ☐ Pigmentation ☐ Fine lines ☐ Texture ☐ Other:\nPeel Depth Requested: ☐ Superficial ☐ Medium ☐ Deep\nPrevious Peels: ☐ None ☐ Yes (type/date):\nRetinoid Prep: ☐ Yes ___ weeks ☐ No\nHistory of HSV: ☐ No ☐ Yes',
   E'Fitzpatrick Type: ___\nSkin Condition: ☐ Clear ☐ Active lesions\nTreatment Area: ☐ Full face ☐ Neck ☐ Hands ☐ Other:\nPeel Agent: ___\nConcentration: ___%\nLayers Applied: ___\nContact Time: ___ minutes\nNeutralized: ☐ Yes ☐ Self-neutralizing\nFrosting Level: ☐ None ☐ Level 1 ☐ Level 2 ☐ Level 3\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient is a candidate for chemical peel.\nSkin Sensitivity: ☐ Normal ☐ Sensitive\nExpected Peeling: ☐ Minimal ☐ Moderate ☐ Significant\nRisk of PIH: ☐ Low ☐ Moderate ☐ High',
   E'Procedure: Chemical peel performed per protocol.\nPatient Tolerance: ☐ Good ☐ Moderate ☐ Requested early termination\nPost-Care:\n  - No exfoliation or picking at peeling skin\n  - Gentle moisturizer\n  - Strict SPF 30+\n  - No retinoids for ___ days\nFollow-up: ___ days\nNext Peel: ___ weeks',
   false),
  (p_clinic_id, 'HydraFacial / Medical Facial',
   E'Chief Complaint: Patient presents for HydraFacial/medical facial.\nSkin Concerns: ☐ Congestion ☐ Dullness ☐ Fine lines ☐ Hydration ☐ Acne ☐ Other:\nSensitivities: ☐ None ☐ Yes:\nCurrent Skincare Routine:',
   E'Fitzpatrick Type: ___\nSkin Type: ☐ Normal ☐ Oily ☐ Dry ☐ Combination ☐ Sensitive\nSkin Condition: ☐ Clear ☐ Congested ☐ Dehydrated ☐ Inflamed\nTreatment Protocol:\n  - Cleanse & Peel: ☐ Completed\n  - Extract & Hydrate: ☐ Completed\n  - Fuse & Protect: ☐ Completed\nBoosters Used: ___\nLED: ☐ Yes (color: ___) ☐ No\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Skin responding well to treatment protocol.\nExtractions: ☐ Minimal ☐ Moderate ☐ Significant\nSkin Hydration Post: ☐ Improved',
   E'Procedure: HydraFacial/medical facial performed.\nProducts Applied: ___\nSPF Applied: ☐ Yes\nHome Care Recommendations:\nNext Treatment: ___ weeks',
   false),
  (p_clinic_id, 'IPL Photofacial',
   E'Chief Complaint: Patient presents for IPL treatment.\nConcerns: ☐ Sun damage ☐ Rosacea ☐ Pigmentation ☐ Vascular lesions ☐ Other:\nSession Number: ___ of ___\nSun Exposure: ☐ None recent ☐ Yes\nPhotosensitizing Meds: ☐ No ☐ Yes:',
   E'Fitzpatrick Type: ___\nTarget Lesions: ☐ Lentigines ☐ Telangiectasia ☐ Diffuse redness ☐ Other:\nTreatment Area: ☐ Full face ☐ Neck ☐ Chest ☐ Hands\nDevice: ___\nFilter/Wavelength: ___ nm\nFluence: ___ J/cm²\nPulse Width: ___ ms\nPasses: ___\nTotal Pulses: ___\nPhotographs: ☐ Pre ☐ Post',
   E'Assessment: Patient responding to IPL protocol.\nPigment Response: ☐ Darkening (expected) ☐ Clearing ☐ No change\nVascular Response: ☐ Clearing ☐ Reduced ☐ No change\nContraindications: ☐ None',
   E'Procedure: IPL performed per protocol.\nEndpoint: ☐ Mild erythema ☐ Pepper spots (pigment darkening)\nPost-Care:\n  - SPF 30+ daily (strict)\n  - No sun exposure 4 weeks\n  - Darkened spots will flake off in 7-14 days\n  - Do not pick\nNext Session: ___ weeks',
   false),
  (p_clinic_id, 'Body Contouring',
   E'Chief Complaint: Patient presents for body contouring.\nTarget Area(s): ☐ Abdomen ☐ Flanks ☐ Thighs ☐ Arms ☐ Chin ☐ Other:\nPrevious Body Contouring: ☐ None ☐ Yes (type/date):\nBMI: ___\nWeight Stable: ☐ Yes ☐ No\nPregnancy Planned: ☐ No ☐ Yes',
   E'Treatment Area Measurements:\n  - Area 1: ___ cm\n  - Area 2: ___ cm\nPinch Test: ___ cm\nDevice: ☐ CoolSculpting ☐ SculpSure ☐ Other: ___\nApplicator(s): ___\nTreatment Time: ___ minutes per area\nTemperature/Settings: ___\nPhotographs: ☐ Pre (standing, front, side, back)',
   E'Assessment: Patient is a candidate for non-invasive body contouring.\nFat Distribution: ☐ Subcutaneous (pinchable) ☐ Visceral (not candidate)\nSkin Laxity: ☐ Good ☐ Moderate ☐ Poor (counsel re: expectations)\nExpected Results: ☐ 20-25% fat reduction per session',
   E'Procedure: Body contouring treatment performed.\nPatient Tolerance: ☐ Good ☐ Discomfort managed\nPost-Treatment Massage: ☐ Performed (2 minutes)\nPost-Care:\n  - Mild swelling, redness, numbness expected\n  - Resume normal activity immediately\n  - Stay hydrated\n  - Maintain stable weight\nResults Timeline: 8-12 weeks\nNext Session (if planned): ___ weeks\nFollow-up Assessment: 8 weeks',
   false),
  (p_clinic_id, 'Tattoo Removal',
   E'Chief Complaint: Patient presents for laser tattoo removal.\nTattoo Location: ___\nTattoo Age: ___ years\nTattoo Colors: ☐ Black ☐ Blue ☐ Green ☐ Red ☐ Yellow ☐ White ☐ Other:\nProfessional/Amateur: ☐ Professional ☐ Amateur\nSession Number: ___ of estimated ___\nPrevious Treatment Response: ☐ Fading ☐ Minimal change ☐ First session',
   E'Fitzpatrick Type: ___\nTattoo Assessment:\n  - Size: ___ cm × ___ cm\n  - Ink Density: ☐ Dense ☐ Moderate ☐ Light\n  - Fading Since Last Session: ___% estimated\nDevice: ___\nWavelength(s): ___ nm\nFluence: ___ J/cm²\nSpot Size: ___ mm\nRepetition Rate: ___ Hz\nPasses: ___\nPhotographs: ☐ Pre ☐ Immediately Post',
   E'Assessment: Tattoo responding to treatment.\nKirby-Desai Score: ___\nEstimated Remaining Sessions: ___\nSkin Response: ☐ Normal ☐ Scarring risk ☐ PIH/hypopigmentation',
   E'Procedure: Laser tattoo removal performed.\nEndpoint: ☐ Whitening/frosting achieved ☐ Pinpoint bleeding\nPost-Care:\n  - Keep treated area clean and dry\n  - Apply antibiotic ointment + bandage 3 days\n  - No sun exposure on treated area\n  - Blistering is normal — do not pop\n  - Report signs of infection\nNext Session: 6-8 weeks minimum',
   false),
  (p_clinic_id, 'Microblading/Permanent Makeup',
   E'Chief Complaint: Patient presents for microblading/permanent makeup.\nArea: ☐ Eyebrows ☐ Eyeliner ☐ Lips ☐ Other:\nDesired Outcome:\nPrevious PMU: ☐ None ☐ Yes (when/where):\nAllergies (esp. pigment/dyes): ☐ None ☐ Yes:\nAutoimmune Conditions: ☐ No ☐ Yes:\nBlood Thinners: ☐ No ☐ Yes:\nPregnant/Nursing: ☐ No',
   E'Skin Assessment:\n  - Fitzpatrick Type: ___\n  - Skin Condition at Treatment Area: ☐ Normal ☐ Oily ☐ Scarred\nColor Selection: ___\nShape Design: ☐ Mapped & approved by client\nNumbing Applied: ☐ Yes (product: ___, duration: ___ min)\nTechnique: ☐ Microblading ☐ Machine ☐ Combination\nNeedle Configuration: ___\nPigment Brand/Lot: ___\nPhotographs: ☐ Pre ☐ During (mapping) ☐ Post',
   E'Assessment: Patient is a candidate for permanent makeup.\nSkin Retention Expected: ☐ Good ☐ May need extra session (oily skin)\nSymmetry Check: ☐ Approved by client before pigment\nContraindications: ☐ None identified',
   E'Procedure: Microblading/PMU performed.\nProcedure Duration: ___ minutes\nClient Satisfaction with Result: ☐ Yes ☐ Touch-up needed\nPost-Care:\n  - Keep dry 10 days\n  - No makeup on area 10 days\n  - No swimming/sauna 14 days\n  - Apply aftercare balm as directed\n  - Color will fade 30-50% during healing\n  - Touch-up appointment: 6-8 weeks',
   false)
  ON CONFLICT DO NOTHING;

  -- Treatment Plan Templates
  INSERT INTO public.treatment_plan_templates (clinic_id, name, description, default_session_count, default_session_interval_days)
  VALUES
  (p_clinic_id, 'Laser Hair Removal - Full Body', 'Complete full body laser hair removal series for optimal hair reduction.', 6, 30),
  (p_clinic_id, 'Laser Hair Removal - Face', 'Facial laser hair removal series targeting upper lip, chin, sideburns.', 6, 21),
  (p_clinic_id, 'Botox - Maintenance Plan', 'Annual neurotoxin maintenance plan with quarterly treatments.', 4, 90),
  (p_clinic_id, 'Filler - Full Face Refresh', 'Comprehensive facial volume restoration with hyaluronic acid fillers.', 3, 30),
  (p_clinic_id, 'Microneedling - Skin Renewal', 'Collagen induction therapy series for skin texture and tone improvement.', 6, 21),
  (p_clinic_id, 'Chemical Peel Series', 'Progressive chemical peel program for skin resurfacing and rejuvenation.', 6, 14),
  (p_clinic_id, 'PRP Hair Restoration', 'Platelet-rich plasma injection series for hair regrowth stimulation.', 4, 30),
  (p_clinic_id, 'CoolSculpting - Body Contour', 'Non-invasive fat reduction program for targeted body contouring.', 3, 60),
  (p_clinic_id, 'IPL Photofacial Series', 'Intense pulsed light treatment series for sun damage and rosacea.', 4, 21),
  (p_clinic_id, 'Tattoo Removal Program', 'Complete tattoo removal with Q-switched/pico laser technology.', 10, 45),
  (p_clinic_id, 'HydraFacial Membership', 'Monthly HydraFacial treatments for ongoing skin health maintenance.', 12, 30),
  (p_clinic_id, 'Acne Treatment Program', 'Comprehensive acne treatment combining peels, LED, and medical skincare.', 8, 14)
  ON CONFLICT DO NOTHING;

  -- Consent Form Templates
  INSERT INTO public.consent_form_templates (clinic_id, name, body_html, is_legal_template, requires_witness)
  VALUES
  (p_clinic_id, 'General Treatment Consent',
   '<h2>General Informed Consent for Treatment</h2><p>I, the undersigned, hereby consent to the cosmetic/aesthetic treatment(s) recommended by my provider. I understand the following:</p><h3>Nature of Treatment</h3><p>The specific treatment, its purpose, expected benefits, and alternatives have been explained to me by my provider.</p><h3>Risks and Complications</h3><p>I understand that all medical and aesthetic procedures carry risks including but not limited to: pain, swelling, bruising, infection, scarring, allergic reaction, unsatisfactory results, and the need for additional treatments. Rare but serious complications may include nerve damage, tissue necrosis, or embolism.</p><h3>No Guarantee of Results</h3><p>I understand that no guarantee has been made regarding the outcome of my treatment. Results vary based on individual factors including skin type, age, health status, and adherence to pre/post care instructions.</p><h3>Alternative Treatments</h3><p>Alternative treatment options, including the option of no treatment, have been explained to me.</p><h3>Photography</h3><p>I consent to clinical photographs being taken before, during, and after treatment for my medical record.</p><h3>Financial Responsibility</h3><p>I understand and accept financial responsibility for this treatment and any follow-up care required.</p><h3>Patient Acknowledgment</h3><p>I have read and understand this consent form. I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I voluntarily consent to the proposed treatment.</p>',
   true, false),
  (p_clinic_id, 'Botox/Neurotoxin Informed Consent',
   '<h2>Informed Consent for Botulinum Toxin Injection</h2><h3>Product Information</h3><p>Botulinum toxin (Botox®, Dysport®, Xeomin®, Jeuveau®) is a purified protein that temporarily reduces muscle activity by blocking nerve signals. It is FDA-approved for cosmetic use in treating moderate to severe facial lines and wrinkles.</p><h3>Procedure Description</h3><p>Small amounts of botulinum toxin will be injected into targeted facial muscles using a fine needle. The procedure typically takes 10-20 minutes. Results typically appear within 3-7 days and last 3-4 months on average.</p><h3>Risks and Potential Complications</h3><ul><li>Pain, swelling, redness, or bruising at injection sites</li><li>Headache (usually transient)</li><li>Temporary eyelid or eyebrow drooping (ptosis) — occurs in 1-5% of cases</li><li>Asymmetry requiring touch-up</li><li>Flu-like symptoms</li><li>Allergic reaction (rare)</li><li>Resistance to treatment with repeated use (rare)</li><li>Spread of toxin beyond injection site causing muscle weakness, difficulty swallowing, or breathing problems (very rare)</li></ul><h3>Contraindications</h3><p>This treatment should NOT be performed if you: are pregnant or breastfeeding; have a neuromuscular disease (e.g., myasthenia gravis, ALS); have an infection at the treatment site; are allergic to any botulinum toxin product or its ingredients; are taking aminoglycoside antibiotics.</p><h3>Pre-Treatment Instructions</h3><p>Avoid blood thinners (aspirin, ibuprofen, fish oil, vitamin E) for 7 days prior. Avoid alcohol for 24 hours prior.</p><h3>Post-Treatment Instructions</h3><p>Do not lie down for 4 hours. Avoid vigorous exercise for 24 hours. Do not massage treated areas. Do not consume excessive alcohol for 24 hours. Contact the clinic immediately if you experience difficulty swallowing, speaking, or breathing.</p><h3>Patient Acknowledgment</h3><p>I confirm that I have disclosed my complete medical history, including all medications and supplements. I understand the risks, benefits, and alternatives. I consent to the proposed treatment.</p>',
   true, false),
  (p_clinic_id, 'Dermal Filler Informed Consent',
   '<h2>Informed Consent for Dermal Filler Injection</h2><h3>Product Information</h3><p>Dermal fillers are injectable gel substances (typically hyaluronic acid) used to restore volume, smooth wrinkles, and enhance facial contours. Results are immediate and typically last 6-18 months depending on the product and treatment area.</p><h3>Procedure Description</h3><p>Filler will be injected into targeted areas using a needle or cannula. Local anesthesia (topical cream or dental block) may be applied. Treatment time varies from 15-60 minutes depending on areas treated.</p><h3>Risks and Potential Complications</h3><ul><li>Swelling, bruising, redness, tenderness (common, resolves in 1-2 weeks)</li><li>Asymmetry or irregularity (may require touch-up or dissolving)</li><li>Nodules or lumps (can often be massaged smooth)</li><li>Infection (rare)</li><li>Migration of filler from injection site</li><li>Allergic or hypersensitivity reaction</li><li><strong>Vascular occlusion</strong> — filler injected into or compressing a blood vessel can cause tissue death (necrosis) or, in extremely rare cases, <strong>blindness</strong>. This is a medical emergency.</li><li>Granuloma formation (rare delayed reaction)</li><li>Biofilm formation requiring antibiotic treatment</li></ul><h3>Emergency Protocol</h3><p>This clinic maintains hyaluronidase (Hylenex®) on-site to dissolve hyaluronic acid filler in the event of vascular compromise. If you experience severe pain, blanching (white skin), or any vision changes during or after treatment, notify your provider <strong>immediately</strong>.</p><h3>Contraindications</h3><p>Do not proceed if you: are pregnant or breastfeeding; have active skin infection or inflammation at treatment site; have autoimmune disease affecting skin; have known allergy to hyaluronic acid or lidocaine; have permanent filler in the treatment area.</p><h3>Post-Treatment Care</h3><p>Apply ice as needed. Avoid excessive heat, exercise, and alcohol for 24-48 hours. Sleep with head elevated the first night. Do not massage unless instructed. Report any unusual pain, color changes, or vision issues immediately.</p><h3>Patient Acknowledgment</h3><p>I understand the risks including the rare but serious risk of vascular occlusion. I consent to the proposed treatment.</p>',
   true, false),
  (p_clinic_id, 'Laser Hair Removal Consent',
   '<h2>Informed Consent for Laser Hair Removal</h2><h3>Procedure Description</h3><p>Laser hair removal uses concentrated light energy to target and destroy hair follicles, resulting in permanent hair reduction. Multiple sessions (typically 6-8) are required as hair grows in cycles and the laser only affects actively growing hair.</p><h3>Expected Results</h3><p>Most patients achieve 70-90% permanent hair reduction after completing a full series. Some maintenance treatments may be needed. Results vary based on hair color, skin type, hormonal factors, and treatment area.</p><h3>Risks and Potential Complications</h3><ul><li>Pain or discomfort during treatment (managed with cooling)</li><li>Redness, swelling, and perifollicular edema (expected, resolves in hours to days)</li><li>Burns or blistering (uncommon with proper settings)</li><li>Hyperpigmentation or hypopigmentation (usually temporary)</li><li>Scarring (very rare)</li><li>Paradoxical hypertrichosis — increased hair growth (rare, more common on face/neck)</li><li>Eye injury if protective eyewear is not worn</li></ul><h3>Contraindications</h3><p>Treatment should be postponed if you: have active tan or recent sun exposure; are using photosensitizing medications (Accutane, tetracyclines); have active infection or open wounds in treatment area; are pregnant.</p><h3>Pre-Treatment Requirements</h3><p>Shave treatment area 24 hours prior. No waxing, plucking, or electrolysis for 4-6 weeks. Avoid sun exposure and self-tanners for 4 weeks. Discontinue retinoids 1 week prior.</p><h3>Post-Treatment Care</h3><p>Apply SPF 30+ daily. Avoid sun exposure 4-6 weeks. No hot baths, saunas, or vigorous exercise 48 hours. Apply aloe vera or cooling gel as needed.</p>',
   true, false),
  (p_clinic_id, 'Laser Skin Resurfacing Consent',
   '<h2>Informed Consent for Laser Skin Resurfacing</h2><h3>Procedure Description</h3><p>Laser skin resurfacing uses concentrated laser energy to remove damaged skin layers and stimulate collagen production. This improves skin texture, reduces wrinkles, scars, and pigmentation. Recovery varies from 3-14 days depending on treatment intensity.</p><h3>Risks and Complications</h3><ul><li>Prolonged redness (weeks to months)</li><li>Swelling and oozing (3-7 days)</li><li>Post-inflammatory hyperpigmentation (higher risk in darker skin)</li><li>Infection (bacterial, viral — HSV reactivation)</li><li>Scarring (rare)</li><li>Delayed healing</li><li>Demarcation lines at treatment borders</li><li>Ectropion — eyelid malposition (periorbital treatment)</li><li>Acneiform eruption</li></ul><h3>Required Pre-Treatment</h3><p>Antiviral prophylaxis will be prescribed if you have any history of cold sores. Retinoids must be discontinued 2-4 weeks prior. Hydroquinone may be prescribed for higher Fitzpatrick types.</p><h3>Post-Treatment Care</h3><p>Keep treated skin moist at all times. Do not pick, scratch, or peel skin. Strict sun avoidance for 3-6 months. Follow the specific post-care protocol provided.</p>',
   true, false),
  (p_clinic_id, 'Microneedling/PRP Consent',
   '<h2>Informed Consent for Microneedling with Optional PRP</h2><h3>Procedure Description</h3><p>Microneedling uses fine needles to create controlled micro-injuries in the skin, stimulating natural collagen and elastin production. When combined with Platelet-Rich Plasma (PRP), your own concentrated blood platelets are applied to enhance healing and results.</p><h3>PRP Component</h3><p>If PRP is included: a small volume of blood will be drawn from your arm, processed in a centrifuge to concentrate platelets, and applied to your skin during the microneedling procedure.</p><h3>Risks and Complications</h3><ul><li>Redness, swelling, and pinpoint bleeding (expected, resolves 24-72 hours)</li><li>Dryness, peeling, and skin sensitivity (3-7 days)</li><li>Bruising (especially with PRP blood draw)</li><li>Infection (rare, if post-care not followed)</li><li>Post-inflammatory hyperpigmentation</li><li>Scarring (very rare)</li><li>Cold sore reactivation (HSV carriers)</li><li>Allergic reaction to applied serums</li></ul><h3>Contraindications</h3><p>Active acne or rosacea flare; active skin infection or open wounds; keloid history; blood disorders or anticoagulant use; pregnancy; isotretinoin use within 6 months; active cold sore.</p>',
   true, false),
  (p_clinic_id, 'Chemical Peel Consent',
   '<h2>Informed Consent for Chemical Peel</h2><h3>Procedure Description</h3><p>A chemical peel applies a chemical solution to the skin to remove damaged outer layers, revealing smoother, more even-toned skin beneath. Peels are categorized as superficial, medium, or deep based on the depth of skin penetration.</p><h3>Risks and Complications</h3><ul><li>Redness, stinging, and sensitivity (expected)</li><li>Peeling and flaking (2-7 days depending on depth)</li><li>Hyperpigmentation or hypopigmentation</li><li>Scarring (rare, more common with deeper peels)</li><li>Infection</li><li>Cold sore reactivation</li><li>Allergic reaction to peel solution</li><li>Persistent redness (deep peels)</li></ul><h3>Post-Treatment Care</h3><p>Do not pick or peel skin prematurely. Use gentle moisturizer. Strict SPF 30+ for 4-6 weeks minimum. Avoid active ingredients (retinol, AHA/BHA, vitamin C) until skin is fully healed. Avoid excessive heat and sweating 48 hours.</p>',
   true, false),
  (p_clinic_id, 'IPL Photofacial Consent',
   '<h2>Informed Consent for Intense Pulsed Light (IPL) Treatment</h2><h3>Procedure Description</h3><p>IPL uses broad-spectrum light to target pigmentation (sun spots, age spots) and vascular lesions (redness, broken capillaries, rosacea). Multiple sessions are typically recommended for optimal results.</p><h3>Expected Response</h3><p>Pigmented spots will darken initially (3-7 days) then flake off naturally. Vascular lesions may initially appear more prominent before fading. Full results visible 2-4 weeks post-treatment.</p><h3>Risks and Complications</h3><ul><li>Mild pain or snapping sensation during treatment</li><li>Redness, swelling (hours to days)</li><li>Darkening of pigmented spots (expected and desired)</li><li>Blistering or crusting (uncommon)</li><li>Hyperpigmentation or hypopigmentation</li><li>Burns (rare with proper settings)</li><li>Scarring (very rare)</li><li>Eye damage if protective eyewear removed</li></ul><h3>Contraindications</h3><p>Active tan or recent sun exposure; pregnancy; photosensitizing medications; active skin infection; history of seizures triggered by light.</p>',
   true, false),
  (p_clinic_id, 'Body Contouring Consent',
   '<h2>Informed Consent for Non-Invasive Body Contouring</h2><h3>Procedure Description</h3><p>Non-invasive body contouring (CoolSculpting®, SculpSure®, or similar) uses controlled cooling or heating to permanently destroy fat cells in targeted areas. Dead fat cells are naturally eliminated by the body over 8-12 weeks.</p><h3>Expected Results</h3><p>Each treatment typically results in 20-25% fat reduction in the treated area. Results are gradual and become visible 4-12 weeks post-treatment. Multiple sessions may be recommended.</p><h3>Risks and Complications</h3><ul><li>Temporary numbness, tingling, or stinging</li><li>Redness, swelling, and bruising</li><li>Cramping or aching in treated area</li><li>Paradoxical adipose hyperplasia (PAH) — increase in fat volume (rare, ~0.05%)</li><li>Delayed onset pain</li><li>Skin sensitivity changes</li><li>Uneven results or contour irregularity</li></ul><h3>Important Limitations</h3><p>This is NOT a weight loss treatment. Best results for patients within 30 lbs of ideal weight with pinchable subcutaneous fat. Not effective for visceral (internal) fat. Weight gain after treatment can diminish results.</p>',
   true, false),
  (p_clinic_id, 'Tattoo Removal Consent',
   '<h2>Informed Consent for Laser Tattoo Removal</h2><h3>Procedure Description</h3><p>Laser tattoo removal uses high-intensity laser pulses to fragment tattoo ink particles, which are then cleared by the body''s immune system. Multiple sessions (typically 6-12+) are required, spaced 6-8 weeks apart.</p><h3>Expected Results</h3><p>Complete removal is not guaranteed. Professional tattoos typically require more sessions than amateur tattoos. Certain colors (green, yellow, white) are more resistant to treatment. Residual shadowing or ghost images may persist.</p><h3>Risks and Complications</h3><ul><li>Pain during treatment (often described as rubber band snapping)</li><li>Blistering, crusting, and scabbing (common)</li><li>Hypopigmentation or hyperpigmentation</li><li>Scarring (including textural changes)</li><li>Infection</li><li>Incomplete removal</li><li>Allergic reaction to fragmented ink particles</li><li>Paradoxical ink darkening (especially white, pink, or flesh-toned inks)</li></ul>',
   true, false),
  (p_clinic_id, 'Photography & Media Release',
   '<h2>Photography and Media Release Authorization</h2><h3>Purpose</h3><p>This authorization grants permission for clinical photographs and/or video recordings to be used for purposes beyond your medical record.</p><h3>Authorized Uses</h3><p>I authorize the use of my before/after photographs and/or videos for the following purposes (check all that apply):</p><ul><li>☐ Medical education and training</li><li>☐ Marketing materials (website, social media, print)</li><li>☐ Scientific presentations and publications</li><li>☐ Patient consultation (showing prospective patients examples)</li></ul><h3>Privacy Protections</h3><p>I understand that: my name will not be associated with any published images unless I provide separate written consent; my face may be cropped or obscured in marketing materials unless full-face consent is given; I may revoke this consent at any time in writing, although images already published cannot always be recalled.</p><h3>Duration</h3><p>This release remains in effect until revoked in writing by the patient.</p><h3>Compensation</h3><p>I understand that I will not receive compensation for the use of my photographs or videos.</p>',
   true, false),
  (p_clinic_id, 'HIPAA / Privacy Authorization',
   '<h2>Notice of Privacy Practices — Patient Acknowledgment</h2><h3>Your Health Information Rights</h3><p>You have the right to: request restrictions on certain uses of your health information; receive confidential communications; inspect and copy your health information; request amendments to your health information; receive an accounting of disclosures; obtain a paper copy of this notice.</p><h3>Our Responsibilities</h3><p>We are required to: maintain the privacy of your health information; provide you with this notice of our legal duties and privacy practices; notify you if we cannot agree to a requested restriction; accommodate reasonable requests for confidential communications.</p><h3>How We May Use Your Information</h3><p>We may use and disclose your protected health information for: treatment (coordinating your care with other providers); payment (submitting claims to insurance); healthcare operations (quality assurance, staff training); appointment reminders and health-related communications.</p><h3>Special Protections</h3><p>Certain categories of information receive additional protection: psychotherapy notes; substance abuse treatment records; HIV/AIDS information; genetic information.</p><h3>Patient Acknowledgment</h3><p>I acknowledge that I have received a copy of this clinic''s Notice of Privacy Practices. I understand that this clinic may use and disclose my protected health information as described in the notice.</p>',
   true, false),
  (p_clinic_id, 'Financial Responsibility Agreement',
   '<h2>Financial Responsibility Agreement</h2><h3>Payment Terms</h3><p>Payment is due at the time of service unless prior arrangements have been made. We accept cash, credit cards, debit cards, and approved financing plans.</p><h3>Insurance</h3><p>Most cosmetic and aesthetic procedures are not covered by medical insurance. If your treatment may be covered by insurance, we will attempt to verify benefits, but coverage is not guaranteed. You are responsible for any amounts not paid by your insurance.</p><h3>Cancellation and No-Show Policy</h3><p>We require 24-48 hours notice for cancellations or rescheduling. Late cancellations (less than 24 hours) may be subject to a cancellation fee. Repeated no-shows may result in a required deposit for future appointments.</p><h3>Refund Policy</h3><p>Refunds are generally not provided for completed treatments. Package or prepaid services may be refunded on a prorated basis for unused sessions, minus any discount received. Products may be returned within 14 days if unopened and in original condition.</p><h3>Collections</h3><p>Unpaid balances may be referred to a collection agency after 90 days. You agree to pay any collection costs or legal fees incurred.</p><h3>Patient Acknowledgment</h3><p>I have read, understand, and agree to the financial policies described above. I accept financial responsibility for all services rendered.</p>',
   true, false),
  (p_clinic_id, 'Cancellation Policy Acknowledgment',
   '<h2>Appointment Cancellation & No-Show Policy</h2><h3>Cancellation Notice</h3><p>We respectfully request a minimum of <strong>24 hours notice</strong> for appointment cancellations or rescheduling. This allows us to offer the appointment time to other patients.</p><h3>Late Cancellation Fee</h3><p>Cancellations made with less than 24 hours notice will incur a late cancellation fee of up to 50% of the scheduled service price.</p><h3>No-Show Fee</h3><p>Failure to attend a scheduled appointment without prior notice will incur a no-show fee of up to 100% of the scheduled service price.</p><h3>Repeated Violations</h3><p>Patients with 3 or more late cancellations or no-shows within a 12-month period may be required to pay a non-refundable deposit to secure future appointments.</p><h3>Exceptions</h3><p>We understand that emergencies and illness happen. Fees may be waived at the clinic''s discretion for documented medical emergencies or extreme weather events.</p><h3>Patient Acknowledgment</h3><p>I have read and understand the cancellation and no-show policy. I agree to provide adequate notice and accept responsibility for applicable fees.</p>',
   true, false)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Trigger seed for existing clinics
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.clinics LOOP
    PERFORM public.seed_clinical_templates(r.id);
  END LOOP;
END;
$$;

-- Also hook into handle_new_user to seed templates for new clinics
-- We'll add this as a separate trigger on clinics table
CREATE OR REPLACE FUNCTION public.seed_clinical_on_clinic_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_clinical_templates(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_clinic_seed_clinical
  AFTER INSERT ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.seed_clinical_on_clinic_create();
