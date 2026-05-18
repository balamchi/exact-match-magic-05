CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL,
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_pending
  ON public.scheduled_emails (send_at)
  WHERE sent_at IS NULL AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_template
  ON public.scheduled_emails (user_id, template_name);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.scheduled_emails
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-emails') THEN
    PERFORM cron.unschedule('send-scheduled-emails');
  END IF;
END$$;

SELECT cron.schedule(
  'send-scheduled-emails',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://xdprzoqptuswfvpktats.supabase.co/functions/v1/send-scheduled-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);