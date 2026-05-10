import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/client-auth-middleware";

const FilterSchema = z.object({
  range: z.enum(["24h", "7d", "30d", "all"]).default("7d"),
  template: z.string().nullable().optional(),
  status: z.enum(["all", "sent", "failed", "suppressed", "pending"]).default("all"),
  limit: z.number().int().min(1).max(200).default(100),
});

interface EmailLogRow {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface EmailLogResponse {
  rows: EmailLogRow[];
  stats: { total: number; sent: number; failed: number; suppressed: number; pending: number };
  templates: string[];
  unauthorized?: boolean;
}

function rangeStart(range: string): string | null {
  const now = Date.now();
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function dedupeByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
  // Rows arrive ordered by created_at desc; first occurrence per message_id wins.
  const seen = new Set<string>();
  const out: EmailLogRow[] = [];
  for (const r of rows) {
    const key = r.message_id ?? `${r.created_at}|${r.recipient_email}|${r.template_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export const fetchEmailLog = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => FilterSchema.parse(input))
  .handler(async ({ data, context }): Promise<EmailLogResponse> => {
    // Only clinic owners/admins should see email logs.
    const { data: roles, error: rolesError } = await context.supabase
      .from("clinic_members")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) {
      console.error("Failed to load clinic memberships", rolesError);
      return {
        rows: [],
        stats: { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 },
        templates: [],
      };
    }

    const isPrivileged = (roles ?? []).some(
      (r) => r.role === "owner" || r.role === "admin",
    );
    if (!isPrivileged) {
      return {
        rows: [],
        stats: { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 },
        templates: [],
        unauthorized: true,
      };
    }

    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const since = rangeStart(data.range);
    let query = admin
      .from("email_send_log")
      .select("message_id, template_name, recipient_email, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (since) query = query.gte("created_at", since);
    if (data.template && data.template !== "all") query = query.eq("template_name", data.template);

    const { data: raw, error } = await query;
    if (error) {
      console.error("Failed to read email_send_log", error);
      return {
        rows: [],
        stats: { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 },
        templates: [],
      };
    }

    const deduped = dedupeByMessageId((raw ?? []) as EmailLogRow[]);

    const stats = { total: deduped.length, sent: 0, failed: 0, suppressed: 0, pending: 0 };
    for (const r of deduped) {
      if (r.status === "sent") stats.sent++;
      else if (r.status === "dlq" || r.status === "failed" || r.status === "bounced")
        stats.failed++;
      else if (r.status === "suppressed" || r.status === "complained") stats.suppressed++;
      else if (r.status === "pending") stats.pending++;
    }

    let filtered = deduped;
    if (data.status !== "all") {
      if (data.status === "failed") {
        filtered = deduped.filter(
          (r) => r.status === "dlq" || r.status === "failed" || r.status === "bounced",
        );
      } else if (data.status === "suppressed") {
        filtered = deduped.filter(
          (r) => r.status === "suppressed" || r.status === "complained",
        );
      } else {
        filtered = deduped.filter((r) => r.status === data.status);
      }
    }

    const templates = Array.from(new Set(deduped.map((r) => r.template_name))).sort();

    return {
      rows: filtered.slice(0, data.limit),
      stats,
      templates,
    };
  });
