
-- Add deposit fields to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_cents integer NOT NULL DEFAULT 0;

-- Create deposit status enum
DO $$ BEGIN
  CREATE TYPE public.deposit_status AS ENUM ('pending', 'collected', 'refunded', 'forfeited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create deposits table
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'card',
  status deposit_status NOT NULL DEFAULT 'pending',
  collected_at timestamptz,
  refunded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deposits_clinic ON public.deposits(clinic_id);
CREATE INDEX idx_deposits_appointment ON public.deposits(appointment_id);

-- Add deposit_id reference to appointments for quick lookup
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT NULL;

-- RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view deposits"
  ON public.deposits FOR SELECT
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Owners/admins can manage deposits"
  ON public.deposits FOR ALL
  USING (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::clinic_role[]));

CREATE POLICY "Staff can create deposits"
  ON public.deposits FOR INSERT
  WITH CHECK (public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin','provider','front_desk']::clinic_role[]));

-- Updated_at trigger
CREATE TRIGGER set_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
