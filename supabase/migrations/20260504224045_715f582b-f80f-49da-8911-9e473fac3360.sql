
-- Add photo_url to staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('service-images', 'service-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staff-photos', 'staff-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-images
CREATE POLICY "Public read service images" ON storage.objects FOR SELECT USING (bucket_id = 'service-images');
CREATE POLICY "Auth users upload service images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-images');
CREATE POLICY "Auth users update service images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-images');
CREATE POLICY "Auth users delete service images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-images');

-- Storage policies for staff-photos
CREATE POLICY "Public read staff photos" ON storage.objects FOR SELECT USING (bucket_id = 'staff-photos');
CREATE POLICY "Auth users upload staff photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'staff-photos');
CREATE POLICY "Auth users update staff photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'staff-photos');
CREATE POLICY "Auth users delete staff photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'staff-photos');

-- Service-location junction table
CREATE TABLE IF NOT EXISTS public.service_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  location_id UUID NOT NULL,
  price_override_cents INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, location_id)
);

ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_locations_read" ON public.service_locations FOR SELECT TO authenticated
  USING (service_id IN (SELECT id FROM public.services WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())));

CREATE POLICY "service_locations_write" ON public.service_locations FOR ALL TO authenticated
  USING (service_id IN (SELECT id FROM public.services WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())))
  WITH CHECK (service_id IN (SELECT id FROM public.services WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())));

-- Staff-location junction table
CREATE TABLE IF NOT EXISTS public.staff_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  location_id UUID NOT NULL,
  primary_location BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, location_id)
);

ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_locations_read" ON public.staff_locations FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())));

CREATE POLICY "staff_locations_write" ON public.staff_locations FOR ALL TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())))
  WITH CHECK (staff_id IN (SELECT id FROM public.staff WHERE clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())));
