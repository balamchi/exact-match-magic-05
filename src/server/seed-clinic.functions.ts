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
    const CATEGORY_TO_CLINIC_TYPE: Record<string, string> = {
      "Injectables": "medical_aesthetic",
      "Laser & Energy": "medical_aesthetic",
      "Skin Treatments": "medical_aesthetic",
      "Body Contouring": "medical_aesthetic",
      "PMU": "medical_aesthetic",
      "Hair": "beauty_salon",
      "Nails": "beauty_salon",
      "Lash, Brow & Wax": "beauty_salon",
      "Dental — Preventive": "dental",
      "Dental — Restorative": "dental",
      "Dental — Cosmetic": "dental",
      "Dental — Surgical": "dental",
      "Dermatology": "dermatology",
      "Physio & Chiro": "wellness",
      "Massage": "wellness",
      "Holistic & Wellness": "wellness",
    };

    type ConsentForm = { clinicType: string[]; title: string; body: string; requires_witness?: boolean };
    const consentForms: ConsentForm[] = [
      // ── Universal (5) — always seeded ──
      { clinicType: ["universal"], title: "General Treatment Consent", body: "<h3>General Treatment Consent</h3><p>I voluntarily consent to receive the proposed treatment from this clinic. The procedure, expected outcomes, risks, benefits, and reasonable alternatives have been explained to me in language I understand.</p><p><strong>I acknowledge:</strong></p><ul><li>Individual results may vary based on my anatomy, lifestyle, and adherence to aftercare</li><li>No specific outcome has been promised or guaranteed</li><li>All my questions have been answered to my satisfaction</li><li>I may withdraw consent at any time before treatment begins</li><li>I have disclosed all relevant medical conditions, allergies, and medications</li></ul><p><strong>I confirm</strong> that I am the patient (or legal guardian), I am providing this consent freely, and the information I have provided is accurate.</p>" },
      { clinicType: ["universal"], title: "Photo & Before/After Consent", body: "<h3>Photo & Before/After Consent</h3><p>I authorize the clinic to take clinical photographs and/or video of me before, during, and after my treatment.</p><p><strong>I understand these images may be used for:</strong></p><ul><li>My medical records and treatment planning (required)</li><li>Clinical education and peer review (anonymized)</li><li>Marketing materials including social media, website, and printed materials (optional — separate consent required for identifiable use)</li></ul><p><strong>I confirm:</strong></p><ul><li>I have the option to consent to medical-only use without marketing release</li><li>I may withdraw marketing consent in writing at any time (existing published material cannot be retracted)</li><li>Identifiable images will not be sold or licensed to third parties without my written permission</li></ul>" },
      { clinicType: ["universal"], title: "HIPAA / Privacy Acknowledgment", body: "<h3>HIPAA / Privacy Acknowledgment</h3><p>I acknowledge that I have received and reviewed the clinic's Notice of Privacy Practices.</p><p><strong>I understand my protected health information (PHI) may be used and disclosed for:</strong></p><ul><li>Treatment — sharing information with other healthcare providers involved in my care</li><li>Payment — billing insurance, processing payments, collections</li><li>Healthcare operations — quality improvement, training, accreditation</li><li>Legal requirements — court orders, public health reporting, suspected abuse</li></ul><p><strong>My rights include:</strong></p><ul><li>Requesting restrictions on certain uses and disclosures</li><li>Inspecting and obtaining a copy of my records</li><li>Requesting amendments to my records</li><li>Receiving an accounting of disclosures</li><li>Filing a complaint with the clinic or with regulatory authorities</li></ul>" },
      { clinicType: ["universal"], title: "Cancellation & No-Show Policy", body: "<h3>Cancellation & No-Show Policy</h3><p>I understand and agree to the clinic's appointment policy:</p><ul><li><strong>24-hour notice</strong> is required to cancel or reschedule any appointment without charge</li><li><strong>Late cancellation</strong> (less than 24 hours) may incur a fee of up to 50% of the scheduled service price</li><li><strong>No-show</strong> (failure to attend without notice) may incur a fee of up to 100% of the scheduled service price</li><li>Repeated no-shows may result in being required to prepay future appointments or being declined for future booking</li><li>Cancellation fees may be charged to the card on file</li></ul><p>I confirm I have read and accept these terms.</p>" },
      { clinicType: ["universal"], title: "Financial Responsibility Agreement", body: "<h3>Financial Responsibility Agreement</h3><p>I accept full financial responsibility for all services rendered, regardless of insurance coverage.</p><p><strong>I understand:</strong></p><ul><li>Payment is due at the time of service unless other arrangements have been made in writing</li><li>The clinic may charge my card on file for outstanding balances, no-show fees, and late cancellation fees</li><li>Aesthetic and elective treatments are typically not covered by insurance</li><li>If insurance is billed, I am responsible for any portion not paid by my carrier (deductibles, co-pays, denied claims)</li><li>Accounts over 30 days past due may be subject to collection fees and may be reported to credit bureaus</li><li>Refund policies are governed by the clinic's published refund terms</li></ul>" },

      // ── Medical Aesthetic (16, includes 2 shared with Dermatology) ──
      { clinicType: ["medical_aesthetic"], title: "Botulinum Toxin (Botox/Dysport/Xeomin) Consent", body: "<h3>Botulinum Toxin Injection Consent</h3><p>I consent to the injection of botulinum toxin (Botox, Dysport, or Xeomin) into the muscles indicated by my provider for the purpose of reducing dynamic wrinkles or treating an approved medical condition.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising, swelling, redness, or tenderness at injection sites</li><li>Headache, flu-like symptoms, or temporary numbness</li><li>Asymmetry of facial expression</li><li>Ptosis (eyelid or eyebrow drooping) lasting weeks to months</li><li>Difficulty smiling, swallowing, or speaking (rare, depending on injection site)</li><li>Allergic reaction (very rare)</li><li>Antibody formation reducing effectiveness over time</li><li>Treatment failure or asymmetric results requiring touch-up</li></ul><p><strong>I confirm:</strong></p><ul><li>I am not pregnant, planning pregnancy, or breastfeeding</li><li>I have no neuromuscular disorder (myasthenia gravis, ALS, Lambert-Eaton)</li><li>I am not currently taking aminoglycoside antibiotics</li><li>I have disclosed all medical conditions, allergies, and medications</li><li>I understand results typically last 3-4 months and treatment is not permanent</li><li>I will follow post-treatment instructions (no lying flat, no exercise for 4 hours)</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Hyaluronic Acid Dermal Filler Consent", body: "<h3>Hyaluronic Acid Dermal Filler Consent</h3><p>I consent to the injection of hyaluronic acid (HA) dermal filler for the purpose of restoring volume, contouring, or augmenting the treated area.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising, swelling, redness, tenderness lasting up to 2 weeks</li><li>Lumps, nodules, or palpable irregularities</li><li>Asymmetry requiring correction or dissolution</li><li>Infection requiring antibiotics</li><li>Allergic reaction or delayed hypersensitivity</li><li>Tyndall effect (bluish discoloration) if placed too superficially</li><li><strong>Vascular occlusion</strong> — rare but serious complication that can lead to tissue necrosis or, in extremely rare cases, vision loss</li><li>Need for hyaluronidase (filler dissolution) in case of complications</li></ul><p><strong>Pre-treatment requirements:</strong></p><ul><li>I will avoid blood thinners (aspirin, ibuprofen, fish oil, vitamin E) for 7 days prior</li><li>I will avoid alcohol for 24 hours prior</li><li>I will disclose any history of cold sores (HSV)</li></ul><p><strong>I confirm:</strong> I understand results last 6-18 months depending on product and area, I am not pregnant or breastfeeding, and emergency reversal protocols have been explained.</p>" },
      { clinicType: ["medical_aesthetic"], title: "Lip Filler Consent", body: "<h3>Lip Filler Consent</h3><p>I consent to the injection of hyaluronic acid filler into my lips and/or perioral area for augmentation, shaping, or hydration.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Significant swelling lasting up to 2 weeks (lips swell more than other areas)</li><li>Bruising, often visible for 7-10 days</li><li>Asymmetry, lumps, or palpable nodules requiring massage or dissolution</li><li>Cold sore reactivation if I have a history of HSV (prophylaxis recommended)</li><li>Vascular complications including, very rarely, tissue necrosis</li><li>Migration of product over time with repeated treatments</li><li>Need for touch-up to achieve desired result</li></ul><p><strong>I confirm:</strong></p><ul><li>I have realistic expectations about final shape, volume, and feel</li><li>Final results take 2-4 weeks to settle after swelling resolves</li><li>I understand 'overfilled' or 'duck lip' appearance can occur and may require dissolution</li><li>I will avoid kissing, drinking through straws, and lipstick for 24 hours</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Sculptra / Bio-stimulator Consent", body: "<h3>Sculptra / Bio-stimulator Consent</h3><p>I consent to the injection of poly-L-lactic acid (Sculptra) or calcium hydroxylapatite (Radiesse) for the purpose of stimulating my body's collagen production and gradually restoring volume.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising, swelling, redness at injection sites</li><li>Palpable nodules or granulomas requiring massage or treatment</li><li>Asymmetry or uneven results between sessions</li><li>Delayed-onset nodules months after treatment</li><li>Infection or allergic reaction</li></ul><p><strong>I confirm:</strong></p><ul><li>Results develop gradually over 3-6 months as collagen builds</li><li>2-4 sessions are typically required for optimal results</li><li>Results are semi-permanent (18-24 months) but not reversible like HA filler</li><li>I will massage the treated area as instructed (5 times daily for 5 days)</li><li>I have realistic expectations about the gradual timeline</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Kybella (Submental Fat) Consent", body: "<h3>Kybella (Submental Fat Reduction) Consent</h3><p>I consent to the injection of deoxycholic acid (Kybella) into the submental area (under chin) for the purpose of reducing localized fat.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Significant swelling lasting 1-2 weeks (will look worse before better)</li><li>Bruising, redness, tenderness, numbness at the treatment site</li><li>Hardness or lumps that gradually resolve</li><li>Nerve injury causing temporary uneven smile or weakness (typically resolves)</li><li>Difficulty swallowing (rare, temporary)</li><li>Skin ulceration at injection site (rare)</li><li>Hair loss in the treated area (rare)</li></ul><p><strong>I confirm:</strong></p><ul><li>I understand 2-4 treatments may be required, spaced 4-6 weeks apart</li><li>Results are permanent once destroyed fat cells are eliminated</li><li>I have realistic expectations about social downtime due to swelling</li><li>I am not pregnant or breastfeeding</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "PRP Facial Injection Consent", body: "<h3>PRP Facial Injection Consent</h3><p>I consent to the drawing of my blood and the injection of platelet-rich plasma (PRP) into my face for the purpose of skin rejuvenation and collagen stimulation.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising and swelling at draw and injection sites</li><li>Mild discomfort during injection</li><li>Infection at injection sites (rare)</li><li>Allergic reaction to anticoagulant in collection tubes (very rare)</li><li>Variable results depending on my own platelet quality</li></ul><p><strong>I confirm:</strong></p><ul><li>3-4 sessions spaced 4-6 weeks apart are typically required</li><li>Results develop gradually over 2-3 months</li><li>I have eaten and am hydrated before blood draw</li><li>I have no blood disorders, active infection, or autoimmune condition</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "PRP Hair Restoration Consent", body: "<h3>PRP Hair Restoration Consent</h3><p>I consent to the injection of platelet-rich plasma (PRP) into my scalp for the purpose of stimulating hair follicles and reducing hair loss.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Scalp tenderness, mild swelling, or headache for 24-48 hours</li><li>Bruising at injection sites</li><li>Temporary shedding (paradoxical) in the first weeks</li><li>Infection (rare)</li><li>Variable results — PRP is most effective in early/moderate hair loss, less effective in advanced baldness</li></ul><p><strong>I confirm:</strong></p><ul><li>Initial protocol is 3-4 monthly sessions, followed by maintenance every 4-6 months</li><li>Results take 3-6 months to become visible</li><li>Outcomes vary and continued treatment is required to maintain results</li><li>I understand PRP works best alongside other hair loss treatments (minoxidil, finasteride)</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Microneedling Consent", body: "<h3>Microneedling Consent</h3><p>I consent to microneedling treatment, which uses fine needles to create controlled micro-injuries in the skin to stimulate collagen production.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Redness, swelling, pinpoint bleeding immediately after treatment</li><li>Sensitivity and dryness for 2-5 days</li><li>Mild peeling or flaking during recovery</li><li>Post-inflammatory hyperpigmentation (PIH), especially in darker skin tones</li><li>Cold sore reactivation if I have HSV history</li><li>Infection (rare with proper aftercare)</li></ul><p><strong>I confirm:</strong></p><ul><li>I will avoid sun exposure for 1 week before and after</li><li>I will use only gentle, fragrance-free skincare for 3 days after</li><li>4-6 sessions spaced 4 weeks apart are typically recommended</li><li>I do not have active acne, eczema, or open wounds in the treatment area</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Microneedling with PRP Consent", body: "<h3>Microneedling with PRP Consent</h3><p>I consent to microneedling combined with topical and/or injected platelet-rich plasma (PRP) from my own blood for enhanced skin rejuvenation.</p><p><strong>I understand the risks include all microneedling risks plus:</strong></p><ul><li>Bruising at blood draw site</li><li>Increased swelling and downtime versus microneedling alone (typically 3-7 days)</li><li>Risk of bleeding/bruising heightened due to combined modalities</li><li>Variable results based on my own platelet quality</li></ul><p><strong>I confirm:</strong></p><ul><li>I have eaten and am hydrated for the blood draw</li><li>I have no bleeding disorder or active infection</li><li>I understand the social downtime can be longer than expected</li><li>3-4 sessions spaced 4-6 weeks apart are typically recommended</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "HydraFacial / Medical Facial Consent", body: "<h3>HydraFacial / Medical Facial Consent</h3><p>I consent to a multi-step medical facial treatment including cleansing, exfoliation, extraction, and serum infusion.</p><p><strong>I understand:</strong></p><ul><li>Mild redness immediately after treatment is normal and resolves within hours</li><li>Mild purging or temporary breakouts may occur</li><li>Sensitivity to active ingredients is possible</li><li>Cold sore reactivation possible if I have HSV history</li></ul><p><strong>I confirm I have no active eczema, rosacea flare, sunburn, or open lesions in the treatment area.</strong></p>" },
      { clinicType: ["medical_aesthetic", "dermatology"], title: "Chemical Peel Consent", body: "<h3>Chemical Peel Consent</h3><p>I consent to the application of a chemical peel solution (glycolic, salicylic, TCA, or other) to exfoliate the upper layers of my skin.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Redness, stinging, burning during and after treatment</li><li>Visible peeling and flaking for 3-7 days (or longer for deeper peels)</li><li>Hyperpigmentation or hypopigmentation, especially in darker skin tones</li><li>Scarring (rare, more likely with deeper peels)</li><li>Cold sore reactivation if HSV history</li><li>Infection if aftercare is not followed</li><li>Allergic reaction to peel ingredients</li></ul><p><strong>Pre-treatment:</strong></p><ul><li>I have discontinued retinoids 5-7 days prior</li><li>I have not had recent waxing, sun exposure, or other peels in the area</li><li>I will avoid sun exposure for 2 weeks after</li></ul><p><strong>I confirm I am not pregnant, do not have active acne breakouts, eczema, or open lesions.</strong></p>" },
      { clinicType: ["medical_aesthetic"], title: "Mesotherapy Consent", body: "<h3>Mesotherapy Consent</h3><p>I consent to mesotherapy injections of vitamins, amino acids, and other compounds into the superficial layers of my skin for the purpose of rejuvenation, hydration, or fat reduction.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising, swelling, and tenderness at injection sites</li><li>Mild bleeding and pinpoint marks</li><li>Allergic reaction to injected compounds</li><li>Infection (rare)</li><li>Variable results depending on individual response</li></ul><p><strong>I confirm I have disclosed all allergies and medical conditions and understand multiple sessions may be required.</strong></p>" },
      { clinicType: ["medical_aesthetic"], title: "Hyaluronidase (Filler Dissolution) Consent", body: "<h3>Hyaluronidase (Filler Dissolution) Consent</h3><p>I consent to the injection of hyaluronidase enzyme for the purpose of dissolving previously placed hyaluronic acid filler.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Allergic reaction (rare but possible, including anaphylaxis — patch test recommended)</li><li>Bruising, swelling, redness at injection sites</li><li>Dissolution of my own natural hyaluronic acid in addition to the filler</li><li>Uneven or partial dissolution requiring additional sessions</li><li>Temporary volume loss in the treated area</li><li>Need for re-injection of filler once dissolution is complete (after 2 weeks)</li></ul><p><strong>I confirm:</strong></p><ul><li>I have no allergy to bee/wasp stings (cross-reactivity possible)</li><li>I understand this is an off-label use of hyaluronidase</li><li>Results are visible within 24-48 hours</li><li>I may need multiple sessions for complete dissolution</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "CoolSculpting / Body Contouring Consent", body: "<h3>CoolSculpting / Body Contouring Consent</h3><p>I consent to non-invasive cryolipolysis (CoolSculpting) or radiofrequency body contouring treatment for the reduction of localized fat.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Redness, bruising, swelling, firmness, and numbness lasting weeks</li><li>Tingling, stinging, or itching during recovery</li><li>Skin sensitivity, temporary discoloration</li><li><strong>Paradoxical Adipose Hyperplasia (PAH)</strong> — a rare condition where the treated area enlarges instead of shrinks (more common in men, may require surgical correction)</li><li>Asymmetry between treated areas</li><li>Late-onset pain syndrome (rare)</li></ul><p><strong>I confirm:</strong></p><ul><li>Results develop gradually over 2-3 months as fat cells are eliminated</li><li>2-3 treatments may be needed for optimal results</li><li>This is not a weight-loss treatment — it targets stubborn pockets of fat</li><li>I do not have cold-related disorders (cryoglobulinemia, cold urticaria, paroxysmal cold hemoglobinuria)</li></ul>" },
      { clinicType: ["medical_aesthetic"], title: "Thread Lift Consent", body: "<h3>Thread Lift Consent</h3><p>I consent to the placement of dissolvable PDO/PLLA threads under my skin for the purpose of lifting, repositioning, and stimulating collagen.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising, swelling, soreness for 1-2 weeks</li><li>Visible or palpable threads, especially in thin skin</li><li>Asymmetry or migration of threads</li><li>Skin dimpling or puckering (usually resolves)</li><li>Infection or extrusion of threads (rare)</li><li>Nerve injury (rare)</li><li>Unsatisfactory result — threads may not produce desired lift</li></ul><p><strong>I confirm:</strong></p><ul><li>Results last 12-18 months as threads dissolve</li><li>I will avoid facial massage, dental work, and sleeping on my face for 2 weeks</li><li>I have realistic expectations — thread lift is not a surgical facelift</li><li>I am not pregnant and have no autoimmune or bleeding disorder</li></ul>", requires_witness: true },
      { clinicType: ["medical_aesthetic", "dermatology"], title: "Laser Skin Resurfacing Consent", body: "<h3>Laser Skin Resurfacing Consent</h3><p>I consent to laser skin resurfacing (fractional, ablative, or non-ablative) for the purpose of treating wrinkles, pigmentation, scars, or skin texture.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Redness, swelling, oozing, and crusting for 5-14 days (longer for ablative)</li><li>Significant downtime for ablative CO2 — appearance like severe sunburn for 1-2 weeks</li><li>Hyperpigmentation or hypopigmentation, especially in skin types IV-VI</li><li>Scarring (rare with experienced provider)</li><li>Infection (bacterial, viral, or fungal) — antiviral prophylaxis required if HSV history</li><li>Persistent redness for weeks to months</li><li>Demarcation lines between treated and untreated areas</li><li>Acne or milia flare-ups during healing</li></ul><p><strong>I confirm:</strong></p><ul><li>I have not had recent sun exposure or sunless tanner in the area</li><li>I have discontinued retinoids and acids per provider instructions</li><li>I will strictly avoid sun exposure for 6-8 weeks post-treatment</li><li>I am not pregnant, do not have active acne, and have no recent isotretinoin use (within 6 months)</li><li>I understand 1-3 sessions may be required and results develop over 3-6 months</li></ul>" },

      // ── Dental (12) ──
      { clinicType: ["dental"], title: "Dental Treatment & Local Anesthesia Consent", body: "<h3>Dental Treatment & Local Anesthesia Consent</h3><p>I consent to dental examination, diagnostic imaging, and routine dental treatment including local anesthesia as required.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Bruising or soreness at injection site</li><li>Numbness extending beyond the treated area (lip, tongue, chin)</li><li>Prolonged numbness or nerve injury (rare but possible)</li><li>Allergic reaction to anesthetic (very rare)</li><li>Cardiovascular effects from epinephrine in anesthetic</li><li>Self-inflicted bite injury while numb</li></ul><p><strong>I confirm I have disclosed all medical conditions, current medications, allergies, and history of adverse reactions to dental anesthetics.</strong></p>" },
      { clinicType: ["dental"], title: "Teeth Whitening Consent", body: "<h3>Teeth Whitening Consent</h3><p>I consent to in-office or take-home teeth whitening using hydrogen peroxide or carbamide peroxide gel.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Temporary tooth sensitivity to cold lasting 1-3 days</li><li>Gum irritation if gel contacts soft tissue</li><li>Uneven whitening — existing dental work (crowns, fillings, veneers) will NOT lighten</li><li>Results vary by individual and may be subtle for tetracycline staining or intrinsic discoloration</li><li>Color regression over months — touch-ups may be needed</li></ul><p><strong>I confirm:</strong></p><ul><li>I do not have active dental decay or untreated gum disease</li><li>I am not pregnant or breastfeeding</li><li>I will avoid staining foods/drinks (coffee, red wine, dark berries) for 48 hours</li></ul>" },
      { clinicType: ["dental"], title: "Porcelain Veneers Consent", body: "<h3>Porcelain Veneers Consent</h3><p>I consent to the preparation and placement of porcelain veneers on my teeth for cosmetic restoration.</p><p><strong>I understand:</strong></p><ul><li>Veneers require removal of a thin layer of enamel — this is irreversible</li><li>My teeth may be sensitive between preparation and placement</li><li>Veneers can chip, crack, or debond requiring repair or replacement</li><li>Average lifespan is 10-15 years; veneers will eventually need replacement</li><li>Color cannot be changed once cemented — surrounding teeth may not match perfectly</li><li>I may need to wear a nightguard to protect veneers from grinding</li><li>The temporary veneers are not the final aesthetic result</li></ul><p><strong>I confirm I have reviewed and approved the proposed shape, size, and shade before final cementation.</strong></p>", requires_witness: true },
      { clinicType: ["dental"], title: "Dental Implant Consent", body: "<h3>Dental Implant Consent</h3><p>I consent to the surgical placement of one or more titanium dental implants, abutments, and prosthetic restorations.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Pain, swelling, bruising, bleeding for several days post-surgery</li><li>Infection requiring antibiotics or removal of implant</li><li>Implant failure (5-10% historical rate) — may require removal and re-placement</li><li>Damage to adjacent teeth or roots</li><li>Nerve injury causing numbness or tingling in lip, chin, or tongue (rare, may be permanent)</li><li>Sinus complications for upper jaw implants — sinus lift may be required</li><li>Bone loss around implant requiring additional grafting</li><li>Need for crown lengthening, gum grafting, or other adjunctive procedures</li><li>Allergic reaction to titanium (extremely rare)</li></ul><p><strong>I confirm:</strong></p><ul><li>The full implant process takes 3-9 months (surgery, healing, restoration)</li><li>I will follow all post-op instructions (no smoking, soft diet, oral hygiene)</li><li>Smoking significantly increases failure risk</li><li>Long-term success requires excellent oral hygiene and regular maintenance</li><li>I have disclosed all medications including bisphosphonates and blood thinners</li></ul>", requires_witness: true },
      { clinicType: ["dental"], title: "Root Canal Therapy Consent", body: "<h3>Root Canal Therapy Consent</h3><p>I consent to endodontic root canal treatment on the indicated tooth/teeth to remove infected or inflamed pulp.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Post-operative pain, sensitivity, or swelling for several days</li><li>Need for prescription pain medication or antibiotics</li><li>Treatment failure requiring retreatment or surgical apicoectomy</li><li>Tooth extraction if treatment fails — implant or bridge would be needed</li><li>Fracture of the tooth — root canal treated teeth become more brittle</li><li><strong>Crown placement is required after root canal</strong> to prevent fracture (separate procedure and fee)</li><li>Instrument separation inside canal (rare)</li><li>Perforation of the root or floor of the tooth</li><li>Sodium hypochlorite accident (rare but serious)</li><li>Discoloration of the tooth over time</li></ul><p><strong>I confirm:</strong></p><ul><li>I understand a crown must be placed within weeks of root canal to prevent fracture</li><li>The treatment may require 1-3 visits</li><li>I have been informed of alternatives including extraction and replacement</li></ul>" },
      { clinicType: ["dental"], title: "Tooth Extraction Consent", body: "<h3>Tooth Extraction Consent</h3><p>I consent to the extraction of the indicated tooth/teeth.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Pain, swelling, bruising, bleeding for several days</li><li>Dry socket (alveolar osteitis) — painful condition requiring additional treatment</li><li>Infection requiring antibiotics</li><li>Damage to adjacent teeth, fillings, or crowns</li><li>Fracture of the jaw (rare)</li><li>Numbness or altered sensation if near a nerve (usually temporary)</li><li>Sinus communication for upper teeth (may require additional treatment)</li><li>Need for bone graft to preserve site for future implant</li><li>Loss of bone and gum tissue over time in the extraction site</li></ul><p><strong>I confirm:</strong></p><ul><li>I will not smoke or use straws for 72 hours (significantly increases dry socket risk)</li><li>I have been informed of replacement options (implant, bridge, partial denture)</li><li>I have disclosed all medications including blood thinners and bisphosphonates</li></ul>" },
      { clinicType: ["dental"], title: "Wisdom Tooth Removal Consent", body: "<h3>Wisdom Tooth Removal Consent</h3><p>I consent to the surgical removal of one or more wisdom teeth (third molars), which may include bone removal and tooth sectioning.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Significant pain, swelling, bruising, and limited mouth opening for 3-7 days</li><li>Bleeding for 24-48 hours</li><li>Dry socket (more common with lower wisdom teeth) — severe pain 3-5 days post-op</li><li>Infection requiring antibiotics</li><li><strong>Nerve injury</strong> — numbness or altered sensation in lip, chin, tongue, or taste; usually temporary but can be permanent in rare cases (inferior alveolar nerve, lingual nerve)</li><li>Sinus complications for upper wisdom teeth</li><li>Jaw fracture (very rare)</li><li>TMJ pain or stiffness</li><li>Damage to adjacent second molars</li></ul><p><strong>I confirm:</strong></p><ul><li>I understand impacted teeth carry higher risk of complications</li><li>I will follow all post-op instructions (no smoking, no straws, soft diet)</li><li>I have arranged for someone to drive me home if sedation is used</li><li>I have disclosed all medical conditions and medications</li></ul>", requires_witness: true },
      { clinicType: ["dental"], title: "Orthodontic / Invisalign Consent", body: "<h3>Orthodontic / Invisalign Consent</h3><p>I consent to orthodontic treatment using braces or clear aligners (Invisalign or similar) to reposition my teeth.</p><p><strong>I understand:</strong></p><ul><li>Treatment requires my full cooperation — Invisalign must be worn 20-22 hours per day</li><li>Treatment duration ranges from 6 months to 3+ years depending on complexity</li><li>Possible risks include tooth root resorption, decay around brackets/attachments, gum inflammation</li><li>Tooth sensitivity and discomfort especially with each new aligner or adjustment</li><li>Possible TMJ discomfort during tooth movement</li><li>Relapse is common — retainers must be worn indefinitely to maintain results</li><li>Occasionally additional procedures (extractions, restorations, surgery) may be needed</li><li>Estimated treatment time and outcome are not guaranteed</li></ul><p><strong>I confirm:</strong></p><ul><li>I will maintain excellent oral hygiene throughout treatment</li><li>I will wear retainers as prescribed after treatment</li><li>I will attend all scheduled appointments</li><li>I have been informed of treatment alternatives</li></ul>" },
      { clinicType: ["dental"], title: "Crown & Bridge Consent", body: "<h3>Crown & Bridge Consent</h3><p>I consent to the preparation and placement of a dental crown or fixed bridge.</p><p><strong>I understand:</strong></p><ul><li>Tooth structure must be removed to fit the crown — this is irreversible</li><li>Sensitivity is common between preparation and final placement</li><li>The tooth may require root canal therapy if pulp is irritated</li><li>Bridges require modification of adjacent healthy teeth as abutments</li><li>Average crown lifespan is 10-15 years; replacement will be needed</li><li>Bridges have higher failure rates than implant-supported crowns</li><li>Recurrent decay can occur at margin of crown if oral hygiene is inadequate</li><li>Color and shape are approved before cementation — adjustments after are limited</li></ul><p><strong>I confirm I have reviewed alternatives including implants and have agreed to the proposed treatment plan.</strong></p>" },
      { clinicType: ["dental"], title: "Periodontal (Gum) Treatment Consent", body: "<h3>Periodontal (Gum) Treatment Consent</h3><p>I consent to non-surgical or surgical periodontal treatment including scaling, root planing, and/or gum surgery for the treatment of periodontal disease.</p><p><strong>I understand:</strong></p><ul><li>Treatment may require multiple visits and local anesthesia</li><li>Post-treatment sensitivity, soreness, and bleeding are common</li><li>Some gum recession may occur, exposing root surfaces</li><li>Tooth sensitivity to hot/cold may persist</li><li>Periodontal disease is chronic — ongoing maintenance every 3-4 months is required</li><li>Despite treatment, some teeth may still be lost due to advanced disease</li><li>Surgical procedures carry additional risks including infection and prolonged healing</li><li>Smoking significantly worsens outcomes</li></ul><p><strong>I confirm I have been informed of the importance of home care and regular maintenance visits.</strong></p>" },
      { clinicType: ["dental"], title: "Sedation Dentistry Consent", body: "<h3>Sedation Dentistry Consent</h3><p>I consent to the administration of sedation (oral, nitrous oxide, IV, or general anesthesia as indicated) to facilitate my dental treatment.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Drowsiness, nausea, or vomiting</li><li>Respiratory depression or airway obstruction</li><li>Cardiovascular effects (blood pressure, heart rate changes)</li><li>Allergic reaction to sedative medications</li><li>Prolonged sedation or delayed recovery</li><li>Amnesia for the procedure</li><li>Paradoxical excitement or agitation (rare)</li><li>In rare cases, more serious complications including respiratory or cardiac arrest</li></ul><p><strong>I confirm:</strong></p><ul><li>I have disclosed all medical conditions, medications, and allergies</li><li>I have followed pre-sedation instructions (NPO/fasting if required)</li><li>I have arranged for a responsible adult to drive me home and monitor me for 24 hours</li><li>I will not drive, operate machinery, or sign legal documents for 24 hours</li><li>I will not consume alcohol for 24 hours after sedation</li></ul>", requires_witness: true },
      { clinicType: ["dental"], title: "Pediatric Dental Treatment Consent (Parent/Guardian)", body: "<h3>Pediatric Dental Treatment Consent (Parent/Guardian)</h3><p>As the parent or legal guardian, I consent to the dental examination, diagnostic imaging, and treatment of my child.</p><p><strong>I understand:</strong></p><ul><li>Behavior management techniques may be used including 'tell-show-do', voice control, distraction, and protective stabilization when necessary for safety</li><li>Nitrous oxide or oral sedation may be recommended for anxious children</li><li>I will be informed of treatment plan and any changes during the appointment</li><li>Local anesthesia may be administered with associated risks of soft tissue injury from lip/cheek biting while numb</li><li>Stainless steel crowns or pulp therapy may be recommended for primary teeth</li></ul><p><strong>I confirm I have disclosed my child's full medical history, medications, allergies, and any developmental considerations.</strong></p>" },

      // ── Beauty Salon (9) ──
      { clinicType: ["beauty_salon"], title: "Hair Color & Chemical Service Consent", body: "<h3>Hair Color & Chemical Service Consent</h3><p>I consent to the application of permanent, semi-permanent, or demi-permanent hair color, including bleach or lightener as needed to achieve the desired result.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Scalp irritation, itching, burning, or redness</li><li>Allergic reaction — patch test recommended 48 hours prior, especially for new clients or PPD-containing dyes</li><li>Damage to hair integrity (dryness, breakage, especially with lightener)</li><li>Color may not lift to desired level or may turn unexpected tones based on existing color/condition</li><li>Color fade or shift over time</li><li>Multiple sessions may be required for major color transformations</li></ul><p><strong>I confirm I have disclosed any prior chemical services, medications, scalp conditions, and known sensitivities.</strong></p>" },
      { clinicType: ["beauty_salon"], title: "Permanent Wave / Relaxer Consent", body: "<h3>Permanent Wave / Relaxer Consent</h3><p>I consent to the application of chemical perm solution or chemical relaxer to alter the texture of my hair.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Scalp burning, irritation, or chemical burns</li><li>Hair damage including breakage, dryness, and loss of elasticity</li><li>Allergic reaction to chemicals</li><li>Uneven results or partial processing</li><li>Difficulty restyling or returning to natural texture (results are semi-permanent)</li><li>Risk increased on previously colored, lightened, or chemically treated hair</li></ul><p><strong>I confirm I have not chemically treated my hair within the past 6 weeks and have disclosed all relevant history.</strong></p>" },
      { clinicType: ["beauty_salon"], title: "Keratin / Smoothing Treatment Consent", body: "<h3>Keratin / Smoothing Treatment Consent</h3><p>I consent to a keratin or smoothing treatment to reduce frizz and add manageability to my hair.</p><p><strong>I understand:</strong></p><ul><li>Treatment may contain formaldehyde or formaldehyde-releasing ingredients — proper ventilation is used</li><li>Possible scalp/eye irritation from fumes</li><li>I should not get hair wet, tied back, or behind ears for 72 hours</li><li>Results last 3-5 months and gradually wash out</li><li>I am not pregnant or breastfeeding</li><li>Some color shift may occur on lightened or chemically treated hair</li></ul>" },
      { clinicType: ["beauty_salon"], title: "Hair Extension Consent", body: "<h3>Hair Extension Consent</h3><p>I consent to the installation of hair extensions (tape-in, sew-in, micro-link, fusion, or clip-in) using my chosen method.</p><p><strong>I understand:</strong></p><ul><li>Improper application or care can cause traction alopecia (hair loss from tension)</li><li>Daily maintenance and proper aftercare are required</li><li>Extensions require professional removal and reinstallation every 6-12 weeks depending on method</li><li>Some methods are not reversible without potential damage (fusion, micro-links)</li><li>Color matching is approximate — minor variations may exist</li><li>Synthetic extensions cannot be heat-styled the same as human hair</li></ul><p><strong>I confirm I will follow all aftercare instructions and return for maintenance as recommended.</strong></p>" },
      { clinicType: ["beauty_salon"], title: "Eyelash Extension Consent", body: "<h3>Eyelash Extension Consent</h3><p>I consent to the application of individual semi-permanent lash extensions adhered to my natural lashes using cyanoacrylate-based adhesive.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Allergic reaction to adhesive — patch test recommended for new clients</li><li>Eye irritation, redness, watering</li><li>Damage to natural lashes if extensions are too heavy or removed improperly</li><li>Infection (blepharitis or styes) if hygiene is not maintained</li><li>Need to keep lashes dry for 24-48 hours after application</li><li>Touch-ups are required every 2-3 weeks as natural lashes shed</li></ul><p><strong>I confirm I have no active eye infections, conjunctivitis, or recent eye surgery.</strong></p>" },
      { clinicType: ["beauty_salon"], title: "Brow Tint / Lamination Consent", body: "<h3>Brow Tint / Lamination Consent</h3><p>I consent to tinting and/or lamination of my eyebrows using semi-permanent dye and/or perming solution.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Allergic reaction (patch test recommended 24-48 hours prior)</li><li>Skin irritation, redness, or temporary staining of skin</li><li>Hair damage or breakage with overprocessing</li><li>Color fades gradually over 4-6 weeks</li><li>Lamination effect lasts 4-8 weeks</li></ul>" },
      { clinicType: ["beauty_salon"], title: "Spray Tan Consent", body: "<h3>Spray Tan Consent</h3><p>I consent to the application of sunless spray tan using a DHA-based solution.</p><p><strong>I understand:</strong></p><ul><li>I should not inhale spray — protective eyewear and nose plugs are available</li><li>Skin reactions or allergies to DHA are possible (rare)</li><li>Color develops over 8 hours and lasts 5-10 days</li><li>I should not shower or sweat for 8 hours</li><li>Streaking or uneven application can occur if I move during spray or if skin was not properly prepped</li><li>Tan does NOT protect from UV — sunscreen is still required</li></ul>" },
      { clinicType: ["beauty_salon"], title: "Manicure / Pedicure Consent", body: "<h3>Manicure / Pedicure Consent</h3><p>I consent to nail care services including manicure, pedicure, gel, acrylic, dip powder, or shellac.</p><p><strong>I understand:</strong></p><ul><li>Cuts, abrasions, or irritation during service can occur</li><li>Possible allergic reaction to nail products or removers</li><li>Improper removal of enhancements can damage the natural nail</li><li>Bacterial or fungal infection is rare with proper sanitation</li><li>I have disclosed any nail or skin conditions, diabetes, or circulation issues</li></ul>" },
      { clinicType: ["beauty_salon"], title: "Waxing Service Consent", body: "<h3>Waxing Service Consent</h3><p>I consent to the removal of hair using hot or strip wax in the indicated area(s).</p><p><strong>I understand the risks may include:</strong></p><ul><li>Redness, irritation, or bumps for 24-48 hours</li><li>Burns if wax is too hot</li><li>Ingrown hairs in the days following</li><li>Skin lifting if I am using retinoids, acids, or accutane (services declined if so)</li><li>Increased sensitivity during menstruation</li><li>Folliculitis (rare with proper aftercare)</li></ul><p><strong>I confirm I am not using retinoids/Accutane and have not had sun exposure in the area in the past 24 hours.</strong></p>" },

      // ── Dermatology (6 — 4 unique + 2 shared with Medical Aesthetic) ──
      { clinicType: ["dermatology"], title: "Skin Cancer Screening Consent", body: "<h3>Skin Cancer Screening Consent</h3><p>I consent to a full-body skin examination by my dermatologist for the purpose of screening for skin cancer and other skin conditions.</p><p><strong>I understand:</strong></p><ul><li>The examination involves inspection of skin from scalp to feet, including genital and intertriginous areas as appropriate</li><li>Suspicious lesions may require biopsy at the same visit or follow-up</li><li>Some skin cancers can be missed even with careful examination</li><li>Regular self-exams and follow-up screenings are recommended</li><li>Findings will be documented in my medical record</li></ul>" },
      { clinicType: ["dermatology"], title: "Mole / Lesion Removal Consent", body: "<h3>Mole / Lesion Removal Consent</h3><p>I consent to the removal of the indicated mole or skin lesion by shave excision, punch biopsy, or surgical excision.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Pain, bleeding, infection at the site</li><li>Scarring — may be keloid, hypertrophic, or hypopigmented (especially in darker skin tones)</li><li>Incomplete removal requiring a second procedure</li><li>Recurrence of the lesion</li><li>If pathology shows malignancy, additional treatment may be required (re-excision, MOHS, sentinel node biopsy)</li><li>Asymmetry or contour changes at the site</li><li>Possible nerve injury at certain anatomical locations</li></ul><p><strong>I confirm I will follow all post-op wound care instructions and return for pathology review.</strong></p>", requires_witness: true },
      { clinicType: ["dermatology"], title: "Cryotherapy Consent", body: "<h3>Cryotherapy (Freezing) Consent</h3><p>I consent to cryotherapy treatment using liquid nitrogen to freeze the indicated skin lesion (wart, actinic keratosis, seborrheic keratosis, or other benign growth).</p><p><strong>I understand the risks may include:</strong></p><ul><li>Pain, stinging, or burning during and after treatment</li><li>Blister formation (sometimes blood-filled) at the treated site</li><li>Permanent hypopigmentation or hyperpigmentation, especially in darker skin tones</li><li>Scarring (rare)</li><li>Incomplete treatment requiring repeat sessions</li><li>Recurrence of the lesion</li><li>Nerve injury (rare, depending on location)</li></ul>" },
      { clinicType: ["dermatology"], title: "Patch Test / Allergy Test Consent", body: "<h3>Patch Test / Allergy Test Consent</h3><p>I consent to patch testing for the purpose of identifying potential allergic contact dermatitis triggers.</p><p><strong>I understand:</strong></p><ul><li>Test patches will remain on my back for 48 hours and must be kept dry</li><li>I must avoid sun, sweating, and bathing during the test period</li><li>Multiple visits are required (application, 48-hour reading, 96-hour reading)</li><li>Reactions can range from mild redness to blistering at test sites</li><li>Strong reactions can leave temporary or rarely permanent pigmentation changes</li><li>Test results identify potential triggers but do not guarantee diagnosis</li></ul>" },

      // ── Wellness (6) ──
      { clinicType: ["wellness"], title: "Chiropractic Treatment Consent", body: "<h3>Chiropractic Treatment Consent</h3><p>I consent to chiropractic care including spinal manipulation (adjustments), soft tissue therapy, and rehabilitation exercises as appropriate for my condition.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Temporary soreness, stiffness, or discomfort lasting 24-48 hours after adjustment</li><li>Headache or fatigue following treatment</li><li>Aggravation of existing conditions</li><li>Rare but serious risks of high-velocity neck manipulation include:</li><li><strong>Vertebral artery dissection</strong> leading to stroke (very rare — estimated 1 in 1-5 million adjustments)</li><li>Disc herniation, fracture, or nerve injury (rare)</li><li>Rib fracture in osteoporotic patients</li></ul><p><strong>I confirm:</strong></p><ul><li>I have disclosed all medical conditions including osteoporosis, vascular disease, cancer history, recent trauma</li><li>I have not had recent neck surgery</li><li>I am not pregnant (or have informed the practitioner if I am)</li><li>I understand alternatives including physical therapy, medication, and surgery</li></ul>" },
      { clinicType: ["wellness"], title: "Physiotherapy Treatment Consent", body: "<h3>Physiotherapy Treatment Consent</h3><p>I consent to physiotherapy assessment and treatment which may include manual therapy, therapeutic exercise, modalities (ultrasound, TENS, electrical stimulation), acupuncture, and education.</p><p><strong>I understand:</strong></p><ul><li>Some treatments may cause temporary discomfort or soreness</li><li>Bruising can occur with manual therapy or cupping</li><li>Modalities have specific contraindications (pacemakers, pregnancy, malignancy in area)</li><li>Outcomes depend on my participation in home exercise program</li><li>I may withdraw from treatment at any time</li></ul>" },
      { clinicType: ["wellness"], title: "Massage Therapy Consent", body: "<h3>Massage Therapy Consent</h3><p>I consent to massage therapy treatment for therapeutic, relaxation, or rehabilitative purposes.</p><p><strong>I understand:</strong></p><ul><li>I may experience temporary soreness, bruising, or fatigue after treatment</li><li>I have disclosed all medical conditions, injuries, medications, and pregnancy status</li><li>I will inform my therapist immediately if any technique causes pain or discomfort</li><li>I may request modifications to pressure, technique, or areas to be avoided at any time</li><li>Draping and modesty will be respected throughout the treatment</li></ul>" },
      { clinicType: ["wellness"], title: "Acupuncture Consent", body: "<h3>Acupuncture Consent</h3><p>I consent to acupuncture treatment including the insertion of sterile, single-use needles into specified points on my body.</p><p><strong>I understand the risks may include:</strong></p><ul><li>Minor bleeding or bruising at needle sites</li><li>Temporary soreness, numbness, or tingling</li><li>Fainting (especially first treatment or anxious patients)</li><li>Infection (extremely rare with sterile single-use needles)</li><li>Pneumothorax (very rare with chest/back points)</li><li>Aggravation of existing conditions in rare cases</li></ul><p><strong>I confirm I have disclosed all medical conditions including bleeding disorders, pregnancy, pacemaker, and current medications.</strong></p>" },
      { clinicType: ["wellness"], title: "Naturopathic / Functional Medicine Consent", body: "<h3>Naturopathic / Functional Medicine Consent</h3><p>I consent to naturopathic or functional medicine consultation and treatment which may include lifestyle counseling, dietary recommendations, supplements, botanical medicine, and laboratory testing.</p><p><strong>I understand:</strong></p><ul><li>Naturopathic treatment is complementary and does not replace conventional medical care</li><li>I should not discontinue prescribed medications without consulting my MD</li><li>Supplements and botanicals can have side effects and may interact with medications</li><li>Recommendations are based on evolving research and traditional practice</li><li>I will continue to see my primary care provider for routine care</li></ul>" },
      { clinicType: ["wellness"], title: "Cupping / Gua Sha Consent", body: "<h3>Cupping / Gua Sha Consent</h3><p>I consent to cupping therapy and/or gua sha treatment as part of my care plan.</p><p><strong>I understand:</strong></p><ul><li>Circular bruise-like marks (sha) from cupping are normal and resolve in 3-10 days</li><li>Skin redness, soreness, and minor abrasion from gua sha are expected</li><li>Marks should NOT be confused with abuse or injury</li><li>Skin can become hypersensitive temporarily</li><li>Burns are rare with fire cupping when properly performed</li><li>Treatment is contraindicated over open wounds, varicose veins, sunburn, or thin/fragile skin</li></ul><p><strong>I confirm I am not on blood thinners and have disclosed all skin conditions.</strong></p>" },
    ];

    // Determine which clinic types to seed based on selected service categories.
    // If no categories selected (skip / load everything), seed all forms.
    const selectedClinicTypes = selectedCategoryNames && selectedCategoryNames.length > 0
      ? new Set(selectedCategoryNames.map((c) => CATEGORY_TO_CLINIC_TYPE[c]).filter(Boolean))
      : null;

    const filteredConsentForms = selectedClinicTypes
      ? consentForms.filter((cf) =>
          cf.clinicType.includes("universal") ||
          cf.clinicType.some((t) => selectedClinicTypes.has(t))
        )
      : consentForms;

    const consentRows = filteredConsentForms.map((cf) => ({
      clinic_id: clinicId,
      name: cf.title,
      body_html: cf.body,
      is_active: true,
      is_legal_template: true,
      requires_witness: cf.requires_witness === true,
    }));

    await supabase.from("consent_form_templates").insert(consentRows);

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
        consentForms: consentRows.length,
        automations: automations.length,
        memberships: memberships.length,
      },
    };
  });
