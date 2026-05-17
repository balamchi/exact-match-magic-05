ALTER TABLE public.soap_templates
  ADD CONSTRAINT soap_templates_clinic_name_key UNIQUE (clinic_id, name);

ALTER TABLE public.lead_sources_config
  ADD CONSTRAINT lead_sources_config_clinic_key_key UNIQUE (clinic_id, source_key);