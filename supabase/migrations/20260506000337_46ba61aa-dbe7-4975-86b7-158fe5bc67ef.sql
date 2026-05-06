
-- Add booking widget columns to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS booking_widget_enabled boolean DEFAULT true;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS booking_widget_settings jsonb DEFAULT '{
  "show_provider_photos": true,
  "show_provider_bios": true,
  "allow_provider_selection": true,
  "show_prices": true,
  "min_advance_hours": 1,
  "max_advance_days": 90,
  "buffer_minutes": 15,
  "welcome_message": "Book your appointment online",
  "thank_you_message": "Thank you! We''ll see you soon."
}'::jsonb;

-- Add online visibility to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS visible_online boolean DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_description text;

-- Add online visibility to staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS visible_online boolean DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS booking_bio text;

-- Anon read policies for public booking
CREATE POLICY "anon_booking_services_read" ON services
  FOR SELECT TO anon
  USING (visible_online = true AND active = true);

CREATE POLICY "anon_booking_staff_read" ON staff
  FOR SELECT TO anon
  USING (visible_online = true AND active = true);

CREATE POLICY "anon_booking_locations_read" ON locations
  FOR SELECT TO anon
  USING (active = true);

-- Anon can read appointments (for availability calculation)
CREATE POLICY "anon_appointments_read" ON appointments
  FOR SELECT TO anon
  USING (true);

-- Anon can create appointments via booking
CREATE POLICY "anon_booking_appointment_create" ON appointments
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can create clients via booking
CREATE POLICY "anon_booking_client_create" ON clients
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can read staff_services for service-provider matching
CREATE POLICY "anon_staff_services_read" ON staff_services
  FOR SELECT TO anon
  USING (true);
