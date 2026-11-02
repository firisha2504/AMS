# Penalty System - How It Works

## Current System (Active)

**Penalties are ONLY created for non-payment of weekly contributions.**

Attendance status (PRESENT/ABSENT/EXCUSED) does NOT create or remove penalties.

## Rule

```
✅ Paid weekly contribution → NO penalty
❌ Didn't pay weekly contribution → Gets penalty (50 Birr)
```

Attendance is tracked separately for reporting purposes only.

## Examples

| Member | Weekly Paid? | Attendance | Gets Penalty? |
|--------|-------------|------------|---------------|
| A      | ✅ Yes       | PRESENT    | ❌ No         |
| B      | ✅ Yes       | ABSENT     | ❌ No         |
| C      | ❌ No        | PRESENT    | ✅ Yes        |
| D      | ❌ No        | ABSENT     | ✅ Yes        |

## How Penalties Are Created

### Automatic (by Scheduler)
- Runs weekly via cron job
- Checks all unpaid weekly obligations
- Creates penalty for each unpaid member
- Reason: "Missed payment for Week X, Year"

### Manual (by Admin)
- Admin can create custom penalties
- For special cases or fines
- Any amount, any reason

## Penalty Statuses

- **OUTSTANDING** 🔴 - Member owes this penalty
- **SETTLED** ✅ - Member paid the penalty
- **WAIVED** 🎁 - Penalty forgiven (not paid)

## Important Notes

1. **Weekly Obligation ≠ Penalty**
   - Weekly obligation: 50 Birr (standard contribution)
   - Penalty: 50 Birr (for not paying the obligation)
   - If you don't pay: You owe 100 Birr total (50 + 50)

2. **Attendance Tracking**
   - Still recorded for statistics
   - Helps track meeting participation
   - Used for reports
   - Does NOT affect penalties

3. **Payment First**
   - System prioritizes getting members to pay
   - Attendance is secondary
   - Fair to members who pay but can't attend

## For More Details

See: `backend/WAIVE_OLD_PENALTIES_GUIDE.md` for managing penalties
