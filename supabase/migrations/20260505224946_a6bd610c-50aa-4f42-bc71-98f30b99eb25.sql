-- Add missing columns to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS check_in_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS check_out_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS no_show_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_calendar
ON public.appointments (clinic_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_appointments_staff
ON public.appointments (clinic_id, staff_id, starts_at);

-- Staff-services junction table
CREATE TABLE IF NOT EXISTS public.staff_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  service_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, service_id)
);

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read staff_services"
  ON public.staff_services FOR SELECT
  TO authenticated
  USING (is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members write staff_services"
  ON public.staff_services FOR ALL
  TO authenticated
  USING (is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (is_clinic_member(clinic_id, auth.uid()));