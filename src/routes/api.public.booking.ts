import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public booking submission endpoint.
// Receives a booking request from the public /book/:slug page,
// inserts a lead, and enqueues two transactional emails:
//   - booking-confirmation → the client
//   - booking-lead-internal → the clinic owner
//
// This route is `/api/public/*` so it bypasses any app auth on published sites.

const BodySchema = z.object({
  clinicSlug: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  date: z.string().min(1).max(40),
  time: z.string().min(1).max(20),
  notes: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/booking")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          const json = await request.json();
          parsed = BodySchema.parse(json);
        } catch (err) {
          return Response.json(
            { error: "Invalid request", details: err instanceof Error ? err.message : String(err) },
            { status: 400 },
          );
        }

        const admin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });

        // Look up the clinic
        const { data: clinic, error: clinicErr } = await admin
          .from("clinics")
          .select("id, name, slug, currency, created_by")
          .eq("slug", parsed.clinicSlug)
          .maybeSingle();
        if (clinicErr || !clinic) {
          return Response.json({ error: "Clinic not found" }, { status: 404 });
        }

        // Service + staff lookups
        const [serviceRes, staffRes] = await Promise.all([
          admin
            .from("services")
            .select("id, name, price_cents, duration_minutes")
            .eq("id", parsed.serviceId)
            .eq("clinic_id", clinic.id)
            .maybeSingle(),
          parsed.staffId
            ? admin
                .from("staff")
                .select("id, display_name")
                .eq("id", parsed.staffId)
                .eq("clinic_id", clinic.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (serviceRes.error || !serviceRes.data) {
          return Response.json({ error: "Service not found" }, { status: 404 });
        }
        const service = serviceRes.data;
        const staff = staffRes.data ?? null;

        // Format the requested time
        let preferredTime = `${parsed.date} ${parsed.time}`;
        try {
          preferredTime = new Date(`${parsed.date}T${parsed.time}`).toLocaleString([], {
            dateStyle: "long",
            timeStyle: "short",
          });
        } catch {
          // keep raw fallback
        }

        const money = (cents: number) =>
          new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency: clinic.currency ?? "CAD",
          }).format(cents / 100);

        const noteText = [
          `📅 Requested: ${preferredTime}`,
          `💆 Service: ${service.name} (${service.duration_minutes} min · ${money(service.price_cents)})`,
          staff ? `👤 Provider: ${staff.display_name}` : "👤 Provider: No preference",
          parsed.notes?.trim() ? `\n📝 Client note:\n${parsed.notes.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        // Insert the lead (so the clinic can follow up / track funnel)
        const { data: lead, error: leadErr } = await admin
          .from("leads")
          .insert({
            clinic_id: clinic.id,
            name: parsed.name.trim(),
            email: parsed.email?.trim() || null,
            phone: parsed.phone?.trim() || null,
            source: "public_booking",
            stage: "consult_booked",
            estimated_value_cents: service.price_cents,
            notes: noteText,
          })
          .select("id")
          .single();
        if (leadErr || !lead) {
          console.error("Failed to insert lead", leadErr);
          return Response.json({ error: "Failed to save booking" }, { status: 500 });
        }

        // Try to find / create a matching client by email or phone, so the
        // appointment links to a real client row.
        let clientId: string | null = null;
        try {
          if (parsed.email?.trim()) {
            const { data: existing } = await admin
              .from("clients")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("email", parsed.email.trim())
              .maybeSingle();
            clientId = existing?.id ?? null;
          }
          if (!clientId && parsed.phone?.trim()) {
            const { data: existing } = await admin
              .from("clients")
              .select("id")
              .eq("clinic_id", clinic.id)
              .eq("phone", parsed.phone.trim())
              .maybeSingle();
            clientId = existing?.id ?? null;
          }
          if (!clientId) {
            const [first, ...rest] = parsed.name.trim().split(/\s+/);
            const { data: created } = await admin
              .from("clients")
              .insert({
                clinic_id: clinic.id,
                first_name: first || parsed.name.trim(),
                last_name: rest.join(" ") || null,
                email: parsed.email?.trim() || null,
                phone: parsed.phone?.trim() || null,
                tags: ["online-booking"],
              })
              .select("id")
              .single();
            clientId = created?.id ?? null;
          }
        } catch (err) {
          console.error("Client upsert failed", err);
        }

        // Create the appointment in `scheduled` status — clinic can confirm.
        let appointmentId: string | null = null;
        try {
          const startsAt = new Date(`${parsed.date}T${parsed.time}`);
          if (!Number.isNaN(startsAt.getTime())) {
            const endsAt = new Date(
              startsAt.getTime() + (service.duration_minutes ?? 60) * 60_000,
            );
            const { data: appt, error: apptErr } = await admin
              .from("appointments")
              .insert({
                clinic_id: clinic.id,
                client_id: clientId,
                service_id: service.id,
                staff_id: staff?.id ?? null,
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                status: "scheduled",
                price_cents: service.price_cents,
                notes: parsed.notes?.trim() || null,
              })
              .select("id")
              .single();
            if (apptErr) console.error("Failed to create appointment", apptErr);
            else appointmentId = appt?.id ?? null;
          }
        } catch (err) {
          console.error("Appointment insert threw", err);
        }

        // Look up the clinic owner's email so we can notify them.
        // We use the admin auth API since the auth.users table isn't directly readable.
        let ownerEmail: string | null = null;
        try {
          const { data: owner } = await admin.auth.admin.getUserById(clinic.created_by);
          ownerEmail = owner?.user?.email ?? null;
        } catch {
          ownerEmail = null;
        }

        // Helper to enqueue an email via the internal send route using a service-role JWT.
        // The send-transactional-email route requires a Bearer token; the service role key
        // is accepted because it's a valid JWT signed by the Supabase project.
        const origin = new URL(request.url).origin;
        const sendEmail = async (
          templateName: string,
          recipientEmail: string,
          templateData: Record<string, unknown>,
          idempotencyKey: string,
        ) => {
          try {
            const res = await fetch(`${origin}/lovable/email/transactional/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                templateName,
                recipientEmail,
                idempotencyKey,
                templateData,
              }),
            });
            if (!res.ok) {
              console.error("Email enqueue failed", {
                templateName,
                status: res.status,
                body: await res.text().catch(() => ""),
              });
            }
          } catch (err) {
            console.error("Email enqueue threw", { templateName, err });
          }
        };

        const sharedData = {
          clientName: parsed.name.trim(),
          clientEmail: parsed.email?.trim() || undefined,
          clientPhone: parsed.phone?.trim() || undefined,
          clinicName: clinic.name,
          serviceName: service.name,
          preferredTime,
          staffName: staff?.display_name,
          notes: parsed.notes?.trim() || undefined,
        };

        const tasks: Promise<unknown>[] = [];
        if (parsed.email?.trim()) {
          tasks.push(
            sendEmail(
              "booking-confirmation",
              parsed.email.trim(),
              sharedData,
              `booking-confirm-${lead.id}`,
            ),
          );
        }
        if (ownerEmail) {
          tasks.push(
            sendEmail(
              "booking-lead-internal",
              ownerEmail,
              sharedData,
              `booking-lead-${lead.id}`,
            ),
          );
        }
        // Fire-and-forget — don't block the response on email enqueue.
        // Errors are logged inside sendEmail.
        await Promise.allSettled(tasks);

        return Response.json({ success: true, leadId: lead.id });
      },
    },
  },
});
