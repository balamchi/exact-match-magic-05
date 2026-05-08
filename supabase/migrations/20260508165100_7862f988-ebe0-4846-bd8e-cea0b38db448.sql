
-- Enums
DO $$ BEGIN
  CREATE TYPE public.conversation_channel AS ENUM ('sms','whatsapp','email','web','instagram','facebook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('open','closed','snoozed','spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_direction AS ENUM ('inbound','outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('queued','sent','delivered','read','failed','received');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_category AS ENUM ('appointment','follow_up','marketing','support','reminder','review_request','birthday','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  channel public.conversation_channel NOT NULL,
  contact_name text NOT NULL,
  contact_handle text NOT NULL,
  contact_avatar_url text,
  status public.conversation_status NOT NULL DEFAULT 'open',
  unread_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  last_message_text text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_direction public.message_direction,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  snoozed_until timestamptz,
  tags text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_clinic_status ON public.conversations(clinic_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(clinic_id, channel, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON public.conversations(clinic_id, unread_count) WHERE unread_count > 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_contact ON public.conversations(clinic_id, channel, contact_handle);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_conversations" ON public.conversations
FOR ALL TO authenticated
USING (public.is_clinic_member(clinic_id, auth.uid()))
WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  direction public.message_direction NOT NULL,
  channel public.conversation_channel NOT NULL,
  body text NOT NULL,
  media_urls text[] DEFAULT ARRAY[]::text[],
  status public.message_status NOT NULL DEFAULT 'queued',
  status_updated_at timestamptz DEFAULT now(),
  failure_reason text,
  sent_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_name text,
  external_id text,
  provider text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_clinic ON public.messages(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_external ON public.messages(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_messages" ON public.messages
FOR ALL TO authenticated
USING (public.is_clinic_member(clinic_id, auth.uid()))
WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.template_category NOT NULL DEFAULT 'general',
  channel public.conversation_channel,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  use_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_clinic ON public.message_templates(clinic_id, category) WHERE is_active = true;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_templates" ON public.message_templates
FOR ALL TO authenticated
USING (public.is_clinic_member(clinic_id, auth.uid()))
WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TRIGGER message_templates_set_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger to update conversation when message added
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_text = LEFT(NEW.body, 200),
    last_message_at = NEW.created_at,
    last_message_direction = NEW.direction,
    unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    status = CASE WHEN NEW.direction = 'inbound' AND status = 'closed' THEN 'open'::conversation_status ELSE status END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

COMMENT ON TABLE public.inbox_messages IS 'DEPRECATED: Use conversations + messages tables instead';
