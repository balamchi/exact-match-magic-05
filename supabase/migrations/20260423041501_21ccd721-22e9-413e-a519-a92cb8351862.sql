CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value integer NOT NULL DEFAULT 10,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
  CONSTRAINT coupons_discount_value_check CHECK (discount_value >= 0),
  CONSTRAINT coupons_usage_check CHECK (usage_limit IS NULL OR usage_limit >= 0),
  UNIQUE (clinic_id, code)
);

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  code text NOT NULL,
  purchaser_name text,
  recipient_name text,
  recipient_email text,
  initial_value_cents integer NOT NULL DEFAULT 0,
  balance_cents integer NOT NULL DEFAULT 0,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_cards_value_check CHECK (initial_value_cents >= 0 AND balance_cents >= 0),
  UNIQUE (clinic_id, code)
);

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sessions integer NOT NULL DEFAULT 1,
  price_cents integer NOT NULL DEFAULT 0,
  expires_after_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT packages_sessions_check CHECK (sessions > 0),
  CONSTRAINT packages_price_check CHECK (price_cents >= 0),
  CONSTRAINT packages_expiry_check CHECK (expires_after_days IS NULL OR expires_after_days > 0)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  sku text,
  name text NOT NULL,
  supplier text,
  stock_quantity integer NOT NULL DEFAULT 0,
  reorder_threshold integer NOT NULL DEFAULT 0,
  unit_cost_cents integer NOT NULL DEFAULT 0,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_check CHECK (stock_quantity >= 0 AND reorder_threshold >= 0 AND unit_cost_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  audience text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT marketing_status_check CHECK (status IN ('draft', 'scheduled', 'sent', 'paused')),
  CONSTRAINT marketing_counts_check CHECK (sent_count >= 0 AND open_count >= 0 AND click_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  trigger_event text NOT NULL DEFAULT 'appointment_completed',
  action_type text NOT NULL DEFAULT 'email',
  active boolean NOT NULL DEFAULT true,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automations_trigger_check CHECK (trigger_event IN ('appointment_booked', 'appointment_completed', 'no_show', 'lead_created', 'birthday')),
  CONSTRAINT automations_action_check CHECK (action_type IN ('email', 'sms', 'task')),
  CONSTRAINT automations_run_count_check CHECK (run_count >= 0)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic members read coupons" ON public.coupons FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write coupons" ON public.coupons FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members read gift cards" ON public.gift_cards FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write gift cards" ON public.gift_cards FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members read packages" ON public.packages FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write packages" ON public.packages FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members read inventory" ON public.inventory_items FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write inventory" ON public.inventory_items FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members read marketing" ON public.marketing_campaigns FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write marketing" ON public.marketing_campaigns FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members read automations" ON public.automations FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "clinic members write automations" ON public.automations FOR ALL TO authenticated USING (is_clinic_member(clinic_id, auth.uid())) WITH CHECK (is_clinic_member(clinic_id, auth.uid()));

CREATE TRIGGER tg_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_gift_cards_updated_at BEFORE UPDATE ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_automations_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_coupons_clinic ON public.coupons(clinic_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_clinic ON public.gift_cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_packages_clinic ON public.packages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_clinic ON public.inventory_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic ON public.marketing_campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_automations_clinic ON public.automations(clinic_id);