ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_clinic_name_key UNIQUE (clinic_id, name);