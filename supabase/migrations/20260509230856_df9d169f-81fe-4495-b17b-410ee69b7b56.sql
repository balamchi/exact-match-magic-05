-- Square OAuth connection per clinic
CREATE TABLE IF NOT EXISTS public.clinic_square_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE,
  merchant_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  location_id text,
  business_name text,
  country text,
  currency text DEFAULT 'CAD',
  connected_by uuid REFERENCES auth.users(id),
  connected_at timestamptz DEFAULT now(),
  last_refreshed_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  webhook_signature_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinic_square_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read square connection" ON public.clinic_square_connections
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "admins manage square connection" ON public.clinic_square_connections
  FOR ALL TO authenticated
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]))
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

-- Extend memberships table
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS square_plan_id text,
  ADD COLUMN IF NOT EXISTS square_plan_variation_id text,
  ADD COLUMN IF NOT EXISTS billing_cadence text DEFAULT 'MONTHLY' CHECK (billing_cadence IN ('WEEKLY','MONTHLY','QUARTERLY','ANNUAL')),
  ADD COLUMN IF NOT EXISTS commitment_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color_hex text DEFAULT '#9333EA',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS public_signup_enabled boolean DEFAULT false;

-- Member subscriptions
CREATE TABLE IF NOT EXISTS public.membership_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  square_subscription_id text UNIQUE,
  square_customer_id text,
  square_card_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','past_due','canceled','expired')),
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  paused_at timestamptz,
  pause_reason text,
  pause_resumes_at timestamptz,
  canceled_at timestamptz,
  canceled_reason text,
  cancel_at_period_end boolean DEFAULT false,
  ended_at timestamptz,
  failed_charge_count integer DEFAULT 0,
  last_charge_at timestamptz,
  last_charge_status text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_subs_clinic ON public.membership_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_membership_subs_client ON public.membership_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_membership_subs_status ON public.membership_subscriptions(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_membership_subs_next_billing ON public.membership_subscriptions(next_billing_at) WHERE status = 'active';

ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read subs" ON public.membership_subscriptions
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members insert subs" ON public.membership_subscriptions
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members update subs" ON public.membership_subscriptions
  FOR UPDATE TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "admins delete subs" ON public.membership_subscriptions
  FOR DELETE TO authenticated USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

-- Charge history
CREATE TABLE IF NOT EXISTS public.membership_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.membership_subscriptions(id) ON DELETE CASCADE,
  square_invoice_id text,
  square_payment_id text,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'CAD',
  status text NOT NULL CHECK (status IN ('pending','paid','failed','refunded','voided')),
  charged_at timestamptz,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_charges_clinic ON public.membership_charges(clinic_id);
CREATE INDEX IF NOT EXISTS idx_membership_charges_sub ON public.membership_charges(subscription_id);
CREATE INDEX IF NOT EXISTS idx_membership_charges_charged ON public.membership_charges(charged_at DESC);

ALTER TABLE public.membership_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read charges" ON public.membership_charges
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

-- Benefits per plan
CREATE TABLE IF NOT EXISTS public.membership_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  benefit_type text NOT NULL CHECK (benefit_type IN ('percent_off_all','percent_off_service','free_service_monthly','dollar_credit_monthly','birthday_credit','free_addon')),
  description text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  percent_value integer,
  cents_value integer,
  quantity_per_period integer DEFAULT 1,
  reset_period text DEFAULT 'monthly' CHECK (reset_period IN ('monthly','yearly','never')),
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_benefits_membership ON public.membership_benefits(membership_id);

ALTER TABLE public.membership_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read benefits" ON public.membership_benefits
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members manage benefits" ON public.membership_benefits
  FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- Redemptions
CREATE TABLE IF NOT EXISTS public.membership_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.membership_subscriptions(id) ON DELETE CASCADE,
  benefit_id uuid NOT NULL REFERENCES public.membership_benefits(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  redeemed_at timestamptz DEFAULT now(),
  period_key text NOT NULL,
  discount_cents integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_redemptions_sub ON public.membership_redemptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_membership_redemptions_period ON public.membership_redemptions(subscription_id, period_key);

ALTER TABLE public.membership_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read redemptions" ON public.membership_redemptions
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "members insert redemptions" ON public.membership_redemptions
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- Add square_customer_id to clients table for Square Customers mapping
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS square_customer_id text;

-- Updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_csc ON public.clinic_square_connections;
CREATE TRIGGER set_updated_at_csc BEFORE UPDATE ON public.clinic_square_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_msub ON public.membership_subscriptions;
CREATE TRIGGER set_updated_at_msub BEFORE UPDATE ON public.membership_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();