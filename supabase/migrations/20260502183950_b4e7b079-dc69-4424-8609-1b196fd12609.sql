
-- Staff HR details
CREATE TABLE public.staff_hr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email text,
  phone text,
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  hire_date date,
  hourly_rate_cents integer,
  salary_cents integer,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id)
);

ALTER TABLE public.staff_hr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic admins can manage staff HR"
  ON public.staff_hr FOR ALL
  TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]))
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER set_staff_hr_updated_at
  BEFORE UPDATE ON public.staff_hr
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Staff commission rules
CREATE TABLE public.staff_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat', 'tiered')),
  rate numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'all',
  service_category text,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic admins can manage commissions"
  ON public.staff_commissions FOR ALL
  TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]))
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER set_staff_commissions_updated_at
  BEFORE UPDATE ON public.staff_commissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
