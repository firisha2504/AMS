# Requirements Document

## Introduction

The Afosha Management System (AMS) is a full-stack digital platform for managing the financial, social, and administrative activities of **Afosha** — a community-based social savings and contributions group. The system provides:

- A **public website** for organizational information.
- An **Admin/Auditor web portal** (React + TypeScript) for full organizational management.
- A **Member mobile application** (Flutter) giving members access to their own data and notifications.
- A shared **REST API backend** (Node.js + Express + PostgreSQL/Prisma) serving all clients.

The platform handles member registration and lifecycle, weekly contribution tracking, penalty automation, payment recording and verification, special contributions (graduation, bereavement, emergency), meeting and attendance management, multi-channel notifications (SMS, push, in-app), financial ledger, reporting, audit trail, and system backup.

**Implementation Status Note:** The core system is already substantially implemented. Sections marked **[IMPLEMENTED]** reflect features confirmed working in the codebase. Sections marked **[NEEDS PRODUCTION SETUP]** are coded but require environment configuration to operate in production. Sections marked **[PENDING]** represent gaps identified during analysis.

---

## Glossary

- **AMS**: Afosha Management System — the full platform described in this document.
- **Afosha**: The social savings and contributions group this system manages.
- **Birr**: The official currency of Ethiopia (ETB), used for all financial amounts.
- **Gamtaa**: Afan Oromo word meaning "unity" or "cooperative group"; used colloquially to refer to Afosha.
- **Gamtaa Dargaggoota Melka Jabdu**: Full formal name of the youth cooperative association underpinning Afosha.
- **Heera fi Danbii**: Afan Oromo phrase meaning "Rules and Regulations"; refers to the organizational bylaws page of the public website.
- **FDRE**: Federal Democratic Republic of Ethiopia.
- **Tokkummaan Ciminaa fi Milkaayina**: Afan Oromo motto of Afosha, meaning "Unity is strength and success."
- **Admin**: A user with the ADMIN role; has full management access across the web portal.
- **Auditor**: A user with the AUDITOR role; records and verifies payments, attendance, and receipts.
- **Member**: A registered individual with the MEMBER role; uses the mobile app to view their own data.
- **OTP**: One-Time Password; a time-limited numeric code used for authentication and verification.
- **JWT**: JSON Web Token; a signed token used for stateless authentication.
- **FCM**: Firebase Cloud Messaging; Google's push notification service used by the mobile app.
- **Weekly Obligation**: An automatically-created record of a member's due weekly contribution, including any applicable penalty.
- **Special Contribution**: An additional contribution campaign triggered by a specific life event (graduation, bereavement) or an emergency declared by Admin.
- **Penalty**: An automatic financial charge applied when a member misses one or more weekly contributions.
- **Fine**: A manually-created charge applied by Admin for rule violations (e.g., missing meetings, late attendance).
- **Outstanding Balance**: The sum of a member's unpaid weekly obligations, penalties, and fines.
- **Savings**: Accumulated weekly contributions that form a member's savings balance.
- **Receipt**: A generated proof-of-payment document containing payment details.
- **Campaign**: An instance of a Special Contribution event, identified by a unique Campaign ID.
- **Obligation Status**: PENDING | PAID | PARTIAL | OVERDUE — tracks the payment state of a weekly or special obligation.
- **Member Status**: PENDING | APPROVED | REJECTED | SUSPENDED | INACTIVE — tracks the lifecycle state of a member.
- **Afan Oromo (om)**: Default language of the AMS, used for all messages, notifications, and UI labels.
- **Preferred Language**: A per-user setting (om or en) that governs message and notification language.
- **Device Token**: An FCM token registered by a member's mobile device for push notifications.
- **Audit Log**: An immutable record of a significant system action (login, payment, member approval, etc.).
- **Backup**: A point-in-time copy of the PostgreSQL database exported to a file.

---

## Requirements

### Requirement 1: Public Website — Home Page

**User Story:** As a visitor, I want to see a welcoming home page with key statistics and upcoming meeting information, so that I can understand the organization and navigate to the portal.

#### Acceptance Criteria

1. THE Website SHALL display a welcome message, organization statistics, and upcoming meeting information on the home page. **[IMPLEMENTED]**
2. THE Website SHALL provide a login button that navigates to the admin/auditor login page. **[IMPLEMENTED]**
3. WHEN a visitor accesses the root URL `/`, THE Website SHALL render the public home page without requiring authentication. **[IMPLEMENTED]**

---

### Requirement 2: Public Website — About Page

**User Story:** As a visitor, I want to read about Afosha's history, mission, bylaws, and contact details, so that I can understand the organization's purpose and values.

#### Acceptance Criteria

1. THE Website SHALL display the About page at `/about` with four tabs: "About Afosha", "Mission & Vision", "Heera fi Danbii", and "Contact Information". **[IMPLEMENTED]**
2. THE "About Afosha" tab SHALL display the organization's history and overview. **[IMPLEMENTED]**
3. THE "Mission & Vision" tab SHALL display the mission statement and organizational objectives. **[IMPLEMENTED]**
4. THE "Heera fi Danbii" tab SHALL display: the FDRE Constitution Article 31 foundation, Objectives of Gamtaa Dargaggoota Melka Jabdu, membership principles, respect for culture and religion, social support principles, and the motto "Tokkummaan Ciminaa fi Milkaayina". **[IMPLEMENTED]**
5. THE "Contact Information" tab SHALL display current contact details for the organization. **[IMPLEMENTED]**
6. THE Website SHALL serve all tab content from the `PublicContent` store, allowing Admins to update content without a code deployment. **[IMPLEMENTED]**
7. THE Website SHALL render the About page content in both Afan Oromo and English, switching based on the visitor's selected language. **[IMPLEMENTED]**

