# Afosha Management System (AMS) — Technical Design Document

> **Scope:** This document describes the architecture and implementation of the AMS as it exists in the codebase. All section headers note implementation status where relevant. For pending gaps, see §9.

---

## Overview

The Afosha Management System (AMS) is a full-stack digital platform for managing the financial, social, and administrative activities of Afosha — a community-based social savings and contributions group in Ethiopia. The system is built as a monorepo with three tiers: a React/TypeScript web portal for Admin and Auditor users, a Flutter mobile app for Members, and a shared Node.js/Express REST API backed by PostgreSQL via Prisma ORM.

The system manages member registration and lifecycle, automated weekly contribution tracking with penalty rules, payment recording and verification, special contribution campaigns (graduation, bereavement, emergency), meeting and attendance management, multi-channel notifications (SMS via Twilio, push via FCM, and in-app), financial ledger entries, report generation (PDF/Excel), audit logging, and scheduled database backups. All user-facing text is available in both Afan Oromo (`om`) and English (`en`).

---

## Architecture

See [System Architecture Overview](#1-system-architecture-overview) for the full ASCII diagram and layer descriptions. In summary:

- **Web** (`/web`): React 19 + TypeScript + Tailwind CSS + Vite. Admin/Auditor portal.
- **Mobile** (`/mobile`): Flutter (Dart). Member-facing app for Android and iOS.
- **Backend** (`/backend`): Node.js + Express 5 + TypeScript. Single REST API serving both clients. Entry point: `src/index.ts`.
- **Database**: PostgreSQL, accessed exclusively through Prisma ORM (`backend/prisma/schema.prisma`).
- **Scheduled jobs**: `src/jobs/scheduler.ts` using node-cron (weekly obligations, overdue marking, SMS reminders, backups).

---

## Components and Interfaces

The backend is organized into the following component groups:

**Route modules** (`src/routes/`): `auth`, `members`, `payments`, `finance`, `dashboard`, `settings`, `special-contributions`, `public`. All mounted under `/api` via `src/routes/index.ts`.

**Service layer** (`src/services/`): `contribution.service.ts`, `notification.service.ts`, `export.service.ts`, `special-contribution.service.ts`, `helpers.ts`. Route handlers delegate all business logic to services.

**Middleware** (`src/middleware/`): `auth.ts` (JWT + RBAC), `audit.ts` (automatic audit logging), `upload.ts` (multer file upload), `validate.ts` (Zod schema validation).

**Utilities** (`src/utils/`): `i18n.ts` (bilingual message catalog), `response.ts` (standard API envelope).

**External interfaces**: Twilio REST API (SMS), FCM REST API (push notifications), SMTP/nodemailer (email), PostgreSQL (database).

The standard API response envelope used by all endpoints:
```json
{
  "success": true,
  "message": "Localized string",
  "data": {},
  "meta": {},
  "errors": {}
}
```

---

## Data Models

See [Database Design](#3-database-design) for the full model descriptions, relationships, indexes, and enum definitions. Key models: `User`, `Member`, `WeeklyObligation`, `Payment`, `Penalty`, `Fine`, `SavingsRecord`, `Meeting`, `Attendance`, `Transaction`, `Notification`, `AuditLog`, `SystemSetting`, `OtpCode`, `SmsLog`, `DeviceToken`, `SpecialContribution`, `SpecialContributionObligation`, `PublicContent`, `Backup`, `RefreshToken`, `EmergencyContact`.

---

## Error Handling

- All route handlers are wrapped in try/catch. Unhandled exceptions fall through to the global Express error handler in `src/index.ts`, which returns `500` with `{ success: false, message: "Internal server error" }`.
- Authentication errors return `401`; authorization errors return `403`.
- Validation errors (Zod) return `400` with per-field `errors` in the response envelope.
- Not-found routes return `404` via the Express 404 catch-all.
- Notification delivery failures (SMS, push, email) are non-fatal and never propagate to the caller. SMS failures are logged to the `SmsLog` table; push failures are silently swallowed.
- Backup job failures are logged to `console.error` and do not crash the server.
- OTP delivery uses console fallback if external services (Twilio/SMTP) are not configured, ensuring development environments always function.

---

## Testing Strategy

The codebase does not currently include automated tests. Recommended testing approach:

- **Unit tests** (Jest/Vitest): `contribution.service.ts` penalty calculation logic, `i18n.ts` key resolution, `helpers.ts` utility functions, Zod schema validators.
- **Integration tests**: Auth flow (login → JWT → protected route), payment recording + verification + obligation update, weekly obligation creation idempotency.
- **Property-based tests**: Penalty rule invariants (e.g., consecutive miss count always produces correct penalty tier), obligation idempotency under repeated cron runs.
- **End-to-end tests** (Playwright): Web portal login, member approval, payment workflow.
- **Mobile**: Flutter `flutter_test` for widget and unit tests.

---

## Correctness Properties

### Property 1: Weekly obligation creation is idempotent
Running `createWeeklyObligations()` multiple times for the same week produces exactly one `WeeklyObligation` per APPROVED member. Enforced by the unique constraint on `(memberId, weekNumber, year)` — duplicate creation is skipped, not rejected with an error.

**Validates: Requirements 7.3**

### Property 2: Outstanding balance consistency
`Member.outstandingBalance` is incremented when a penalty-bearing obligation is created, and decremented when a payment is applied to that obligation. The decrement is capped at the remaining unpaid amount so the balance never goes below zero.

**Validates: Requirements 7.7**

### Property 3: Penalty record created only on miss
A `Penalty` record is created in `createWeeklyObligations()` if and only if `consecutiveMissed >= 1` (i.e., `penaltyAmount > 0`). Members with no previous unpaid obligations receive a zero-penalty obligation and no `Penalty` record.

**Validates: Requirements 8.1**

### Property 4: Penalty tier is mutually exclusive
For any new obligation: if `consecutiveMissed >= 3`, the monthly penalty rule applies (`isMonthlyPenalty = true`, 100 Birr + arrears); if `1 <= consecutiveMissed <= 2`, the weekly penalty applies (`isMonthlyPenalty = false`, 50 Birr). Both rules cannot apply simultaneously.

**Validates: Requirements 7.5, 7.6**

### Property 5: Receipt number is unique and only set on verification
`Payment.receiptNumber` has a `@unique` database constraint and is `null` on creation. It is only assigned when `PATCH /payments/:id/verify` sets `status = VERIFIED`. PENDING and REJECTED payments always have a null receipt number.

**Validates: Requirements 10.4**

### Property 6: Beneficiary exemption in special contributions
When a `SpecialContribution` campaign is created, the beneficiary member's `SpecialContributionObligation` is created with `isExempt = true` and `status = PAID`. No payment is ever required from the beneficiary.

**Validates: Requirements 12.2, 13.2**

### Property 7: Standard API envelope on all responses
Every API response — success or error — follows the envelope: `{ success: boolean, message: string, data?: any, meta?: any, errors?: any }`. This is enforced by routing all responses through `sendSuccess()` and `sendError()` in `src/utils/response.ts`.

**Validates: Requirements 3.1**

### Property 8: Passwords never stored in plaintext
The `User.passwordHash` field always contains a bcrypt hash. The `sanitizeBody()` function in `audit.ts` redacts `password` and `passwordHash` from audit log entries. No endpoint returns the password hash.

**Validates: Requirements 3.6**

### Property 9: Audit log coverage of state-changing requests
The `auditLog` middleware intercepts `res.json` and writes an `AuditLog` entry for every response with a 2xx status code. This applies to all routes without requiring per-route configuration.

**Validates: Requirements 3.7**

### Property 10: JWT verification gates all protected routes
Every route that applies `authenticate` middleware verifies the Bearer token signature and expiry, checks `User.isActive` and `User.lockedUntil` against the DB, and returns `401` or `403` before the route handler executes if any check fails.

**Validates: Requirements 3.1, 3.3**

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Database Design](#3-database-design)
4. [Web Frontend Architecture](#4-web-frontend-architecture)
5. [Mobile App Architecture](#5-mobile-app-architecture)
6. [Authentication & Security Design](#6-authentication--security-design)
7. [Notification Architecture](#7-notification-architecture)
8. [Weekly Automation Design](#8-weekly-automation-design)
9. [Identified Gaps (PENDING)](#9-identified-gaps-pending)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. System Architecture Overview

AMS is a three-tier system served from a monorepo with three top-level directories:

```
Afosha MS/
├── backend/        Node.js + Express REST API (TypeScript, Prisma)
├── web/            React + TypeScript admin/auditor web portal
└── mobile/         Flutter member mobile app (Android + iOS)
```

The backend is the single source of truth for all business logic and data. Both the web portal and the mobile app communicate with it exclusively through the REST API.

```
┌─────────────────────────────────────────────────────┐
│                     CLIENTS                         │
│                                                     │
│  ┌─────────────────────┐  ┌────────────────────┐   │
│  │  Web Portal          │  │  Mobile App         │   │
│  │  React / TypeScript  │  │  Flutter (Dart)     │   │
│  │  Vite + Tailwind CSS │  │  Android / iOS      │   │
│  │  Port 5173 (dev)     │  │  FlutterSecureStore │   │
│  └─────────┬───────────┘  └──────────┬──────────┘   │
└────────────┼──────────────────────────┼──────────────┘
             │  HTTP/REST (JSON)         │  HTTP/REST (JSON)
             │  Authorization: Bearer    │  Accept-Language: om|en
             ▼                           ▼
┌─────────────────────────────────────────────────────┐
│                  REST API (Backend)                  │
│  Node.js + Express 5 + TypeScript                   │
│  Port 5000                                          │
│                                                     │
│  Middleware chain:                                  │
│  helmet → cors → json-body → optionalAuth →         │
│  rate-limit → [authenticate → authorize] →          │
│  validate → auditLog → route handler                │
│                                                     │
│  Route modules: auth, members, payments, finance,   │
│  dashboard, settings, special-contributions, public │
│                                                     │
│  Service layer: contribution, notification,         │
│  export, special-contribution, helpers              │
│                                                     │
│  Cron Jobs (node-cron):                             │
│  Sat 06:00 • Daily 00:00 • Fri 18:00 •              │
│  Sat 07:00 • Daily 02:00                            │
└──────────────────────────┬──────────────────────────┘
                           │  Prisma ORM
                           ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL Database                 │
│  Managed via Prisma migrations                      │
│  schema: backend/prisma/schema.prisma               │
└─────────────────────────────────────────────────────┘

External services:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Twilio SMS  │  │  FCM (Push)  │  │  SMTP Email  │
  │  (optional)  │  │  (optional)  │  │  (optional)  │
  └──────────────┘  └──────────────┘  └──────────────┘
```

All three external services have graceful fallbacks when not configured (console logging in development).

---

## 2. Backend Architecture

### Entry Point: `src/index.ts`

The Express application is assembled and started in `src/index.ts`. The middleware chain applied globally is:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet` | Sets security HTTP headers |
| 2 | `cors` | Allows `CORS_ORIGIN` (default `http://localhost:5173`) |
| 3 | `express.json({ limit: '10mb' })` | Parses JSON bodies |
| 4 | `express.urlencoded` | Parses form-encoded bodies |
| 5 | `optionalAuth` | Attaches `req.user` and `req.lang` if a valid Bearer token is present; does not reject unauthenticated requests |
| 6 | `rateLimit` | 200 requests per 15-minute window per IP on `/api/*` |

Static file serving: `GET /uploads/*` is served directly from the `uploads/` directory on disk.

After startup, `startScheduledJobs()` is called to register all cron tasks.

### Route Modules: `src/routes/`

All routes are mounted at `/api` via `src/routes/index.ts`:

| Mount path | File | Protected |
|-----------|------|-----------|
| `/api/auth` | `auth.routes.ts` | Mixed (login/OTP = public; logout/change-password = authenticated) |
| `/api/members` | `members.routes.ts` | Mixed (register = public; others = authenticated with RBAC) |
| `/api/payments` | `payments.routes.ts` | Authenticated (Admin/Auditor or Member) |
| `/api/finance` | `finance.routes.ts` | Authenticated (Admin/Auditor or Member) |
| `/api/dashboard` | `dashboard.routes.ts` | Authenticated (role-specific) |
| `/api/settings` | `settings.routes.ts` | Authenticated (Admin for write; all for notifications) |
| `/api/special-contributions` | `special-contributions.routes.ts` | Authenticated (Admin/Auditor or Member) |
| `/api/public` | `public.routes.ts` | Public |
| `GET /api/health` | inline | Public |

### Service Layer: `src/services/`

Route handlers delegate all business logic to service modules:

- **`contribution.service.ts`** — Weekly obligation creation, overdue marking, payment application to obligations, ledger entries, unpaid reminder dispatch.
- **`notification.service.ts`** — OTP creation/verification, SMS delivery (Twilio + fallback), email delivery (nodemailer + fallback), push notifications (FCM REST API), bilingual SMS helpers.
- **`export.service.ts`** — Report generation using PDFKit (PDF) and ExcelJS (Excel/CSV) for contributions, savings, penalties, attendance, and year-end summaries.
- **`special-contribution.service.ts`** — Campaign creation (GRADUATION, BEREAVEMENT, EMERGENCY), obligation fan-out, beneficiary exemption, notification dispatch.
- **`helpers.ts`** — Shared utilities: `generateOtp`, `generateTransactionId`, `getNumericSetting`, `getWeekNumber`, `getNextSaturday`.

### Prisma ORM: `src/config/database.ts`

All database access goes through a singleton Prisma Client instance exported from `src/config/database.ts`. No raw SQL is used anywhere in the codebase.

### Middleware Details

**`src/middleware/auth.ts`**
- `authenticate(req, res, next)` — Verifies the `Authorization: Bearer <token>` header, decodes the JWT using `config.jwt.secret`, fetches the user from the DB to check `isActive` and `lockedUntil`, and attaches `{ userId, role }` to `req.user`.
- `authorize(...roles)` — Returns a middleware that checks `req.user.role` against the allowed list; returns `403` if not authorized.
- `optionalAuth(req, res, next)` — Attempts to decode the token silently; continues without error if absent or invalid. Used globally at app level so all routes have access to `req.lang`.

**`src/middleware/audit.ts`**
- `auditLog(req, res, next)` — Wraps `res.json` to intercept successful responses (2xx). On success, writes an `AuditLog` record containing `userId`, `action` (`METHOD /path`), `module` (derived from `req.baseUrl`), sanitized request body (passwords redacted), and `ipAddress`. Operates asynchronously and never blocks the response.
- `createAuditEntry(...)` — Direct audit insertion used from route handlers for specific events.

**`src/middleware/upload.ts`**
- Multer disk storage to `uploads/` directory.
- Accepted MIME types: `jpeg`, `jpg`, `png`, `webp`, `gif`.
- Maximum file size: `config.upload.maxSizeMb` (default 5 MB).
- Filename: `{timestamp}-{random}{ext}`.

**`src/middleware/validate.ts`**
- Wraps Zod schemas into Express middleware. Validates `req.body` against the provided schema and returns a `400` with field-level errors if validation fails.

### Validation Schemas: `src/validators/schemas.ts`

Zod schemas are defined here and referenced by the validate middleware on all `POST` and `PATCH` endpoints. Covers login, OTP, member registration, payment recording, fine creation, savings, meeting, attendance, settings update, and special contribution creation.

### Utilities

**`src/utils/i18n.ts`**
- In-memory message catalog for `en` and `om` (Afan Oromo).
- `t(lang, key)` performs dot-notation key lookup (e.g., `t('om', 'auth.loginSuccess')`).
- Falls back to `om` if an unrecognized language is requested.
- Used by all response helpers.

**`src/utils/response.ts`**
- `sendSuccess(res, data, messageKey, lang, statusCode, meta)` — Sends a standard success envelope.
- `sendError(res, messageKey, lang, statusCode, errors)` — Sends a standard error envelope.
- All API responses follow the envelope format:
  ```json
  {
    "success": true | false,
    "message": "Localized string",
    "data": {},
    "meta": {},
    "errors": {}
  }
  ```
- `getLanguage(header)` — Parses the `Accept-Language` request header; returns `'om'` (default) or `'en'`.

### Configuration: `src/config/index.ts`

All runtime configuration is read from environment variables with sensible defaults:

| Key | Default | Purpose |
|-----|---------|---------|
| `PORT` | `5000` | HTTP listen port |
| `JWT_EXPIRES_IN` | `24h` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `OTP_EXPIRES_MINUTES` | `10` | OTP validity window |
| `OTP_MAX_ATTEMPTS` | `5` | Max OTP verification tries |
| `MAX_LOGIN_ATTEMPTS` | `5` | Failed logins before lockout |
| `LOCKOUT_DURATION_MINUTES` | `30` | Lockout duration |
| `DEFAULT_WEEKLY_CONTRIBUTION` | `50` | Birr per week |
| `DEFAULT_WEEKLY_PENALTY` | `50` | Birr per missed week |
| `DEFAULT_MONTHLY_PENALTY` | `100` | Birr for 4 consecutive misses |
| `DEFAULT_GRADUATION_CONTRIBUTION` | `100` | Birr per graduation campaign |
| `DEFAULT_BEREAVEMENT_CONTRIBUTION` | `100` | Birr per bereavement campaign |
| `MAX_FILE_SIZE_MB` | `5` | Upload limit |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin |

---

## 3. Database Design

### Schema Location

`backend/prisma/schema.prisma` — Prisma schema with PostgreSQL provider. Migrations are stored in `backend/prisma/migrations/`.

### Enums

| Enum | Values |
|------|--------|
| `UserRole` | `ADMIN`, `AUDITOR`, `MEMBER` |
| `MemberStatus` | `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `INACTIVE` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `PaymentMethod` | `CASH`, `BANK_TRANSFER`, `MOBILE_MONEY` |
| `PaymentStatus` | `PENDING`, `VERIFIED`, `REJECTED` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `EXCUSED` |
| `TransactionType` | `WEEKLY_CONTRIBUTION`, `SAVINGS`, `PENALTY`, `FINE`, `SPECIAL_CONTRIBUTION`, `ADJUSTMENT`, `REFUND` |
| `NotificationType` | `MEETING_REMINDER`, `PAYMENT_REMINDER`, `PENALTY_NOTICE`, `PAYMENT_CONFIRMATION`, `SYSTEM_ANNOUNCEMENT`, `ACCOUNT_UPDATE`, `SPECIAL_CONTRIBUTION` |
| `OtpPurpose` | `LOGIN`, `PASSWORD_RESET`, `ACCOUNT_VERIFICATION` |
| `OtpChannel` | `SMS`, `EMAIL` |
| `ObligationStatus` | `PENDING`, `PAID`, `PARTIAL`, `OVERDUE` |
| `SpecialContributionType` | `GRADUATION`, `BEREAVEMENT`, `EMERGENCY` |
| `FamilyRelationship` | `FATHER`, `MOTHER`, `BROTHER`, `SISTER`, `UNCLE`, `AUNT` |
| `SpecialContributionStatus` | `ACTIVE`, `CLOSED`, `CANCELLED` |

### Models

#### `User`
Core authentication record. Every person in the system has a `User`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `username` | String? unique | Admin/Auditor identifier |
| `phone` | String? unique | Member identifier |
| `email` | String? unique | Optional |
| `passwordHash` | String | bcrypt |
| `role` | `UserRole` | ADMIN / AUDITOR / MEMBER |
| `isActive` | Boolean | Default true |
| `preferredLanguage` | String | Default `"om"` |
| `failedLoginAttempts` | Int | Lockout counter |
| `lockedUntil` | DateTime? | Null = not locked |

Indexes: `role`, `phone`.

#### `Member`
Profile record for users with `MEMBER` role. One-to-one with `User`.

| Field | Type | Notes |
|-------|------|-------|
| `memberId` | String unique | Human-readable ID (e.g., `AMS-0001`) |
| `userId` | String unique FK | → `User` |
| `status` | `MemberStatus` | Default `PENDING` |
| `totalSavings` | Decimal(12,2) | Running aggregate |
| `totalCredit` | Decimal(12,2) | Running aggregate |
| `outstandingBalance` | Decimal(12,2) | Running aggregate |

Indexes: `status`, `fullName`, `memberId`.

#### `EmergencyContact`
One-to-one with `Member`. Stores emergency contact name, relationship, phone, and address.

#### `WeeklyObligation`
One record per member per week. The unique constraint `(memberId, weekNumber, year)` ensures idempotent creation.

| Field | Type | Notes |
|-------|------|-------|
| `contributionAmount` | Decimal | Base weekly amount |
| `penaltyAmount` | Decimal | 0 if no miss, otherwise weeklyPenalty or monthlyPenalty |
| `totalDue` | Decimal | Sum including any penalties |
| `amountPaid` | Decimal | Running paid amount |
| `status` | `ObligationStatus` | PENDING → PARTIAL / PAID / OVERDUE |
| `isMonthlyPenalty` | Boolean | True when 4+ consecutive misses |
| `consecutiveMissedWeeks` | Int | Count at time of creation |

Indexes: `dueDate`, `status`.

#### `Payment`
Each payment recorded by an Auditor or Admin. Can be linked to a `WeeklyObligation` or a `SpecialContributionObligation` (or neither for standalone savings).

| Field | Type | Notes |
|-------|------|-------|
| `paymentId` | String unique | Human-readable |
| `obligationId` | String? FK | → `WeeklyObligation` |
| `specialContributionObligationId` | String? FK | → `SpecialContributionObligation` |
| `status` | `PaymentStatus` | PENDING → VERIFIED / REJECTED |
| `receiptNumber` | String? unique | Set on verification |
| `verifiedById` | String? FK | → `User` |

Indexes: `memberId`, `paymentDate`, `status`.

#### `Penalty`
Created automatically by `contribution.service.ts` when a `WeeklyObligation` is created with a penalty. Not created manually.

| Field | Type | Notes |
|-------|------|-------|
| `isMonthly` | Boolean | True = monthly penalty (100 Birr rule) |
| `isPaid` | Boolean | Default false — **see Gap #1** |

#### `Fine`
Manually created by Admin for rule violations.

| Field | Notes |
|-------|-------|
| `fineType` | Free-text string |
| `isPaid` | Boolean — tracked but must be manually updated |

#### `SavingsRecord`
Each deposit entry. Stores `runningBalance` computed at write time.

#### `Meeting`
Scheduled meeting with title, location, `meetingDate`, `meetingTime`, and agenda.

#### `Attendance`
Unique per `(meetingId, memberId)`. Status: `PRESENT`, `ABSENT`, or `EXCUSED`.

#### `Transaction`
Immutable ledger entries created alongside payments and penalty events. Types: `WEEKLY_CONTRIBUTION`, `SAVINGS`, `PENALTY`, `FINE`, `SPECIAL_CONTRIBUTION`, `ADJUSTMENT`, `REFUND`.

#### `Notification`
In-app notifications. Stores bilingual content: `title` / `titleOm`, `message` / `messageOm`. Scoped to a `userId` and optionally a `memberId`. The `isRead` flag is toggled via the API.

#### `AuditLog`
Append-only. Written by `audit.ts` middleware on every successful state-changing request. Contains `userId`, `action`, `module`, sanitized `details` (JSON), and `ipAddress`.

#### `SystemSetting`
Key-value store for runtime configuration. Keys include `weekly_contribution`, `weekly_penalty`, `monthly_penalty`, `graduation_contribution`, `bereavement_contribution`, and SMS template keys.

#### `OtpCode`
Stores hashed OTP codes with `purpose`, `channel`, `expiresAt`, `isUsed`, and `attempts` counter.

#### `SmsLog`
Delivery log for every SMS attempt. Fields: `phone`, `message`, `status` (`sent` / `logged` / `failed`), `provider` (`twilio` / `console`), `error`.

#### `Backup`
Registry of backup files: `filename`, `filePath`, `fileSize`, `type` (`automatic` / `manual`), `createdBy`.

#### `DeviceToken`
FCM push tokens registered by mobile clients. Unique per `token`. Multiple records per `userId` (one per device).

#### `SpecialContribution`
Campaign header record. `campaignId` format:
- Graduation: `SC-GRA-{timestamp}`
- Bereavement: `SC-BER-{timestamp}`
- Emergency: `SC-EMR-{timestamp}`

`targetMemberIds` is stored as JSON for emergency campaigns with a restricted member list.

#### `SpecialContributionObligation`
Per-member obligation within a campaign. Unique per `(specialContributionId, memberId)`. The `isExempt` flag marks the beneficiary member as exempt (auto-PAID).

#### `PublicContent`
CMS for the public website. Records identified by `slug`. Stores bilingual `title` / `titleOm` and `content` / `contentOm` (TEXT). Managed by Admin through the Settings API.

### Key Relationships

```
User ──< Member (1:1)
User ──< RefreshToken (1:many)
User ──< OtpCode (1:many)
User ──< AuditLog (1:many)
User ──< Notification (1:many)
User ──< DeviceToken (1:many)

Member ──< WeeklyObligation (1:many) [unique: memberId+weekNumber+year]
Member ──< Payment (1:many)
Member ──< Penalty (1:many)
Member ──< Fine (1:many)
Member ──< SavingsRecord (1:many)
Member ──< Attendance (1:many)
Member ──< Transaction (1:many)
Member ──< SpecialContributionObligation (1:many)
Member ──< Notification (1:many)
Member ─── EmergencyContact (1:1)

WeeklyObligation ──< Payment (1:many)

SpecialContribution ──< SpecialContributionObligation (1:many)
SpecialContributionObligation ──< Payment (1:many)

Meeting ──< Attendance (1:many) [unique: meetingId+memberId]
```

---

## 4. Web Frontend Architecture

### Stack

- **React 19** + **TypeScript 6** for component logic
- **Tailwind CSS 4** for styling
- **Vite 8** as the build tool and dev server (default port 5173)
- **react-router-dom v7** for client-side routing
- **axios** for API requests
- **i18next + react-i18next** for multilingual UI (English / Afan Oromo)
- **Recharts** for dashboard charts and analytics visualizations
- **lucide-react** for icons

### File Structure (relevant source paths)

```
web/src/
├── App.tsx                      Main router and AuthProvider wrapper
├── i18n.ts                      i18next initialization
├── contexts/
│   └── AuthContext.tsx          Global authentication state
├── components/
│   ├── ProtectedRoute.tsx       RBAC route guard
│   └── Layout.tsx               Authenticated shell (sidebar, header)
└── pages/
    ├── public/
    │   ├── PublicHomePage.tsx   Route: /
    │   └── AboutPage.tsx        Route: /about
    ├── LoginPage.tsx             Route: /login
    ├── DashboardPage.tsx         Route: /dashboard
    ├── MembersPage.tsx           Route: /members
    ├── PaymentsPage.tsx          Route: /payments
    ├── SpecialContributionsPage.tsx  Route: /special-contributions
    ├── AttendancePage.tsx        Route: /attendance
    ├── FinesPage.tsx             Route: /fines
    ├── ReportsPage.tsx           Route: /reports
    ├── NotificationsPage.tsx     Route: /notifications
    ├── AuditLogsPage.tsx         Route: /audit-logs
    ├── SettingsPage.tsx          Route: /settings
    └── BackupPage.tsx            Route: /backup
```

### Routing

Defined in `App.tsx` using `react-router-dom v7`. Public routes (`/`, `/about`, `/login`) render without authentication. All other routes are wrapped in `<ProtectedRoute>`, which:

1. Reads authentication state from `AuthContext`.
2. Redirects unauthenticated users to `/login`.
3. Enforces role-based access (Admin vs. Auditor vs. Member) at the route level.

The `<Layout>` component wraps all authenticated pages and renders the navigation sidebar and top header.

Unrecognized paths (`*`) redirect to `/`.

### AuthContext (`contexts/AuthContext.tsx`)

Provides the following to the component tree:
- `user` — decoded JWT payload (`userId`, `role`) or `null`
- `token` — current access token string
- `isAuthenticated` — boolean
- `login(credentials)` — calls `POST /api/auth/login`, stores token
- `logout()` — calls `POST /api/auth/logout`, clears token

Token is stored in browser `localStorage` (or `sessionStorage`) and attached to all axios requests as `Authorization: Bearer <token>`.

### Internationalization

`i18next` is initialized in `src/i18n.ts` with `en` and `om` resource bundles. Components use the `useTranslation()` hook. Language selection persists via `localStorage`. The `Accept-Language` header is forwarded in all API requests so the backend returns localized messages in the same language.

---

## 5. Mobile App Architecture

### Stack

- **Flutter** (Dart), targeting Android and iOS
- **SDK constraint**: `>=3.2.0 <4.0.0`
- **State management**: Provider pattern (`provider: ^6.1.2`)
- **Secure storage**: `flutter_secure_storage: ^9.2.2` for JWT token persistence
- **HTTP**: `http: ^1.2.0` (wrapped by `ApiService`)
- **Localization**: `flutter_localizations` + `intl` + ARB files
- **Push notifications**: `firebase_core: ^3.8.0` + `firebase_messaging: ^15.1.5`
- **PDF**: `pdf: ^3.11.1` + `printing: ^5.13.4` for receipt rendering
- **Image picker**: `image_picker: ^1.1.2` for profile photo selection
- **Image cache**: `cached_network_image: ^3.4.1`

### Entry Point: `lib/main.dart`

`main()` calls `PushService.initialize()` before running the app. The root widget `AmsApp` wraps everything in `MultiProvider` supplying `AuthProvider` and `LocaleProvider`. The `MaterialApp` home switches between `LoginScreen` and `HomeScreen` based on `AuthProvider.isAuthenticated`.

### Providers

**`lib/providers/auth_provider.dart` — `AuthProvider`**
- Holds the authenticated user state.
- Reads/writes JWT tokens from `FlutterSecureStorage` (key: `accessToken`, `refreshToken`).
- Exposes `isAuthenticated`, `isLoading`, `login()`, `logout()`.

**`lib/providers/locale_provider.dart` — `LocaleProvider`**
- Holds the current `Locale` (`om` or `en`).
- Persists selection via `shared_preferences`.
- Calls `ApiService.setLanguage(lang)` so all subsequent requests use the correct `Accept-Language` header.

### API Client: `lib/services/api_service.dart`

Centralised static HTTP client. All screens call it directly — there are no per-feature service classes.

| Method | Signature |
|--------|-----------|
| `get` | `ApiService.get(path, {params})` |
| `post` | `ApiService.post(path, body)` |
| `patch` | `ApiService.patch(path, body)` |
| `uploadFile` | `ApiService.uploadFile(path, file, {fieldName})` |

Internally, `_headers()` reads the stored `accessToken` and injects it as `Authorization: Bearer <token>`, plus the `Accept-Language` header set by `LocaleProvider`. Errors from the server are surfaced as `ApiException(message)`.

### Push Service: `lib/services/push_service.dart`

- Calls `FirebaseMessaging.instance.requestPermission()` on startup.
- Retrieves the FCM device token and registers it with the backend via `POST /api/members/device-token`.
- Handles foreground notifications using `FirebaseMessaging.onMessage`.

### Screens: `lib/screens/`

| Screen file | Purpose |
|-------------|---------|
| `login_screen.dart` | Username/password login form; calls `AuthProvider.login()` |
| `home_screen.dart` | Bottom navigation shell; hosts the tab screens |
| `contributions_screen.dart` | Weekly obligation history and current balance |
| `savings_screen.dart` | Savings balance and deposit history |
| `penalties_screen.dart` | List of penalties and fines |
| `receipts_screen.dart` | Payment receipts with PDF export |
| `special_contributions_screen.dart` | Active special contribution campaigns |
| `attendance_screen.dart` | Member's own attendance record |
| `notifications_screen.dart` | In-app notifications list with mark-as-read |
| `profile_screen.dart` | View/edit profile; profile picture upload |
| `more_screen.dart` | Language toggle, logout, app info |

### Localization: `lib/l10n/`

Two ARB files provide all UI strings:
- `app_en.arb` — English
- `app_om.arb` — Afan Oromo

The `flutter gen-l10n` code generator produces typed accessor classes. Because the `om` locale is not included in the standard Flutter localization delegates, two custom delegates are provided:

- `FallbackMaterialLocalizationsDelegate` — falls back to `en` for `MaterialLocalizations`
- `FallbackCupertinoLocalizationsDelegate` — falls back to `en` for `CupertinoLocalizations`

Both are defined in `lib/utils/fallback_locale_delegate.dart` and registered in `main.dart`.

### Assets

Static images are bundled from `assets/images/` (declared in `pubspec.yaml`).

---

## 6. Authentication & Security Design

### JWT Token Pair

| Token | Lifetime | Storage |
|-------|---------|---------|
| Access token | `JWT_EXPIRES_IN` (default `24h`) | Web: `localStorage`; Mobile: `FlutterSecureStorage` |
| Refresh token | `JWT_REFRESH_EXPIRES_IN` (default `7d`) | Stored in `RefreshToken` table (DB), sent to client |

Refresh token rotation: `POST /auth/refresh` (not listed in API docs but present in auth routes) validates the stored refresh token, issues a new access token, and optionally rotates the refresh token.

Logout (`POST /auth/logout`) deletes the `RefreshToken` record from the DB, invalidating the session server-side.

### OTP Flow

```
Client                    Backend                         DB
  │                          │                             │
  │── POST /auth/request-otp ─▶                           │
  │                          │── generateOtp() ────────── │
  │                          │── hash(code) ──────────────▶ OtpCode.create()
  │                          │── sendSms / sendEmail ──── │
  │◀── 200 OK ───────────────│                             │
  │                          │                             │
  │── POST /auth/verify-otp ─▶                             │
  │                          │── findFirst(userId, code,   │
  │                          │   purpose, !isUsed,         │
  │                          │   expiresAt > now) ────────▶│
  │                          │── check attempts < max ─── │
  │                          │── update isUsed=true ──────▶│
  │◀── 200 OK ───────────────│                             │
```

OTP `purposes`: `LOGIN`, `PASSWORD_RESET`, `ACCOUNT_VERIFICATION`.  
OTP `channels`: `SMS`, `EMAIL`.  
Expiry: `OTP_EXPIRES_MINUTES` (default 10 minutes).  
Max attempts: `OTP_MAX_ATTEMPTS` (default 5).

### Password Security

- All passwords hashed with **bcryptjs** before storage in `User.passwordHash`.
- Plaintext passwords never logged or returned in any API response.
- The `sanitizeBody()` function in `audit.ts` redacts `password` and `passwordHash` fields before writing to `AuditLog`.

### Account Lockout

- `User.failedLoginAttempts` is incremented on each failed login.
- When `failedLoginAttempts >= MAX_LOGIN_ATTEMPTS` (default 5), `User.lockedUntil` is set to `now + LOCKOUT_DURATION_MINUTES` (default 30 minutes).
- The `authenticate` middleware rejects requests with a `403` if `lockedUntil > now`.

### RBAC

Authorization is enforced per route via the `authorize(...roles)` middleware. Example:

```typescript
// Admin-only
router.patch('/:id/approve', authenticate, authorize(UserRole.ADMIN), handler);

// Admin + Auditor
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.AUDITOR), handler);

// Member self-service
router.get('/me', authenticate, authorize(UserRole.MEMBER), handler);
```

### Input Validation

All `POST` and `PATCH` endpoints apply the `validate(schema)` middleware using Zod schemas defined in `src/validators/schemas.ts`. Validation failures return `400` with per-field error details.

### Audit Logging

Every successful (2xx) state-changing request is logged to `AuditLog` automatically by the `auditLog` middleware without any per-route configuration. The log entry includes: acting user ID, HTTP method + path, module name, sanitized request body, and client IP address.

---

## 7. Notification Architecture

AMS delivers notifications through three independent channels. All three are fire-and-forget — notification failures never block the primary operation.

### Channel 1: In-App (Database)

Stored as `Notification` records in PostgreSQL.

| Field | Notes |
|-------|-------|
| `userId` | FK to `User` (scopes notification to account) |
| `memberId` | FK to `Member` (optional, for member-specific events) |
| `type` | `NotificationType` enum |
| `title` / `titleOm` | Bilingual title |
| `message` / `messageOm` | Bilingual body |
| `isRead` | Default false |
| `metadata` | JSON blob for extra context |

Retrieval: `GET /api/settings/notifications` — returns only the authenticated user's notifications.  
Mark read: `PATCH /api/settings/notifications/:id/read`.

### Channel 2: SMS (Twilio)

Implemented in `src/services/notification.service.ts` — `sendSms(phone, message)`.

**Production path** (Twilio credentials configured):
1. Dynamically imports `twilio` package.
2. Creates a Twilio client with `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`.
3. Calls `client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: phone })`.
4. Writes `SmsLog` with `status: 'sent'`, `provider: 'twilio'`.

**Development fallback** (no Twilio credentials):
1. Logs the message to `console.log`.
2. Writes `SmsLog` with `status: 'logged'`, `provider: 'console'`.

**Error path**:
- Exception caught; writes `SmsLog` with `status: 'failed'`, `error: message`.

Bilingual SMS helpers:
- `sendPaymentReminderSms(phone, amount, lang)` — used by the weekly scheduler
- `sendMeetingReminderSms(phone, date, lang)` — used by the Friday cron

**Note:** SMS message text is hardcoded in these helper functions. There is no template substitution engine — see Gap #3.

### Channel 3: Push (FCM)

Implemented in `src/services/notification.service.ts` — `sendPushNotification(userId, title, body)`.

1. Returns immediately if `FCM_SERVER_KEY` is not configured.
2. Queries `DeviceToken` table for all tokens belonging to `userId`.
3. POSTs to `https://fcm.googleapis.com/fcm/send` for each token using the legacy FCM API:
   ```json
   { "to": "<device_token>", "notification": { "title": "...", "body": "..." } }
   ```
4. Per-token send errors are silently swallowed (best-effort delivery).

Device tokens are registered by the mobile app at startup via the backend endpoint and stored in `DeviceToken`.

### Trigger Points

| Event | In-App | SMS | Push |
|-------|--------|-----|------|
| Payment verified | ✓ (PAYMENT_CONFIRMATION) | — | ✓ |
| Special contribution created | ✓ (SPECIAL_CONTRIBUTION, per member) | — | — |
| Weekly obligation unpaid (Sat 07:00 cron) | — | ✓ | — |
| Meeting reminder (Fri 18:00 cron) | — | ✓ | — |
| Admin system announcement | ✓ (SYSTEM_ANNOUNCEMENT, all members) | — | — |

---

## 8. Weekly Automation Design

All scheduled jobs are registered in `src/jobs/scheduler.ts` via `node-cron` and started by `startScheduledJobs()` at server boot.

### Cron Schedule

| Cron expression | When | Job |
|----------------|------|-----|
| `0 6 * * 6` | Saturday 06:00 | Create weekly obligations |
| `0 0 * * *` | Daily 00:00 | Mark overdue obligations |
| `0 18 * * 5` | Friday 18:00 | Send meeting reminder SMS to all APPROVED members |
| `0 7 * * 6` | Saturday 07:00 | Send payment reminder SMS for unpaid/overdue obligations |
| `0 2 * * *` | Daily 02:00 | Automated backup (members + payments JSON snapshot) |

### Obligation Creation: `contribution.service.ts → createWeeklyObligations()`

Step-by-step for each APPROVED member:

1. Read `weekly_contribution` from `SystemSetting` (default 50 Birr).
2. Compute `weekNumber` and `year` for the next Saturday using `getNextSaturday()` + `getWeekNumber()`.
3. Check for existing obligation: `WHERE memberId = X AND weekNumber = W AND year = Y`. If found, skip (idempotent).
4. Count previous obligations with status `PENDING`, `OVERDUE`, or `PARTIAL` — this is `consecutiveMissed`.
5. Apply penalty rules:

   | `consecutiveMissed` | Rule | Penalty | `isMonthlyPenalty` |
   |--------------------|------|---------|-------------------|
   | 0 | No miss | 0 | false |
   | 1–2 | Rule 1 (one miss) | `weekly_penalty` (default 50 Birr) | false |
   | ≥ 3 | Rule 2 (4th consecutive miss) | `monthly_penalty` (default 100 Birr) + sum of all unpaid | true |

6. Create `WeeklyObligation` with computed `penaltyAmount`, `totalDue`, `consecutiveMissedWeeks`.
7. If `penaltyAmount > 0`: create `Penalty` record + increment `Member.outstandingBalance` by `totalDue`.

### Overdue Marking: `markOverdueObligations()`

Bulk update: sets `status = OVERDUE` on all `WeeklyObligation` records where `status = PENDING` and `dueDate < now()`. Runs daily at midnight.

### Payment Application: `applyPaymentToObligation(obligationId, amount)`

Called by the payments route handler when a payment is linked to an obligation:

1. Fetches the `WeeklyObligation`.
2. Adds `amount` to `amountPaid`.
3. Sets status: `PAID` if `amountPaid >= totalDue`, else `PARTIAL`.
4. Decrements `Member.outstandingBalance` by the applied amount (capped at remaining balance).

**Known gap:** The associated `Penalty.isPaid` flag is not updated here — see Gap #1.

### Backup Job

The daily 02:00 cron exports a JSON snapshot of `members` and `payments` tables to `backups/auto-backup-{timestamp}.json` and records the file metadata in the `Backup` table. Manual backups can also be triggered via `POST /api/settings/backups`.

---

## 9. Identified Gaps (PENDING)

These are gaps between the requirements document and the current codebase state. They are not design decisions — they are missing implementations.

### Gap 1 — Penalty `isPaid` flag not updated on payment (Req 8.5)

`contribution.service.ts → applyPaymentToObligation()` updates `WeeklyObligation.status` to `PAID` when fully covered, but does not locate and update the associated `Penalty.isPaid` flag. As a result, the `GET /finance/penalties` endpoint will show penalties as unpaid even after the member has settled the obligation.

**Fix required:** After setting obligation status to `PAID`, query `Penalty` records for the member with matching `weekNumber` and `year` and set `isPaid = true`.

### Gap 2 — No dedicated ledger query API (Req 21.4)

The `Transaction` model is populated correctly when payments are recorded and special contributions are processed. However, no `GET /finance/transactions` endpoint exists to expose the transaction ledger to Admin or Auditor users. The finance routes module does not include a transactions listing endpoint.

**Fix required:** Add `GET /finance/transactions` with filters for `memberId`, `type`, and `date range` to `finance.routes.ts`.

### Gap 3 — SMS template substitution not implemented (Req 18.8, 24.4)

`SystemSetting` stores SMS template keys (as noted in requirements), but `notification.service.ts` does not read these settings. Instead, the bilingual SMS messages in `sendPaymentReminderSms()` and `sendMeetingReminderSms()` are hardcoded strings. Any Admin changes to SMS templates via Settings have no effect on outgoing messages.

**Fix required:** Read the relevant `SystemSetting` keys in the SMS helper functions and apply variable substitution (e.g., replacing `{amount}` and `{date}` placeholders).

### Gap 4 — Report export language selection unconfirmed (Req 27.9)

`export.service.ts` generates PDF and Excel reports. It is not confirmed whether report column headers and content respect the requesting user's preferred language. The requirement specifies that report exports should support language selection.

**Fix required:** Verify and, if necessary, pass `lang` to all `export.service.ts` functions and conditionalise all label strings on the language parameter.

### Gap 5 — Default admin password change not enforced programmatically (Req 29.6)

The seed script (`prisma/seed.ts`) creates a default Admin account with username `admin` and password `Admin@123`. There is no programmatic enforcement requiring this password to be changed on first login — no `mustChangePassword` flag on `User`, no middleware check, and no UI prompt.

**Fix required:** Add a `mustChangePassword: Boolean @default(false)` field to `User`. Set it `true` for the seeded Admin. Have the `authenticate` middleware (or the login response) signal this flag, and have the web portal redirect to the change-password flow when it is set.

---

## 10. Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Web Frontend | React + TypeScript | React 19, TS 6 |
| Web Build Tool | Vite | 8.x |
| Web Styling | Tailwind CSS | 4.x |
| Web Routing | react-router-dom | 7.x |
| Web Charts | Recharts | 3.x |
| Web HTTP | axios | 1.x |
| Web i18n | i18next + react-i18next | 26.x / 17.x |
| Mobile | Flutter (Dart) | SDK ≥3.2.0 |
| Mobile State | provider | 6.1.x |
| Mobile Storage | flutter_secure_storage | 9.2.x |
| Mobile Push | firebase_messaging | 15.1.x |
| Mobile PDF | pdf + printing | 3.x / 5.x |
| Backend Runtime | Node.js + TypeScript | TS 5.8.x |
| Backend Framework | Express | 5.1.x |
| ORM | Prisma | 6.9.x |
| Database | PostgreSQL | — |
| Auth | jsonwebtoken + bcryptjs | 9.x / 3.x |
| Validation | Zod | 3.x |
| Scheduler | node-cron | 4.x |
| SMS | Twilio | 5.7.x |
| Email | nodemailer | 7.x |
| Push Notifications | FCM REST API (legacy send) | — |
| PDF Reports | PDFKit | 0.17.x |
| Excel Reports | ExcelJS | 4.4.x |
| File Upload | multer | 2.x |
| Rate Limiting | express-rate-limit | 7.x |
| Security Headers | helmet | 8.x |
