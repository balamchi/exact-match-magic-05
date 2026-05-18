DROP POLICY IF EXISTS "Authenticated upload clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Members upload clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Members update clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Members delete clinic photos" ON storage.objects;

CREATE POLICY "Members upload clinic photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-photos'
    AND public.is_clinic_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Members update clinic photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-photos'
    AND public.is_clinic_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Members delete clinic photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-photos'
    AND public.is_clinic_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.extract_clinic_photo_path(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN url IS NULL THEN NULL
    WHEN url ~ '/clinic-photos/' THEN
      regexp_replace(regexp_replace(url, '^.*/clinic-photos/', ''), '\?.*$', '')
    ELSE NULL
  END;
$$;