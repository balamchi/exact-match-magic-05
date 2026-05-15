-- Part A: Patch has_clinic_role to expand 'admin' to also match 'senior_admin'
CREATE OR REPLACE FUNCTION public.has_clinic_role(_clinic uuid, _user uuid, _roles public.clinic_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic
      AND user_id = _user
      AND (
        role = ANY(_roles)
        OR (role = 'senior_admin'::public.clinic_role AND 'admin'::public.clinic_role = ANY(_roles))
      )
  );
$$;

COMMENT ON FUNCTION public.has_clinic_role(uuid, uuid, public.clinic_role[]) IS
  'Returns true if user has any of the given roles for the given clinic. ''senior_admin'' is automatically granted whenever ''admin'' is in the requested role list (backwards-compat expansion for the 6-role permission system introduced 2026-05-15).';

-- Part B: Recreate audit_log_select via the helper
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;

CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_clinic_role(clinic_id, auth.uid(), ARRAY['owner','admin']::public.clinic_role[])
  );

-- Part C: Forward-looking permission-key helper
CREATE OR REPLACE FUNCTION public.has_clinic_permission(
  _clinic uuid,
  _user uuid,
  _permission text
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH user_role AS (
    SELECT role FROM public.clinic_members
    WHERE clinic_id = _clinic AND user_id = _user
    LIMIT 1
  )
  SELECT CASE
    WHEN (SELECT role FROM user_role) = 'owner' THEN true
    WHEN (SELECT role FROM user_role) IN ('senior_admin', 'admin') THEN
      _permission NOT IN ('clinic.delete', 'clinic.billing.write')
    WHEN (SELECT role FROM user_role) = 'junior_admin' THEN
      _permission IN (
        'clinic.settings.read',
        'users.read',
        'clients.read', 'clients.write', 'clients.export',
        'appointments.read.own', 'appointments.read.all', 'appointments.write',
        'appointments.cancel', 'appointments.checkin',
        'services.read', 'services.write',
        'consent_forms.read', 'consent_forms.write', 'consent_forms.sign',
        'soap_notes.read.own', 'soap_notes.read.all', 'soap_notes.write',
        'automations.read', 'automations.write',
        'memberships.read', 'memberships.write',
        'payments.process',
        'billing.read',
        'reports.read', 'reports.export',
        'staff.read',
        'seed.view_log'
      )
    WHEN (SELECT role FROM user_role) = 'manager' THEN
      _permission IN (
        'clinic.settings.read',
        'users.read',
        'clients.read', 'clients.write',
        'appointments.read.own', 'appointments.read.all', 'appointments.write',
        'appointments.cancel', 'appointments.checkin',
        'services.read',
        'consent_forms.read', 'consent_forms.sign',
        'soap_notes.read.own', 'soap_notes.read.all', 'soap_notes.write',
        'automations.read',
        'memberships.read',
        'payments.process',
        'billing.read',
        'reports.read',
        'staff.read', 'staff.write',
        'seed.view_log'
      )
    WHEN (SELECT role FROM user_role) = 'provider' THEN
      _permission IN (
        'clinic.settings.read',
        'users.read',
        'clients.read', 'clients.write',
        'appointments.read.own', 'appointments.write',
        'appointments.checkin',
        'services.read',
        'consent_forms.read', 'consent_forms.sign',
        'soap_notes.read.own', 'soap_notes.write',
        'memberships.read',
        'staff.read'
      )
    WHEN (SELECT role FROM user_role) = 'front_desk' THEN
      _permission IN (
        'clients.read', 'clients.write',
        'appointments.read.all', 'appointments.write',
        'appointments.cancel', 'appointments.checkin',
        'services.read',
        'consent_forms.read',
        'memberships.read',
        'payments.process',
        'staff.read'
      )
    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.has_clinic_permission(uuid, uuid, text) IS
  'Returns true if user has the given permission key for the given clinic. Mirror of the role-permission matrix in src/lib/permissions.ts. Used by application code (Commit 4.5+) for fine-grained access checks. Not used by RLS policies yet (those still use has_clinic_role).';

REVOKE EXECUTE ON FUNCTION public.has_clinic_permission(uuid, uuid, text) FROM anon;