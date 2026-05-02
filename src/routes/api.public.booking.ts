import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const BookingSchema = z.object({
  clinicSlug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  email: z.string().email().max(320).nullable(),
  phone: z.string().min(1).max(30).nullable(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).nullable(),
});

export const Route = createFileRoute("/api/public/booking")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
      POST: async ({ request }) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };

        try {
          const body = await request.json();
          const data = BookingSchema.parse(body);

          // Look up clinic
          const { data: clinic, error: clinicErr } = await supabaseAdmin
            .from("clinics")
            .select("id, timezone")
            .eq("slug", data.clinicSlug)
            .single();

          if (clinicErr || !clinic) {
            return new Response(JSON.stringify({ error: "Clinic not found" }), {
              status: 404,
              headers: corsHeaders,
            });
          }

          // Look up service
          const { data: service, error: svcErr } = await supabaseAdmin
            .from("services")
            .select("id, duration_minutes, price_cents")
            .eq("id", data.serviceId)
            .eq("clinic_id", clinic.id)
            .eq("active", true)
            .single();

          if (svcErr || !service) {
            return new Response(JSON.stringify({ error: "Service not available" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          // Create or find client
          const nameParts = data.name.split(" ");
          const firstName = nameParts[0] || data.name;
          const lastName = nameParts.slice(1).join(" ") || null;

          let clientId: string | null = null;

          // Try to find existing client by email or phone
          if (data.email) {
            const { data: existing } = await supabaseAdmin
              .from("clients")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("email", data.email)
              .maybeSingle();
            if (existing) clientId = existing.id;
          }

          if (!clientId && data.phone) {
            const { data: existing } = await supabaseAdmin
              .from("clients")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("phone", data.phone)
              .maybeSingle();
            if (existing) clientId = existing.id;
          }

          if (!clientId) {
            const { data: newClient, error: clientErr } = await supabaseAdmin
              .from("clients")
              .insert({
                clinic_id: clinic.id,
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                phone: data.phone,
                tags: ["online-booking"],
              })
              .select("id")
              .single();

            if (clientErr || !newClient) {
              return new Response(JSON.stringify({ error: "Could not create client record" }), {
                status: 500,
                headers: corsHeaders,
              });
            }
            clientId = newClient.id;
          }

          // Create appointment
          const startsAt = new Date(`${data.date}T${data.time}:00`);
          const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000);

          const { error: apptErr } = await supabaseAdmin.from("appointments").insert({
            clinic_id: clinic.id,
            client_id: clientId,
            service_id: data.serviceId,
            staff_id: data.staffId,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: "scheduled",
            price_cents: service.price_cents,
            notes: data.notes ? `[Online booking] ${data.notes}` : "[Online booking]",
          });

          if (apptErr) {
            console.error("Appointment insert error:", apptErr);
            return new Response(JSON.stringify({ error: "Could not create appointment" }), {
              status: 500,
              headers: corsHeaders,
            });
          }

          // Also create a lead for tracking
          await supabaseAdmin.from("leads").insert({
            clinic_id: clinic.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            source: "online_booking",
            stage: "won",
            estimated_value_cents: service.price_cents,
            notes: `Booked ${data.date} via public booking page`,
          });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err) {
          if (err instanceof z.ZodError) {
            return new Response(JSON.stringify({ error: "Invalid request data", details: err.errors }), {
              status: 400,
              headers: corsHeaders,
            });
          }
          console.error("Booking error:", err);
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      },
    },
  },
});
