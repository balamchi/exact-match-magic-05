ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_trigger_check;
ALTER TABLE public.automations ADD CONSTRAINT automations_trigger_check CHECK (trigger_event IN (
  'appointment_booked',
  'appointment_upcoming',
  'appointment_completed',
  'appointment_cancelled',
  'no_show',
  'birthday',
  'client_inactive',
  'lead_created',
  'inventory_low',
  'service_completed',
  'package_expiring'
));