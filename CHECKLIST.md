# Functional Test Checklist

> Run before every release. Mark with `[x]` once verified in the live preview.

## Smoke Tests

### Authentication
- [ ] User can sign up with email
- [ ] User receives verification email
- [ ] User can sign in
- [ ] User can reset password
- [ ] User can log out

### Onboarding (New Clinic)
- [ ] Create clinic during signup
- [ ] Set clinic info (name, address, phone, hours)
- [ ] Invite first staff member
- [ ] Add first location
- [ ] Add first service
- [ ] Configure brand colors

### Calendar & Booking
- [ ] Create new appointment
- [ ] Edit appointment time/staff/service
- [ ] Drag to move appointment
- [ ] Cancel appointment
- [ ] Mark appointment complete
- [ ] Public booking widget loads
- [ ] Customer can book via public widget
- [ ] Confirmation email arrives

### Clients (CRM)
- [ ] Create client
- [ ] Edit client details
- [ ] Add note to client
- [ ] Add tag to client
- [ ] View appointment history
- [ ] View invoice history
- [ ] Delete client (verify cascade)

### Lead Pipeline
- [ ] Create new lead
- [ ] Move lead between stages (Kanban)
- [ ] Switch to list view (mobile)
- [ ] Add lead activity
- [ ] Convert lead to client

### Clinical
- [ ] Create SOAP note from template
- [ ] Save as draft
- [ ] Finalize SOAP note (immutable)
- [ ] Amend finalized note (audit trail)
- [ ] Create treatment plan
- [ ] Add session to plan
- [ ] Upload before/after photo
- [ ] Send consent form via email
- [ ] Customer signs consent (public link)
- [ ] PDF generated automatically
- [ ] IP captured in audit log

### Communication
- [ ] Send email via inbox
- [ ] View thread with replies
- [ ] Use message template
- [ ] Filter conversations by status
- [ ] Mark conversation resolved

### Reviews
- [ ] Configure review settings
- [ ] Trigger review request after appointment
- [ ] Customer submits review (public link)
- [ ] Negative review alert email arrives
- [ ] Reply to review

### Referrals
- [ ] Generate referral code for client
- [ ] Customer uses code at checkout
- [ ] Reward triggered for referrer
- [ ] Track referral chain

### Coupons
- [ ] Create discount coupon
- [ ] Set expiry date
- [ ] Limit usage count
- [ ] Apply at booking
- [ ] Track redemptions

### Gift Cards
- [ ] Issue gift card
- [ ] Email delivery sends real email
- [ ] Customer receives email with code
- [ ] Resend email works (real, not toast-only)
- [ ] Adjust balance manually
- [ ] Track transactions

### Packages
- [ ] Create multi-service package
- [ ] Sell package to client
- [ ] Redeem session
- [ ] Track remaining sessions

### Reports
- [ ] Revenue report
- [ ] Client report
- [ ] Service report
- [ ] Date range filtering
- [ ] Export to CSV

### Staff
- [ ] Add staff member
- [ ] Set role/permissions
- [ ] Assign services
- [ ] Set commissions
- [ ] HR profile (PTO, etc.)

### Settings
- [ ] Update clinic info
- [ ] Change branding
- [ ] Update billing
- [ ] Reply email setting
- [ ] Phone setting

### Mobile (iPhone viewport)
- [ ] Landing page renders
- [ ] Theme toggle works
- [ ] Sign in/up
- [ ] Dashboard KPIs stack 2x2
- [ ] Inbox single-panel UX
- [ ] Leads list view
- [ ] Clients card layout
- [ ] Calendar day view
- [ ] All forms fit in viewport

### Theme (both modes on every page)
- [ ] Landing — dark + light
- [ ] Pricing — both
- [ ] Auth pages — both
- [ ] Dashboard — both
- [ ] All app pages — both
- [ ] Public booking — both
- [ ] Public consent — both

### Phase 4 / Beta indicators
- [ ] `/app/feature-status` loads
- [ ] All 4 Phase 4 pages show ComingSoonBanner (`/app/ai`, `/app/ai-optimizer`, `/app/quickbooks`, `/app/api-settings`)
- [ ] All Beta pages show BetaBadge (`/app/checkin`, `/app/pos`, `/app/inventory`, `/app/tasks`, `/app/injection-mapping`)
- [ ] Sidebar shows `4` indicator on Phase 4 nav items
- [ ] Phase 4 dropdown items disabled on client profile
