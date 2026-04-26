-- ============================================================
-- SUBSCRIPTION_PLANS — catalog of available tiers
-- ============================================================
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  price_monthly_cents integer NOT NULL DEFAULT 0,
  price_annual_cents integer NOT NULL DEFAULT 0,
  monthly_price_id text,
  annual_price_id text,
  staff_seats_included integer,
  locations_included integer,
  active_clients_limit integer,
  sms_included integer NOT NULL DEFAULT 0,
  email_included integer NOT NULL DEFAULT 0,
  whatsapp_included integer NOT NULL DEFAULT 0,
  ai_calls_included integer NOT NULL DEFAULT 0,
  editions_included integer NOT NULL DEFAULT 1,
  card_processing_rate numeric(5,4) NOT NULL DEFAULT 0.029,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public plans"
  ON public.subscription_plans FOR SELECT
  USING (is_public = true);

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- SUBSCRIPTIONS — one row per paddle subscription
-- ============================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'trialing',
  billing_interval text NOT NULL DEFAULT 'monthly',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_clinic_id ON public.subscriptions(clinic_id);
CREATE INDEX idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- has_active_subscription helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  clinic_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE clinic_id = clinic_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing', 'past_due')
          AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

-- ============================================================
-- SEED PLANS
-- ============================================================
INSERT INTO public.subscription_plans (
  code, name, tagline,
  price_monthly_cents, price_annual_cents,
  monthly_price_id, annual_price_id,
  staff_seats_included, locations_included, active_clients_limit,
  sms_included, email_included, whatsapp_included, ai_calls_included,
  editions_included, card_processing_rate,
  features, is_popular, display_order
) VALUES
  ('starter', 'Starter', 'For solo practitioners and small clinics',
   6900, 70800,
   'starter_monthly', 'starter_annual',
   2, 1, 500,
   500, 2500, 0, 50,
   1, 0.029,
   '["2 staff seats","1 location","Up to 500 active clients","500 SMS / 2,500 emails per month","Calendar & booking widget","Clients & POS","Inventory","10 consent form templates","Email support"]'::jsonb,
   false, 1),
  ('professional', 'Professional', 'Most popular — for established clinics',
   19900, 202800,
   'professional_monthly', 'professional_annual',
   10, 3, 5000,
   3000, 15000, 1000, 2000,
   1, 0.027,
   '["10 staff seats","3 locations","Up to 5,000 active clients","3,000 SMS / 15,000 emails per month","All 73 consent forms","43 marketing automations","Memberships, loyalty & gift cards","Coupons & referrals","Reviews management","SOAP notes & treatment plans","Lead pipeline","40+ advanced reports","Multi-language with RTL","Email + chat support"]'::jsonb,
   true, 2),
  ('growth', 'Growth', 'For multi-location clinics and franchises',
   44900, 454800,
   'growth_monthly', 'growth_annual',
   NULL, NULL, NULL,
   10000, 75000, 5000, 15000,
   5, 0.025,
   '["Unlimited seats, locations & clients","10,000 SMS / 75,000 emails per month","AI Assistant (GPT-4 chat)","Voice-to-SOAP transcription","Predictive churn analysis","All editions included","Custom domain","API access (read + write)","Priority support + dedicated CSM","Quarterly business reviews"]'::jsonb,
   false, 3),
  ('enterprise', 'Enterprise', 'For franchises and white-label partners',
   150000, 1500000,
   'enterprise_monthly', 'enterprise_annual',
   NULL, NULL, NULL,
   0, 0, 0, 0,
   5, 0.023,
   '["Everything in Growth","White-label option","HIPAA + SOC 2 + BAA","99.99% uptime SLA","Dedicated infrastructure","Custom integrations","Volume transaction rates","Dedicated account manager","On-site training option","Custom DPA"]'::jsonb,
   false, 4);