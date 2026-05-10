import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/client-auth-middleware";

const Schema = z.object({
  giftCardId: z.string().uuid(),
});

export const sendGiftCardEmail = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Load gift card
    const { data: gc, error } = await admin
      .from("gift_cards")
      .select("*, clinics(name)")
      .eq("id", data.giftCardId)
      .single();
    if (error || !gc) {
      throw new Error("Gift card not found");
    }

    // Verify caller is a member of the clinic
    const { data: member } = await context.supabase
      .from("clinic_members")
      .select("role")
      .eq("user_id", context.userId)
      .eq("clinic_id", gc.clinic_id)
      .maybeSingle();
    if (!member) {
      throw new Error("Not authorized for this clinic");
    }

    if (!gc.recipient_email) {
      throw new Error("No recipient email on file");
    }

    const amount = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format((gc.initial_value_cents ?? 0) / 100);

    const expiresAt = gc.expires_at
      ? new Date(gc.expires_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    const clinicName = (gc as any).clinics?.name ?? "the clinic";

    const { error: enqErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_email_queue",
      payload: {
        templateName: "gift-card-delivery",
        recipientEmail: gc.recipient_email,
        data: {
          recipientName: gc.recipient_name ?? undefined,
          senderName: gc.sender_name ?? undefined,
          clinicName,
          code: gc.code,
          amount,
          personalMessage: gc.personal_message ?? undefined,
          expiresAt,
        },
      },
    });
    if (enqErr) throw new Error(enqErr.message);

    // Mark delivered
    await admin
      .from("gift_cards")
      .update({ delivered_at: new Date().toISOString(), status: "delivered" })
      .eq("id", gc.id);

    return { ok: true };
  });
