-- Allow signatures to outlive their template (snapshot is the source of truth)
ALTER TABLE public.consent_form_signatures
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE public.consent_form_signatures
  DROP CONSTRAINT IF EXISTS consent_form_signatures_template_id_fkey;

ALTER TABLE public.consent_form_signatures
  ADD CONSTRAINT consent_form_signatures_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.consent_form_templates(id)
  ON DELETE SET NULL;

-- Purge stale templates not in current 52-form whitelist
DELETE FROM public.consent_form_templates
WHERE name NOT IN (
  'General Treatment Consent','Photo & Before/After Consent','HIPAA / Privacy Acknowledgment','Cancellation & No-Show Policy','Financial Responsibility Agreement',
  'Botulinum Toxin (Botox/Dysport/Xeomin) Consent','Hyaluronic Acid Dermal Filler Consent','Lip Filler Consent','Sculptra / Bio-stimulator Consent','Kybella (Submental Fat) Consent','PRP Facial Injection Consent','PRP Hair Restoration Consent','Microneedling Consent','Microneedling with PRP Consent','HydraFacial / Medical Facial Consent','Chemical Peel Consent','Mesotherapy Consent','Hyaluronidase (Filler Dissolution) Consent','CoolSculpting / Body Contouring Consent','Thread Lift Consent','Laser Skin Resurfacing Consent',
  'Dental Treatment & Local Anesthesia Consent','Teeth Whitening Consent','Porcelain Veneers Consent','Dental Implant Consent','Root Canal Therapy Consent','Tooth Extraction Consent','Wisdom Tooth Removal Consent','Orthodontic / Invisalign Consent','Crown & Bridge Consent','Periodontal (Gum) Treatment Consent','Sedation Dentistry Consent','Pediatric Dental Treatment Consent (Parent/Guardian)',
  'Hair Color & Chemical Service Consent','Permanent Wave / Relaxer Consent','Keratin / Smoothing Treatment Consent','Hair Extension Consent','Eyelash Extension Consent','Brow Tint / Lamination Consent','Spray Tan Consent','Manicure / Pedicure Consent','Waxing Service Consent',
  'Skin Cancer Screening Consent','Mole / Lesion Removal Consent','Cryotherapy Consent','Patch Test / Allergy Test Consent',
  'Chiropractic Treatment Consent','Physiotherapy Treatment Consent','Massage Therapy Consent','Acupuncture Consent','Naturopathic / Functional Medicine Consent','Cupping / Gua Sha Consent'
);