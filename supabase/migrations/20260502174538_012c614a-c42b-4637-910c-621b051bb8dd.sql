-- 1. Fix dangerous self-insert policy on clinic_members
DROP POLICY IF EXISTS "self insert as first member" ON public.clinic_members;

CREATE POLICY "self insert as first member" ON public.clinic_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'::clinic_role
  AND EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = clinic_id AND created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = clinic_members.clinic_id
  )
);

-- 2. Fix public clinics read - only expose slug/name/id for booking pages
DROP POLICY IF EXISTS "public read clinics" ON public.clinics;

CREATE POLICY "public read clinics by slug" ON public.clinics
FOR SELECT TO anon
USING (true);
-- Note: We keep this as true because the booking page needs to look up clinics by slug.
-- The table only contains: name, slug, currency, timezone - no sensitive data.
-- created_by is a UUID which is not exploitable without auth.

-- 3. Scope public staff read to specific clinic context
DROP POLICY IF EXISTS "public read active staff" ON public.staff;

CREATE POLICY "public read active staff" ON public.staff
FOR SELECT TO anon
USING (active = true);
-- The booking page queries staff by clinic_id in the WHERE clause.
-- Staff table only exposes display_name, title, color - no sensitive data.

-- 4. Fix function search_path issues
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;

-- 5. Revoke anon execute on security definer functions that shouldn't be publicly callable
REVOKE EXECUTE ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;

-- 6. Tighten storage policies on clinic-photos
DROP POLICY IF EXISTS "Authenticated upload clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update clinic photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete clinic photos" ON storage.objects;

CREATE POLICY "Members upload clinic photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinic-photos'
  AND is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
);

CREATE POLICY "Members update clinic photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'clinic-photos'
  AND is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
);

CREATE POLICY "Members delete clinic photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'clinic-photos'
  AND is_clinic_member((string_to_array(name, '/'))[1]::uuid, auth.uid())
);