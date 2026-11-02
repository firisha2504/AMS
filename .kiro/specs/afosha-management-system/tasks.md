# Implementation Plan: Afosha Management System — Gap Resolution

## Overview

The AMS core is largely implemented. This plan addresses the **5 identified gaps** from Design §9, plus one mobile push verification task and a documentation cleanup task. Already-shipped features are not re-listed.

**Summary Table**

| # | Task | Priority | Status | Requirements |
|---|------|----------|--------|--------------|
| 1 | Fix Penalty `isPaid` flag on payment settlement | High | Pending | 8.5 |
| 2 | Add financial transaction ledger query API | High | Pending | 21.4 |
| 3 | Implement SMS template substitution engine | Medium | Pending | 18.8, 24.4 |
| 4 | Add language parameter to report exports | Medium | Pending | 27.9 |
| 5 | Enforce first-login password change for default Admin | Medium | Pending | 29.6 |
| 6 | Register device token endpoint on mobile startup | High | Pending | 19.1, 19.2 |
| 7 | Update documentation to reflect all changes | Low | Pending | all |

## Tasks

- [x] 1. Fix Penalty `isPaid` flag on payment settlement
  - **Status:** Pending
  - **Priority:** High (data correctness bug — Design §9 Gap 1)
  - `applyPaymentToObligation()` sets `WeeklyObligation.status = PAID` but never marks linked `Penalty` records as paid, causing `GET /finance/penalties` to show settled penalties as outstanding.
  - [x] 1.1 In `backend/src/services/contribution.service.ts`, inside `applyPaymentToObligation()`, after the obligation status resolves to `PAID`, query all `Penalty` records where `memberId` matches the obligation's member and `weekNumber` + `year` match the obligation's values.
    _Requirements: 8.5_
  - [x] 1.2 Call `prisma.penalty.updateMany({ where: { memberId, weekNumber, year }, data: { isPaid: true } })` on those matching records.
    _Requirements: 8.5_
  - [x] 1.3 Wrap the `weeklyObligation.update`, `penalty.updateMany`, and `member.update` (outstanding balance decrement) calls in a single `prisma.$transaction([...])` to ensure atomicity.
    _Requirements: 8.5_
  - [x] 1.4 Review `applyPaymentToSpecialContributionObligation()` to determine whether any `Penalty` records are associated with special contribution obligations; apply the same `isPaid` update if applicable.
    _Requirements: 8.5_
  - [x] 1.5 Verify manually (or via a test seed) that after recording and verifying a payment that fully covers an obligation, `GET /finance/penalties` returns `isPaid: true` for that member's matching penalty record.
    _Requirements: 8.5_

- [x] 2. Add financial transaction ledger query API
  - **Status:** Pending
  - **Priority:** High (missing admin feature — Design §9 Gap 2)
  - The `Transaction` table is populated correctly by existing flows, but no endpoint exposes it. Admins and Auditors have no way to query the ledger.
  - [x] 2.1 In `backend/src/routes/finance.routes.ts`, add a `GET /transactions` route protected by `authenticate` and `authorize('ADMIN', 'AUDITOR')`.
    _Requirements: 21.4_
  - [x] 2.2 Accept optional query parameters: `memberId` (string), `type` (enum value from `TransactionType`), `from` (ISO 8601 date), `to` (ISO 8601 date), `page` (integer, default `1`), `limit` (integer, default `50`).
    _Requirements: 21.4_
  - [x] 2.3 Build the Prisma `where` clause dynamically — include each filter only when the parameter is present; apply date filters as `{ gte: new Date(from) }` / `{ lte: new Date(to) }` on `Transaction.createdAt`.
    _Requirements: 21.4_
  - [x] 2.4 Execute `prisma.transaction.findMany({ where, include: { member: { select: { fullName: true, memberId: true } } }, skip, take, orderBy: { createdAt: 'desc' } })` alongside `prisma.transaction.count({ where })` in a `Promise.all`.
    _Requirements: 21.4_
  - [x] 2.5 Return results via `sendSuccess(res, transactions, 'general.success', lang, 200, { total, page, limit })` using the standard response envelope.
    _Requirements: 21.4_
  - [x] 2.6 Add the new endpoint to `docs/API.md` under the Finance section, documenting path, method, required role, query parameters, and an example response.
    _Requirements: 21.4_

