-- Revoke anon + authenticated from trigger-only function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Revoke anon from auth-helper functions (authenticated still needs them for RLS)
REVOKE EXECUTE ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;

-- Tighten storage: drop any overly broad SELECT policy on storage.objects for clinic-photos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%clinic%photo%'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Re-create a scoped read policy: anyone can read files (public bucket) but NOT list
CREATE POLICY "clinic_photos_read_objects"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-photos' AND name IS NOT NULL AND name != '');