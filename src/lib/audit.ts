import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  clinicId: string;
  action: "insert" | "update" | "delete" | "view" | "export" | "sign";
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    clinic_id: params.clinicId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    changes: params.changes ?? null,
  });
  if (error) {
    console.error("Failed to write audit log:", error);
  }
}
