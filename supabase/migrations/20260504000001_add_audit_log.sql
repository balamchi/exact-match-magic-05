CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete', 'view', 'export', 'sign')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_log_clinic ON audit_log(clinic_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
  );

-- Trigger function that auto-logs INSERT/UPDATE/DELETE on PHI tables.
-- SECURITY DEFINER runs as the function owner so it can bypass the INSERT RLS
-- policy (which requires a session user) when triggered by service-role writes.
CREATE OR REPLACE FUNCTION tg_audit_phi_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action    TEXT;
  v_entity_id UUID;
  v_clinic_id UUID;
  v_changes   JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action    := 'insert';
    v_entity_id := NEW.id;
    v_clinic_id := NEW.clinic_id;
    v_changes   := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action    := 'update';
    v_entity_id := NEW.id;
    v_clinic_id := NEW.clinic_id;
    v_changes   := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action    := 'delete';
    v_entity_id := OLD.id;
    v_clinic_id := OLD.clinic_id;
    v_changes   := to_jsonb(OLD);
  END IF;

  INSERT INTO audit_log (clinic_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_clinic_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_changes
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_clients_phi
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION tg_audit_phi_changes();

CREATE TRIGGER audit_soap_notes_phi
  AFTER INSERT OR UPDATE OR DELETE ON soap_notes
  FOR EACH ROW EXECUTE FUNCTION tg_audit_phi_changes();

CREATE TRIGGER audit_injection_sites_phi
  AFTER INSERT OR UPDATE OR DELETE ON injection_sites
  FOR EACH ROW EXECUTE FUNCTION tg_audit_phi_changes();

CREATE TRIGGER audit_before_after_photos_phi
  AFTER INSERT OR UPDATE OR DELETE ON before_after_photos
  FOR EACH ROW EXECUTE FUNCTION tg_audit_phi_changes();

CREATE TRIGGER audit_signed_consents_phi
  AFTER INSERT OR UPDATE OR DELETE ON signed_consents
  FOR EACH ROW EXECUTE FUNCTION tg_audit_phi_changes();
