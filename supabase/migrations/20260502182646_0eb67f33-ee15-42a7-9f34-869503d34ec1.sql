-- Add medical alert columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS medical_alerts text,
  ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications text[] DEFAULT '{}';