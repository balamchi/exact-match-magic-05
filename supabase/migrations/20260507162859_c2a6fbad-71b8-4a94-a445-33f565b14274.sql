
-- ═══════════════════════════════════════════════════════════
-- PART 1: REVIEWS
-- ═══════════════════════════════════════════════════════════

-- Enums
DO $$ BEGIN
  CREATE TYPE public.review_request_status AS ENUM ('pending','sent','opened','completed','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_platform AS ENUM ('internal','google','yelp','facebook','instagram');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_sent_via AS ENUM ('email','sms','both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- review_settings
CREATE TABLE IF NOT EXISTS public.review_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  trigger_hours_after_appointment integer NOT NULL DEFAULT 24,
  smart_filter_enabled boolean NOT NULL DEFAULT true,
  google_business_url text,
  internal_thank_you_message text DEFAULT 'Thank you for your feedback!',
  negative_feedback_alert_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read review_settings" ON public.review_settings FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins manage review_settings" ON public.review_settings FOR ALL TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role])) WITH CHECK (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE TRIGGER trg_review_settings_updated BEFORE UPDATE ON public.review_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- review_requests
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  client_id uuid NOT NULL,
  appointment_id uuid,
  sent_via review_sent_via NOT NULL DEFAULT 'email',
  status review_request_status NOT NULL DEFAULT 'pending',
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  scheduled_send_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read review_requests" ON public.review_requests FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members insert review_requests" ON public.review_requests FOR INSERT TO authenticated WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins update review_requests" ON public.review_requests FOR UPDATE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE POLICY "admins delete review_requests" ON public.review_requests FOR DELETE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
-- anon can read by token for public submission page
CREATE POLICY "anon read review_requests by token" ON public.review_requests FOR SELECT TO anon USING (true);
CREATE INDEX idx_review_requests_clinic_status ON public.review_requests(clinic_id, status, sent_at);

-- Expand existing reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_responded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_review_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz DEFAULT now();

-- Migrate existing data: responded → is_responded, source → platform
UPDATE public.reviews SET is_responded = responded WHERE responded = true;
UPDATE public.reviews SET platform = CASE
  WHEN source = 'google' THEN 'google'
  WHEN source = 'yelp' THEN 'yelp'
  WHEN source = 'facebook' THEN 'facebook'
  ELSE 'internal'
END;
UPDATE public.reviews SET posted_at = created_at WHERE posted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_clinic_rating ON public.reviews(clinic_id, rating, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_clinic_platform ON public.reviews(clinic_id, platform);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);

-- Allow anon to insert reviews (for public submission)
CREATE POLICY "anon submit review" ON public.reviews FOR INSERT TO anon WITH CHECK (true);

-- review_responses
CREATE TABLE IF NOT EXISTS public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  response_text text NOT NULL,
  responded_by uuid,
  posted_to_external boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read review_responses" ON public.review_responses FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members insert review_responses" ON public.review_responses FOR INSERT TO authenticated WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins update review_responses" ON public.review_responses FOR UPDATE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE POLICY "admins delete review_responses" ON public.review_responses FOR DELETE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE TRIGGER trg_review_responses_updated BEFORE UPDATE ON public.review_responses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- PART 2: REFERRALS
-- ═══════════════════════════════════════════════════════════

-- Enums
DO $$ BEGIN
  CREATE TYPE public.reward_type AS ENUM ('credit','percentage','free_service','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('invited','signed_up','first_appointment_completed','rewarded','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.reward_status AS ENUM ('pending','available','redeemed','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- referral_settings
CREATE TABLE IF NOT EXISTS public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  reward_type reward_type NOT NULL DEFAULT 'credit',
  reward_value numeric NOT NULL DEFAULT 25,
  reward_service_id uuid,
  reward_description text DEFAULT '$25 credit toward your next visit',
  referee_reward_enabled boolean NOT NULL DEFAULT true,
  referee_reward_type reward_type NOT NULL DEFAULT 'credit',
  referee_reward_value numeric NOT NULL DEFAULT 15,
  terms_text text DEFAULT 'Reward is applied after the referred client completes their first appointment.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read referral_settings" ON public.referral_settings FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins manage referral_settings" ON public.referral_settings FOR ALL TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role])) WITH CHECK (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE TRIGGER trg_referral_settings_updated BEFORE UPDATE ON public.referral_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  client_id uuid NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  times_used integer NOT NULL DEFAULT 0,
  total_rewards_earned_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, client_id),
  UNIQUE(clinic_id, code)
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read referral_codes" ON public.referral_codes FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members insert referral_codes" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins update referral_codes" ON public.referral_codes FOR UPDATE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE POLICY "admins delete referral_codes" ON public.referral_codes FOR DELETE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
-- anon can look up codes for public referral page
CREATE POLICY "anon read referral_codes" ON public.referral_codes FOR SELECT TO anon USING (is_active = true);
CREATE TRIGGER trg_referral_codes_updated BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Expand existing referrals table
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_client_id uuid,
  ADD COLUMN IF NOT EXISTS referrer_code_id uuid,
  ADD COLUMN IF NOT EXISTS referee_client_id uuid,
  ADD COLUMN IF NOT EXISTS referee_phone text,
  ADD COLUMN IF NOT EXISTS reward_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS reward_redeemed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_referrals_clinic_status ON public.referrals(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_email ON public.referrals(referred_email);

-- Allow anon to insert referrals (for public signup)
CREATE POLICY "anon submit referral" ON public.referrals FOR INSERT TO anon WITH CHECK (true);

-- referral_rewards
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  recipient_client_id uuid NOT NULL,
  reward_type reward_type NOT NULL DEFAULT 'credit',
  amount_cents integer NOT NULL DEFAULT 0,
  status reward_status NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read referral_rewards" ON public.referral_rewards FOR SELECT TO authenticated USING (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "members insert referral_rewards" ON public.referral_rewards FOR INSERT TO authenticated WITH CHECK (is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "admins update referral_rewards" ON public.referral_rewards FOR UPDATE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE POLICY "admins delete referral_rewards" ON public.referral_rewards FOR DELETE TO authenticated USING (has_clinic_role(clinic_id, auth.uid(), ARRAY['owner'::clinic_role, 'admin'::clinic_role]));
CREATE INDEX idx_referral_rewards_recipient ON public.referral_rewards(recipient_client_id, status);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_rewards;
