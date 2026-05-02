-- handle_new_user: trigger only
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Email queue functions: server-side only
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM authenticated;

REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM authenticated;

REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM authenticated;

-- Auth helpers: revoke anon, keep authenticated (used in RLS)
REVOKE ALL ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_clinic_role(uuid, uuid, clinic_role[]) TO authenticated;

REVOKE ALL ON FUNCTION public.is_clinic_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;