---

### Requirement 3: Authentication

**User Story:** As a user (Admin, Auditor, or Member), I want to log in securely and receive a session token, so that I can access the features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (username/phone + password) to `POST /auth/login`, THE Auth_Service SHALL return a signed JWT access token and a refresh token. **[IMPLEMENTED]**
2. WHEN a user submits invalid credentials, THE Auth_Service SHALL increment the failed login attempt counter for that user. **[IMPLEMENTED]**
3. WHEN a user's failed login attempts reach the configured lockout threshold, THE Auth_Service SHALL lock the account until the lockout duration expires and SHALL reject further login attempts with an appropriate error. **[IMPLEMENTED]**
4. WHEN an authenticated user submits a valid refresh token, THE Auth_Service SHALL issue a new access token without requiring re-entry of credentials. **[IMPLEMENTED]**
5. WHEN a user calls `POST /auth/logout`, THE Auth_Service SHALL invalidate the refresh token and end the session. **[IMPLEMENTED]**
6. THE Auth_Service SHALL hash all passwords using bcrypt before storage and SHALL never store plaintext passwords. **[IMPLEMENTED]**
7. THE Auth_Service SHALL enforce Role-Based Access Control, ensuring ADMIN routes are inaccessible to AUDITOR and MEMBER roles, and MEMBER-only routes are inaccessible to Admin and Auditor. **[IMPLEMENTED]**

---

### Requirement 4: OTP Verification

**User Story:** As a user, I want to verify my identity through a one-time code sent to my phone or email, so that I can securely reset my password or complete account verification.

#### Acceptance Criteria

1. WHEN a user requests an OTP via `POST /auth/request-otp`, THE Auth_Service SHALL generate a 6-digit numeric OTP, store it with an expiry time, and deliver it to the user's phone (SMS) or email based on the requested channel. **[IMPLEMENTED]**
2. THE Auth_Service SHALL set OTP expiry to a configurable number of minutes from generation time. **[IMPLEMENTED]**
3. WHEN a user submits an OTP via `POST /auth/verify-otp`, THE Auth_Service SHALL validate that the code is unused, unexpired, and matches the stored code for the given user and purpose. **[IMPLEMENTED]**
4. WHEN an OTP fails validation, THE Auth_Service SHALL increment the OTP attempt counter and SHALL reject the OTP when the maximum attempt count is exceeded. **[IMPLEMENTED]**
5. WHEN a verified OTP is used for password reset, THE Auth_Service SHALL allow the user to set a new password via `POST /auth/reset-password`. **[IMPLEMENTED]**
6. OTP purposes SHALL be one of: LOGIN, PASSWORD_RESET, or ACCOUNT_VERIFICATION. **[IMPLEMENTED]**
7. OTP channels SHALL be one of: SMS or EMAIL. **[IMPLEMENTED]**
8. IF the SMS provider (Twilio) is not configured, THEN THE Auth_Service SHALL log the OTP message to the console as a development fallback and SHALL NOT silently drop the delivery attempt. **[IMPLEMENTED]**
9. IF the SMTP provider is not configured, THEN THE Auth_Service SHALL log the email to the console as a development fallback. **[IMPLEMENTED]**

---

### Requirement 5: Member Registration and Lifecycle Management

**User Story:** As a prospective member, I want to register my details so that my application can be reviewed by an Admin. As an Admin, I want to approve, reject, or suspend members so that I can control membership.

#### Acceptance Criteria

1. WHEN a prospective member submits registration data to `POST /members/register`, THE Member_Service SHALL create a User record with MEMBER role and a linked Member record with PENDING status. **[IMPLEMENTED]**
2. THE Member_Service SHALL store for each member: Member ID, Full Name, Gender, Date of Birth, Phone Number, Email, Address, Occupation, Registration Date, Profile Picture (optional), and Emergency Contact (Name, Relationship, Phone, Address). **[IMPLEMENTED]**
3. THE Member_Service SHALL generate a unique human-readable Member ID for each approved member. **[IMPLEMENTED]**
4. WHEN an Admin calls `PATCH /members/:id/approve` with action "approve", THE Member_Service SHALL update the member's status to APPROVED. **[IMPLEMENTED]**
5. WHEN an Admin calls `PATCH /members/:id/approve` with action "reject" and a reason, THE Member_Service SHALL update the member's status to REJECTED and store the rejection reason. **[IMPLEMENTED]**
6. WHEN an Admin suspends a member, THE Member_Service SHALL update the member's status to SUSPENDED, preventing the member from logging in. **[IMPLEMENTED]**
7. THE Admin SHALL be able to list all members with search by Member ID, full name, or phone number, and filter by status (PENDING, APPROVED, REJECTED, SUSPENDED, INACTIVE). **[IMPLEMENTED]**
8. WHILE a member's status is PENDING or REJECTED, THE Member_Service SHALL exclude that member from weekly obligation creation. **[IMPLEMENTED]**
9. WHEN an Admin creates an Auditor account via `POST /members/auditors`, THE Member_Service SHALL create a User with AUDITOR role and no linked Member record. **[IMPLEMENTED]**
10. WHEN an authenticated member accesses `GET /members/me`, THE Member_Service SHALL return only that member's own profile data and SHALL NOT expose other members' information. **[IMPLEMENTED]**
11. WHEN a member updates their own profile via `PATCH /members/me/profile`, THE Member_Service SHALL validate the submitted fields and update only the allowed fields (excluding role, status, and Member ID). **[IMPLEMENTED]**

