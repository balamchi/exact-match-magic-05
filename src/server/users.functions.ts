import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/client-auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPermission } from "@/lib/permissions";
import type { ClinicRole } from "@/lib/auth-context";

const INVITABLE_ROLES = [
  "senior_admin",
  "junior_admin",
  "manager",
  "provider",
  "front_desk",
] as const;

const InviteSchema = z.object({
  clinicId: z.string().uuid(),
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(INVITABLE_ROLES),
});

function unwrapInput<T>(input: T): T {
  if (input && typeof input === "object" && "data" in (input as any)) {
    return (input as any).data;
  }
  return input;
}

const STAFF_LINKED_ROLES = ["provider", "manager"] as const;

/**
 * Auto-create a staff row for users invited as provider/manager so they
 * appear in calendar/booking immediately. Idempotent: if a staff row
 * already exists for this user_id + clinic_id, skip silently.
 * Failure is non-fatal — the clinic_members insert is the source of truth.
 */
async function autoCreateStaffRow(args: {
  clinicId: string;
  userId: string;
  email: string;
  role: string;
}): Promise<{ created: boolean; error?: string }> {
  if (!STAFF_LINKED_ROLES.includes(args.role as typeof STAFF_LINKED_ROLES[number])) {
    return { created: false };
  }

  const { data: existing } = await supabaseAdmin
    .from("staff")
    .select("id")
    .eq("clinic_id", args.clinicId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (existing) {
    return { created: false };
  }

  const localPart = args.email.split("@")[0] ?? args.email;
  const displayName = localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || args.email;

  const { error: insertErr } = await supabaseAdmin.from("staff").insert({
    clinic_id: args.clinicId,
    user_id: args.userId,
    display_name: displayName,
    email: args.email,
    role: args.role,
    active: true,
    online_booking_visible: args.role === "provider",
  });

  if (insertErr) {
    console.error("autoCreateStaffRow failed", insertErr);
    return { created: false, error: insertErr.message };
  }

  return { created: true };
}

export const inviteUserToClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, attachSupabaseAuth])
  .inputValidator((raw: unknown) => InviteSchema.parse(unwrapInput(raw)))
  .handler(async ({ data, context }) => {
    const { clinicId, email, role } = data;
    const { supabase, userId } = context;

    // Verify caller has users.invite permission for THIS clinic
    const { data: callerMembership, error: membershipErr } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipErr || !callerMembership) {
      return {
        success: false as const,
        error: "You are not a member of this clinic",
      };
    }

    if (!hasPermission(callerMembership.role as ClinicRole, "users.invite")) {
      return {
        success: false as const,
        error: "You don't have permission to invite users",
      };
    }

    // Check if this email already exists as a user
    const { data: existingUsers, error: lookupErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (lookupErr) {
      console.error("inviteUserToClinic listUsers failed", lookupErr);
      return {
        success: false as const,
        error: "Failed to check existing users. Please try again.",
      };
    }

    const existingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (existingUser) {
      const { data: alreadyMember } = await supabaseAdmin
        .from("clinic_members")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (alreadyMember) {
        return {
          success: false as const,
          error: "This user is already a member of this clinic",
        };
      }

      const { error: insertErr } = await supabaseAdmin
        .from("clinic_members")
        .insert({
          clinic_id: clinicId,
          user_id: existingUser.id,
          role,
        });

      if (insertErr) {
        console.error("inviteUserToClinic insert (existing user) failed", insertErr);
        return {
          success: false as const,
          error: "Failed to add user to clinic. Please try again.",
        };
      }

      await autoCreateStaffRow({ clinicId, userId: existingUser.id, email, role });

      return {
        success: true as const,
        addedExistingUser: true as const,
        message: `${email} added to clinic as ${role}`,
      };
    }

    // Send invite email via Supabase Auth
    const { data: inviteResult, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          invited_to_clinic_id: clinicId,
          invited_role: role,
        },
      });

    if (inviteErr || !inviteResult?.user) {
      console.error("inviteUserToClinic inviteUserByEmail failed", inviteErr);
      return {
        success: false as const,
        error: inviteErr?.message ?? "Failed to send invite email. Please try again.",
      };
    }

    const { error: insertErr } = await supabaseAdmin
      .from("clinic_members")
      .insert({
        clinic_id: clinicId,
        user_id: inviteResult.user.id,
        role,
      });

    if (insertErr) {
      console.error("inviteUserToClinic clinic_members insert failed", insertErr);
      return {
        success: false as const,
        error: "Invite email sent, but failed to register clinic membership. Please contact support.",
      };
    }

    return {
      success: true as const,
      addedExistingUser: false as const,
      message: `Invite email sent to ${email}`,
    };
  });
