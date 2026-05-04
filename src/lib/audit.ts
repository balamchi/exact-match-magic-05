import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  clinicId: string;
  action: "insert" | "update" | "delete" | "view" | "export" | "sign";
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Use rpc or raw fetch since audit_log table may not exist yet
    const { error } = await supabase.rpc("enqueue_email" as never, {
      queue_name: "audit_log",
      payload: {
        clinic_id: params.clinicId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        changes: params.changes ?? null,
        logged_at: new Date().toISOString(),
      },
    } as never);
    if (error) {
      // Audit logging is best-effort; don't crash the app
      console.warn("Audit log skipped:", error.message);
    }
  } catch {
    // silently ignore — audit is non-critical
  }
}