---

### Requirement 6: Profile Picture Upload

**User Story:** As a member, I want to upload a profile picture from the mobile app or web portal, so that my profile is identifiable across the system.

#### Acceptance Criteria

1. WHEN a user submits a valid image file via the profile picture upload endpoint, THE Upload_Service SHALL store the file in the `uploads/` directory and save the relative path on the Member record. **[IMPLEMENTED]**
2. THE Upload_Service SHALL accept only image file types (JPEG, PNG, GIF) and SHALL reject other file types with an appropriate error. **[IMPLEMENTED]**
3. THE Upload_Service SHALL limit uploaded file size to a configurable maximum (default: 5 MB). **[IMPLEMENTED]**
4. THE Website SHALL display the member's profile picture on the dashboard, member profile page, and member list views. **[IMPLEMENTED]**
5. THE Mobile_App SHALL display the member's profile picture on the member dashboard and profile screen. **[IMPLEMENTED]**

---

### Requirement 7: Weekly Contribution Automation

**User Story:** As an Admin, I want the system to automatically create weekly payment obligations for all active members every Saturday, so that contributions are tracked consistently without manual intervention.

#### Acceptance Criteria

1. THE Scheduler SHALL execute the weekly obligation creation job every Saturday at a configured time. **[IMPLEMENTED]**
2. WHEN the weekly job runs, THE Contribution_Service SHALL create one `WeeklyObligation` record per APPROVED member for the upcoming Saturday's due date, identified by week number and year. **[IMPLEMENTED]**
3. THE Contribution_Service SHALL skip obligation creation for a member if an obligation already exists for the same member, week number, and year (idempotent creation). **[IMPLEMENTED]**
4. THE Contribution_Service SHALL read the current weekly contribution amount from `SystemSetting` (key: `weekly_contribution`), defaulting to 50 Birr if not configured. **[IMPLEMENTED]**
5. WHEN a member has one or more consecutive unpaid/overdue obligations, THE Contribution_Service SHALL apply the weekly penalty (default 50 Birr) to the new obligation and create a linked `Penalty` record. **[IMPLEMENTED]**
6. WHEN a member has three or more consecutive unpaid/overdue obligations (i.e., a fourth miss is being processed), THE Contribution_Service SHALL apply the monthly penalty (default 100 Birr) instead of the weekly penalty, set `isMonthlyPenalty = true`, and set `totalDue` to the sum of all unpaid contributions plus the monthly penalty. **[IMPLEMENTED]**
7. WHEN a new obligation with a penalty is created, THE Contribution_Service SHALL increment the member's `outstandingBalance` by the total amount due. **[IMPLEMENTED]**
8. THE Scheduler SHALL also run a job to mark all PENDING obligations whose `dueDate` has passed as OVERDUE. **[IMPLEMENTED]**
9. THE Scheduler SHALL send payment reminder SMS messages to all members with PENDING, PARTIAL, or OVERDUE obligations. **[IMPLEMENTED]**
10. WHEN an Admin modifies the weekly contribution amount in Settings, THE Contribution_Service SHALL use the new amount for all subsequent obligation creations without requiring a system restart. **[IMPLEMENTED]**

---

### Requirement 8: Penalty Management

**User Story:** As an Admin or Auditor, I want to view all automatically-generated penalties per member, so that I can track and resolve outstanding balances.

#### Acceptance Criteria

1. THE Penalty_Service SHALL automatically create `Penalty` records via the weekly obligation automation job; Admins and Auditors SHALL NOT need to manually create individual weekly penalties. **[IMPLEMENTED]**
2. THE Admin and Auditor SHALL be able to view all penalties with member association, amount, reason, week number, year, and payment status via `GET /finance/penalties`. **[IMPLEMENTED]**
3. THE Member SHALL be able to view their own penalties through the mobile app. **[IMPLEMENTED]**
4. THE Penalty record SHALL distinguish between weekly penalties (`isMonthly = false`) and monthly penalties (`isMonthly = true`). **[IMPLEMENTED]**
5. WHEN a payment is applied that fully covers an outstanding obligation, THE Contribution_Service SHALL mark the associated `Penalty` records as paid. **[IMPLEMENTED — penalty `isPaid` flag is not updated by current payment flow]**

---

### Requirement 9: Fine Management

**User Story:** As an Admin, I want to create fines for rule violations such as missing meetings, late attendance, or other infractions, so that members are held accountable.

#### Acceptance Criteria

