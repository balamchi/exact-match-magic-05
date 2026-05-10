
CREATE TABLE IF NOT EXISTS public.report_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_key text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.report_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own presets" ON public.report_presets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_clinic_member(clinic_id, auth.uid()));
CREATE INDEX IF NOT EXISTS idx_report_presets_clinic_user ON public.report_presets(clinic_id, user_id);
CREATE TRIGGER report_presets_updated_at BEFORE UPDATE ON public.report_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id uuid REFERENCES public.report_presets(id) ON DELETE SET NULL,
  report_keys text[] NOT NULL DEFAULT '{}',
  name text NOT NULL,
  cadence text NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
  send_time time NOT NULL DEFAULT '09:00',
  send_day_of_week int CHECK (send_day_of_week BETWEEN 0 AND 6),
  send_day_of_month int CHECK (send_day_of_month BETWEEN 1 AND 28),
  timezone text NOT NULL DEFAULT 'America/Toronto',
  recipients text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  next_send_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage scheduled reports" ON public.scheduled_reports FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_send ON public.scheduled_reports(next_send_at) WHERE active = true;
CREATE TRIGGER scheduled_reports_updated_at BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.scheduled_report_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id uuid NOT NULL REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent','failed','partial')),
  recipients_count int NOT NULL DEFAULT 0,
  error_message text
);
ALTER TABLE public.scheduled_report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read scheduled log" ON public.scheduled_report_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_reports sr WHERE sr.id = scheduled_report_id AND public.is_clinic_member(sr.clinic_id, auth.uid())));

-- Cron: run every 15 minutes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reports-scheduled-send') THEN
    PERFORM cron.schedule(
      'reports-scheduled-send',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://xdprzoqptuswfvpktats.supabase.co/functions/v1/reports-scheduled-send',
        headers := jsonb_build_object('Content-Type','application/json','apikey', current_setting('app.settings.anon_key', true)),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
