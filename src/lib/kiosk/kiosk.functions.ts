import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const verifyClinicSlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, name, slug")
      .eq("slug", data.slug)
      .maybeSingle();
    return clinic
      ? { valid: true as const, name: clinic.name, slug: clinic.slug }
      : { valid: false as const };
  });

const lookupSchema = z
  .object({
    clinic_slug: z.string().min(1).max(100),
    phone: z.string().min(3).max(40).optional(),
    email: z.string().email().max(255).optional(),
  })
  .refine((d) => !!(d.phone || d.email), { message: "phone or email required" });

export const lookupClientForKiosk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => lookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id, name, slug")
      .eq("slug", data.clinic_slug)
      .maybeSingle();
    if (cErr || !clinic) throw new Error("Clinic not found");

    let query = supabaseAdmin
      .from("clients")
      .select("id, first_name, last_name, phone, email, medical_history_completed_at")
      .eq("clinic_id", clinic.id);

    if (data.phone) {
      const phoneDigits = data.phone.replace(/\D/g, "");
      query = query.like("phone", `%${phoneDigits.slice(-7)}%`);
    } else if (data.email) {
      query = query.ilike("email", data.email);
    }

    const { data: clients } = await query.limit(1);

    if (!clients || clients.length === 0) {
      return {
        found: false as const,
        clinic_id: clinic.id,
        clinic_name: clinic.name,
      };
    }

    const client = clients[0];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("id, starts_at, service_id, staff_id, status, services(name), staff(first_name, last_name)")
      .eq("client_id", client.id)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at")
      .limit(5);

    return {
      found: true as const,
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      client,
      appointments: appts ?? [],
    };
  });

const registerSchema = z.object({
  clinic_slug: z.string().min(1).max(100),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().min(3).max(40),
  email: z.string().email().max(255).optional().or(z.literal("")),
  date_of_birth: z.string().optional(),
  address_line1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(40).optional(),
  emergency_contact_relationship: z.string().max(60).optional(),
  allergies: z.string().max(2000).optional(),
  medications: z.string().max(2000).optional(),
  medical_conditions: z.string().max(2000).optional(),
  profile_photo_data_url: z.string().max(5_000_000).optional(),
});

export const registerNewClientFromKiosk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("slug", data.clinic_slug)
      .maybeSingle();
    if (cErr || !clinic) throw new Error("Clinic not found");

    let photoUrl: string | null = null;
    if (data.profile_photo_data_url && data.profile_photo_data_url.startsWith("data:image/")) {
      try {
        const match = data.profile_photo_data_url.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const ext = contentType.split("/")[1] ?? "jpg";
          const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
          const path = `${clinic.id}/clients/${Date.now()}.${ext}`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("clinic-photos")
            .upload(path, bytes, { contentType, upsert: true });
          if (!upErr) {
            const { data: pub } = supabaseAdmin.storage.from("clinic-photos").getPublicUrl(path);
            photoUrl = pub.publicUrl;
          }
        }
      } catch (e) {
        console.error("kiosk photo upload failed", e);
      }
    }

    const { data: client, error } = await supabaseAdmin
      .from("clients")
      .insert({
        clinic_id: clinic.id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email && data.email !== "" ? data.email : null,
        date_of_birth: data.date_of_birth || null,
        address_line1: data.address_line1 ?? null,
        city: data.city ?? null,
        state_province: data.state_province ?? null,
        postal_code: data.postal_code ?? null,
        emergency_contact_name: data.emergency_contact_name ?? null,
        emergency_contact_phone: data.emergency_contact_phone ?? null,
        emergency_contact_relationship: data.emergency_contact_relationship ?? null,
        current_medications: data.medications ?? null,
        photo_url: photoUrl,
        medical_history_completed_at: new Date().toISOString(),
        source: "kiosk",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { client_id: client.id };
  });

const submitSchema = z.object({
  clinic_slug: z.string().min(1).max(100),
  client_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
});

export const submitKioskCheckin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("slug", data.clinic_slug)
      .maybeSingle();
    if (cErr || !clinic) throw new Error("Clinic not found");

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("first_name, last_name, clinic_id")
      .eq("id", data.client_id)
      .maybeSingle();
    if (!client || client.clinic_id !== clinic.id) throw new Error("Client not found");

    await supabaseAdmin.from("checkins").insert({
      clinic_id: clinic.id,
      client_id: data.client_id,
      client_name: `${client.first_name} ${client.last_name ?? ""}`.trim(),
      appointment_id: data.appointment_id ?? null,
      status: "waiting",
      checked_in_at: new Date().toISOString(),
    });

    if (data.appointment_id) {
      await supabaseAdmin
        .from("appointments")
        .update({ status: "checked_in", check_in_at: new Date().toISOString() })
        .eq("id", data.appointment_id)
        .eq("clinic_id", clinic.id);
    }

    return { ok: true };
  });
