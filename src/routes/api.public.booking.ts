import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const BookingSchema = z.object({
  clinicSlug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  firstName: z.string().min(1).max(100).transform((s) => s.trim()),
  lastName: z.string().min(1).max(100).transform((s) => s.trim()),
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
  phone: z.string().min(7).max(30).transform((s) => s.trim()),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).nullable(),
  dob: z.string().nullable().optional(),
  reminderConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  honeypot: z.string().optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/booking")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = BookingSchema.parse(body);

          // Honeypot check — bots fill hidden fields
          if (data.honeypot) {
            return new Response(JSON.stringify({ ok: true, appointmentId: "00000000" }), { status: 200, headers: CORS });
          }

          // Lookup clinic
          const { data: clinic, error: clinicErr } = await supabaseAdmin
            .from("clinics")
            .select("id, name, timezone, email, phone, booking_widget_enabled, booking_widget_settings")
            .eq("slug", data.clinicSlug)
            .single();

          if (clinicErr || !clinic) {
            return new Response(JSON.stringify({ error: "Clinic not found" }), { status: 404, headers: CORS });
          }

          if (clinic.booking_widget_enabled === false) {
            return new Response(JSON.stringify({ error: "Online booking is disabled" }), { status: 403, headers: CORS });
          }

          // Lookup service
          const { data: service, error: svcErr } = await supabaseAdmin
            .from("services")
            .select("id, name, duration_minutes, price_cents")
            .eq("id", data.serviceId)
            .eq("clinic_id", clinic.id)
            .eq("active", true)
            .single();

          if (svcErr || !service) {
            return new Response(JSON.stringify({ error: "Service not available" }), { status: 400, headers: CORS });
          }

          // Resolve staff
          let staffId = data.staffId;
          let staffName = "First available";
          if (staffId) {
            const { data: staffRec } = await supabaseAdmin
              .from("staff")
              .select("id, display_name")
              .eq("id", staffId)
              .eq("clinic_id", clinic.id)
              .single();
            if (staffRec) staffName = staffRec.display_name;
            else staffId = null;
          }

          // If no staff selected, find first available
          if (!staffId) {
            const { data: allStaff } = await supabaseAdmin
              .from("staff")
              .select("id, display_name")
              .eq("clinic_id", clinic.id)
              .eq("active", true)
              .order("display_name");

            const startsAt = new Date(`${data.date}T${data.time}:00`);
            const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000);

            const { data: conflicts } = await supabaseAdmin
              .from("appointments")
              .select("staff_id")
              .eq("clinic_id", clinic.id)
              .lt("starts_at", endsAt.toISOString())
              .gt("ends_at", startsAt.toISOString())
              .not("status", "in", '("cancelled","no_show")');

            const busyStaff = new Set((conflicts ?? []).map((c) => c.staff_id));
            const free = (allStaff ?? []).find((s) => !busyStaff.has(s.id));
            if (free) {
              staffId = free.id;
              staffName = free.display_name;
            }
          }

          // Build appointment times
          const startsAt = new Date(`${data.date}T${data.time}:00`);
          const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000);

          // CONFLICT CHECK — final check right before insert
          if (staffId) {
            const { data: conflicts } = await supabaseAdmin
              .from("appointments")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("staff_id", staffId)
              .lt("starts_at", endsAt.toISOString())
              .gt("ends_at", startsAt.toISOString())
              .not("status", "in", '("cancelled","no_show")')
              .limit(1);

            if (conflicts && conflicts.length > 0) {
              return new Response(JSON.stringify({ error: "TIME_CONFLICT" }), { status: 409, headers: CORS });
            }
          }

          // Find or create client
          let clientId: string | null = null;

          const { data: byEmail } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("clinic_id", clinic.id)
            .eq("email", data.email)
            .maybeSingle();
          if (byEmail) clientId = byEmail.id;

          if (!clientId) {
            const { data: byPhone } = await supabaseAdmin
              .from("clients")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("phone", data.phone)
              .maybeSingle();
            if (byPhone) clientId = byPhone.id;
          }

          if (!clientId) {
            const { data: newClient, error: clientErr } = await supabaseAdmin
              .from("clients")
              .insert({
                clinic_id: clinic.id,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                phone: data.phone,
                date_of_birth: data.dob || null,
                sms_consent: data.reminderConsent ?? false,
                email_consent: data.reminderConsent ?? false,
                marketing_consent: data.marketingConsent ?? false,
                tags: ["online-booking"],
                source: "online_booking",
              })
              .select("id")
              .single();

            if (clientErr || !newClient) {
              console.error("Client create error:", clientErr);
              return new Response(JSON.stringify({ error: "Could not create client record" }), { status: 500, headers: CORS });
            }
            clientId = newClient.id;
          }

          // Insert appointment
          const { data: appt, error: apptErr } = await supabaseAdmin
            .from("appointments")
            .insert({
              clinic_id: clinic.id,
              client_id: clientId,
              service_id: data.serviceId,
              staff_id: staffId,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              status: "confirmed",
              price_cents: service.price_cents,
              notes: data.notes ? `[Online] ${data.notes}` : "[Online booking]",
            })
            .select("id")
            .single();

          if (apptErr || !appt) {
            console.error("Appointment insert error:", apptErr);
            return new Response(JSON.stringify({ error: "Could not create appointment" }), { status: 500, headers: CORS });
          }

          // Create lead for tracking
          await supabaseAdmin.from("leads").insert({
            clinic_id: clinic.id,
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            source: "online_booking",
            stage: "won",
            estimated_value_cents: service.price_cents,
            notes: `Booked ${service.name} on ${data.date} at ${data.time} via public booking`,
          }).catch(() => {});

          // Send confirmation email via transactional email system
          try {
            const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && serviceKey) {
              const preferredTime = new Date(`${data.date}T${data.time}:00`).toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });

              await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceKey}`,
                },
              }).catch(() => {});

              // Enqueue email via RPC
              await supabaseAdmin.rpc("enqueue_email", {
                queue_name: "transactional_email_queue",
                payload: {
                  templateName: "booking-confirmation",
                  recipientEmail: data.email,
                  data: {
                    clientName: data.firstName,
                    clinicName: clinic.name,
                    serviceName: service.name,
                    preferredTime,
                    staffName: staffName !== "First available" ? staffName : undefined,
                  },
                },
              }).catch((err: unknown) => {
                console.error("Email enqueue failed:", err);
              });
            }
          } catch (emailErr) {
            console.error("Email send error:", emailErr);
            // Don't fail the booking if email fails
          }

          return new Response(JSON.stringify({ ok: true, appointmentId: appt.id }), { status: 200, headers: CORS });
        } catch (err) {
          if (err instanceof z.ZodError) {
            return new Response(JSON.stringify({ error: "Invalid request data", details: err.errors }), { status: 400, headers: CORS });
          }
          console.error("Booking error:", err);
          return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: CORS });
        }
      },
    },
  },
});
