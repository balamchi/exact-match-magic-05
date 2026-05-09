ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS square_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS square_sync_error text;