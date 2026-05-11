import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/client-auth-middleware";

/**
 * Seeds a brand-new clinic with default content.
 * Uses requireSupabaseAuth middleware for secure authentication.
 */
export const seedClinicDefaults = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((d: { force?: boolean; categories?: string[] } | undefined) => d ?? {})
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
          { name: "Botox Consultation", duration_minutes: 30, price_cents: 0, popular: true, description: "Initial assessment, treatment plan, no units injected." },
          { name: "Botox — Per Unit", duration_minutes: 5, price_cents: 1200, popular: true, description: "Per-unit pricing for precise dosing." },
          { name: "Botox — Upper Face (30u)", duration_minutes: 45, price_cents: 36000, popular: true, description: "Forehead, frown lines, crow's feet." },
          { name: "Botox — Full Face (50u)", duration_minutes: 60, price_cents: 60000, popular: true, description: "Comprehensive upper + lower face." },
          { name: "Botox — Neck Bands", duration_minutes: 30, price_cents: 28000, popular: false, description: "Softens vertical platysmal bands." },
          { name: "Botox — Masseter / Jawline Slimming", duration_minutes: 30, price_cents: 42000, popular: true, description: "Slims jawline, relieves bruxism." },
          { name: "Botox — Hyperhidrosis (Underarms)", duration_minutes: 45, price_cents: 80000, popular: false, description: "Reduces underarm sweating 4-6 months." },
          { name: "Dysport — Per Unit", duration_minutes: 5, price_cents: 500, popular: false, description: "Alternative neurotoxin, faster onset." },
          { name: "Xeomin — Per Unit", duration_minutes: 5, price_cents: 1100, popular: false, description: "Pure botulinum toxin, no additives." },
          { name: "Lip Filler — 0.5ml", duration_minutes: 45, price_cents: 42000, popular: true, description: "Subtle lip enhancement." },
          { name: "Lip Filler — 1ml", duration_minutes: 60, price_cents: 65000, popular: true, description: "Most popular lip enhancement." },
          { name: "Cheek Filler — 1ml", duration_minutes: 60, price_cents: 70000, popular: true, description: "Restores cheek volume." },
          { name: "Cheek Filler — 2ml", duration_minutes: 75, price_cents: 130000, popular: false, description: "Full cheek restoration." },
          { name: "Nasolabial Fold Filler", duration_minutes: 45, price_cents: 65000, popular: false, description: "Softens smile lines." },
          { name: "Chin Filler", duration_minutes: 45, price_cents: 70000, popular: false, description: "Enhances chin projection." },
          { name: "Jawline Filler", duration_minutes: 60, price_cents: 140000, popular: false, description: "Sharpens jawline. 2ml typical." },
          { name: "Under-Eye / Tear Trough Filler", duration_minutes: 45, price_cents: 75000, popular: true, description: "Reduces dark circles and hollowing." },
          { name: "Marionette Lines Filler", duration_minutes: 45, price_cents: 65000, popular: false, description: "Lifts mouth corners." },
          { name: "Temple Filler", duration_minutes: 45, price_cents: 70000, popular: false, description: "Restores temple hollowing." },
          { name: "Non-Surgical Rhinoplasty", duration_minutes: 60, price_cents: 85000, popular: false, description: "Liquid nose job, no surgery." },
          { name: "Hand Rejuvenation Filler", duration_minutes: 45, price_cents: 75000, popular: false, description: "Restores volume to aging hands." },
          { name: "Sculptra — Per Vial", duration_minutes: 60, price_cents: 85000, popular: false, description: "Bio-stimulator, collagen over 3-6 months." },
          { name: "Radiesse — Per Syringe", duration_minutes: 45, price_cents: 75000, popular: false, description: "Calcium hydroxylapatite filler." },
          { name: "Filler Dissolution (Hyaluronidase)", duration_minutes: 30, price_cents: 30000, popular: false, description: "Reverses hyaluronic acid filler." },
          { name: "PRP Facial Injection", duration_minutes: 60, price_cents: 65000, popular: true, description: "Vampire facial." },
          { name: "PRP Hair Restoration", duration_minutes: 60, price_cents: 70000, popular: false, description: "Per session, 3 sessions recommended." },
          { name: "Mesotherapy — Face", duration_minutes: 45, price_cents: 38000, popular: false, description: "Vitamin cocktail for glow." },
          { name: "Mesotherapy — Body", duration_minutes: 60, price_cents: 45000, popular: false, description: "Per session for fat and cellulite." },
          { name: "Kybella (Submental Fat)", duration_minutes: 45, price_cents: 90000, popular: false, description: "Permanent double-chin reduction." },
          { name: "Skinvive Microdroplets", duration_minutes: 45, price_cents: 75000, popular: false, description: "Hydrating cheek glow." },
        ],
      },
      {
        category: "Laser & Energy",
        services: [
          { name: "Laser Consultation", duration_minutes: 30, price_cents: 0, popular: true, description: "Skin typing and treatment plan." },
          { name: "Laser Hair Removal — Upper Lip", duration_minutes: 15, price_cents: 8000, popular: true, description: "Per session." },
          { name: "Laser Hair Removal — Chin", duration_minutes: 15, price_cents: 9000, popular: false, description: "Per session." },
          { name: "Laser Hair Removal — Full Face", duration_minutes: 30, price_cents: 18000, popular: false, description: "Per session." },
          { name: "Laser Hair Removal — Underarms", duration_minutes: 20, price_cents: 12000, popular: true, description: "Per session." },
          { name: "Laser Hair Removal — Bikini", duration_minutes: 30, price_cents: 18000, popular: false, description: "Standard bikini line." },
          { name: "Laser Hair Removal — Brazilian", duration_minutes: 45, price_cents: 25000, popular: true, description: "Complete bikini area." },
          { name: "Laser Hair Removal — Full Legs", duration_minutes: 60, price_cents: 38000, popular: true, description: "Thighs + calves." },
          { name: "Laser Hair Removal — Full Body", duration_minutes: 90, price_cents: 65000, popular: false, description: "All major areas." },
          { name: "Laser Hair Removal — Back (Male)", duration_minutes: 45, price_cents: 28000, popular: false, description: "Full back." },
          { name: "IPL Photofacial", duration_minutes: 45, price_cents: 32000, popular: true, description: "Sun damage and redness." },
          { name: "IPL for Rosacea", duration_minutes: 45, price_cents: 38000, popular: false, description: "Targets persistent rosacea." },
          { name: "Fraxel Laser Resurfacing", duration_minutes: 90, price_cents: 85000, popular: false, description: "Fractional skin renewal." },
          { name: "CO2 Fractional Laser", duration_minutes: 120, price_cents: 180000, popular: false, description: "Deep resurfacing, 7-10 day downtime." },
          { name: "Erbium Laser Peel", duration_minutes: 90, price_cents: 95000, popular: false, description: "Gentler resurfacing than CO2." },
          { name: "BBL BroadBand Light", duration_minutes: 60, price_cents: 42000, popular: false, description: "Anti-aging broadband light." },
          { name: "Forever Young BBL", duration_minutes: 75, price_cents: 58000, popular: false, description: "Anti-aging maintenance." },
          { name: "Laser Tattoo Removal — Small", duration_minutes: 15, price_cents: 12000, popular: false, description: "Up to 2 inches per session." },
          { name: "Laser Tattoo Removal — Medium", duration_minutes: 30, price_cents: 24000, popular: false, description: "2-5 inches per session." },
          { name: "Laser Tattoo Removal — Large", duration_minutes: 45, price_cents: 38000, popular: false, description: "Over 5 inches per session." },
          { name: "Laser Genesis", duration_minutes: 45, price_cents: 28000, popular: false, description: "Non-ablative rejuvenation." },
          { name: "Spider Vein Laser Treatment", duration_minutes: 30, price_cents: 24000, popular: false, description: "Per area." },
          { name: "Laser Skin Tightening (Titan)", duration_minutes: 60, price_cents: 45000, popular: false, description: "Infrared tightening." },
          { name: "Pico Laser — Pigmentation", duration_minutes: 45, price_cents: 42000, popular: false, description: "Melasma and age spots." },
          { name: "LaseMD / Thulium Laser", duration_minutes: 60, price_cents: 52000, popular: false, description: "Stamp resurfacing." },
        ],
      },
      {
        category: "Skin Treatments",
        services: [
          { name: "Express Facial", duration_minutes: 30, price_cents: 8000, popular: true, description: "Quick cleanse, exfoliate, mask, moisturize." },
          { name: "Signature Glow Facial", duration_minutes: 60, price_cents: 18000, popular: true, description: "Signature multi-step treatment." },
          { name: "HydraFacial — Express", duration_minutes: 30, price_cents: 18000, popular: false, description: "Cleanse, peel, hydrate." },
          { name: "HydraFacial — Signature", duration_minutes: 60, price_cents: 28000, popular: true, description: "Full treatment with boosters." },
          { name: "HydraFacial — Deluxe", duration_minutes: 75, price_cents: 38000, popular: false, description: "With LED and premium boosters." },
          { name: "HydraFacial — Platinum", duration_minutes: 90, price_cents: 48000, popular: false, description: "Full works with lymphatic drainage." },
          { name: "Oxygen Facial", duration_minutes: 60, price_cents: 22000, popular: false, description: "Intraceuticals oxygen infusion." },
          { name: "Anti-Aging Facial", duration_minutes: 75, price_cents: 24000, popular: false, description: "Wrinkle and elasticity targeting." },
          { name: "Brightening Facial (Vitamin C)", duration_minutes: 60, price_cents: 22000, popular: false, description: "Dullness and pigmentation." },
          { name: "Acne Facial", duration_minutes: 75, price_cents: 24000, popular: true, description: "Deep extraction + LED." },
          { name: "Back Facial", duration_minutes: 60, price_cents: 22000, popular: false, description: "Back acne and detox." },
          { name: "Teen Facial", duration_minutes: 45, price_cents: 14000, popular: false, description: "Educational, under 18, gentler." },
          { name: "Male Grooming Facial", duration_minutes: 60, price_cents: 20000, popular: false, description: "Built for men's skin." },
          { name: "Microdermabrasion", duration_minutes: 30, price_cents: 14000, popular: false, description: "Mechanical exfoliation." },
          { name: "Dermaplaning", duration_minutes: 30, price_cents: 12000, popular: true, description: "Removes peach fuzz and dead skin." },
          { name: "Dermaplaning + Facial", duration_minutes: 60, price_cents: 22000, popular: true, description: "Combo service." },
          { name: "Chemical Peel — Light (Glycolic)", duration_minutes: 30, price_cents: 12000, popular: true, description: "No downtime." },
          { name: "Chemical Peel — Medium (TCA)", duration_minutes: 45, price_cents: 28000, popular: false, description: "Some peeling 3-5 days." },
          { name: "Chemical Peel — Deep (Phenol)", duration_minutes: 60, price_cents: 62000, popular: false, description: "7-10 day recovery." },
          { name: "VI Peel", duration_minutes: 30, price_cents: 38000, popular: false, description: "Medical-grade peel." },
          { name: "Perfect Derma Peel", duration_minutes: 30, price_cents: 32000, popular: false, description: "Melasma-focused peel." },
          { name: "Microneedling", duration_minutes: 60, price_cents: 32000, popular: true, description: "Collagen induction." },
          { name: "Microneedling + PRP", duration_minutes: 90, price_cents: 58000, popular: true, description: "With growth factors." },
          { name: "Microneedling + Exosomes", duration_minutes: 75, price_cents: 68000, popular: false, description: "Advanced cellular regeneration." },
          { name: "RF Microneedling (Morpheus8)", duration_minutes: 75, price_cents: 95000, popular: true, description: "Skin tightening + texture." },
          { name: "LED Light Therapy", duration_minutes: 30, price_cents: 8000, popular: false, description: "Per session." },
          { name: "Mesoestetic Peel", duration_minutes: 45, price_cents: 28000, popular: false, description: "Combination peel for hyperpigmentation." },
          { name: "Bridal Pre-Wedding Facial", duration_minutes: 90, price_cents: 32000, popular: false, description: "Luxe session before wedding." },
          { name: "Back Polish / Body Facial", duration_minutes: 60, price_cents: 22000, popular: false, description: "Full back with extraction." },
          { name: "Hand Rejuvenation Treatment", duration_minutes: 45, price_cents: 18000, popular: false, description: "Hand facial with peel and mask." },
        ],
      },
      {
        category: "Body Contouring",
        services: [
          { name: "Body Contouring Consultation", duration_minutes: 45, price_cents: 0, popular: true, description: "Body assessment and plan." },
          { name: "CoolSculpting — Small Area", duration_minutes: 60, price_cents: 70000, popular: false, description: "Per applicator." },
          { name: "CoolSculpting — Large Area", duration_minutes: 75, price_cents: 120000, popular: false, description: "Per applicator." },
          { name: "Emsculpt NEO — Single Area", duration_minutes: 30, price_cents: 75000, popular: true, description: "Per session." },
          { name: "Emsculpt NEO — Package Session", duration_minutes: 30, price_cents: 65000, popular: false, description: "In-package pricing." },
          { name: "Velashape / Body Sculpting", duration_minutes: 45, price_cents: 28000, popular: false, description: "Per area, per session." },
          { name: "Cellulite Reduction Treatment", duration_minutes: 60, price_cents: 32000, popular: false, description: "Per session." },
          { name: "RF Skin Tightening (Body)", duration_minutes: 60, price_cents: 38000, popular: false, description: "Per area." },
          { name: "Ultherapy — Face", duration_minutes: 90, price_cents: 280000, popular: false, description: "Non-surgical face lift, HIFU." },
          { name: "Ultherapy — Neck", duration_minutes: 60, price_cents: 140000, popular: false, description: "Chin and neck tightening." },
          { name: "Lymphatic Drainage Massage", duration_minutes: 60, price_cents: 18000, popular: false, description: "Detox and post-surgical support." },
          { name: "Post-Surgery Recovery Package", duration_minutes: 90, price_cents: 28000, popular: false, description: "Per session." },
          { name: "Endermologie LPG", duration_minutes: 45, price_cents: 22000, popular: false, description: "Cellulite + skin tone." },
          { name: "Wood Therapy", duration_minutes: 60, price_cents: 18000, popular: false, description: "Manual sculpting." },
          { name: "Sauna — Infrared", duration_minutes: 45, price_cents: 6000, popular: false, description: "Per session." },
          { name: "IV Therapy — Hydration", duration_minutes: 45, price_cents: 18000, popular: true, description: "Basic saline + vitamins." },
          { name: "IV Therapy — Myers Cocktail", duration_minutes: 60, price_cents: 24000, popular: true, description: "Classic wellness blend." },
          { name: "IV Therapy — NAD+", duration_minutes: 120, price_cents: 65000, popular: false, description: "Premium anti-aging infusion." },
          { name: "IV Therapy — Glutathione", duration_minutes: 60, price_cents: 28000, popular: false, description: "Skin brightening antioxidant." },
          { name: "IV Therapy — Immunity Boost", duration_minutes: 45, price_cents: 22000, popular: false, description: "High-dose vitamin C and zinc." },
          { name: "Vitamin Injection — B12", duration_minutes: 15, price_cents: 4000, popular: true, description: "Energy boost, walk-in." },
          { name: "Vitamin Injection — Lipo-C", duration_minutes: 15, price_cents: 6000, popular: false, description: "Weight loss support." },
          { name: "Semaglutide Consultation", duration_minutes: 30, price_cents: 0, popular: true, description: "Medical weight loss assessment." },
          { name: "Semaglutide Weekly Injection", duration_minutes: 15, price_cents: 28000, popular: true, description: "Per dose with monitoring." },
          { name: "HCG Weight Loss Consultation", duration_minutes: 30, price_cents: 0, popular: false, description: "Program assessment." },
          { name: "Cryotherapy — Whole Body", duration_minutes: 5, price_cents: 6000, popular: false, description: "Per session." },
          { name: "Red Light Therapy Bed", duration_minutes: 20, price_cents: 6000, popular: false, description: "Per session." },
        ],
      },
      {
        category: "PMU",
        services: [
          { name: "PMU Consultation", duration_minutes: 30, price_cents: 0, popular: true, description: "Color match and design." },
          { name: "Microblading Eyebrows — Initial", duration_minutes: 150, price_cents: 68000, popular: true, description: "Includes 2 sessions over 6-8 weeks." },
          { name: "Microblading Touch-Up (6 weeks)", duration_minutes: 90, price_cents: 0, popular: false, description: "Included with initial." },
          { name: "Microblading Annual Refresh", duration_minutes: 90, price_cents: 38000, popular: false, description: "Yearly boost." },
          { name: "Powder Brows / Ombré Brows", duration_minutes: 150, price_cents: 72000, popular: true, description: "Shaded powder look." },
          { name: "Combo Brows", duration_minutes: 180, price_cents: 85000, popular: false, description: "Hair strokes + shading." },
          { name: "Nano Brows", duration_minutes: 180, price_cents: 92000, popular: false, description: "Finest hair-stroke technique." },
          { name: "Lip Blush / Lip Tattoo", duration_minutes: 150, price_cents: 75000, popular: true, description: "Tinted natural lip color." },
          { name: "Lip Liner Permanent Makeup", duration_minutes: 120, price_cents: 65000, popular: false, description: "Definition only." },
          { name: "Full Lip Color PMU", duration_minutes: 180, price_cents: 85000, popular: false, description: "Complete lip color." },
          { name: "Eyeliner — Top Lash Line", duration_minutes: 90, price_cents: 38000, popular: false, description: "Lash line only." },
          { name: "Eyeliner — Top + Bottom", duration_minutes: 120, price_cents: 58000, popular: false, description: "Complete eyeliner." },
          { name: "Beauty Mark / Freckles", duration_minutes: 45, price_cents: 18000, popular: false, description: "Per session." },
          { name: "Scalp Micropigmentation", duration_minutes: 120, price_cents: 85000, popular: false, description: "Per session." },
          { name: "Areola Restoration (Medical)", duration_minutes: 180, price_cents: 95000, popular: false, description: "Post-mastectomy." },
          { name: "Scar Camouflage", duration_minutes: 120, price_cents: 65000, popular: false, description: "Per area." },
          { name: "Stretch Mark Camouflage", duration_minutes: 120, price_cents: 75000, popular: false, description: "Per area." },
          { name: "PMU Removal (Saline)", duration_minutes: 60, price_cents: 28000, popular: false, description: "Per session." },
          { name: "PMU Correction", duration_minutes: 120, price_cents: 45000, popular: false, description: "Color correction." },
        ],
      },
      {
        category: "Hair",
        services: [
          { name: "Women's Haircut + Style", duration_minutes: 45, price_cents: 6500, popular: true, description: "Cut, wash, blow dry." },
          { name: "Men's Haircut", duration_minutes: 30, price_cents: 4000, popular: true, description: "Classic men's cut." },
          { name: "Men's Haircut + Beard Trim", duration_minutes: 45, price_cents: 5500, popular: true, description: "Cut + beard combo." },
          { name: "Kids' Haircut (under 12)", duration_minutes: 30, price_cents: 2800, popular: false, description: "Children's cut." },
          { name: "Blow Dry Only", duration_minutes: 30, price_cents: 4500, popular: false, description: "Wash and style." },
          { name: "Hair Wash + Scalp Massage", duration_minutes: 20, price_cents: 2500, popular: false, description: "Relaxing wash." },
          { name: "Bridal Hair — Trial", duration_minutes: 90, price_cents: 12000, popular: false, description: "Preview before wedding." },
          { name: "Bridal Hair — Wedding Day", duration_minutes: 90, price_cents: 22000, popular: false, description: "Wedding day styling." },
          { name: "Single Process Color", duration_minutes: 90, price_cents: 12000, popular: true, description: "All-over base color." },
          { name: "Root Touch-Up", duration_minutes: 60, price_cents: 8000, popular: true, description: "Regrowth only." },
          { name: "Highlights — Partial", duration_minutes: 120, price_cents: 18000, popular: true, description: "Top and front sections." },
          { name: "Highlights — Full", duration_minutes: 150, price_cents: 24000, popular: true, description: "All-over highlights." },
          { name: "Balayage", duration_minutes: 180, price_cents: 28000, popular: true, description: "Hand-painted natural color." },
          { name: "Ombré / Sombré", duration_minutes: 180, price_cents: 28000, popular: false, description: "Gradient color." },
          { name: "Color Correction Consultation", duration_minutes: 30, price_cents: 0, popular: false, description: "Required for complex color." },
          { name: "Color Correction", duration_minutes: 240, price_cents: 38000, popular: false, description: "Starting price." },
          { name: "Keratin Smoothing Treatment", duration_minutes: 150, price_cents: 28000, popular: false, description: "4-6 month frizz reduction." },
          { name: "Brazilian Blowout", duration_minutes: 180, price_cents: 32000, popular: false, description: "Longer-lasting smoothing." },
          { name: "Olaplex Treatment", duration_minutes: 45, price_cents: 6000, popular: false, description: "Bond repair." },
          { name: "Deep Conditioning Treatment", duration_minutes: 45, price_cents: 4500, popular: false, description: "Intensive mask." },
          { name: "Hair Gloss / Glaze", duration_minutes: 45, price_cents: 6500, popular: false, description: "Shine boost." },
          { name: "Perm / Permanent Wave", duration_minutes: 150, price_cents: 14000, popular: false, description: "Classic perm." },
          { name: "Extensions — Tape-In Install", duration_minutes: 120, price_cents: 38000, popular: false, description: "Labor only." },
          { name: "Extensions — Tape-In Re-Install", duration_minutes: 90, price_cents: 18000, popular: false, description: "6-8 week maintenance." },
          { name: "Extensions — Keratin Bond Install", duration_minutes: 240, price_cents: 68000, popular: false, description: "Labor only." },
          { name: "Extensions — I-Tip Install", duration_minutes: 180, price_cents: 52000, popular: false, description: "Labor only." },
          { name: "Updo / Formal Style", duration_minutes: 60, price_cents: 12000, popular: false, description: "Events, weddings." },
          { name: "Braiding — Box Braids", duration_minutes: 240, price_cents: 28000, popular: false, description: "Starting price." },
          { name: "Braiding — Cornrows", duration_minutes: 120, price_cents: 14000, popular: false, description: "Starting price." },
          { name: "Natural Hair Styling", duration_minutes: 120, price_cents: 18000, popular: false, description: "Texture-specific." },
          { name: "Men's Hot Towel Shave", duration_minutes: 45, price_cents: 5500, popular: false, description: "Traditional barber shave." },
        ],
      },
      {
        category: "Nails",
        services: [
          { name: "Classic Manicure", duration_minutes: 30, price_cents: 3500, popular: true, description: "Shape, cuticle care, polish." },
          { name: "Gel Manicure", duration_minutes: 45, price_cents: 5000, popular: true, description: "2-3 week wear." },
          { name: "Shellac / CND Manicure", duration_minutes: 45, price_cents: 5500, popular: false, description: "Premium gel system." },
          { name: "Acrylic Full Set", duration_minutes: 90, price_cents: 6500, popular: true, description: "Artificial nail application." },
          { name: "Acrylic Fill", duration_minutes: 60, price_cents: 4500, popular: true, description: "2-3 week maintenance." },
          { name: "Gel-X / Soft Gel Extensions", duration_minutes: 90, price_cents: 7500, popular: true, description: "Press-on gel extensions." },
          { name: "Dip Powder Manicure", duration_minutes: 60, price_cents: 6000, popular: false, description: "Long-lasting powder." },
          { name: "Classic Pedicure", duration_minutes: 45, price_cents: 5000, popular: true, description: "Basic foot care and polish." },
          { name: "Spa Pedicure", duration_minutes: 60, price_cents: 6500, popular: true, description: "With scrub, mask, massage." },
          { name: "Luxury Pedicure", duration_minutes: 90, price_cents: 9500, popular: false, description: "Full spa with paraffin." },
          { name: "Gel Pedicure", duration_minutes: 60, price_cents: 6500, popular: false, description: "Gel polish for feet." },
          { name: "Paraffin Hand Treatment", duration_minutes: 20, price_cents: 2000, popular: false, description: "Warm wax soak." },
          { name: "Nail Art — Simple", duration_minutes: 15, price_cents: 500, popular: false, description: "Per nail." },
          { name: "Nail Art — Advanced", duration_minutes: 30, price_cents: 1500, popular: false, description: "Per nail." },
          { name: "French Manicure Upcharge", duration_minutes: 15, price_cents: 1000, popular: false, description: "Add-on." },
          { name: "Polish Change — Hands", duration_minutes: 15, price_cents: 2000, popular: false, description: "No shaping." },
          { name: "Polish Change — Feet", duration_minutes: 15, price_cents: 2500, popular: false, description: "No shaping." },
          { name: "Nail Repair", duration_minutes: 15, price_cents: 1000, popular: false, description: "Per nail." },
          { name: "Cuticle Treatment", duration_minutes: 20, price_cents: 2000, popular: false, description: "Add-on." },
          { name: "Russian Manicure (E-File)", duration_minutes: 60, price_cents: 8000, popular: false, description: "Precision dry technique." },
        ],
      },
      {
        category: "Lash, Brow & Wax",
        services: [
          { name: "Classic Lash Extensions — Full Set", duration_minutes: 120, price_cents: 18000, popular: true, description: "1:1 lash application." },
          { name: "Hybrid Lash Extensions — Full Set", duration_minutes: 150, price_cents: 22000, popular: true, description: "Mix classic + volume." },
          { name: "Volume Lash Extensions — Full Set", duration_minutes: 180, price_cents: 26000, popular: true, description: "2-6 lashes per natural." },
          { name: "Mega Volume Extensions — Full Set", duration_minutes: 180, price_cents: 32000, popular: false, description: "10+ lashes per natural." },
          { name: "Lash Fill — 2 Weeks", duration_minutes: 60, price_cents: 7500, popular: true, description: "2-week touch-up." },
          { name: "Lash Fill — 3 Weeks", duration_minutes: 75, price_cents: 9000, popular: true, description: "3-week touch-up." },
          { name: "Lash Lift", duration_minutes: 60, price_cents: 8500, popular: true, description: "Natural curl 6-8 weeks." },
          { name: "Lash Lift + Tint", duration_minutes: 75, price_cents: 11000, popular: false, description: "Combo for fuller look." },
          { name: "Lash Tint Only", duration_minutes: 30, price_cents: 3500, popular: false, description: "Quick darkening." },
          { name: "Strip Lash Application", duration_minutes: 20, price_cents: 2500, popular: false, description: "Temporary glam." },
          { name: "Brow Shaping — Wax", duration_minutes: 20, price_cents: 2000, popular: true, description: "Wax and tweeze." },
          { name: "Brow Shaping — Threading", duration_minutes: 20, price_cents: 2000, popular: false, description: "Precise threading." },
          { name: "Brow Tint", duration_minutes: 20, price_cents: 2500, popular: false, description: "Color boost." },
          { name: "Brow Lamination", duration_minutes: 45, price_cents: 6000, popular: true, description: "Fluffy brushed-up look." },
          { name: "Brow Lamination + Tint", duration_minutes: 60, price_cents: 8000, popular: false, description: "Combo for max impact." },
          { name: "Brow Tint + Shape", duration_minutes: 30, price_cents: 4000, popular: false, description: "Color + shape." },
          { name: "Henna Brows", duration_minutes: 45, price_cents: 5000, popular: false, description: "Plant-based tint." },
          { name: "Upper Lip Wax", duration_minutes: 10, price_cents: 1500, popular: false, description: "Quick, precise." },
          { name: "Chin Wax", duration_minutes: 10, price_cents: 1500, popular: false, description: "Quick chin." },
          { name: "Full Face Wax", duration_minutes: 30, price_cents: 5500, popular: false, description: "Brows, lip, chin, sides." },
          { name: "Underarm Wax", duration_minutes: 15, price_cents: 2500, popular: false, description: "Standard underarm." },
          { name: "Half Arm Wax", duration_minutes: 20, price_cents: 3000, popular: false, description: "Below elbow." },
          { name: "Full Arm Wax", duration_minutes: 30, price_cents: 4500, popular: false, description: "Complete arm." },
          { name: "Half Leg Wax", duration_minutes: 30, price_cents: 4500, popular: false, description: "Below knee." },
          { name: "Full Leg Wax", duration_minutes: 45, price_cents: 7500, popular: false, description: "Complete leg." },
          { name: "Bikini Wax", duration_minutes: 20, price_cents: 4000, popular: false, description: "Standard bikini." },
          { name: "Brazilian Wax", duration_minutes: 30, price_cents: 6500, popular: true, description: "Complete bikini area." },
          { name: "Back Wax — Male", duration_minutes: 30, price_cents: 5500, popular: false, description: "Full back." },
          { name: "Chest Wax — Male", duration_minutes: 30, price_cents: 5500, popular: false, description: "Full chest." },
          { name: "Nose Wax", duration_minutes: 10, price_cents: 1500, popular: false, description: "Safe nose hair removal." },
          { name: "Ear Wax", duration_minutes: 10, price_cents: 1500, popular: false, description: "Quick ear hair." },
        ],
      },
      {
        category: "Dental — Preventive",
        services: [
          { name: "New Patient Exam + X-Rays", duration_minutes: 60, price_cents: 18000, popular: true, description: "Comprehensive exam." },
          { name: "Recall Exam + Cleaning", duration_minutes: 60, price_cents: 15000, popular: true, description: "Every 6 months." },
          { name: "Cleaning — Prophylaxis", duration_minutes: 45, price_cents: 12000, popular: true, description: "Above gumline." },
          { name: "Cleaning — Deep Scaling", duration_minutes: 90, price_cents: 28000, popular: false, description: "Per quadrant." },
          { name: "Periodontal Maintenance", duration_minutes: 60, price_cents: 18000, popular: false, description: "Every 3 months." },
          { name: "Pediatric Exam + Cleaning", duration_minutes: 45, price_cents: 12000, popular: true, description: "Child under 12." },
          { name: "Emergency Exam", duration_minutes: 30, price_cents: 9000, popular: false, description: "Urgent visit." },
          { name: "Fluoride Treatment", duration_minutes: 15, price_cents: 4000, popular: false, description: "Preventive." },
          { name: "Sealant — Per Tooth", duration_minutes: 15, price_cents: 6000, popular: false, description: "Preventive sealant." },
        ],
      },
      {
        category: "Dental — Restorative",
        services: [
          { name: "Composite Filling — 1 Surface", duration_minutes: 45, price_cents: 18000, popular: true, description: "Tooth-colored composite." },
          { name: "Composite Filling — 2 Surfaces", duration_minutes: 60, price_cents: 24000, popular: false, description: "Larger composite." },
          { name: "Composite Filling — 3+ Surfaces", duration_minutes: 75, price_cents: 32000, popular: false, description: "Multiple surfaces." },
          { name: "Amalgam Filling", duration_minutes: 45, price_cents: 16000, popular: false, description: "Silver filling." },
          { name: "Crown — Porcelain", duration_minutes: 90, price_cents: 120000, popular: true, description: "Lab-made porcelain." },
          { name: "Crown — Zirconia", duration_minutes: 90, price_cents: 145000, popular: false, description: "Strongest material." },
          { name: "Crown — Same-Day (CEREC)", duration_minutes: 120, price_cents: 150000, popular: false, description: "Single visit milled." },
          { name: "Bonding — Per Tooth", duration_minutes: 45, price_cents: 28000, popular: false, description: "Cosmetic repair." },
          { name: "Dental Implant — Single", duration_minutes: 90, price_cents: 320000, popular: false, description: "Per implant + abutment." },
          { name: "Implant Consultation + CBCT", duration_minutes: 60, price_cents: 15000, popular: true, description: "3D imaging." },
          { name: "Denture — Full Upper/Lower", duration_minutes: 90, price_cents: 240000, popular: false, description: "Acrylic complete." },
          { name: "Denture — Partial", duration_minutes: 90, price_cents: 180000, popular: false, description: "Removable with framework." },
          { name: "Bridge — 3 Unit", duration_minutes: 120, price_cents: 360000, popular: false, description: "Traditional bridge." },
        ],
      },
      {
        category: "Dental — Cosmetic",
        services: [
          { name: "Veneer — Single Tooth", duration_minutes: 120, price_cents: 120000, popular: false, description: "Porcelain veneer." },
          { name: "Veneers — Full Set (10)", duration_minutes: 300, price_cents: 1200000, popular: false, description: "Smile transformation." },
          { name: "Teeth Whitening — Zoom In-Office", duration_minutes: 90, price_cents: 48000, popular: true, description: "1-hour in-chair." },
          { name: "Teeth Whitening — Take-Home Kit", duration_minutes: 30, price_cents: 28000, popular: true, description: "Custom trays." },
          { name: "Invisalign Consultation", duration_minutes: 45, price_cents: 0, popular: true, description: "3D scan preview." },
          { name: "Invisalign — Full Treatment", duration_minutes: 60, price_cents: 580000, popular: true, description: "Typical 12-month case." },
          { name: "Invisalign — Teen", duration_minutes: 60, price_cents: 520000, popular: false, description: "Teen pricing." },
          { name: "Invisalign — Express", duration_minutes: 60, price_cents: 380000, popular: false, description: "6-month case." },
          { name: "Braces — Traditional Metal", duration_minutes: 60, price_cents: 480000, popular: false, description: "24-month metal." },
          { name: "Braces — Ceramic (Clear)", duration_minutes: 60, price_cents: 560000, popular: false, description: "Tooth-colored brackets." },
        ],
      },
      {
        category: "Dental — Surgical",
        services: [
          { name: "Root Canal — Anterior", duration_minutes: 90, price_cents: 85000, popular: false, description: "Front tooth." },
          { name: "Root Canal — Premolar", duration_minutes: 90, price_cents: 95000, popular: false, description: "Middle tooth." },
          { name: "Root Canal — Molar", duration_minutes: 120, price_cents: 120000, popular: false, description: "Back tooth." },
          { name: "Extraction — Simple", duration_minutes: 30, price_cents: 18000, popular: false, description: "Straightforward extraction." },
          { name: "Extraction — Surgical", duration_minutes: 60, price_cents: 32000, popular: false, description: "Complex with bone work." },
          { name: "Wisdom Tooth Extraction", duration_minutes: 45, price_cents: 38000, popular: false, description: "Per tooth." },
          { name: "Night Guard", duration_minutes: 45, price_cents: 48000, popular: false, description: "Custom bruxism appliance." },
          { name: "Sports Mouth Guard", duration_minutes: 30, price_cents: 18000, popular: false, description: "Athletic guard." },
          { name: "TMJ Consultation", duration_minutes: 45, price_cents: 14000, popular: false, description: "Jaw pain assessment." },
          { name: "Sleep Apnea Appliance", duration_minutes: 60, price_cents: 220000, popular: false, description: "Custom MAD device." },
          { name: "Laser Gum Therapy", duration_minutes: 60, price_cents: 68000, popular: false, description: "Per quadrant." },
          { name: "Gum Contouring (Laser)", duration_minutes: 60, price_cents: 45000, popular: false, description: "Per arch." },
        ],
      },
      {
        category: "Dermatology",
        services: [
          { name: "Dermatology Consultation", duration_minutes: 30, price_cents: 18000, popular: true, description: "General skin exam." },
          { name: "Full Body Skin Exam (Mole Check)", duration_minutes: 45, price_cents: 22000, popular: true, description: "Annual cancer screening." },
          { name: "Dermoscopy Exam", duration_minutes: 30, price_cents: 18000, popular: false, description: "Detailed mole exam." },
          { name: "Mole Removal — Shave", duration_minutes: 30, price_cents: 28000, popular: false, description: "Shave technique." },
          { name: "Mole Removal — Excision", duration_minutes: 45, price_cents: 42000, popular: false, description: "Surgical with sutures." },
          { name: "Skin Biopsy", duration_minutes: 30, price_cents: 35000, popular: false, description: "Includes pathology." },
          { name: "Cryotherapy — Wart / Skin Tag", duration_minutes: 15, price_cents: 9500, popular: false, description: "Per lesion." },
          { name: "Electrocautery", duration_minutes: 20, price_cents: 18000, popular: false, description: "Per area heat removal." },
          { name: "Acne Consultation + Plan", duration_minutes: 45, price_cents: 22000, popular: true, description: "Initial visit." },
          { name: "Acne Follow-Up", duration_minutes: 20, price_cents: 12000, popular: true, description: "Review treatment." },
          { name: "Accutane Consultation", duration_minutes: 45, price_cents: 24000, popular: false, description: "iPLEDGE enrollment." },
          { name: "Accutane Monthly Follow-Up", duration_minutes: 20, price_cents: 12000, popular: false, description: "Required monitoring." },
          { name: "Cortisone Injection (Cyst)", duration_minutes: 15, price_cents: 8000, popular: false, description: "Inflamed acne." },
          { name: "Eczema / Dermatitis Consult", duration_minutes: 30, price_cents: 18000, popular: false, description: "Diagnosis and plan." },
          { name: "Psoriasis Consultation", duration_minutes: 45, price_cents: 22000, popular: false, description: "With biologic eligibility." },
          { name: "Rosacea Treatment Plan", duration_minutes: 45, price_cents: 22000, popular: false, description: "With laser quote." },
          { name: "Hair Loss Consultation", duration_minutes: 45, price_cents: 22000, popular: false, description: "Diagnostic workup." },
          { name: "Nail Fungus Consultation", duration_minutes: 30, price_cents: 18000, popular: false, description: "Possible KOH test." },
          { name: "Skin Tag Removal", duration_minutes: 20, price_cents: 12000, popular: false, description: "Per tag." },
          { name: "Seborrheic Keratosis Removal", duration_minutes: 20, price_cents: 14000, popular: false, description: "Per lesion." },
          { name: "Cherry Angioma Removal", duration_minutes: 20, price_cents: 12000, popular: false, description: "Per area laser." },
          { name: "Phototherapy — UVB Session", duration_minutes: 15, price_cents: 8000, popular: false, description: "Per session." },
          { name: "Patch Testing (Allergy)", duration_minutes: 60, price_cents: 42000, popular: false, description: "48-72hr panel." },
          { name: "Wart Treatment Series", duration_minutes: 20, price_cents: 9500, popular: false, description: "Per visit." },
          { name: "Molluscum Removal", duration_minutes: 20, price_cents: 14000, popular: false, description: "Per session." },
          { name: "MOHS Surgery Consultation", duration_minutes: 60, price_cents: 38000, popular: false, description: "Pre-surgery for skin cancer." },
          { name: "MOHS Surgery", duration_minutes: 180, price_cents: 180000, popular: false, description: "Per stage." },
          { name: "Sclerotherapy (Spider Veins)", duration_minutes: 30, price_cents: 32000, popular: false, description: "Per session for legs." },
          { name: "Skin Cancer Surveillance", duration_minutes: 30, price_cents: 18000, popular: false, description: "Follow-up monitoring." },
          { name: "Cosmetic Mole Removal", duration_minutes: 45, price_cents: 38000, popular: false, description: "Non-medical removal." },
        ],
      },
      {
        category: "Physio & Chiro",
        services: [
          { name: "Physiotherapy — Initial", duration_minutes: 60, price_cents: 14000, popular: true, description: "First visit assessment." },
          { name: "Physiotherapy — Follow-Up", duration_minutes: 45, price_cents: 9500, popular: true, description: "Subsequent treatment." },
          { name: "Physiotherapy — Extended", duration_minutes: 60, price_cents: 12000, popular: false, description: "Complex cases." },
          { name: "Chiropractic — Initial", duration_minutes: 60, price_cents: 14000, popular: true, description: "First visit exam." },
          { name: "Chiropractic — Adjustment", duration_minutes: 30, price_cents: 7000, popular: true, description: "Standard adjustment." },
          { name: "Chiropractic — Extended", duration_minutes: 45, price_cents: 9500, popular: false, description: "With modalities." },
          { name: "Osteopathy — Initial", duration_minutes: 60, price_cents: 15000, popular: false, description: "First visit." },
          { name: "Osteopathy — Follow-Up", duration_minutes: 45, price_cents: 12000, popular: false, description: "Subsequent treatment." },
          { name: "Kinesiology Session", duration_minutes: 60, price_cents: 11000, popular: false, description: "Movement therapy." },
          { name: "Athletic Therapy", duration_minutes: 60, price_cents: 11000, popular: false, description: "Sport rehabilitation." },
        ],
      },
      {
        category: "Massage",
        services: [
          { name: "Massage — Swedish 60 min", duration_minutes: 60, price_cents: 11000, popular: true, description: "Classic relaxation massage." },
          { name: "Massage — Swedish 90 min", duration_minutes: 90, price_cents: 15000, popular: true, description: "Extended Swedish." },
          { name: "Massage — Deep Tissue 60 min", duration_minutes: 60, price_cents: 12000, popular: true, description: "Targeted firmer pressure." },
          { name: "Massage — Deep Tissue 90 min", duration_minutes: 90, price_cents: 16500, popular: false, description: "Extended deep tissue." },
          { name: "Massage — Sports / Therapeutic", duration_minutes: 60, price_cents: 12500, popular: false, description: "Athletic recovery." },
          { name: "Massage — Hot Stone", duration_minutes: 90, price_cents: 16000, popular: false, description: "With heated basalt." },
          { name: "Massage — Prenatal", duration_minutes: 60, price_cents: 12000, popular: false, description: "Pregnancy-safe." },
          { name: "Massage — Lymphatic Drainage", duration_minutes: 60, price_cents: 14000, popular: false, description: "Post-surgical or detox." },
          { name: "Couples Massage", duration_minutes: 60, price_cents: 22000, popular: false, description: "Two therapists." },
          { name: "Reflexology", duration_minutes: 60, price_cents: 9000, popular: false, description: "Foot pressure point therapy." },
          { name: "Cupping Therapy", duration_minutes: 30, price_cents: 6000, popular: false, description: "Add-on or standalone." },
          { name: "Myofascial Release", duration_minutes: 60, price_cents: 13000, popular: false, description: "Connective tissue work." },
        ],
      },
      {
        category: "Holistic & Wellness",
        services: [
          { name: "Acupuncture — Initial", duration_minutes: 75, price_cents: 14000, popular: true, description: "First session with intake." },
          { name: "Acupuncture — Follow-Up", duration_minutes: 45, price_cents: 9500, popular: true, description: "Ongoing treatment." },
          { name: "Naturopathy — Initial", duration_minutes: 60, price_cents: 22000, popular: false, description: "Comprehensive intake." },
          { name: "Naturopathy — Follow-Up", duration_minutes: 30, price_cents: 12000, popular: false, description: "Review and adjust." },
          { name: "Nutrition Consultation — Initial", duration_minutes: 60, price_cents: 18000, popular: true, description: "Assessment and meal plan." },
          { name: "Nutrition Follow-Up", duration_minutes: 30, price_cents: 9500, popular: true, description: "Review progress." },
          { name: "Group Yoga Class — Drop-In", duration_minutes: 75, price_cents: 2500, popular: false, description: "Per class." },
          { name: "Private Yoga Session", duration_minutes: 60, price_cents: 9500, popular: false, description: "One-on-one practice." },
          { name: "Pilates — Mat Class", duration_minutes: 60, price_cents: 2500, popular: false, description: "Drop-in group class." },
          { name: "Pilates — Reformer Private", duration_minutes: 60, price_cents: 9500, popular: false, description: "One-on-one reformer." },
          { name: "Meditation / Breathwork Session", duration_minutes: 45, price_cents: 6000, popular: false, description: "Group or private." },
          { name: "Functional Medicine Consultation", duration_minutes: 90, price_cents: 38000, popular: false, description: "Root-cause assessment." },
          { name: "Personal Training — 1 Session", duration_minutes: 60, price_cents: 9500, popular: false, description: "One-on-one training." },
        ],
      },
    ];

    const selectedCategoryNames = data?.categories;
    const filteredCategories = selectedCategoryNames && selectedCategoryNames.length > 0
      ? serviceCategories.filter((c) => selectedCategoryNames.includes(c.category))
      : serviceCategories;

    const serviceRows = filteredCategories.flatMap((cat) =>
      cat.services.map((s: any) => ({
        clinic_id: clinicId,
        name: s.name,
        category: cat.category,
        duration_minutes: s.duration_minutes,
        price_cents: s.price_cents,
        active: s.popular === true,
        visible_online: s.popular === true,
        booking_description: s.description ?? null,
      }))
    );

    await supabase.from("services").upsert(serviceRows, {
      onConflict: "clinic_id,name",
      ignoreDuplicates: true,
    });

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
