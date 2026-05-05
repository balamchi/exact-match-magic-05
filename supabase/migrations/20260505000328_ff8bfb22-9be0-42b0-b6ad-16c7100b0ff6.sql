
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS logo_dark_url text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#9333EA';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#D946EF';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS booking_rules jsonb DEFAULT '{"allow_online_booking": true, "cancellation_window_hours": 24, "lead_time_hours": 1, "max_advance_days": 90, "allow_same_day": true, "require_deposit": false, "auto_confirm": false, "block_after_noshows": 3}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS communication_settings jsonb DEFAULT '{}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS tax_currency_settings jsonb DEFAULT '{"tax_rate": 0.13, "tax_label": "HST", "tax_inclusive": false, "date_format": "MM/DD/YYYY", "time_format": "12h", "first_day_of_week": "monday"}';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS integration_settings jsonb DEFAULT '{}';

-- Create audit_log table for settings audit trail
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));

CREATE POLICY "members insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (is_clinic_member(clinic_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_audit_log_clinic_created ON public.audit_log (clinic_id, created_at DESC);
