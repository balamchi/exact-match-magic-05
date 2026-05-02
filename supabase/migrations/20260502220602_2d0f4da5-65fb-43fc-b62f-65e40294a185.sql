-- Personal & contact
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Canada';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Marketing
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referred_by_client_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT false;

-- Medical / health
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS medical_conditions TEXT[];
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pregnancy_status TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS smoking_status TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS skin_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS previous_treatments TEXT;

-- Emergency contact
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Business / classification
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_provider_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lifetime_value_cents INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS first_visit_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes_internal TEXT;