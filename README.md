# 🏢 Afosha Management System

A comprehensive member management system for weekly contributions, penalties, attendance tracking, and financial management.

---

## 🚀 Quick Start

### First Time Setup
1. **Start Backend**: 
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   cd web
   npm install
   npm run dev
   ```

3. **Access System**: 
   - URL: `http://localhost:5173`
   - Username: `admin`
   - Password: `Admin@123`

📖 **Detailed Instructions**: See [`START_HERE.md`](START_HERE.md)

---

## 📚 Documentation Index

### 📖 For Members
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference card for daily operations
- **[START_HERE.md](START_HERE.md)** - Getting started guide
- **[LOGIN_GUIDE.md](LOGIN_GUIDE.md)** - How to access the system
- **[ATTENDANCE_VS_PAYMENTS_GUIDE.md](ATTENDANCE_VS_PAYMENTS_GUIDE.md)** - Understanding attendance vs payments
- **[HOW_TO_PAY_PENALTIES.md](HOW_TO_PAY_PENALTIES.md)** - Penalty payment workflow
- **[HOW_TO_PAY_PAST_WEEKS.md](HOW_TO_PAY_PAST_WEEKS.md)** - Paying for past weeks

### 💻 For System Administrators
- **[ADMIN_DASHBOARD_PENALTIES_GUIDE.md](ADMIN_DASHBOARD_PENALTIES_GUIDE.md)** - Admin dashboard guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - System administration & maintenance

---

## 🎯 Key Features

### 📊 Personal Member Dashboard
- **My Balance**: Real-time balance showing contributions vs obligations
- **Weekly Overview**: Current week contribution status
- **Attendance Record**: Your meeting attendance history
- **Payment History**: Complete record of your transactions

### ✅ Payment Management
- **Weekly Contributions**: 50 ETB per member per week
- **Special Contributions**: One-time special contributions for your account
- **Penalty Payments**: Track and pay any outstanding penalties
- **Payment Tracking**: See all your payments and remaining balance

### ✅ Penalty System
- **Your Penalties**: View any penalties on your account
- **Payment History**: See all your penalty payments
- **Status Overview**: Know exactly what you owe

### ✅ Attendance Tracking
- **Independent System**: Attendance ≠ Payment
- **Meeting Record**: Your Saturday meeting attendance
- **Flexible Status**: Can attend without paying and vice versa

---

## 🔑 Important Concepts

### 💡 Attendance vs Payment
**These are COMPLETELY SEPARATE:**
- **Attendance** = Physical presence at meeting (Present/Absent)
- **Payment** = Financial obligation (50 ETB weekly)

**Scenarios:**
- Member can be PRESENT but NOT PAY (will pay later)
- Member can be ABSENT but STILL PAY (sent payment remotely)
- Everyone must pay regardless of attendance

📖 **Full Explanation**: See [`ATTENDANCE_VS_PAYMENTS_GUIDE.md`](ATTENDANCE_VS_PAYMENTS_GUIDE.md)

### 💡 Payment Types (Independent)
**Two separate payment systems:**
1. **Weekly Contributions** - Regular 50 ETB weekly payments
2. **Penalties** - 50 ETB penalties for missed weeks

**Important:**
- Paying weekly contribution does NOT pay penalty
- Paying penalty does NOT pay weekly contribution
- Must be paid separately

📖 **Full Workflow**: See [`HOW_TO_PAY_PENALTIES.md`](HOW_TO_PAY_PENALTIES.md)

---

## 📅 Automatic Jobs (Cron)

| Time | Day | Job | Description |
|------|-----|-----|-------------|
| 6:00 AM | Saturday | Create Obligations | Create weekly obligations for all members |
| 7:00 AM | Saturday | Morning Reminders | Send meeting & payment reminders |
| 6:00 PM | Friday | Meeting Reminders | Send reminder 1 day before meeting |
| **1:00 AM** | **Sunday** | **Create Penalties** | Create penalties for unpaid Saturday obligations ⚠️ CRITICAL |
| 12:00 AM | Daily | Mark Overdue | Mark overdue obligations |
| 2:00 AM | Daily | Backup | Create database backup |

---

