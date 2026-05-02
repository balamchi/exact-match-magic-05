-- Create the storage bucket for clinic photos
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic-photos', 'clinic-photos', true);

-- Allow public read access
CREATE POLICY "Public read clinic photos" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-photos');

-- Allow authenticated users to upload to their clinic folder
CREATE POLICY "Authenticated upload clinic photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clinic-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated update clinic photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'clinic-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated delete clinic photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'clinic-photos');