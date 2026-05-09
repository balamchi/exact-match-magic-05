# ClinicPro QA Audit Report

_Generated after the Phase-1/2/3/4 honesty pass. Reflects the state of `src/routes/app.*.tsx` at the time of the audit._

Status legend:
- ✅ **Live** — wired to real backend (Supabase / edge fn / server fn) and safe to ship
- 🟡 **Beta** — functional but missing polish, edge-case handling, or coverage
- 🟠 **Phase 4** — UI present, real backend deferred (clearly labeled in-product)
- ⛔ **Stub** — placeholder, should not be reachable in prod

---

## Overview

| Route | Status | Backend | Notes |
|---|---|---|---|
| `/app/dashboard` | ✅ Live | supabase reads (appointments, invoices, clients, leads) | KPI tiles, real data |
| `/app/reports` | ✅ Live | supabase reads + CSV export | Date-range filters client-side |
| `/app/ai` | 🟠 Phase 4 | supabase edge fn `chat` (preview) | Phase 4 banner + Phase4 badge |
| `/app/booking` | ✅ Live | supabase insert/update on `appointments` | Public booking widget separate |
| `/app/calendar` | ✅ Live | supabase reads/updates on `appointments` | Drag/drop wired |
| `/app/checkin` | 🟡 Beta | supabase realtime on `waitlist` | BetaBadge |
| `/app/clinical/consent-forms` | ✅ Live | supabase + `consent-generate-pdf` edge fn | Public sign link works |
| `/app/clients` | ✅ Live | supabase CRUD on `clients` | CSV import/export |
| `/app/clients/$clientId` | ✅ Live | supabase CRUD | Phase4 actions disabled (Apply gift card, Charge card, Add membership) |
| `/app/services` | ✅ Live | supabase CRUD on `services` | |
| `/app/staff` | ✅ Live | supabase CRUD on `staff` | |
| `/app/locations` | ✅ Live | supabase CRUD on `locations` | |
| `/app/leads` | ✅ Live | supabase CRUD + Kanban | List view on mobile |
| `/app/pos` | 🟡 Beta | supabase inserts on `pos_orders` | BetaBadge — payment capture deferred |
| `/app/invoices` | ✅ Live | supabase reads/inserts on `invoices` | |
| `/app/coupons` | ✅ Live | supabase CRUD on `coupons` | |
| `/app/giftcards` | ✅ Live | supabase CRUD + `sendGiftCardEmail` server fn | Resend wired to real email |
| `/app/packages` | ✅ Live | supabase CRUD on `packages`, `package_redemptions` | |
| `/app/memberships` | 🟡 Beta | supabase CRUD on `memberships` | Recurring billing deferred to Phase 4 |
| `/app/loyalty` | 🟡 Beta | supabase CRUD on `loyalty_points` | |
| `/app/inventory` | 🟡 Beta | supabase CRUD on `inventory_items` | BetaBadge — auto-decrement WIP |
| `/app/inbox` | 🟡 Beta | supabase CRUD on `messages` (email channel real) | SMS/WhatsApp send disabled in UI |
| `/app/whatsapp` | 🟠 Phase 4 | none | Full ComingSoonBanner |
| `/app/communication/templates` | ✅ Live | supabase CRUD on `templates` | |
| `/app/marketing` | ✅ Live | supabase reads `email_campaigns` + Resend send | |
| `/app/automations` | ✅ Live | supabase CRUD on `automations` | |
| `/app/reviews` | ✅ Live | supabase CRUD + `reviews-send-pending` edge fn | Public review page works |
| `/app/referrals` | ✅ Live | supabase + `referrals-trigger-reward` edge fn | |
| `/app/tasks` | 🟡 Beta | supabase CRUD on `tasks` | BetaBadge |
| `/app/email-log` | ✅ Live | supabase reads on `email_log` | |
| `/app/clinical/soap-notes` | ✅ Live | supabase CRUD on `soap_notes` | Immutable + amendments |
| `/app/clinical/treatment-plans` | ✅ Live | supabase CRUD on `treatment_plans` | |
| `/app/injection-mapping` | 🟡 Beta | supabase reads on `injection_logs` | BetaBadge |
| `/app/before-after` | ✅ Live | supabase storage uploads | |
| `/app/ai-optimizer` | 🟠 Phase 4 | none | Phase4Badge + ComingSoonBanner |
| `/app/quickbooks` | 🟠 Phase 4 | none | Phase4Badge + ComingSoonBanner |
| `/app/api-settings` | 🟠 Phase 4 | none | Phase4Badge + ComingSoonBanner |
| `/app/feature-status` | ✅ Live | static module list | Linked from sidebar |
| `/app/settings` | ✅ Live | supabase updates on `clinics` | |
| `/app/settings/billing` | ✅ Live | Paddle checkout + `customer-portal` edge fn | |
| `/app/help` | ✅ Live | static | |
| `/app/qa-checklist` | ✅ Live | static checklist | |

---

## DB tables touched (multi-tenant via `clinic_id`, RLS enforced)

`appointments`, `clients`, `staff`, `services`, `locations`, `leads`, `lead_activities`,
`pos_orders`, `pos_order_items`, `invoices`, `payments`, `coupons`, `coupon_redemptions`,
`gift_cards`, `gift_card_transactions`, `packages`, `package_redemptions`, `memberships`,
`loyalty_points`, `inventory_items`, `messages`, `message_threads`, `templates`,
`automations`, `email_campaigns`, `email_log`, `email_queue`, `email_suppressions`,
`reviews`, `review_requests`, `referrals`, `referral_rewards`, `tasks`, `soap_notes`,
`soap_note_amendments`, `treatment_plans`, `treatment_plan_sessions`, `consent_forms`,
`consent_signatures`, `injection_logs`, `before_after_photos`, `clinics`, `clinic_members`,
`waitlist`, `ai_assistants`, `ai_chats`.

## Email templates wired

`booking-confirmation`, `booking-lead-internal`, `consent-request`, `direct-message`,
`email-change`, `gift-card-delivery`, `invite`, `magic-link`, `negative-review-alert`,
`payment-failed`, `reauthentication`, `recovery`, `review-request`, `signup`. All registered
in `src/lib/email-templates/registry.ts`.

## Known remaining gaps (Phase 4 scope)

- WhatsApp Business API send/receive
- Stripe/Paddle card-on-file charge from client profile
- QuickBooks Online OAuth + sync runner
- Public REST API + webhook delivery
- AI Schedule Optimizer recommendation engine
- Recurring membership billing automation