## 🗂️ Project Structure

```
Afosha MS/
├── backend/                 # Backend API (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, upload
│   │   ├── jobs/           # Cron jobs (penalty creation)
│   │   └── config/         # Configuration
│   ├── prisma/             # Database schema & migrations
│   └── scripts/            # Admin utility scripts
│
├── web/                     # Frontend (React + TypeScript + Vite)
│   └── src/
│       ├── pages/          # Main application pages
│       ├── components/     # Reusable components
│       └── lib/            # Utilities & API client
│
└── Documentation Files      # This folder (root)
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript
- **Jobs**: node-cron

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router
- **HTTP Client**: Axios

---

## 📊 System Status

### Production Readiness: ✅ 100%

#### Member Features Complete (8/8):
1. ✅ Personal dashboard with balance overview
2. ✅ Weekly contribution payment tracking
3. ✅ Penalty payment system
4. ✅ Payment history by type (weekly/penalty)
5. ✅ Attendance tracking
6. ✅ Joining obligation management
7. ✅ Multiple payment methods (6 methods)
8. ✅ Special contribution support

#### Quality Assurance:
- ✅ All member workflows tested
- ✅ Payment security implemented
- ✅ Business logic verified
- ✅ Automatic penalty system working
- ✅ Complete member documentation

---

## 🎓 Common Member Tasks

### Check My Balance
1. Go to **Dashboard**
2. View your balance card showing:
   - Total owed for current week
   - Any outstanding penalties
   - Your payment status

### Record My Payment
1. Go to **Weekly Contributions** page
2. Select your week (defaults to current)
3. Click **Pay Now** button
4. Choose payment method (M-Pesa, Telebirr, CBE, eBirr, etc.)
5. Enter 50 ETB and submit

### Pay a Penalty
1. Go to **Penalties** page
2. View your outstanding penalties
3. Click **Pay** on the penalty you want to settle
4. Enter payment amount and method
5. Submit - penalty marked as PAID

### View My Payment History
1. Go to **History** page
2. View all your transactions in one place:
   - Weekly contributions paid
   - Penalties paid
   - Special contributions
   - Attendance record

### Joining Obligation Payment
1. Go to **My Joining Obligation** page
2. See amount owed for weeks before joining
3. Make payments toward your joining obligation
4. Track progress until fully paid

📖 **Detailed Instructions**: See [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)

---

## 🔧 System Access

### Member Account Login
- **Username**: Your phone number or email
- **Password**: Set during first login
- **Reset**: Contact group admin if you forget

### Payment Methods Supported
- ✅ M-Pesa
- ✅ Telebirr (Ethio Telecom)
- ✅ CBE (Commercial Bank of Ethiopia)
- ✅ e-Birr
- ✅ Bank Transfer
- ✅ Cash (with receipt)

---

## 🚨 Troubleshooting

### Member not showing in Penalties dropdown
✅ **This is correct!** Dropdown only shows members with OUTSTANDING penalties.
If member paid all penalties, they disappear from list.

### Week not showing in Weekly Contributions
Page defaults to most recent week with verified payments.
Use dropdown to manually select any week.

### Payment not showing in History
- Check correct tab (All / Weekly / Penalty)
- Verify payment was submitted successfully
- Refresh the page (Ctrl + F5)

### No console errors but page blank
- Verify backend is running (port 5000)
- Verify frontend is running (port 5173)
- Check browser console for network errors

📖 **More Help**: See [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) Troubleshooting section

---

## 📞 Support

### Documentation Questions
Check the relevant guide from the documentation index above.

### Technical Issues
See [`ALL_FIXES_COMPLETE.md`](ALL_FIXES_COMPLETE.md) for technical details.

### Deployment Help
See [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) for deployment steps.

---

## 📝 License

This project is proprietary software developed for Afosha organization.

---

## 🎉 Version History

### v1.0.0 - June 17, 2026
- ✅ All 10 tasks completed
- ✅ Production-ready release
- ✅ Complete documentation
- ✅ Clean codebase (no debug logs)

---

**Last Updated**: June 17, 2026 (Wednesday)  
**Status**: ✅ Production Ready  
**All Tasks**: 10/10 Complete






 