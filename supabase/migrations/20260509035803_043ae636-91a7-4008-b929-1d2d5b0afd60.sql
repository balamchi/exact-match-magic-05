ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS reply_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.clinics.reply_email IS 'Email where client replies to outgoing messages will be delivered';
COMMENT ON COLUMN public.clinics.contact_phone IS 'Public-facing clinic phone number for client communication';