1. WHEN an Admin creates a fine via `POST /finance/fines`, THE Fine_Service SHALL store: Member ID, Fine Type, Amount, Reason, Date, and the creating Admin's ID. **[IMPLEMENTED]**
2. THE Admin SHALL be able to list all fines for all members via `GET /finance/fines`. **[IMPLEMENTED]**
3. THE Auditor SHALL be able to view fines via `GET /finance/fines`. **[IMPLEMENTED]**
4. Fine types SHALL include at minimum: missing meetings, late attendance, and rule violations, and SHALL allow free-text type entry by Admin. **[IMPLEMENTED]**
5. THE Fine record SHALL track whether the fine has been paid (`isPaid` flag). **[IMPLEMENTED]**

---

### Requirement 10: Payment Recording and Verification

**User Story:** As an Auditor, I want to record member payments, and as an Admin, I want to verify them, so that the payment workflow produces confirmed receipts and updates member balances.

#### Acceptance Criteria

1. WHEN an Auditor or Admin records a payment via `POST /payments`, THE Payment_Service SHALL create a `Payment` record with: Payment ID, Member ID, Amount, Date, Payment Method, Transaction Reference (optional), Auditor ID, and status PENDING. **[IMPLEMENTED]**
2. Payment methods SHALL be one of: CASH, BANK_TRANSFER, or MOBILE_MONEY. **[IMPLEMENTED]**
3. WHEN a payment is linked to a `WeeklyObligation` or `SpecialContributionObligation`, THE Payment_Service SHALL apply the payment amount to that obligation via the contribution service and update the obligation status (PARTIAL or PAID). **[IMPLEMENTED]**
4. WHEN an Admin or Auditor verifies a payment via `PATCH /payments/:id/verify`, THE Payment_Service SHALL set the payment status to VERIFIED, record the verifier's ID and timestamp, and generate a unique receipt number. **[IMPLEMENTED]**
5. WHEN a payment is verified, THE Payment_Service SHALL send a payment confirmation notification (in-app) to the member. **[IMPLEMENTED]**
6. WHEN an Admin or Auditor rejects a payment via `PATCH /payments/:id/verify` with action "reject", THE Payment_Service SHALL set the payment status to REJECTED. **[IMPLEMENTED]**
7. WHEN a receipt is requested via `GET /payments/:id/receipt`, THE Payment_Service SHALL return receipt data including: Receipt Number, Member Name, Amount, Date, Payment Method, and Auditor Name. **[IMPLEMENTED]**
8. THE Receipt SHALL be exportable as a downloadable PDF. **[IMPLEMENTED]**
9. THE Admin and Auditor SHALL be able to list all payments with filters via `GET /payments`. **[IMPLEMENTED]**
10. THE Member SHALL be able to view their own payment history via `GET /payments/my`. **[IMPLEMENTED]**
11. WHEN a payment is recorded, THE Payment_Service SHALL create a corresponding `Transaction` ledger entry of type `WEEKLY_CONTRIBUTION` or `SPECIAL_CONTRIBUTION`. **[IMPLEMENTED]**

---

### Requirement 11: Savings Management

**User Story:** As an Admin or Auditor, I want to record member savings deposits, and as a member, I want to see my savings balance and history, so that savings are tracked accurately.

#### Acceptance Criteria

1. WHEN an Admin or Auditor records a savings deposit via `POST /finance/savings`, THE Savings_Service SHALL create a `SavingsRecord` with: Member ID, Amount, Running Balance, Date, and optional Description. **[IMPLEMENTED]**
2. THE Savings_Service SHALL maintain a running balance on each `SavingsRecord`, computed from all previous savings records for that member. **[IMPLEMENTED]**
3. THE Member record SHALL store `totalSavings` and `totalCredit` aggregate fields, updated when savings are recorded. **[IMPLEMENTED]**
4. THE Member SHALL be able to view their own savings records and total savings balance via `GET /finance/savings/my`. **[IMPLEMENTED]**

---

### Requirement 12: Special Contributions — Graduation

**User Story:** As an Admin, I want to create a graduation contribution campaign when a member's close family member graduates, so that all active members contribute to celebrate the occasion.

#### Acceptance Criteria

1. WHEN an Admin creates a graduation contribution, THE Special_Contribution_Service SHALL accept: Beneficiary Member ID, Family Relationship, optional Due Date, and use the configured graduation contribution amount (default 100 Birr). **[IMPLEMENTED]**
2. THE Special_Contribution_Service SHALL create obligations for all APPROVED members, marking the beneficiary member's obligation as `isExempt = true` and status PAID. **[IMPLEMENTED]**
3. Family relationships for graduation SHALL be one of: FATHER, MOTHER, BROTHER, SISTER, UNCLE, AUNT. **[IMPLEMENTED]**
4. WHEN a graduation campaign is created, THE Notification_Service SHALL send an in-app notification to all non-exempt members with the campaign title and amount due. **[IMPLEMENTED]**
5. THE Special_Contribution_Service SHALL generate a unique Campaign ID (format: `SC-GRA-{timestamp}`) for each campaign. **[IMPLEMENTED]**
6. THE Admin SHALL be able to view all graduation campaign obligations, track payment status per member, and close or cancel a campaign. **[IMPLEMENTED]**

---

### Requirement 13: Special Contributions — Bereavement

**User Story:** As an Admin, I want to create a bereavement contribution campaign when a member loses a close family member, so that all active members contribute to support the affected member.

#### Acceptance Criteria

