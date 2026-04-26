ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_change_action text,
  ADD COLUMN IF NOT EXISTS scheduled_change_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_change_meta jsonb;