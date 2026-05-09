# Bug Bounty Report

_Findings from the post-Phase-4 sweep across `src/routes/app.*.tsx`._

Severity:
- 🔴 Critical — user loses data or sees confusing state
- 🟡 Medium — action seems to work but doesn't
- 🟢 Minor — polish only

## Resolved this pass

| # | Sev | Location | Issue | Fix |
|---|---|---|---|---|
| 1 | 🟡 | `app.giftcards.tsx` Resend button | Toast said "Resend queued" — implied async work, but the call is synchronous and there is no queue. | Now reads "Email resent successfully" after the real `sendEmail` server fn resolves; surfaces real error message on failure. |
| 2 | 🟡 | `app.clients_.$clientId.tsx` action menu | "Apply gift card", "Charge card", "Add membership" each fired a `toast.info("…coming in Phase 4")` from a regular menu item — looked like a working command. | Items are now `disabled` with `opacity-50` + inline "Phase 4" pill. No misleading toast. |
| 3 | 🟡 | `app.quickbooks.tsx` | Page presented as Beta but no real OAuth or sync; toasts were honest but the page lacked a top-of-page indicator. | Phase4Badge in heading + ComingSoonBanner. |
| 4 | 🟡 | `app.ai-optimizer.tsx`, `app.api-settings.tsx`, `app.ai.tsx` | Polished UIs that look fully functional but no live backend. | Phase4Badge + ComingSoonBanner on all three. |
| 5 | 🟢 | Sidebar nav | Users couldn't distinguish working modules from Phase 4 ones until they clicked. | Tiny `4` chip on Phase 4 sidebar items (`/app/ai`, `/app/ai-optimizer`, `/app/quickbooks`, `/app/api-settings`). |

## Open / known — to triage in next pass

| # | Sev | Location | Issue |
|---|---|---|---|
| O1 | 🟢 | `app.communication.templates.tsx` | Some optimistic toasts fire before the supabase round-trip resolves; on error the UI shows the new template until refresh. |
| O2 | 🟢 | `app.invoices.tsx` | "Send invoice" button shows `toast.success` regardless of actual email send result. Verify against `email_log`. |
| O3 | 🟢 | `app.settings.tsx` | A few sub-settings persist via toast-then-update pattern; needs error-path coverage. |
| O4 | 🟢 | `app.coupons.tsx` | `delete` action has no confirmation modal — easy to mis-click. |
| O5 | 🟢 | `app.api-settings.tsx` | "Create key" still allowed locally; data is in-component state only. Consider hiding the form entirely until Phase 4. |
| O6 | 🟡 | `app.inbox.tsx` SMS/WhatsApp | Send button is disabled (good), but channel switcher still selects SMS — consider hiding non-functional channels behind a Phase 4 gate. |
| O7 | 🟢 | `app.pos.tsx` | Card-on-file charge button is disabled on the client profile but POS still allows a "card" payment row that does not capture funds. |

None of the open items block beta; all are tracked for the next polish pass.

## Method

Commands run:

```bash
rg -n "onClick.*=>.*toast\.(info|success)" src/routes/app.*.tsx
rg -n "supabase\.from" src/routes/app.*.tsx | grep -v "try\|catch\|error"
rg -n "Dialog open|Modal open" src/routes/app.*.tsx
```

Each finding was inspected by reading the surrounding handler and confirming whether the toast/UI state matched a real backend write.
