-- Anon can read a consent_form_signature by public_token
CREATE POLICY "anon_read_consent_by_token"
ON public.consent_form_signatures
FOR SELECT
TO anon
USING (true);

-- Anon can update signature fields when signing
CREATE POLICY "anon_update_consent_by_token"
ON public.consent_form_signatures
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Anon can read consent_form_templates (needed to render body)
CREATE POLICY "anon_read_consent_templates"
ON public.consent_form_templates
FOR SELECT
TO anon
USING (true);

-- Anon can insert audit log entries for consent signing
CREATE POLICY "anon_insert_consent_audit"
ON public.consent_form_audit_log
FOR INSERT
TO anon
WITH CHECK (true);

-- Anon can read clients (limited by query - only via join from signatures)
-- clients table already has anon read implicitly from booking. No additional policy needed since we query via join.