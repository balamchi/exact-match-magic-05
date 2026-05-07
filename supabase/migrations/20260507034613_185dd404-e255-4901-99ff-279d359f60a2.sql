
-- 1. Add new enum values to lead_stage
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'consultation_booked' AFTER 'qualified';
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'treatment_booked' AFTER 'consultation_booked';
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'converted' AFTER 'treatment_booked';

-- 2. Create activity type enum
DO $$ BEGIN
  CREATE TYPE public.lead_activity_type AS ENUM (
    'stage_change', 'note', 'call_made', 'email_sent', 'sms_sent',
    'meeting_booked', 'appointment_booked', 'converted', 'follow_up_set'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Alter leads table — add new columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS source_details text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS service_interest uuid,
  ADD COLUMN IF NOT EXISTS converted_to_client_id uuid,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

-- 4. Backfill first_name / last_name from existing 'name' column
UPDATE public.leads SET
  first_name = split_part(name, ' ', 1),
  last_name = CASE WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1) ELSE '' END
WHERE first_name IS NULL;

-- 5. Make first_name NOT NULL with default
ALTER TABLE public.leads ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.leads ALTER COLUMN last_name SET DEFAULT '';

-- 6. Create lead_activities table
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  activity_type public.lead_activity_type NOT NULL DEFAULT 'note',
  description text,
  performed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read lead_activities"
  ON public.lead_activities FOR SELECT
  TO authenticated
  USING (is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members insert lead_activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "admins delete lead_activities"
  ON public.lead_activities FOR DELETE
  TO authenticated
  USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));

-- 7. Create lead_sources_config table
CREATE TABLE IF NOT EXISTS public.lead_sources_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  source_key text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read lead_sources_config"
  ON public.lead_sources_config FOR SELECT
  TO authenticated
  USING (is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "admins manage lead_sources_config"
  ON public.lead_sources_config FOR ALL
  TO authenticated
  USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]))
  WITH CHECK (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_clinic_stage ON public.leads (clinic_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_created ON public.leads (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_source ON public.leads (clinic_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_assigned ON public.leads (clinic_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_clinic ON public.lead_activities (clinic_id);

-- 9. Updated_at trigger for leads (reuse existing function)
DO $$ BEGIN
  CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
