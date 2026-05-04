
-- ═══════════════════════════════════════════════
-- Services: add missing columns
-- ═══════════════════════════════════════════════
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS prep_time_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleanup_time_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_price_cents integer,
  ADD COLUMN IF NOT EXISTS online_booking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_category text,
  ADD COLUMN IF NOT EXISTS pre_treatment_instructions text,
  ADD COLUMN IF NOT EXISTS post_treatment_aftercare text,
  ADD COLUMN IF NOT EXISTS treatment_area_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dosage_notes text,
  ADD COLUMN IF NOT EXISTS recommended_interval text;

-- ═══════════════════════════════════════════════
-- Staff: add missing columns
-- ═══════════════════════════════════════════════
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'provider',
  ADD COLUMN IF NOT EXISTS online_booking_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT '{}';

-- ═══════════════════════════════════════════════
-- Locations: add missing columns
-- ═══════════════════════════════════════════════
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}';

-- ═══════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_services_clinic_active ON public.services (clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_services_clinic_name ON public.services (clinic_id, name);
CREATE INDEX IF NOT EXISTS idx_staff_clinic_active ON public.staff (clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_staff_clinic_name ON public.staff (clinic_id, display_name);
CREATE INDEX IF NOT EXISTS idx_locations_clinic_active ON public.locations (clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_locations_clinic_name ON public.locations (clinic_id, name);
