ALTER TABLE public.clinics 
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clinics_onboarding 
  ON public.clinics(onboarding_completed_at, onboarding_dismissed_at);