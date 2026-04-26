-- Public booking widget: allow anonymous users to view active clinic offerings
-- by slug, and submit booking requests as leads (NOT appointments — those
-- still require authenticated clinic members to confirm).

-- 1. Public read of clinic basics (name, slug, currency, timezone)
CREATE POLICY "public read clinics"
ON public.clinics
FOR SELECT
TO anon
USING (true);

-- 2. Public read of active services for booking selection
CREATE POLICY "public read active services"
ON public.services
FOR SELECT
TO anon
USING (active = true);

-- 3. Public read of active staff for provider selection
CREATE POLICY "public read active staff"
ON public.staff
FOR SELECT
TO anon
USING (active = true);

-- 4. Allow anonymous lead submission (booking requests come in as leads)
-- Stage is forced to 'new' via trigger to prevent abuse.
CREATE POLICY "public submit lead"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (stage = 'new');
