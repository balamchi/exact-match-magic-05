import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "appointments" | "leads" | "tasks" | "inventory_items";

/**
 * Subscribe to realtime changes on a clinic-scoped table.
 * Calls `onChange` whenever any row for the active clinic is inserted,
 * updated, or deleted by any user. Auto-cleans up on unmount.
 *
 * Usage:
 *   useRealtimeTable("appointments", activeClinic?.clinic_id, loadAll);
 */
export function useRealtimeTable(
  table: TableName,
  clinicId: string | undefined,
  onChange: () => void,
) {
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel(`rt:${table}:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          onChange();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, clinicId, onChange]);
}
