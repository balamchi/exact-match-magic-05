-- Add intake completion timestamp
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS medical_history_completed_at timestamptz;

-- Kiosk session tracking
CREATE TABLE IF NOT EXISTS public.kiosk_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  device_label text,
  pin_code text,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.kiosk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_admins manage kiosk sessions" ON public.kiosk_sessions
  FOR ALL TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]))
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER set_updated_at_kiosk_sessions
  BEFORE UPDATE ON public.kiosk_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_clinic ON public.kiosk_sessions(clinic_id);