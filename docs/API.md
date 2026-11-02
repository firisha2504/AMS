# AMS REST API Reference

Base URL: `http://localhost:5000/api`

All responses follow this format:

```json
{
  "success": true,
  "message": "Localized message",
  "data": {},
  "meta": {}
}
```

Send `Accept-Language: om` or `Accept-Language: en` for localized messages.

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with username/phone + password |
| POST | `/auth/logout` | Logout (requires token) |
| POST | `/auth/request-otp` | Request OTP via SMS/email |
| POST | `/auth/verify-otp` | Verify OTP code |
| POST | `/auth/reset-password` | Reset password with OTP |
| POST | `/auth/change-password` | Change password (authenticated) |

### Login

```json
POST /auth/login
{
  "identifier": "admin",
  "password": "Admin@123"
}
```

The response `data.user` object includes a `mustChangePassword: boolean` field. When `true`, the client **must** redirect the user to the change-password screen before allowing access to any other part of the system. This flag is set to `true` for the seeded Admin account on first login and is cleared once the password is successfully changed via `POST /auth/change-password`.

## Members

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/members/register` | Public | Register new member |
| GET | `/members` | Admin, Auditor | List members |
| GET | `/members/me` | Member | Get own profile |
| GET | `/members/:id` | Admin, Auditor | Get member details |
| PATCH | `/members/:id/approve` | Admin | Approve/reject member |
| PATCH | `/members/me/profile` | Member | Update own profile |
| POST | `/members/auditors` | Admin | Create auditor account |

## Payments

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/payments` | Admin, Auditor | Record payment |
| PATCH | `/payments/:id/verify` | Admin, Auditor | Verify payment |
| GET | `/payments` | Admin, Auditor | List all payments |
| GET | `/payments/my` | Member | Own payment history |
| GET | `/payments/:id/receipt` | All | Get receipt data |

## Finance

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/finance/penalties` | All | List penalties |
| POST | `/finance/fines` | Admin | Create custom fine |
| GET | `/finance/fines` | Admin, Auditor | List fines |
| POST | `/finance/savings` | Admin, Auditor | Record savings |
| GET | `/finance/savings/my` | Member | Own savings |
| POST | `/finance/meetings` | Admin | Schedule meeting |
| GET | `/finance/meetings` | Admin, Auditor | List meetings |
| POST | `/finance/attendance` | Admin, Auditor | Record attendance |
| GET | `/finance/attendance/my` | Member | Own attendance |
| GET | `/finance/transactions` | Admin, Auditor | Query transaction ledger |

### GET /finance/transactions

Returns a paginated list of ledger transactions with optional filters.

**Required role:** `ADMIN` or `AUDITOR`

**Query parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `memberId` | string (UUID) | No | — | Filter by member ID |
| `type` | enum | No | — | One of: `WEEKLY_CONTRIBUTION`, `SAVINGS`, `PENALTY`, `FINE`, `SPECIAL_CONTRIBUTION`, `ADJUSTMENT`, `REFUND` |
| `from` | ISO 8601 date | No | — | Include transactions on or after this date (applied to `createdAt`) |
| `to` | ISO 8601 date | No | — | Include transactions on or before this date (applied to `createdAt`) |
| `page` | integer | No | `1` | Page number |
| `limit` | integer | No | `50` | Results per page (max 200) |

**Example request:**

```
GET /api/finance/transactions?type=SAVINGS&from=2026-01-01&to=2026-06-30&page=1&limit=20
Authorization: Bearer <token>
```

**Example response:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": "c1a2b3c4-...",
      "transactionId": "TXN-20260115-0001",
      "memberId": "d5e6f7a8-...",
      "type": "SAVINGS",
      "amount": "500.00",
      "description": "Savings deposit",
      "recordedById": "a1b2c3d4-...",
      "transactionDate": "2026-01-15T09:30:00.000Z",
      "createdAt": "2026-01-15T09:30:00.000Z",
      "member": {
        "fullName": "Abebe Bekele",
        "memberId": "MBR-0042"
      }
    }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 20
  }
}
```

## Dashboard

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/admin` | Admin | Admin analytics |
| GET | `/dashboard/auditor` | Auditor | Auditor analytics |
| GET | `/dashboard/member` | Member | Member dashboard |

## Settings & System

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/settings` | Admin | Get system settings |
| PUT | `/settings` | Admin | Update settings |
| GET | `/settings/audit-logs` | Admin | View audit logs |
| GET | `/settings/notifications` | All | List notifications |
| PATCH | `/settings/notifications/:id/read` | All | Mark notification read |
| GET | `/settings/reports/:type` | Admin, Auditor | Generate reports |
| POST | `/settings/backups` | Admin | Create manual backup |
| GET | `/settings/backups` | Admin | List backups |

### Report Types

- `contributions` — Payment history
- `savings` — Savings records
- `penalties` — Penalty records
- `attendance` — Attendance records
- `year-end` — Year-end summary

Query params: `?from=2026-01-01&to=2026-12-31`

## Health Check

```
GET /api/health
```
