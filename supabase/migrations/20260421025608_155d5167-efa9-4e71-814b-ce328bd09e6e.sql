
-- ============ ENUMS ============
CREATE TYPE public.clinic_role AS ENUM ('owner','admin','provider','front_desk');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','checked_in','completed','no_show','cancelled');
CREATE TYPE public.lead_stage AS ENUM ('new','contacted','qualified','consult_booked','won','lost');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','done');

-- ============ HELPER: timestamps ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ CLINICS ============
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  currency text NOT NULL DEFAULT 'CAD',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CLINIC MEMBERS (roles) ============
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.clinic_role NOT NULL DEFAULT 'front_desk',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clinic_members_user ON public.clinic_members(user_id);
CREATE INDEX idx_clinic_members_clinic ON public.clinic_members(clinic_id);

-- ============ SECURITY DEFINER HELPERS (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_role(_clinic uuid, _user uuid, _roles public.clinic_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id = _clinic AND user_id = _user AND role = ANY(_roles));
$$;

-- ============ CLINIC RLS ============
CREATE POLICY "members read clinic" ON public.clinics FOR SELECT TO authenticated
  USING (public.is_clinic_member(id, auth.uid()));
CREATE POLICY "owner/admin update clinic" ON public.clinics FOR UPDATE TO authenticated
  USING (public.has_clinic_role(id, auth.uid(), ARRAY['owner','admin']::public.clinic_role[]));
CREATE POLICY "any auth user create clinic" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner delete clinic" ON public.clinics FOR DELETE TO authenticated
  USING (public.has_clinic_role(id, auth.uid(), ARRAY['owner']::public.clinic_role[]));

-- ============ CLINIC_MEMBERS RLS ============
CREATE POLICY "members read members" ON public.clinic_members FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "owner/admin manage members" ON public.clinic_members FOR ALL TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::public.clinic_role[]))
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::public.clinic_role[]));
-- Allow inserting yourself as the first owner row (handled via trigger, but also allow direct)
CREATE POLICY "self insert as first member" ON public.clinic_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ GENERIC tenant table maker via repeated DDL ============
-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  date_of_birth date,
  notes text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_clinic ON public.clients(clinic_id);
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  duration_minutes int NOT NULL DEFAULT 60,
  price_cents int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_services_clinic ON public.services(clinic_id);
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read services" ON public.services FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write services" ON public.services FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- STAFF
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  title text,
  color text DEFAULT '#a78bfa',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_staff_clinic ON public.staff(clinic_id);
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read staff" ON public.staff FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write staff" ON public.staff FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  price_cents int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_appointments_clinic_time ON public.appointments(clinic_id, starts_at);
CREATE TRIGGER appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- CONSENT FORMS
CREATE TABLE public.consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_consent_clinic ON public.consent_forms(clinic_id);
CREATE TRIGGER consent_updated BEFORE UPDATE ON public.consent_forms FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read consent" ON public.consent_forms FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write consent" ON public.consent_forms FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  source text,
  stage public.lead_stage NOT NULL DEFAULT 'new',
  estimated_value_cents int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_clinic ON public.leads(clinic_id);
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write leads" ON public.leads FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  status public.task_status NOT NULL DEFAULT 'todo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_clinic ON public.tasks(clinic_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "clinic members read tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- ============ Auto-create clinic on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_clinic_id uuid;
  base_slug text;
  final_slug text;
  n int := 0;
  clinic_name text;
BEGIN
  clinic_name := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'My Clinic');
  base_slug := lower(regexp_replace(clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'clinic'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = final_slug) LOOP
    n := n + 1;
    final_slug := base_slug || '-' || n::text;
  END LOOP;

  INSERT INTO public.clinics (name, slug, created_by)
  VALUES (clinic_name, final_slug, NEW.id)
  RETURNING id INTO new_clinic_id;

  INSERT INTO public.clinic_members (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'owner');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
