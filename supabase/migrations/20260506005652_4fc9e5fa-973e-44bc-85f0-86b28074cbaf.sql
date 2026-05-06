
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean DEFAULT false
);

CREATE INDEX idx_signup_attempts_ip_time ON public.signup_attempts (ip_address, attempted_at DESC);
CREATE INDEX idx_signup_attempts_email_time ON public.signup_attempts (email, attempted_at DESC);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.signup_attempts
  FOR ALL USING (auth.role() = 'service_role');
