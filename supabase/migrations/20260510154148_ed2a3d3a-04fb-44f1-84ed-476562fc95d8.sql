ALTER TABLE public.services
  ADD CONSTRAINT services_clinic_name_unique UNIQUE (clinic_id, name);