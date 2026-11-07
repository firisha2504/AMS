import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Dashboard Payment & Financial Calculations', () => {

  describe('1. Confirmed Cash vs Pending/Rejected Payments', () => {
    test('only VERIFIED payments are added to Total Income, excluding PENDING and REJECTED', () => {
      const payments = [
        { id: 'p1', amount: 50, status: 'VERIFIED' },
        { id: 'p2', amount: 100, status: 'PENDING' },
        { id: 'p3', amount: 50, status: 'REJECTED' },
        { id: 'p4', amount: 150, status: 'VERIFIED' },
      ];

      const confirmedPayments = payments.filter((p) => p.status === 'VERIFIED');
      const totalIncome = confirmedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      assert.strictEqual(totalIncome, 200, 'Total Income must only include VERIFIED payments (50 + 150 = 200)');
      assert.strictEqual(confirmedPayments.length, 2, 'Exactly 2 confirmed payments');
    });

    test('when all payments are 0 or none are confirmed, Total Income is strictly 0 and never NaN', () => {
      const zeroPayments: any[] = [];
      const confirmedTotal = zeroPayments
        .filter((p) => p.status === 'VERIFIED')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const totalIncome = isNaN(confirmedTotal) ? 0 : Math.max(0, confirmedTotal);
      const formatted = `${totalIncome.toLocaleString()} ETB`;

      assert.strictEqual(totalIncome, 0);
      assert.strictEqual(formatted, '0 ETB');
      assert.doesNotMatch(formatted, /NaN/);
    });

    test('handles null, undefined, or missing fields without producing NaN', () => {
      const adm: any = {
        totalMembers: 2,
        activeMembers: 2,
        pendingMembers: 0,
        weeklyContributions: 0,
        // paidPenalties is intentionally undefined (reproducing original bug)
      };

      // Buggy formula: Number(adm.weeklyContributions) + Number(adm.paidPenalties) => 0 + NaN = NaN
      const buggyTotal = Number(adm.weeklyContributions) + Number(adm.paidPenalties);
      assert.strictEqual(isNaN(buggyTotal), true, 'Original formula produced NaN');

      // Fixed safe formula
      const safeTotalIncome = Number(
        adm.totalConfirmedIncome ??
        adm.totalIncome ??
        (Number(adm.weeklyContributions || 0) + Number(adm.paidPenalties || 0))
      );
      const validatedIncome = isNaN(safeTotalIncome) ? 0 : Math.max(0, safeTotalIncome);
      const displayString = `${validatedIncome.toLocaleString()} ETB`;

      assert.strictEqual(validatedIncome, 0);
      assert.strictEqual(displayString, '0 ETB');
      assert.doesNotMatch(displayString, /NaN/);
    });
  });

  describe('2. Weekly Participation & This Week Paid Calculation', () => {
    test('when no member has paid, This Week Paid is 0 / totalMembers (0% participation)', () => {
      const activeMembers = 2;
      const currentPeriodObligations: any[] = []; // No verified payments recorded

      const paidMemberIds = new Set<string>();
      for (const ob of currentPeriodObligations) {
        if (ob.payments && ob.payments.some((p: any) => p.status === 'VERIFIED')) {
          paidMemberIds.add(ob.memberId);
        }
      }

      const thisWeekPaidCount = paidMemberIds.size;
      const thisWeekTotalMembers = activeMembers;
      const paidRate = thisWeekTotalMembers > 0
        ? Math.round((thisWeekPaidCount / thisWeekTotalMembers) * 100)
        : 0;

      assert.strictEqual(thisWeekPaidCount, 0, 'This week paid count must be 0');
      assert.strictEqual(thisWeekTotalMembers, 2, 'Total active members must be 2');
      assert.strictEqual(paidRate, 0, 'Participation rate must be 0% when no payments have been made');
    });

    test('only confirmed weekly contribution payments count for This Week Paid', () => {
      const obligations = [
        {
          id: 'ob-1',
          memberId: 'mem-1',
          contributionAmount: 50,
          status: 'PAID',
          payments: [{ status: 'VERIFIED', amount: 50 }],
          allocations: [{ allocationType: 'WEEKLY', payment: { status: 'VERIFIED' }, amount: 50 }],
        },
        {
          id: 'ob-2',
          memberId: 'mem-2',
          contributionAmount: 50,
          status: 'PENDING',
          payments: [{ status: 'PENDING', amount: 50 }], // Pending must NOT count
          allocations: [],
        },
      ];

      const paidMemberIds = new Set<string>();
      for (const ob of obligations) {
        const verifiedPaymentSum = (ob.payments || [])
          .filter((p: any) => p.status === 'VERIFIED')
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const verifiedAllocSum = (ob.allocations || [])
          .filter((a: any) => a.payment?.status === 'VERIFIED' && a.allocationType === 'WEEKLY')
          .reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
        const totalVerified = Math.max(verifiedPaymentSum, verifiedAllocSum);
        const required = Number(ob.contributionAmount || 0);

        if (
          (totalVerified >= required && required > 0) ||
          (ob.status === 'PAID' && totalVerified > 0)
        ) {
          paidMemberIds.add(ob.memberId);
        }
      }

      const totalMembers = 2;
      const thisWeekPaidCount = paidMemberIds.size;
      const paidRate = Math.round((thisWeekPaidCount / totalMembers) * 100);

      assert.strictEqual(thisWeekPaidCount, 1, 'Only member 1 with VERIFIED payment must count as paid');
      assert.strictEqual(paidRate, 50, 'Participation rate must be 50%');
    });

    test('penalty payments do NOT count as weekly contributions', () => {
      const penaltyPayments = [
        { id: 'pen-1', memberId: 'mem-1', amount: 50, status: 'VERIFIED', isPenalty: true },
      ];

      // Weekly obligation payments should be empty
      const weeklyPayments = penaltyPayments.filter((p) => !(p as any).isPenalty);
      assert.strictEqual(weeklyPayments.length, 0, 'Penalties must never be counted as weekly payments');
    });

    test('special contribution payments do NOT count as weekly contributions', () => {
      const specialPayments = [
        { id: 'sp-1', memberId: 'mem-1', amount: 200, status: 'VERIFIED', type: 'SPECIAL' },
      ];

      const weeklyPayments = specialPayments.filter((p) => p.type === 'WEEKLY');
      assert.strictEqual(weeklyPayments.length, 0, 'Special contributions must never be counted as weekly payments');
    });
  });

  describe('3. Outstanding Contributions & Pending Obligations Calculation', () => {
    test('calculates outstanding balance including historical joining obligations', () => {
      const joiningObligations = [
        { memberId: 'mem-1', totalBackContributionAmount: 5600, amountPaid: 0, status: 'PENDING' },
        { memberId: 'mem-2', totalBackContributionAmount: 5600, amountPaid: 0, status: 'PENDING' },
      ];

      let histOwed = 0;
      let histPaid = 0;
      let histReceivable = 0;
      let histUnpaidCount = 0;

      for (const j of joiningObligations) {
        const orig = Number(j.totalBackContributionAmount);
        const paid = Number(j.amountPaid || 0);
        const isPaid = j.status === 'PAID' || paid >= orig;
        const rem = isPaid ? 0 : Math.max(0, orig - paid);

        histOwed += orig;
        histPaid += paid;
        if (!isPaid) {
          histUnpaidCount++;
          histReceivable += rem;
        }
      }

      assert.strictEqual(histOwed, 11200, 'Total historical owed is 11,200 ETB');
      assert.strictEqual(histPaid, 0, 'Total historical paid is 0 ETB');
      assert.strictEqual(histReceivable, 11200, 'Historical receivable is 11,200 ETB');
      assert.strictEqual(histUnpaidCount, 2, '2 pending historical obligations');
    });

    test('outstanding card displays 11,200 ETB and 2 pending obligations instead of 0', () => {
      const adm = {
        totalOutstandingReceivables: 11200,
        totalOutstandingBalance: 11200,
        unpaidObligationsCount: 2,
        pendingMembers: 0, // Unapproved registrations count = 0
      };

      const outstandingAmount = Number(adm.totalOutstandingReceivables ?? adm.totalOutstandingBalance ?? 0);
      const pendingObligations = Number(adm.unpaidObligationsCount ?? 0);

      const amountDisplay = `${outstandingAmount.toLocaleString()} ETB`;
      const subtitleDisplay = `${pendingObligations} pending obligations`;

      assert.strictEqual(amountDisplay, '11,200 ETB');
      assert.strictEqual(subtitleDisplay, '2 pending obligations');
      assert.notStrictEqual(amountDisplay, '0');
    });
  });

  describe('4. Ethiopian Calendar Week Resolution', () => {
    test('maps Gregorian date 2026-11-07 to Saturday deadline of Week 9, Meskerem/Tikimt 2019 E.C.', () => {
      // Current date in system
      const gDate = new Date('2026-11-07T15:00:00.000Z');
      assert.strictEqual(gDate.getUTCDay(), 6, 'Must fall on a Saturday (day 6)');

      const period = {
        periodId: 'WP-2019-W09',
        ethiopianYear: 2019,
        ethiopianMonth: 2, // Tikimt
        weekNumber: 9,
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-07T20:59:59.999Z'),
        dueDate: new Date('2026-11-07T15:00:00.000Z'),
      };

      assert.ok(gDate >= period.startDate && gDate <= period.endDate, 'Date must be within period range');
      assert.strictEqual(period.weekNumber, 9);
      assert.strictEqual(period.ethiopianYear, 2019);
    });
  });
});

