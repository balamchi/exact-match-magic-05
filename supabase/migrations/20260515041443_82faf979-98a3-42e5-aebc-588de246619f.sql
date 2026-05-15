-- Dedupe consent_form_templates
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY clinic_id, name ORDER BY created_at DESC, id DESC) rn
  FROM public.consent_form_templates
)
DELETE FROM public.consent_form_templates WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.consent_form_templates
  ADD CONSTRAINT consent_form_templates_clinic_name_key UNIQUE (clinic_id, name);

-- Dedupe automations
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY clinic_id, name ORDER BY created_at DESC, id DESC) rn
  FROM public.automations
)
DELETE FROM public.automations WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.automations
  ADD CONSTRAINT automations_clinic_name_key UNIQUE (clinic_id, name);

-- Dedupe memberships
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY clinic_id, name ORDER BY created_at DESC, id DESC) rn
  FROM public.memberships
)
DELETE FROM public.memberships WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_clinic_name_key UNIQUE (clinic_id, name);
