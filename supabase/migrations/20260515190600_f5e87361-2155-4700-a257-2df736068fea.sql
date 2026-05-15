-- Part A: Audit log
CREATE TABLE IF NOT EXISTS public.seed_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seed_activity_log_clinic_idx
  ON public.seed_activity_log(clinic_id, created_at DESC);

ALTER TABLE public.seed_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners and admins read seed_activity_log" ON public.seed_activity_log;
CREATE POLICY "owners and admins read seed_activity_log"
  ON public.seed_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = seed_activity_log.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role::text IN ('owner', 'admin', 'senior_admin')
    )
  );

DROP POLICY IF EXISTS "owners and admins write seed_activity_log" ON public.seed_activity_log;
CREATE POLICY "owners and admins write seed_activity_log"
  ON public.seed_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = seed_activity_log.clinic_id
        AND cm.user_id = auth.uid()
        AND cm.role::text IN ('owner', 'admin', 'senior_admin')
    )
  );

COMMENT ON TABLE public.seed_activity_log IS
  'Audit log of clinic setup / seeding operations. One row per seed/refresh/reset action.';

-- Part B: Expand clinic_role enum (additive)
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'senior_admin';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'junior_admin';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'manager';

-- Part C: Persist selected clinic types
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS seeded_clinic_types text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.clinics.seeded_clinic_types IS
  'Clinic types selected by user. Used by seeder to filter templates. Empty = no preference.';

-- Part D: Conservative orphan services cleanup
WITH deletable_services AS (
  SELECT s.id
  FROM public.services s
  WHERE s.created_at < (now() - interval '7 days')
    AND NOT EXISTS (SELECT 1 FROM public.appointments WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.client_package_redemptions WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.consent_form_signatures WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.consent_form_templates WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.membership_benefits WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.package_services WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.service_locations WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.soap_notes WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.soap_templates WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.staff_commissions WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.staff_services WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.treatment_plan_templates WHERE service_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM public.treatment_plans WHERE service_id = s.id)
)
DELETE FROM public.services
WHERE id IN (SELECT id FROM deletable_services);