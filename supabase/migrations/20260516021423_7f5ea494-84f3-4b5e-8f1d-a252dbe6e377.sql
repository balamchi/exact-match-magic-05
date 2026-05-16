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
        'seed.view_log',
        'audit.read'
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
        'seed.view_log',
        'audit.read'
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
  'Returns true if the user has the given permission key on the clinic. Mirrors src/lib/permissions.ts hasPermission(). Drift-fixed 2026-05-16 to add audit.read for junior_admin and manager.';

REVOKE EXECUTE ON FUNCTION public.has_clinic_permission(uuid, uuid, text) FROM anon;