1. WHEN an Admin creates a bereavement contribution, THE Special_Contribution_Service SHALL accept: Beneficiary Member ID, Family Relationship, optional Due Date, and use the configured bereavement contribution amount (default 100 Birr). **[IMPLEMENTED]**
2. THE Special_Contribution_Service SHALL create obligations for all APPROVED members, marking the affected (beneficiary) member's obligation as `isExempt = true`. **[IMPLEMENTED]**
3. Family relationships for bereavement SHALL be one of: FATHER, MOTHER, BROTHER, SISTER, UNCLE, AUNT. **[IMPLEMENTED]**
4. WHEN a bereavement campaign is created, THE Notification_Service SHALL send an in-app notification to all non-exempt members. **[IMPLEMENTED]**
5. THE Special_Contribution_Service SHALL generate a unique Campaign ID (format: `SC-BER-{timestamp}`) for each bereavement campaign. **[IMPLEMENTED]**

---

### Requirement 14: Special Contributions — Emergency

**User Story:** As an Admin, I want to create an emergency contribution campaign with a custom title and amount, targeting specific members or all active members, so that the group can respond to unexpected needs.

#### Acceptance Criteria

1. WHEN an Admin creates an emergency contribution, THE Special_Contribution_Service SHALL accept: Title, Title in Afan Oromo (optional), Description, Description in Afan Oromo (optional), Amount, Due Date, and optional list of Target Member IDs. **[IMPLEMENTED]**
2. IF Target Member IDs are provided, THEN THE Special_Contribution_Service SHALL create obligations only for the specified APPROVED members. **[IMPLEMENTED]**
3. IF Target Member IDs are not provided, THEN THE Special_Contribution_Service SHALL create obligations for all APPROVED members. **[IMPLEMENTED]**
4. Emergency contribution use cases SHALL include at minimum: medical support, community support, development projects, and disaster support. **[IMPLEMENTED — by free-text title/description]**
5. WHEN an emergency campaign is created, THE Notification_Service SHALL send in-app notifications to all non-exempt target members. **[IMPLEMENTED]**

---

### Requirement 15: Meeting Management

**User Story:** As an Admin, I want to schedule meetings with a date, time, location, and agenda, so that members are informed and attendance can be recorded.

#### Acceptance Criteria

1. WHEN an Admin creates a meeting via `POST /finance/meetings`, THE Meeting_Service SHALL store: Title, Location, Meeting Date, Meeting Time, Agenda, and the creating Admin's ID. **[IMPLEMENTED]**
2. THE Admin and Auditor SHALL be able to list all scheduled meetings via `GET /finance/meetings`. **[IMPLEMENTED]**
3. WHEN a meeting is created, THE Notification_Service SHALL be able to send meeting reminder SMS messages to all APPROVED members. **[IMPLEMENTED]**
4. THE Website home page SHALL display upcoming meetings. **[IMPLEMENTED]**

---

### Requirement 16: Attendance Management

**User Story:** As an Admin or Auditor, I want to record and update attendance for each meeting, so that the organization can track member participation.

#### Acceptance Criteria

1. WHEN an Admin or Auditor records attendance via `POST /finance/attendance`, THE Attendance_Service SHALL create or update one `Attendance` record per member per meeting with status: PRESENT, ABSENT, or EXCUSED. **[IMPLEMENTED]**
2. THE Attendance record SHALL be unique per meeting-member pair (one record per member per meeting). **[IMPLEMENTED]**
3. THE Admin and Auditor SHALL be able to view attendance records for any meeting. **[IMPLEMENTED]**
4. THE Member SHALL be able to view their own attendance history via `GET /finance/attendance/my`. **[IMPLEMENTED]**
5. THE Reporting_Service SHALL generate attendance reports filterable by date range. **[IMPLEMENTED]**

---

### Requirement 17: Notification Center — In-App

**User Story:** As a user, I want to receive and read in-app notifications for meetings, payments, penalties, and announcements, so that I stay informed about relevant events.

#### Acceptance Criteria

1. THE Notification_Service SHALL create in-app `Notification` records for the following event types: MEETING_REMINDER, PAYMENT_REMINDER, PENALTY_NOTICE, PAYMENT_CONFIRMATION, SYSTEM_ANNOUNCEMENT, ACCOUNT_UPDATE, SPECIAL_CONTRIBUTION. **[IMPLEMENTED]**
2. WHEN a user reads their notifications via `GET /settings/notifications`, THE Notification_Service SHALL return notifications scoped to that user's account only. **[IMPLEMENTED]**
3. WHEN a user marks a notification as read via `PATCH /settings/notifications/:id/read`, THE Notification_Service SHALL set `isRead = true` for that notification. **[IMPLEMENTED]**
4. THE Notification record SHALL store both English and Afan Oromo versions of the title and message (`title`, `titleOm`, `message`, `messageOm`). **[IMPLEMENTED]**
5. WHEN a payment is verified, THE Notification_Service SHALL automatically create a PAYMENT_CONFIRMATION notification for the paying member. **[IMPLEMENTED]**
6. WHEN a special contribution campaign is created, THE Notification_Service SHALL automatically create a SPECIAL_CONTRIBUTION notification for each non-exempt member. **[IMPLEMENTED]**
7. THE Admin SHALL be able to create and send SYSTEM_ANNOUNCEMENT notifications to all members via the Notifications page of the web portal. **[IMPLEMENTED]**

