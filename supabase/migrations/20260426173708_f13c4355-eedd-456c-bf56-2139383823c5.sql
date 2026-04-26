CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  address_line1 text, city text, region text, postal_code text,
  country text DEFAULT 'CA', phone text,
  timezone text DEFAULT 'America/Toronto',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  benefits text,
  active boolean NOT NULL DEFAULT true,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  points_balance integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  lifetime_points integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  referrer_name text NOT NULL,
  referred_name text NOT NULL,
  referred_email text,
  status text NOT NULL DEFAULT 'pending',
  reward_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  body text,
  source text NOT NULL DEFAULT 'in_app',
  responded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  title text NOT NULL,
  goals text,
  estimated_total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  subjective text, objective text, assessment text, plan text,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.before_after_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  treatment text,
  before_url text, after_url text,
  taken_on date NOT NULL DEFAULT CURRENT_DATE,
  consent_given boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.injection_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  product text NOT NULL,
  region text NOT NULL,
  units numeric NOT NULL DEFAULT 0,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms',
  contact_name text NOT NULL,
  contact_handle text,
  preview text,
  unread boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  invoice_number text,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  due_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  total_cents integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'completed',
  staff_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text NOT NULL DEFAULT 'front_desk',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text,
  active boolean NOT NULL DEFAULT true,
  call_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  seated_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','memberships','loyalty_accounts','referrals','reviews','treatment_plans','soap_notes','before_after_photos','injection_sites','inbox_messages','invoices','pos_orders','ai_assistants','checkins']
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY "members read %1$s" ON public.%1$I FOR SELECT TO authenticated
        USING (public.is_clinic_member(clinic_id, auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "members insert %1$s" ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "members update %1$s" ON public.%1$I FOR UPDATE TO authenticated
        USING (public.is_clinic_member(clinic_id, auth.uid()))
        WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "admins delete %1$s" ON public.%1$I FOR DELETE TO authenticated
        USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));
    $f$, t);
    EXECUTE format('CREATE INDEX idx_%1$s_clinic ON public.%1$I(clinic_id);', t);
  END LOOP;
END $$;