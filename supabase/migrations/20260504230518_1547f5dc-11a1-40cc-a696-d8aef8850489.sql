
-- ============================================================
-- COUPONS: Add missing columns
-- ============================================================
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount_cents integer;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_purchase_cents integer DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS stackable boolean DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS per_client_limit integer DEFAULT 1;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_time_only boolean DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_days text[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_start_time text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_end_time text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to_type text DEFAULT 'all';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to_ids uuid[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS visible_to_clients boolean DEFAULT true;

-- ============================================================
-- GIFT CARDS: Add missing columns
-- ============================================================
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS design_template text DEFAULT 'classic';
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS personal_message text;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS sender_email text;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'email';
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS scheduled_delivery_at timestamptz;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS issued_by_staff_id uuid;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS card_image_url text;

-- ============================================================
-- PACKAGES: Add missing columns
-- ============================================================
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'specific';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS validity_type text DEFAULT 'never';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS validity_days integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS activation_policy text DEFAULT 'on_purchase';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS transferable boolean DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS member_only boolean DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS tax_category text;

-- ============================================================
-- COUPON_LOCATIONS junction
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  location_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, location_id)
);

ALTER TABLE public.coupon_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_locations_read" ON public.coupon_locations
  FOR SELECT TO authenticated
  USING (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "coupon_locations_write" ON public.coupon_locations
  FOR ALL TO authenticated
  USING (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- COUPON_USAGE tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  client_id uuid,
  used_at timestamptz NOT NULL DEFAULT now(),
  discount_applied_cents integer NOT NULL DEFAULT 0,
  pos_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_usage_read" ON public.coupon_usage
  FOR SELECT TO authenticated
  USING (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "coupon_usage_write" ON public.coupon_usage
  FOR ALL TO authenticated
  USING (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (coupon_id IN (
    SELECT id FROM public.coupons WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- GIFT_CARD_LOCATIONS junction
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gift_card_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL,
  location_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gift_card_id, location_id)
);

ALTER TABLE public.gift_card_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_card_locations_read" ON public.gift_card_locations
  FOR SELECT TO authenticated
  USING (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "gift_card_locations_write" ON public.gift_card_locations
  FOR ALL TO authenticated
  USING (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- GIFT_CARD_TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  transaction_type text NOT NULL DEFAULT 'redemption',
  pos_order_id uuid,
  notes text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_card_transactions_read" ON public.gift_card_transactions
  FOR SELECT TO authenticated
  USING (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "gift_card_transactions_write" ON public.gift_card_transactions
  FOR ALL TO authenticated
  USING (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (gift_card_id IN (
    SELECT id FROM public.gift_cards WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- PACKAGE_SERVICES junction
-- ============================================================
CREATE TABLE IF NOT EXISTS public.package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  service_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, service_id)
);

ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_services_read" ON public.package_services
  FOR SELECT TO authenticated
  USING (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "package_services_write" ON public.package_services
  FOR ALL TO authenticated
  USING (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- PACKAGE_LOCATIONS junction
-- ============================================================
CREATE TABLE IF NOT EXISTS public.package_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  location_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, location_id)
);

ALTER TABLE public.package_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_locations_read" ON public.package_locations
  FOR SELECT TO authenticated
  USING (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "package_locations_write" ON public.package_locations
  FOR ALL TO authenticated
  USING (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (package_id IN (
    SELECT id FROM public.packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- CLIENT_PACKAGES (sold packages)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  client_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  total_sessions integer NOT NULL,
  sessions_used integer NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  paid_amount_cents integer NOT NULL DEFAULT 0,
  pos_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_packages_read" ON public.client_packages
  FOR SELECT TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "client_packages_write" ON public.client_packages
  FOR ALL TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
  ));

-- ============================================================
-- CLIENT_PACKAGE_REDEMPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_package_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id uuid NOT NULL,
  appointment_id uuid,
  service_id uuid,
  staff_id uuid,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_package_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_package_redemptions_read" ON public.client_package_redemptions
  FOR SELECT TO authenticated
  USING (client_package_id IN (
    SELECT id FROM public.client_packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "client_package_redemptions_write" ON public.client_package_redemptions
  FOR ALL TO authenticated
  USING (client_package_id IN (
    SELECT id FROM public.client_packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (client_package_id IN (
    SELECT id FROM public.client_packages WHERE clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-card-designs', 'gift-card-designs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for package-images
CREATE POLICY "package_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'package-images');

CREATE POLICY "package_images_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'package-images');

CREATE POLICY "package_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'package-images');

CREATE POLICY "package_images_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'package-images');

-- Storage policies for gift-card-designs
CREATE POLICY "gift_card_designs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'gift-card-designs');

CREATE POLICY "gift_card_designs_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gift-card-designs');

CREATE POLICY "gift_card_designs_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gift-card-designs');

CREATE POLICY "gift_card_designs_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gift-card-designs');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupon_locations_coupon ON public.coupon_locations (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_locations_gc ON public.gift_card_locations (gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gc ON public.gift_card_transactions (gift_card_id);
CREATE INDEX IF NOT EXISTS idx_package_services_pkg ON public.package_services (package_id);
CREATE INDEX IF NOT EXISTS idx_package_locations_pkg ON public.package_locations (package_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_clinic ON public.client_packages (clinic_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON public.client_packages (client_id);
CREATE INDEX IF NOT EXISTS idx_client_package_redemptions_cp ON public.client_package_redemptions (client_package_id);
