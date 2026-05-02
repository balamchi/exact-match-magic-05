-- Add tax config to locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0.13,
  ADD COLUMN IF NOT EXISTS tax_label text NOT NULL DEFAULT 'Tax';

-- Add deposit config to clinics  
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer NOT NULL DEFAULT 5000;