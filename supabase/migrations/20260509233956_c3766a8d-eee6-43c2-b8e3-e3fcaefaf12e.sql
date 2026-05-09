CREATE UNIQUE INDEX IF NOT EXISTS membership_charges_square_invoice_id_key
  ON public.membership_charges (square_invoice_id)
  WHERE square_invoice_id IS NOT NULL;