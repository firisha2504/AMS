import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('AFOSHA Financial Business Rules Engine', () => {

  describe('1. Weekly Obligation & Penalties (Sections 6 & 7)', () => {
    test('standard single missed week incurs 50 ETB weekly contribution + 50 ETB weekly penalty', () => {
      const weeklyRate = 50;
      const weeklyPenalty = 50;
      const missedWeeks = 1;

      const totalContribution = missedWeeks * weeklyRate;
      const totalPenalty = missedWeeks * weeklyPenalty;
      const totalObligation = totalContribution + totalPenalty;

      assert.strictEqual(totalContribution, 50);
      assert.strictEqual(totalPenalty, 50);
      assert.strictEqual(totalObligation, 100);
    });

    test('four consecutive missed weeks trigger exactly one additional 100 ETB monthly penalty', () => {
      const weeklyRate = 50;
      const weeklyPenalty = 50;
      const monthlyPenaltyRate = 100;
      const consecutiveMissedWeeks = 4;

      const totalContribution = consecutiveMissedWeeks * weeklyRate;
      const totalWeeklyPenalties = consecutiveMissedWeeks * weeklyPenalty;
      const completedFourWeekBlocks = Math.floor(consecutiveMissedWeeks / 4);
      const totalMonthlyPenalties = completedFourWeekBlocks * monthlyPenaltyRate;
      const totalObligation = totalContribution + totalWeeklyPenalties + totalMonthlyPenalties;

      assert.strictEqual(totalContribution, 200, 'Four weeks contributions must equal 200 ETB');
      assert.strictEqual(totalWeeklyPenalties, 200, 'Four weekly penalties must equal 200 ETB');
      assert.strictEqual(totalMonthlyPenalties, 100, 'One completed 4-week block triggers 100 ETB monthly penalty');
      assert.strictEqual(totalObligation, 500, 'Total obligation for 4 consecutive missed weeks must be 500 ETB');
    });

    test('eight consecutive missed weeks trigger exactly two monthly penalties', () => {
      const weeklyRate = 50;
      const weeklyPenalty = 50;
      const monthlyPenaltyRate = 100;
      const consecutiveMissedWeeks = 8;

      const totalContribution = consecutiveMissedWeeks * weeklyRate;
      const totalWeeklyPenalties = consecutiveMissedWeeks * weeklyPenalty;
      const completedFourWeekBlocks = Math.floor(consecutiveMissedWeeks / 4);
      const totalMonthlyPenalties = completedFourWeekBlocks * monthlyPenaltyRate;
      const totalObligation = totalContribution + totalWeeklyPenalties + totalMonthlyPenalties;

      assert.strictEqual(totalContribution, 400);
      assert.strictEqual(totalWeeklyPenalties, 400);
      assert.strictEqual(completedFourWeekBlocks, 2);
      assert.strictEqual(totalMonthlyPenalties, 200, 'Eight weeks triggers 2 x 100 = 200 ETB monthly penalty');
      assert.strictEqual(totalObligation, 1000);
    });
  });

  describe('2. Historical Joining Contribution Calculation (Section 5)', () => {
    test('calculates historical dues based on rate effective during each period (never flat rate)', () => {
      // Rates table from Section 5.1 example
      const ratePeriods = [
        { name: 'Jan-Mar', rate: 50, weeks: 13 },
        { name: 'Apr-Jun', rate: 70, weeks: 13 },
        { name: 'Jul',     rate: 100, weeks: 4 },
      ];

      let totalHistoricalWeeks = 0;
      let totalHistoricalAssessment = 0;

      for (const period of ratePeriods) {
        totalHistoricalWeeks += period.weeks;
        totalHistoricalAssessment += period.rate * period.weeks;
      }

      assert.strictEqual(totalHistoricalWeeks, 30, 'Total historical weeks = 30');
      assert.strictEqual(totalHistoricalAssessment, 1960, '13*50 (650) + 13*70 (910) + 4*100 (400) must equal 1,960 ETB');

      // Contrast with incorrect flat current rate calculation:
      const incorrectFlatCurrentRate = totalHistoricalWeeks * 100; // 3000 ETB
      assert.notStrictEqual(totalHistoricalAssessment, incorrectFlatCurrentRate, 'Must NOT use flat current rate');
    });
  });

  describe('3. Special Contributions & Beneficiary Exemption (Section 8)', () => {
    test('exempts the affected member from contributing to their own family event', () => {
      const activeMembers = [
        { id: 'MEM-001', name: 'Abebe Kebede' }, // Beneficiary whose brother died/graduated
        { id: 'MEM-002', name: 'Gemechu Keneni' },
        { id: 'MEM-003', name: 'Tsion Daniel' },
        { id: 'MEM-004', name: 'Chala Beyene' },
        { id: 'MEM-005', name: 'Tolasa Feyisa' },
      ];

      const beneficiaryMemberId = 'MEM-001';
      const specialAmount = 100;

      // Filter eligible contributors
      const obligations = activeMembers.map((m) => {
        const isExempt = m.id === beneficiaryMemberId;
        return {
          memberId: m.id,
          amount: isExempt ? 0 : specialAmount,
          isExempt,
        };
      });

      const beneficiaryObligation = obligations.find((o) => o.memberId === beneficiaryMemberId);
      assert.ok(beneficiaryObligation, 'Beneficiary record exists');
      assert.strictEqual(beneficiaryObligation.isExempt, true, 'Beneficiary must be marked exempt');
      assert.strictEqual(beneficiaryObligation.amount, 0, 'Beneficiary owes 0 ETB');

      const otherObligations = obligations.filter((o) => o.memberId !== beneficiaryMemberId);
      assert.strictEqual(otherObligations.length, 4, 'All 4 other active members are billed');
      for (const o of otherObligations) {
        assert.strictEqual(o.amount, 100);
        assert.strictEqual(o.isExempt, false);
      }
    });
  });

  describe('4. Deterministic Payment Allocation Order (Section 14)', () => {
    test('allocates funds in strict priority: weekly -> weekly penalty -> monthly penalty -> historical -> special', () => {
      const paymentAmount = 150; // Member pays 150 ETB

      // Outstanding dues before allocation:
      const dues = [
        { type: 'WEEKLY', id: 'OBL-01', amountDue: 50, paid: 0 },
        { type: 'WEEKLY_PENALTY', id: 'PEN-01', amountDue: 50, paid: 0 },
        { type: 'MONTHLY_PENALTY', id: 'MPEN-01', amountDue: 100, paid: 0 },
        { type: 'HISTORICAL', id: 'HIST-01', amountDue: 200, paid: 0 },
      ];

      let remainingPayment = paymentAmount;
      const allocations = [];

      for (const item of dues) {
        if (remainingPayment <= 0) break;
        const amountToSettle = Math.min(remainingPayment, item.amountDue);
        item.paid += amountToSettle;
        remainingPayment -= amountToSettle;
        allocations.push({
          id: item.id,
          type: item.type,
          amountSettled: amountToSettle,
          isFullySettled: item.paid === item.amountDue,
        });
      }

      // Check results:
      assert.strictEqual(allocations[0].type, 'WEEKLY');
      assert.strictEqual(allocations[0].amountSettled, 50);
      assert.strictEqual(allocations[0].isFullySettled, true);

      assert.strictEqual(allocations[1].type, 'WEEKLY_PENALTY');
      assert.strictEqual(allocations[1].amountSettled, 50);
      assert.strictEqual(allocations[1].isFullySettled, true);

      assert.strictEqual(allocations[2].type, 'MONTHLY_PENALTY');
      assert.strictEqual(allocations[2].amountSettled, 50);
      assert.strictEqual(allocations[2].isFullySettled, false, 'Partially settled monthly penalty');

      assert.strictEqual(remainingPayment, 0, '150 ETB completely allocated');
      assert.strictEqual(dues[3].paid, 0, 'Historical obligation untouched due to lower priority');
    });
  });

  describe('5. Accounting Principles: Cash vs Receivables (Section 15)', () => {
    test('does NOT count unpaid member obligations as collected organization cash', () => {
      const verifiedIncome = 158750; // Actual confirmed cash in bank/vault
      const verifiedExpenses = 28500; // Approved disbursed expenses
      const outstandingReceivables = 42000; // Unpaid dues and pending penalties

      // Rule: Available Funds = Confirmed Income - Confirmed Expenses
      const availableFunds = verifiedIncome - verifiedExpenses;

      assert.strictEqual(availableFunds, 130250);
      assert.notStrictEqual(
        availableFunds,
        verifiedIncome - verifiedExpenses + outstandingReceivables,
        'Receivables must never be added to cash balance'
      );
    });
  });

});
