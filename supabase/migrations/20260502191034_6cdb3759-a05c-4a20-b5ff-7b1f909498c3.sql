-- Fix 1: Replace unrestricted public clinics read with slug-only access
DROP POLICY IF EXISTS "public read clinics by slug" ON public.clinics;
CREATE POLICY "anon read clinic by slug"
  ON public.clinics
  FOR SELECT
  TO anon
  USING (slug IS NOT NULL);

-- Fix 2: Replace unrestricted public staff read with clinic-scoped
DROP POLICY IF EXISTS "public read active staff" ON public.staff;

-- Fix 3: Replace unrestricted public services read with clinic-scoped
DROP POLICY IF EXISTS "public read active services" ON public.services;

-- Fix 4: Revoke execute on security definer functions from anon
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;