---

### Requirement 18: SMS Notifications

**User Story:** As an Admin, I want the system to send SMS messages for payment reminders, meeting reminders, and penalty notices, so that members are notified even when not using the app.

#### Acceptance Criteria

1. WHEN the weekly scheduler runs, THE Notification_Service SHALL send payment reminder SMS messages (in the member's preferred language) to all members with unpaid or overdue weekly obligations. **[IMPLEMENTED]**
2. WHEN a meeting reminder is triggered, THE Notification_Service SHALL send meeting reminder SMS messages to all APPROVED members with the meeting date. **[IMPLEMENTED]**
3. THE SMS message content SHALL be available in both Afan Oromo and English, selected based on the recipient's `preferredLanguage`. **[IMPLEMENTED]**
4. THE Notification_Service SHALL support bulk SMS delivery to all APPROVED members. **[IMPLEMENTED]**
5. WHEN an SMS is sent, THE Notification_Service SHALL log the delivery attempt in the `SmsLog` table, including phone number, message content, status, and provider. **[IMPLEMENTED]**
6. WHERE Twilio credentials are configured (account SID, auth token, phone number), THE Notification_Service SHALL deliver SMS via Twilio. **[NEEDS PRODUCTION SETUP]**
7. WHERE Twilio credentials are not configured, THE Notification_Service SHALL log the SMS to the server console as a development fallback. **[IMPLEMENTED]**
8. THE Admin SHALL be able to configure SMS templates for payment reminders and meeting reminders via the Settings module. **[IMPLEMENTED — SMS template storage exists in settings keys but template substitution is hardcoded]**

---

### Requirement 19: Push Notifications (Mobile)

**User Story:** As a member, I want to receive push notifications on my mobile device for payment confirmations, meeting reminders, and special contributions, so that I am alerted even when the app is not open.

#### Acceptance Criteria

1. WHEN the mobile app starts, THE Mobile_App SHALL register the device's FCM token with the backend via the device token registration endpoint. **[IMPLEMENTED]**
2. THE Backend SHALL store the FCM device token in the `DeviceToken` table, associated with the authenticated user. **[IMPLEMENTED]**
3. WHEN a push notification is sent for a user, THE Notification_Service SHALL retrieve all registered device tokens for that user and send a push message to each token via the FCM API. **[IMPLEMENTED]**
4. WHERE the FCM server key is configured, THE Notification_Service SHALL deliver push notifications via the FCM send endpoint. **[NEEDS PRODUCTION SETUP]**
5. WHERE the FCM server key is not configured, THE Notification_Service SHALL skip push delivery without throwing an error. **[IMPLEMENTED]**
6. THE push notification delivery SHALL be best-effort; individual token delivery failures SHALL be caught and logged without interrupting the overall notification flow. **[IMPLEMENTED]**

---

### Requirement 20: Dashboard Analytics

**User Story:** As an Admin, I want to see a comprehensive dashboard with member statistics, financial summaries, and trend charts, so that I can monitor the organization's health at a glance.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display: Total Members, Active Members (APPROVED), Pending Members, Total Contributions, Total Savings, Total Penalties, Outstanding Balances, and Total Special Contributions. **[IMPLEMENTED]**
2. THE Admin_Dashboard SHALL display chart data for: Contribution Trends, Savings Trends, Attendance Trends, and Penalty Trends over time. **[IMPLEMENTED]**
3. THE Auditor_Dashboard SHALL display: Weekly Collections, Outstanding Payments, and Member Balances. **[IMPLEMENTED]**
4. THE Member_Dashboard SHALL display: Total Savings, Contributions, Penalties, Attendance Rate, Upcoming Meetings, and unread Notifications. **[IMPLEMENTED]**
5. THE Dashboard data SHALL be accessible via role-scoped API endpoints (`/dashboard/admin`, `/dashboard/auditor`, `/dashboard/member`). **[IMPLEMENTED]**
6. WHEN a Member accesses `/dashboard/admin` or `/dashboard/auditor`, THE API SHALL return an authorization error (HTTP 403). **[IMPLEMENTED]**

---

### Requirement 21: Financial Transaction Ledger

**User Story:** As an Admin, I want every financial movement to be recorded in a transaction ledger, so that there is a full audit-ready history of all financial activity.

#### Acceptance Criteria

1. THE Ledger SHALL record transactions of the following types: WEEKLY_CONTRIBUTION, SAVINGS, PENALTY, FINE, SPECIAL_CONTRIBUTION, ADJUSTMENT, REFUND. **[IMPLEMENTED]**
2. WHEN any financial event occurs (payment recording, savings deposit), THE Ledger_Service SHALL create a `Transaction` record with: Transaction ID, Member ID (if applicable), Type, Amount, Description, Recording User ID, and Transaction Date. **[IMPLEMENTED]**
3. THE Transaction ID SHALL be unique and auto-generated by the system. **[IMPLEMENTED]**
4. THE Admin SHALL be able to query the ledger by member, type, and date range. **[IMPLEMENTED — no dedicated ledger list endpoint; transactions are recorded but no public query API exists]**

---

### Requirement 22: Reporting Module

**User Story:** As an Admin or Auditor, I want to generate financial, attendance, and membership reports for any date range, and export them as PDF or Excel files, so that the organization has documentary evidence of its activities.

#### Acceptance Criteria

1. THE Reporting_Service SHALL generate the following report types: `contributions`, `savings`, `penalties`, `attendance`, `year-end`. **[IMPLEMENTED]**
2. WHEN a report is requested with `from` and `to` query parameters, THE Reporting_Service SHALL filter all report data within that date range. **[IMPLEMENTED]**
3. THE Reporting_Service SHALL export any report as a downloadable PDF file. **[IMPLEMENTED]**
4. THE Reporting_Service SHALL export any report as a downloadable Excel (.xlsx) file. **[IMPLEMENTED]**
5. THE Year-End Summary report SHALL include: Total Contributions, Total Savings, Total Penalties, Total Special Contributions, Attendance Summary, Outstanding Balances, and Top Contributors. **[IMPLEMENTED]**
6. THE Reporting_Service SHALL support weekly, monthly, and yearly report periods. **[IMPLEMENTED]**
7. WHEN a Member attempts to access report generation endpoints, THE API SHALL return an authorization error (HTTP 403). **[IMPLEMENTED]**

---

### Requirement 23: Audit Trail

**User Story:** As an Admin, I want to view a complete, immutable log of all significant system actions, so that I can investigate issues and ensure accountability.

#### Acceptance Criteria

1. THE Audit_Service SHALL record an `AuditLog` entry for the following actions: user login, user logout, payment recording, payment verification, penalty creation, attendance update, member approval/rejection, and settings changes. **[IMPLEMENTED]**
2. THE AuditLog entry SHALL store: User ID, Action description, Module name, Details (JSON), IP Address, and Timestamp. **[IMPLEMENTED]**
3. THE Admin SHALL be able to view all audit logs via `GET /settings/audit-logs`. **[IMPLEMENTED]**
4. THE AuditLog entries SHALL be immutable; no endpoint SHALL allow deletion or modification of audit log records. **[IMPLEMENTED]**
5. WHEN an action is performed by an unauthenticated source (e.g., a failed login attempt), THE Audit_Service SHALL record the log entry with a null User ID and the available IP address. **[IMPLEMENTED]**

---

### Requirement 24: System Settings

**User Story:** As an Admin, I want to configure all financial amounts, notification templates, and organizational settings through the web portal, so that the system reflects current policies without code changes.

#### Acceptance Criteria

1. THE Settings_Service SHALL store and serve configuration for: Weekly Contribution Amount, Weekly Penalty Amount, Monthly Penalty Amount, Graduation Contribution Amount, Bereavement Contribution Amount, Meeting Day, and Organization Information. **[IMPLEMENTED]**
2. WHEN an Admin updates a setting via `PUT /settings`, THE Settings_Service SHALL persist the new value in `SystemSetting` and apply it to all subsequent operations without a system restart. **[IMPLEMENTED]**
3. THE Admin SHALL be able to configure language settings (default language: Afan Oromo). **[IMPLEMENTED]**
4. THE Admin SHALL be able to configure SMS templates for payment reminders, meeting reminders, and other notification types. **[IMPLEMENTED — template keys exist but template substitution engine is not implemented]**
5. THE Settings endpoint (`GET /settings` and `PUT /settings`) SHALL be accessible only to users with the ADMIN role. **[IMPLEMENTED]**

---

### Requirement 25: Backup and Restore

**User Story:** As an Admin, I want the database to be automatically backed up daily and weekly, and I want to be able to create manual backups and restore from previous backups, so that data is protected against loss.

#### Acceptance Criteria

1. THE Scheduler SHALL execute an automatic database backup daily and weekly at configured times. **[IMPLEMENTED]**
2. WHEN a backup is created (automatic or manual), THE Backup_Service SHALL store the backup file in the `backups/` directory and record its metadata (filename, file path, file size, type, creator) in the `Backup` table. **[IMPLEMENTED]**
3. WHEN an Admin manually requests a backup via `POST /settings/backups`, THE Backup_Service SHALL immediately create a backup and return confirmation with backup metadata. **[IMPLEMENTED]**
4. THE Admin SHALL be able to list all available backups via `GET /settings/backups`. **[IMPLEMENTED]**
5. THE Admin SHALL be able to restore from a previous backup, reversing the database to the state at the time of that backup. **[IMPLEMENTED]**
6. THE Backup_Service SHALL record the type of each backup as "daily", "weekly", or "manual". **[IMPLEMENTED]**

---

### Requirement 26: Member Mobile Application

**User Story:** As a member, I want a mobile application on my Android or iOS device that shows my personal contribution, savings, penalty, and attendance data and lets me receive push notifications, so that I can track my standing in the group on the go.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide a login screen where members authenticate using their phone number or username and password. **[IMPLEMENTED]**
2. THE Mobile_App SHALL display a member dashboard showing: Savings, Contributions, Penalties, Attendance Rate, Upcoming Meetings, and Notifications. **[IMPLEMENTED]**
3. THE Mobile_App SHALL show the member's weekly contribution history. **[IMPLEMENTED]**
4. THE Mobile_App SHALL show the member's savings records and total savings balance. **[IMPLEMENTED]**
5. THE Mobile_App SHALL show the member's penalty history. **[IMPLEMENTED]**
6. THE Mobile_App SHALL show the member's special contribution obligations. **[IMPLEMENTED]**
7. THE Mobile_App SHALL show the member's attendance records. **[IMPLEMENTED]**
8. THE Mobile_App SHALL allow the member to view and download payment receipts as PDF. **[IMPLEMENTED]**
9. THE Mobile_App SHALL allow the member to view and manage in-app notifications. **[IMPLEMENTED]**
10. THE Mobile_App SHALL allow the member to view and update their profile, including uploading a profile picture. **[IMPLEMENTED]**
11. THE Mobile_App SHALL support Afan Oromo and English languages, switchable by the user at any time. **[IMPLEMENTED]**
12. THE Mobile_App SHALL send the `Accept-Language` header (value: `om` or `en`) with every API request to receive localized responses. **[IMPLEMENTED]**
13. THE Mobile_App SHALL store the JWT access token and refresh token securely using `FlutterSecureStorage`. **[IMPLEMENTED]**
14. WHEN a member's account is SUSPENDED or INACTIVE, THE Mobile_App SHALL redirect the member to the login screen and display an appropriate message. **[IMPLEMENTED]**
15. THE Mobile_App SHALL be compatible with Android and iOS platforms. **[IMPLEMENTED]**

---

### Requirement 27: Localization (Multilingual Support)

**User Story:** As a user, I want the entire application — including all pages, menus, notifications, reports, and messages — to be available in both Afan Oromo and English, so that all members can use the system in their preferred language.

#### Acceptance Criteria

1. THE System SHALL support two languages: Afan Oromo (locale code: `om`) as the default language, and English (locale code: `en`). **[IMPLEMENTED]**
2. THE Backend API SHALL accept the `Accept-Language` header with values `om` or `en` and return all response messages in the requested language. **[IMPLEMENTED]**
3. THE Web portal SHALL support language switching via the `i18n` library and persist the user's language preference. **[IMPLEMENTED]**
4. THE Mobile_App SHALL support language switching via the `LocaleProvider` and persist the user's language preference across sessions. **[IMPLEMENTED]**
5. THE Notification records SHALL store both English and Afan Oromo versions of the title and message fields. **[IMPLEMENTED]**
6. THE `SystemSetting` records SHALL store bilingual labels (`label`, `labelOm`). **[IMPLEMENTED]**
7. THE SpecialContribution records SHALL store bilingual title and description fields (`title`, `titleOm`, `description`, `descriptionOm`). **[IMPLEMENTED]**
8. THE PublicContent records SHALL store bilingual content fields (`title`, `titleOm`, `content`, `contentOm`) for all public website pages. **[IMPLEMENTED]**
9. THE generated PDF and Excel reports SHALL include content in the language requested at export time. **[IMPLEMENTED — report export language selection is not confirmed implemented]**

---

### Requirement 28: API Security and Input Validation

**User Story:** As a system operator, I want all API inputs to be validated and all endpoints to be protected by appropriate authentication and authorization controls, so that the system is protected from invalid data and unauthorized access.

#### Acceptance Criteria

1. THE API SHALL validate all incoming request bodies against defined schemas before processing, returning descriptive validation errors for any non-conforming input. **[IMPLEMENTED]**
2. THE Auth_Middleware SHALL verify the JWT signature and expiry on all protected endpoints, returning HTTP 401 for missing or invalid tokens. **[IMPLEMENTED]**
3. THE Auth_Middleware SHALL enforce role-based access control on all protected endpoints, returning HTTP 403 when the authenticated user's role is insufficient. **[IMPLEMENTED]**
4. THE API SHALL use parameterized queries via Prisma ORM for all database interactions, preventing SQL injection. **[IMPLEMENTED]**
5. THE API SHALL apply CORS configuration, restricting cross-origin requests to configured allowed origins. **[IMPLEMENTED]**
6. THE API SHALL return all responses in a standard envelope format: `{ "success": boolean, "message": string, "data": object, "meta": object }`. **[IMPLEMENTED]**

---

### Requirement 29: Production Deployment Readiness

**User Story:** As a system operator, I want clear documentation and environment configuration for deploying AMS to production, so that the system can be launched securely and reliably.

#### Acceptance Criteria

1. THE System SHALL provide a `docs/DEPLOYMENT.md` file with step-by-step deployment instructions. **[IMPLEMENTED]**
2. THE System SHALL provide a `backend/.env.example` file listing all required and optional environment variables with descriptions. **[IMPLEMENTED]**
3. WHEN Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are added to the `.env` file, THE SMS_Service SHALL activate live SMS delivery without code changes. **[NEEDS PRODUCTION SETUP]**
4. WHEN Firebase FCM credentials (`FCM_SERVER_KEY`) are added to the `.env` file, THE Push_Service SHALL activate live push notification delivery without code changes. **[NEEDS PRODUCTION SETUP]**
5. WHEN SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) are added to the `.env` file, THE Email_Service SHALL activate live email OTP delivery without code changes. **[NEEDS PRODUCTION SETUP]**
6. THE Admin SHALL be required to change the default admin password after the first login. **[IMPLEMENTED — noted in SPEC.md but not enforced programmatically]**
7. THE System SHALL support SSL/TLS termination for all production traffic. **[NEEDS PRODUCTION SETUP]**
