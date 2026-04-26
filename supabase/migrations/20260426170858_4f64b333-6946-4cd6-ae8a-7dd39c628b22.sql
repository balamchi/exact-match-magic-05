CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  paddle_transaction_id text NOT NULL,
  paddle_subscription_id text,
  paddle_customer_id text,
  plan_code text,
  price_id text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL,
  origin text,
  invoice_number text,
  invoice_pdf_url text,
  error_reason text,
  billed_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paddle_transaction_id, environment)
);

CREATE INDEX idx_payment_tx_clinic ON public.payment_transactions(clinic_id, environment, created_at DESC);
CREATE INDEX idx_payment_tx_subscription ON public.payment_transactions(paddle_subscription_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members read transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Service role manages transactions"
  ON public.payment_transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();