- [x] 3. Implement SMS template substitution engine
  - **Status:** Pending
  - **Priority:** Medium (admin configurability — Design §9 Gap 3)
  - `SystemSetting` stores SMS template keys but `notification.service.ts` uses hardcoded strings, so Admin edits via the Settings page have no effect on outgoing messages.
  - [x] 3.1 In `backend/prisma/seed.ts`, add (or confirm presence of) four `SystemSetting` upsert entries with keys: `sms_template_payment_reminder_en`, `sms_template_payment_reminder_om`, `sms_template_meeting_reminder_en`, `sms_template_meeting_reminder_om`.
    _Requirements: 18.8, 24.4_
  - [x] 3.2 Set default template values using placeholder variables `{memberName}`, `{amount}`, `{dueDate}`, `{meetingDate}` — e.g. `"Reminder: Your weekly contribution of Birr {amount} is unpaid. Please pay before {dueDate}."` for the English payment reminder.
    _Requirements: 18.8, 24.4_
  - [x] 3.3 Create a `renderTemplate(template: string, vars: Record<string, string>): string` utility function in `backend/src/services/helpers.ts` that replaces each `{key}` placeholder with the corresponding value from `vars`, leaving unrecognised placeholders unchanged.
    _Requirements: 18.8, 24.4_
  - [x] 3.4 Update `sendPaymentReminderSms(phone, amount, lang)` in `backend/src/services/notification.service.ts` to: (a) read the matching template from `SystemSetting` via `prisma.systemSetting.findUnique({ where: { key: \`sms_template_payment_reminder_${lang}\` } })`, (b) fall back to the existing hardcoded string if absent, and (c) call `renderTemplate(template, { amount: String(amount) })` before passing to `sendSms()`.
    _Requirements: 18.8_
  - [x] 3.5 Apply the same pattern to `sendMeetingReminderSms(phone, date, lang)`, reading `sms_template_meeting_reminder_{lang}` and substituting `{ meetingDate: date }`.
    _Requirements: 18.8, 24.4_
  - [x] 3.6 Confirm via the Settings page that editing an SMS template value via `PUT /settings` persists to `SystemSetting` and that the next scheduled SMS delivery uses the updated text.
    _Requirements: 24.4_

- [x] 4. Add language parameter to report exports
  - **Status:** Pending
  - **Priority:** Medium (localization completeness — Design §9 Gap 4)
  - `export.service.ts` may use hardcoded English column headers. The requirement mandates that PDF and Excel exports honour the `Accept-Language` header.
  - [x] 4.1 Open `backend/src/services/export.service.ts` and audit every exported function (`generatePdfReport`, `generateExcelReport`, and any type-specific helpers) to identify all hardcoded English strings used as column headers, sheet names, or section labels.
    _Requirements: 27.9_
  - [x] 4.2 Add a `lang: string` parameter (default `'om'`) to each of those functions for backwards compatibility.
    _Requirements: 27.9_
  - [x] 4.3 Replace each hardcoded label with a `t(lang, key)` call using `backend/src/utils/i18n.ts` and a consistent dot-notation key convention (e.g. `reports.headerMemberName`, `reports.headerAmount`).
    _Requirements: 27.9_
  - [x] 4.4 Add all missing translation keys to both the `en` and `om` message catalogs in `backend/src/utils/i18n.ts`.
    _Requirements: 27.9_
  - [x] 4.5 In the report generation endpoint(s) in `backend/src/routes/settings.routes.ts`, extract language via `getLanguage(req.headers['accept-language'])` and pass it as the `lang` argument to the export functions.
    _Requirements: 27.9_
  - [x] 4.6 Validate by requesting a report with `Accept-Language: om` and confirming Afan Oromo column headers appear in the generated PDF/Excel; repeat with `Accept-Language: en`.
    _Requirements: 27.9_

