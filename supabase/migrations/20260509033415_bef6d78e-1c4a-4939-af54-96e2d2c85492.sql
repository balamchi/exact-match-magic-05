-- Fix 1: Add client_id to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id) WHERE client_id IS NOT NULL;

-- Fix 2: FK from referral_rewards.referral_id -> referral_codes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'referral_rewards_referral_id_fkey'
      AND table_name = 'referral_rewards'
  ) THEN
    ALTER TABLE public.referral_rewards
      ADD CONSTRAINT referral_rewards_referral_id_fkey
      FOREIGN KEY (referral_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON public.referral_rewards(referral_id);