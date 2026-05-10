import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Seeds a brand-new clinic with default content.
 * Uses requireSupabaseAuth middleware for secure authentication.
 */
export const seedClinicDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { force?: boolean } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const force = data?.force === true;

    // Get user's clinic
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id, role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!membership) throw new Error("No clinic found or insufficient role");

    const clinicId = membership.clinic_id;

    // Check if already seeded — only block if clinic has REAL content
    const { count: serviceCount } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);

    const { count: consentCount } = await supabase
      .from("consent_form_templates")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);

    if (!force && (serviceCount ?? 0) > 20 && (consentCount ?? 0) > 0) {
      return {
        seeded: false,
        message: `Clinic already has ${serviceCount} services and ${consentCount} consent forms`,
        summary: { services: serviceCount, consent_forms: consentCount },
      };
    }

    console.log(`Seeding clinic ${clinicId} (current: ${serviceCount ?? 0} services, force=${force})`);

    // ── Services ──
    const serviceCategories = [
      {
        category: "Injectables",
        services: [
          { name: "Botox - Forehead", duration_minutes: 30, price_cents: 35000 },
          { name: "Botox - Glabella (11s)", duration_minutes: 30, price_cents: 30000 },
          { name: "Botox - Crow's Feet", duration_minutes: 30, price_cents: 25000 },
          { name: "Botox - Full Face", duration_minutes: 45, price_cents: 75000 },
          { name: "Botox - Jawline Slimming", duration_minutes: 30, price_cents: 50000 },
          { name: "Botox - Lip Flip", duration_minutes: 15, price_cents: 15000 },
          { name: "Botox - Gummy Smile", duration_minutes: 15, price_cents: 20000 },
          { name: "Botox - Neck Bands", duration_minutes: 30, price_cents: 40000 },
          { name: "Dysport - Full Face", duration_minutes: 45, price_cents: 65000 },
          { name: "Dermal Filler - Lips (1ml)", duration_minutes: 45, price_cents: 70000 },
          { name: "Dermal Filler - Lips (0.5ml)", duration_minutes: 30, price_cents: 45000 },
          { name: "Dermal Filler - Cheeks", duration_minutes: 45, price_cents: 80000 },
          { name: "Dermal Filler - Jawline", duration_minutes: 60, price_cents: 90000 },
          { name: "Dermal Filler - Chin", duration_minutes: 45, price_cents: 70000 },
          { name: "Dermal Filler - Under Eyes", duration_minutes: 45, price_cents: 85000 },
          { name: "Dermal Filler - Nasolabial Folds", duration_minutes: 30, price_cents: 60000 },
          { name: "Dermal Filler - Marionette Lines", duration_minutes: 30, price_cents: 60000 },
          { name: "Filler Dissolving (Hyalenex)", duration_minutes: 30, price_cents: 35000 },
          { name: "Kybella - Double Chin", duration_minutes: 30, price_cents: 120000 },
          { name: "PRP Facial (Vampire Facial)", duration_minutes: 60, price_cents: 80000 },
        ],
      },
      {
        category: "Skin Treatments",
        services: [
          { name: "Chemical Peel - Light", duration_minutes: 30, price_cents: 15000 },
          { name: "Chemical Peel - Medium", duration_minutes: 45, price_cents: 25000 },
          { name: "Chemical Peel - Deep", duration_minutes: 60, price_cents: 40000 },
          { name: "Microneedling", duration_minutes: 60, price_cents: 35000 },
          { name: "Microneedling with PRP", duration_minutes: 75, price_cents: 55000 },
          { name: "HydraFacial - Signature", duration_minutes: 30, price_cents: 22000 },
          { name: "HydraFacial - Deluxe", duration_minutes: 60, price_cents: 35000 },
          { name: "HydraFacial - Platinum", duration_minutes: 75, price_cents: 45000 },
          { name: "Dermaplaning", duration_minutes: 30, price_cents: 15000 },
          { name: "LED Light Therapy", duration_minutes: 30, price_cents: 10000 },
          { name: "Oxygen Facial", duration_minutes: 45, price_cents: 20000 },
          { name: "Carbon Laser Facial", duration_minutes: 45, price_cents: 30000 },
        ],
      },
      {
        category: "Laser & Energy",
        services: [
          { name: "Laser Hair Removal - Small Area", duration_minutes: 15, price_cents: 10000 },
          { name: "Laser Hair Removal - Medium Area", duration_minutes: 30, price_cents: 20000 },
          { name: "Laser Hair Removal - Large Area", duration_minutes: 45, price_cents: 35000 },
          { name: "Laser Hair Removal - Full Body", duration_minutes: 120, price_cents: 80000 },
          { name: "IPL Photofacial", duration_minutes: 45, price_cents: 35000 },
          { name: "Laser Skin Resurfacing - Fractional", duration_minutes: 60, price_cents: 100000 },
          { name: "Laser Tattoo Removal (per session)", duration_minutes: 30, price_cents: 30000 },
          { name: "Laser Vein Treatment", duration_minutes: 30, price_cents: 25000 },
          { name: "CoolSculpting - 1 Cycle", duration_minutes: 60, price_cents: 75000 },
          { name: "RF Skin Tightening", duration_minutes: 45, price_cents: 40000 },
          { name: "HIFU Face Lift", duration_minutes: 60, price_cents: 150000 },
        ],
      },
      {
        category: "Body Contouring",
        services: [
          { name: "Body Sculpting Consultation", duration_minutes: 30, price_cents: 0 },
          { name: "CoolSculpting - Abdomen", duration_minutes: 60, price_cents: 80000 },
          { name: "CoolSculpting - Flanks", duration_minutes: 60, price_cents: 80000 },
          { name: "EMSculpt - Abdomen", duration_minutes: 30, price_cents: 50000 },
          { name: "EMSculpt - Buttocks", duration_minutes: 30, price_cents: 50000 },
          { name: "Cellulite Treatment", duration_minutes: 45, price_cents: 30000 },
        ],
      },
      {
        category: "Wellness & IV",
        services: [
          { name: "IV Drip - Hydration", duration_minutes: 45, price_cents: 20000 },
          { name: "IV Drip - Immune Boost", duration_minutes: 45, price_cents: 25000 },
          { name: "IV Drip - Beauty Glow", duration_minutes: 45, price_cents: 30000 },
          { name: "IV Drip - NAD+", duration_minutes: 120, price_cents: 50000 },
          { name: "B12 Injection", duration_minutes: 15, price_cents: 5000 },
          { name: "Vitamin D Injection", duration_minutes: 15, price_cents: 5000 },
          { name: "Weight Loss Consultation", duration_minutes: 30, price_cents: 0 },
          { name: "Semaglutide Injection", duration_minutes: 15, price_cents: 40000 },
        ],
      },
      {
        category: "Consultations",
        services: [
          { name: "New Patient Consultation", duration_minutes: 30, price_cents: 0 },
          { name: "Follow-Up Consultation", duration_minutes: 15, price_cents: 0 },
          { name: "Virtual Consultation", duration_minutes: 20, price_cents: 5000 },
          { name: "Treatment Plan Review", duration_minutes: 30, price_cents: 0 },
        ],
      },
    ];

    const serviceRows = serviceCategories.flatMap((cat) =>
      cat.services.map((s) => ({
        clinic_id: clinicId,
        name: s.name,
        category: cat.category,
        duration_minutes: s.duration_minutes,
        price_cents: s.price_cents,
        active: true,
      }))
    );

    await supabase.from("services").insert(serviceRows);

    // ── Consent Forms ──
    const consentForms = [
      {
        clinic_id: clinicId,
        title: "Botulinum Toxin (Botox/Dysport) Consent",
        body: "I understand that botulinum toxin injections are a cosmetic procedure. Risks include bruising, swelling, asymmetry, ptosis, headache, and allergic reaction. Results typically last 3-4 months. I confirm I am not pregnant or breastfeeding, and I have disclosed all medical conditions and medications.",
        active: true,
      },
      {
        clinic_id: clinicId,
        title: "Dermal Filler Consent",
        body: "I understand that dermal filler injections carry risks including bruising, swelling, infection, vascular occlusion, asymmetry, and nodule formation. I will avoid blood thinners 7 days prior. I understand results are temporary (6-18 months). Emergency protocols have been explained to me.",
        active: true,
      },
      {
        clinic_id: clinicId,
        title: "Laser/IPL Treatment Consent",
        body: "I understand that laser treatments carry risks including burns, blistering, hyperpigmentation, hypopigmentation, and scarring. I will avoid sun exposure 2 weeks before and after treatment. I confirm I have no photosensitive conditions and am not using retinoids or photosensitizing medications.",
        active: true,
      },
      {
        clinic_id: clinicId,
        title: "General Treatment Consent",
        body: "I consent to receive the proposed cosmetic treatment. I have been informed of the procedure, expected outcomes, risks, and alternatives. I understand that individual results may vary. I have had the opportunity to ask questions and all my questions have been answered satisfactorily.",
        active: true,
      },
      {
        clinic_id: clinicId,
        title: "Photo & Before/After Consent",
        body: "I authorize the clinic to take clinical photographs before, during, and after treatment for medical records. I understand these photos may be used for educational purposes, marketing, or social media with my identity anonymized, unless I provide additional written consent for identifiable use.",
        active: true,
      },
    ];

    await supabase.from("consent_form_templates").insert(consentForms.map(cf => ({
      clinic_id: cf.clinic_id,
      name: cf.title,
      body_html: cf.body,
      is_active: cf.active,
    })));

    // ── Automations ──
    const automations = [
      { name: "24h Appointment Reminder", trigger_event: "appointment_upcoming", action_type: "email", active: true },
      { name: "2h Appointment Reminder (SMS)", trigger_event: "appointment_upcoming", action_type: "sms", active: true },
      { name: "Post-Treatment Follow-Up (48h)", trigger_event: "appointment_completed", action_type: "email", active: true },
      { name: "Birthday Greeting + Offer", trigger_event: "client_birthday", action_type: "email", active: true },
      { name: "No-Show Follow-Up", trigger_event: "appointment_no_show", action_type: "email", active: true },
      { name: "Review Request (7 days post-visit)", trigger_event: "appointment_completed", action_type: "email", active: true },
      { name: "Rebook Nudge (30 days since last visit)", trigger_event: "client_inactive", action_type: "email", active: true },
      { name: "New Lead Welcome Email", trigger_event: "lead_created", action_type: "email", active: true },
      { name: "Loyalty Tier Upgrade Notification", trigger_event: "loyalty_tier_change", action_type: "email", active: true },
      { name: "Low Inventory Alert", trigger_event: "inventory_low", action_type: "email", active: true },
    ].map((a) => ({ ...a, clinic_id: clinicId }));

    await supabase.from("automations").insert(automations);

    // ── Memberships ──
    const memberships = [
      {
        clinic_id: clinicId,
        name: "Essential Glow",
        description: "Monthly HydraFacial + 10% off all services",
        monthly_price_cents: 14900,
        benefits: "1x HydraFacial Signature per month, 10% off all additional services, Priority booking",
        active: true,
      },
      {
        clinic_id: clinicId,
        name: "Premium Beauty",
        description: "Monthly treatment credit + exclusive perks",
        monthly_price_cents: 29900,
        benefits: "$200 monthly treatment credit, 15% off all services, Free consultations, Birthday bonus treatment",
        active: true,
      },
      {
        clinic_id: clinicId,
        name: "VIP All-Access",
        description: "Unlimited access to select treatments",
        monthly_price_cents: 49900,
        benefits: "Unlimited HydraFacials & LED, 20% off injectables, Complimentary add-ons, VIP scheduling",
        active: true,
      },
    ];

    await supabase.from("memberships").insert(memberships);

    return {
      seeded: true,
      summary: {
        services: serviceRows.length,
        consentForms: consentForms.length,
        automations: automations.length,
        memberships: memberships.length,
      },
    };
  });