- [x] 5. Enforce first-login password change for default Admin
  - **Status:** Pending
  - **Priority:** Medium (production security — Design §9 Gap 5)
  - The seed Admin account (`admin` / `Admin@123`) has no programmatic prompt to change its password. Any deployment that skips the manual step ships with a known default credential.
  - [x] 5.1 Add `mustChangePassword Boolean @default(false)` to the `User` model in `backend/prisma/schema.prisma`.
    _Requirements: 29.6_
  - [x] 5.2 Create a new Prisma migration: run `npx prisma migrate dev --name add_must_change_password` from the `backend/` directory.
    _Requirements: 29.6_
  - [x] 5.3 In `backend/prisma/seed.ts`, set `mustChangePassword: true` on the seeded Admin account's `User` create/upsert data block.
    _Requirements: 29.6_
  - [x] 5.4 In the login route handler (`backend/src/routes/auth.routes.ts`), include `mustChangePassword` in the returned user payload so the client can read it from the login response.
    _Requirements: 29.6_
  - [x] 5.5 In the web portal `web/src/contexts/AuthContext.tsx`, after a successful login, check `user.mustChangePassword`; if `true`, redirect the user to the change-password page before allowing access to any other portal content.
    _Requirements: 29.6_
  - [x] 5.6 In the change-password handler (`POST /auth/change-password` in `auth.routes.ts`), after successfully updating `User.passwordHash`, also set `mustChangePassword = false` on the same `User` record.
    _Requirements: 29.6_
  - [x] 5.7 Verify the full flow on a fresh seed: log in as `admin`, confirm redirect to the change-password page, set a new password, confirm the flag clears, and confirm normal portal access is restored.
    _Requirements: 29.6_

- [x] 6. Register device token endpoint on mobile startup
  - **Status:** Pending (confirm integration)
  - **Priority:** High (FCM push prerequisite)
  - The backend endpoint `POST /api/members/me/device-token` exists and handles upserts correctly (confirmed in `members.routes.ts`). This task verifies the mobile-side integration.
  - [x] 6.1 Open `mobile/lib/services/push_service.dart` and confirm that after `FirebaseMessaging.instance.getToken()` returns a non-null token, the code calls `ApiService.post('/members/me/device-token', { 'token': token, 'platform': 'android'|'ios' })`. If absent, add the call.
    _Requirements: 19.1, 19.2_
  - [x] 6.2 Wrap the registration call in a try/catch so that a failed device-token registration is swallowed silently (non-fatal) and does not prevent app startup or user login.
    _Requirements: 19.2_
  - [x] 6.3 Confirm the backend's `DeviceToken` upsert (`where: { token }`) handles duplicate registrations without error — verify the existing upsert logic in `members.routes.ts` is correct.
    _Requirements: 19.2_
  - [x] 6.4 On a test device, launch the mobile app, log in as a Member, then confirm the token was persisted by querying `SELECT * FROM "DeviceToken" WHERE "userId" = '<id>';` in the database.
    _Requirements: 19.1, 19.2_

- [x] 7. Update documentation to reflect all changes
  - **Status:** Pending
  - **Priority:** Low
  - Brings all documentation into sync after Tasks 1–6 are complete.
  - [x] 7.1 Update `docs/API.md` to add the `GET /finance/transactions` endpoint from Task 2: document path, HTTP method, required role (ADMIN, AUDITOR), query parameters, and an example response body.
    _Requirements: all_
  - [x] 7.2 Update `docs/API.md` to document the `mustChangePassword` boolean field added to the login response payload by Task 5.
    _Requirements: all_
  - [x] 7.3 Update `docs/SPEC.md` implementation status table to mark all 5 Design §9 gaps as resolved once their corresponding tasks are complete.
    _Requirements: all_
  - [x] 7.4 In `.kiro/specs/afosha-management-system/requirements.md`, change the status tag for each criterion addressed by Tasks 1–5 from `[PENDING]` to `[IMPLEMENTED]`: Requirements 8.5, 21.4, 18.8, 24.4, 27.9, and 29.6.
    _Requirements: all_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3, 4, 5, 6] },
    { "wave": 2, "tasks": [7] }
  ]
}
```

Tasks 1–6 are fully independent and can be worked in parallel (Wave 1). Task 7 depends on all Wave 1 tasks being complete.

## Notes

- Tasks 1–6 address gaps only. Do not modify any already-implemented feature as part of these tasks unless the change is required to fix the gap (e.g., adding a field to `schema.prisma` in Task 5).
- The `applyPaymentToSpecialContributionObligation()` function referenced in Task 1.4 may live in `contribution.service.ts` or `special-contribution.service.ts` — check both files before implementing.
- Task 6 is marked "confirm implementation" because the backend endpoint is already verified present. If the mobile call is already in `push_service.dart`, steps 6.1–6.2 are verification only, not new code.
- After Task 5.2, run `npx prisma generate` to regenerate the Prisma client before testing any code that references `mustChangePassword`.
