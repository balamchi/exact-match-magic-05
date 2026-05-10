-- Drop the partial index that Supabase cannot use for onConflict
DROP INDEX IF EXISTS public.membership_charges_square_invoice_id_key;

-- Add a proper named unique constraint (works with onConflict)
ALTER TABLE public.membership_charges
  ADD CONSTRAINT membership_charges_square_invoice_id_uniq
  UNIQUE (square_invoice_id);