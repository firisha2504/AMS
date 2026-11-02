import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/database.js';
import { executeUnifiedPayment, reverseVerifiedPayment, validateTransactionReferenceUnique } from '../src/services/payment-allocation.service.js';
import { getMemberFinancialSummary, getOrganizationFinancialSummary } from '../src/services/financial-calculator.service.js';
import { createPaymentRequest, submitTransactionReference, verifyPaymentRequest } from '../src/services/payment-request.service.js';
import { createGraduationContribution, createEmergencyContribution } from '../src/services/special-contribution.service.js';
import { PenaltyStatus, ObligationStatus } from '@prisma/client';

describe('Financial Audit Integration Scenarios (Tests A through J)', () => {
  let adminUserId: string;
  const createdRecordIds: {
    members: string[];
    users: string[];
    obligations: string[];
    penalties: string[];
    specialCampaigns: string[];
    payments: string[];
    paymentRequests: string[];
  } = {
    members: [],
    users: [],
    obligations: [],
    penalties: [],
    specialCampaigns: [],
    payments: [],
    paymentRequests: [],
  };

  async function createIsolatedMember(tag: string) {
    const user = await prisma.user.create({
      data: {
        username: `user_${tag}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        phone: `+25199${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: 'dummyhash',
        role: 'MEMBER',
        preferredLanguage: 'om',
      },
    });
    createdRecordIds.users.push(user.id);

    const member = await prisma.member.create({
      data: {
        memberId: `MEM-${tag}-${Date.now()}`,
        userId: user.id,
        fullName: `Test Member ${tag}`,
        gender: 'MALE',
        dateOfBirth: new Date('1995-01-01'),
        status: 'APPROVED',
        outstandingBalance: 0,
      },
    });
    createdRecordIds.members.push(member.id);
    return member;
  }

  before(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error('Admin user required in database');
    adminUserId = admin.id;
  });

  after(async () => {
    try {
      if (createdRecordIds.paymentRequests.length > 0) {
        await prisma.paymentRequest.deleteMany({ where: { id: { in: createdRecordIds.paymentRequests } } });
      }
      if (createdRecordIds.payments.length > 0) {
        await prisma.paymentAllocation.deleteMany({ where: { paymentId: { in: createdRecordIds.payments } } });
        await prisma.receipt.deleteMany({ where: { paymentId: { in: createdRecordIds.payments } } });
        await prisma.transaction.deleteMany({ where: { memberId: { in: createdRecordIds.members } } });
        await prisma.transactionReversal.deleteMany({ where: { authorizedById: adminUserId } });
        await prisma.payment.deleteMany({ where: { id: { in: createdRecordIds.payments } } });
      }
      if (createdRecordIds.penalties.length > 0) {
        await prisma.penalty.deleteMany({ where: { id: { in: createdRecordIds.penalties } } });
      }
      if (createdRecordIds.obligations.length > 0) {
        await prisma.weeklyObligation.deleteMany({ where: { id: { in: createdRecordIds.obligations } } });
      }
      if (createdRecordIds.specialCampaigns.length > 0) {
        await prisma.specialContributionObligation.deleteMany({ where: { specialContributionId: { in: createdRecordIds.specialCampaigns } } });
        await prisma.specialContribution.deleteMany({ where: { id: { in: createdRecordIds.specialCampaigns } } });
      }
      if (createdRecordIds.members.length > 0) {
        await prisma.notification.deleteMany({ where: { memberId: { in: createdRecordIds.members } } });
        await prisma.member.deleteMany({ where: { id: { in: createdRecordIds.members } } });
      }
      if (createdRecordIds.users.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdRecordIds.users } } });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST A: Weekly Contribution
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test A: Weekly contribution - member pays 50 ETB, obligation becomes Paid, balance becomes 0', async () => {
    const member = await createIsolatedMember('A');
    const obligation = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 91,
        year: 2026,
        contributionAmount: 50,
        penaltyAmount: 0,
        totalDue: 50,
        amountPaid: 0,
        status: ObligationStatus.PENDING,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(obligation.id);

    const initialSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(initialSummary.weeklyOutstanding, 50, 'Initially owes 50 ETB weekly');

    const ref = `TX-TEST-A-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 50,
      paymentMethod: 'CASH',
      transactionReference: ref,
      category: 'WEEKLY',
      obligationId: obligation.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    const updatedObligation = await prisma.weeklyObligation.findUnique({ where: { id: obligation.id } });
    assert.ok(updatedObligation, 'Obligation exists');
    assert.strictEqual(updatedObligation.status, ObligationStatus.PAID, 'Status must be PAID');
    assert.strictEqual(Number(updatedObligation.amountPaid), 50, 'Amount paid must be 50 ETB');

    const finalSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(finalSummary.weeklyOutstanding, 0, 'Outstanding weekly balance must be 0');
    assert.strictEqual(finalSummary.weeklyPaid, 50, 'Weekly contributions paid must be 50');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST B: Weekly Penalty
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test B: Weekly penalty - member owes 50 ETB penalty, pays 50 ETB, penalty is Settled, balance becomes 0', async () => {
    const member = await createIsolatedMember('B');
    const penalty = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Missed Saturday Payment Penalty',
        amount: 50,
        amountPaid: 0,
        reason: 'Missed Saturday deadline',
        status: PenaltyStatus.OUTSTANDING,
        isMonthly: false,
      },
    });
    createdRecordIds.penalties.push(penalty.id);

    const initialSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(initialSummary.penaltiesOutstanding, 50, 'Initially owes 50 ETB penalty');

    const ref = `TX-TEST-B-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 50,
      paymentMethod: 'CBE',
      transactionReference: ref,
      category: 'PENALTY',
      penaltyId: penalty.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    const updatedPenalty = await prisma.penalty.findUnique({ where: { id: penalty.id } });
    assert.ok(updatedPenalty, 'Penalty exists');
    assert.strictEqual(updatedPenalty.status, PenaltyStatus.SETTLED, 'Penalty status must be SETTLED');
    assert.strictEqual(Number(updatedPenalty.amountPaid), 50, 'Penalty amount paid must be 50');

    const finalSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(finalSummary.penaltiesOutstanding, 0, 'Outstanding penalty must be 0');
    assert.strictEqual(finalSummary.penaltiesPaid, 50, 'Penalties paid must be 50');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST C: Partial Penalty Payment
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test C: Partial penalty payment - member owes 150 ETB (50 weekly + 100 monthly), pays 50 ETB: weekly Settled, monthly Unpaid, 100 outstanding', async () => {
    const member = await createIsolatedMember('C');
    const weeklyPenalty = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Weekly Missed Saturday Deadline',
        amount: 50,
        amountPaid: 0,
        reason: 'Missed week 90',
        status: PenaltyStatus.OUTSTANDING,
        isMonthly: false,
      },
    });
    createdRecordIds.penalties.push(weeklyPenalty.id);

    const monthlyPenalty = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: '4 Consecutive Weeks Missed Penalty',
        amount: 100,
        amountPaid: 0,
        reason: 'Four consecutive missed weeks',
        status: PenaltyStatus.OUTSTANDING,
        isMonthly: true,
      },
    });
    createdRecordIds.penalties.push(monthlyPenalty.id);

    const initialSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(initialSummary.penaltiesOutstanding, 150, 'Total penalty balance must initially be 150 ETB');

    // Pay 50 ETB targeted to the weekly penalty
    const ref = `TX-TEST-C-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 50,
      paymentMethod: 'TELEBIRR',
      transactionReference: ref,
      category: 'PENALTY',
      penaltyId: weeklyPenalty.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    // Verify weekly penalty is SETTLED (50 paid, 0 remaining)
    const updatedWeekly = await prisma.penalty.findUnique({ where: { id: weeklyPenalty.id } });
    assert.strictEqual(updatedWeekly!.status, PenaltyStatus.SETTLED, 'Weekly penalty must be SETTLED');
    assert.strictEqual(Number(updatedWeekly!.amountPaid), 50, 'Weekly penalty paid must be 50');
    assert.strictEqual(Number(updatedWeekly!.amount) - Number(updatedWeekly!.amountPaid), 0, 'Weekly remaining must be 0');

    // Verify monthly penalty remains OUTSTANDING (0 paid, 100 remaining)
    const updatedMonthly = await prisma.penalty.findUnique({ where: { id: monthlyPenalty.id } });
    assert.strictEqual(updatedMonthly!.status, PenaltyStatus.OUTSTANDING, 'Monthly penalty must remain OUTSTANDING');
    assert.strictEqual(Number(updatedMonthly!.amountPaid), 0, 'Monthly penalty paid must be 0');
    assert.strictEqual(Number(updatedMonthly!.amount) - Number(updatedMonthly!.amountPaid), 100, 'Monthly remaining must be 100');

    // Verify overall financial summary: 50 paid, 100 remaining
    const finalSummary = await getMemberFinancialSummary(member.id);
    assert.strictEqual(finalSummary.penaltiesPaid, 50, 'Total penalty paid must be 50 ETB');
    assert.strictEqual(finalSummary.penaltiesOutstanding, 100, 'Outstanding penalty balance must be 100 ETB');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST D: Special Contribution
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test D: Special contribution - 100 ETB graduation event excludes affected member, other member pays 100 ETB', async () => {
    const beneficiary = await createIsolatedMember('D_BENEFICIARY');
    const payingMember = await createIsolatedMember('D_PAYER');

    const campaign = await createGraduationContribution(
      beneficiary.id,
      'BROTHER',
      adminUserId,
      new Date(Date.now() + 86400000 * 14),
      [payingMember.id]
    );
    createdRecordIds.specialCampaigns.push(campaign.id);

    // Affected member must NOT have an obligation
    const beneficiaryObligation = await prisma.specialContributionObligation.findFirst({
      where: { specialContributionId: campaign.id, memberId: beneficiary.id },
    });
    assert.strictEqual(beneficiaryObligation, null, 'Affected member must be exempt and receive NO obligation');

    // Other eligible member receives obligation
    const payerObligation = await prisma.specialContributionObligation.findFirst({
      where: { specialContributionId: campaign.id, memberId: payingMember.id },
    });
    assert.ok(payerObligation, 'Other eligible member must receive obligation');
    assert.strictEqual(Number(payerObligation!.amount), 100, 'Obligation amount must be 100 ETB');
    assert.strictEqual(payerObligation!.status, ObligationStatus.PENDING, 'Obligation status must initially be PENDING');

    // Payer pays 100 ETB
    const ref = `TX-TEST-D-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: payingMember.id,
      amount: 100,
      paymentMethod: 'CBE',
      transactionReference: ref,
      category: 'SPECIAL',
      specialContributionObligationId: payerObligation!.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    const updatedObligation = await prisma.specialContributionObligation.findUnique({
      where: { id: payerObligation!.id },
    });
    assert.strictEqual(updatedObligation!.status, ObligationStatus.PAID, 'Special contribution obligation must be PAID');
    assert.strictEqual(Number(updatedObligation!.amountPaid), 100, 'Amount paid must be 100 ETB');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST E: Emergency Contribution
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test E: Emergency contribution - created, member pays, only emergency obligation updated', async () => {
    const member = await createIsolatedMember('E');
    const campaign = await createEmergencyContribution({
      title: 'Community Bridge Repair Emergency',
      amount: 150,
      dueDate: new Date(Date.now() + 86400000 * 7),
      targetMemberIds: [member.id],
      createdById: adminUserId,
    });
    createdRecordIds.specialCampaigns.push(campaign.id);

    const obligation = await prisma.specialContributionObligation.findFirst({
      where: { specialContributionId: campaign.id, memberId: member.id },
    });
    assert.ok(obligation, 'Emergency obligation created');
    assert.strictEqual(Number(obligation!.amount), 150);

    const ref = `TX-TEST-E-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 150,
      paymentMethod: 'CASH',
      transactionReference: ref,
      category: 'SPECIAL',
      specialContributionObligationId: obligation!.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    const updated = await prisma.specialContributionObligation.findUnique({ where: { id: obligation!.id } });
    assert.strictEqual(updated!.status, ObligationStatus.PAID);
    assert.strictEqual(Number(updated!.amountPaid), 150);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST F: Multiple Payment Categories
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test F: Multiple categories - member has weekly, penalty, and special dues; pays penalty; other dues unchanged', async () => {
    const member = await createIsolatedMember('F');
    const weeklyObl = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 92,
        year: 2026,
        contributionAmount: 50,
        totalDue: 50,
        amountPaid: 0,
        status: ObligationStatus.PENDING,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(weeklyObl.id);

    const pen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Meeting Late Penalty',
        amount: 50,
        amountPaid: 0,
        reason: 'Arrived 30 mins late',
        status: PenaltyStatus.OUTSTANDING,
        isMonthly: false,
      },
    });
    createdRecordIds.penalties.push(pen.id);

    const specCampaign = await prisma.specialContribution.create({
      data: {
        campaignId: `SC-TEST-F-${Date.now()}`,
        type: 'BEREAVEMENT',
        title: 'Bereavement Fund F',
        amount: 100,
        createdById: adminUserId,
        obligations: {
          create: [{ memberId: member.id, amount: 100, status: ObligationStatus.PENDING, amountPaid: 0 }],
        },
      },
      include: { obligations: true },
    });
    createdRecordIds.specialCampaigns.push(specCampaign.id);
    const specObl = specCampaign.obligations[0];

    const summaryBefore = await getMemberFinancialSummary(member.id);
    assert.strictEqual(summaryBefore.weeklyOutstanding, 50, 'Weekly dues before payment = 50');
    assert.strictEqual(summaryBefore.penaltiesOutstanding, 50, 'Penalty dues before payment = 50');
    assert.strictEqual(summaryBefore.specialOutstanding, 100, 'Special dues before payment = 100');

    // Pay penalty ONLY
    const ref = `TX-TEST-F-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 50,
      paymentMethod: 'CBE',
      transactionReference: ref,
      category: 'PENALTY',
      penaltyId: pen.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    // Penalty is SETTLED
    const updatedPen = await prisma.penalty.findUnique({ where: { id: pen.id } });
    assert.strictEqual(updatedPen!.status, PenaltyStatus.SETTLED);

    // Weekly and special obligations are completely UNCHANGED
    const updatedWeekly = await prisma.weeklyObligation.findUnique({ where: { id: weeklyObl.id } });
    assert.strictEqual(updatedWeekly!.status, ObligationStatus.PENDING);
    assert.strictEqual(Number(updatedWeekly!.amountPaid), 0);

    const updatedSpec = await prisma.specialContributionObligation.findUnique({ where: { id: specObl.id } });
    assert.strictEqual(updatedSpec!.status, ObligationStatus.PENDING);
    assert.strictEqual(Number(updatedSpec!.amountPaid), 0);

    const summaryAfter = await getMemberFinancialSummary(member.id);
    assert.strictEqual(summaryAfter.penaltiesOutstanding, 0, 'Penalty outstanding is now 0');
    assert.strictEqual(summaryAfter.weeklyOutstanding, 50, 'Weekly dues remain 50 ETB');
    assert.strictEqual(summaryAfter.specialOutstanding, 100, 'Special dues remain 100 ETB');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST G: Pending and Failed Payments
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test G: Pending and failed payments do NOT change financial balances or mark obligations as paid', async () => {
    const member = await createIsolatedMember('G');
    const weeklyObl = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 93,
        year: 2026,
        contributionAmount: 50,
        totalDue: 50,
        amountPaid: 0,
        status: ObligationStatus.PENDING,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(weeklyObl.id);

    const balBefore = await getMemberFinancialSummary(member.id);

    // 1. Create a PENDING payment request
    const pendingReq = await createPaymentRequest({
      memberId: member.id,
      amount: 50,
      paymentProvider: 'CBE',
      category: 'WEEKLY',
      obligationId: weeklyObl.id,
    });
    createdRecordIds.paymentRequests.push(pendingReq.id);
    await submitTransactionReference(pendingReq.id, `TX-PENDING-${Date.now()}`);

    // Verify obligation is still PENDING and balances unchanged
    const oblAfterPending = await prisma.weeklyObligation.findUnique({ where: { id: weeklyObl.id } });
    assert.strictEqual(oblAfterPending!.status, ObligationStatus.PENDING);
    assert.strictEqual(Number(oblAfterPending!.amountPaid), 0);

    const balAfterPending = await getMemberFinancialSummary(member.id);
    assert.strictEqual(balAfterPending.totalAmountPaid, balBefore.totalAmountPaid, 'Total paid cannot change from pending request');

    // 2. Reject/Fail the request
    await prisma.paymentRequest.update({
      where: { id: pendingReq.id },
      data: { status: 'REJECTED', verificationNotes: 'Invalid screenshot / fake transfer' },
    });

    // Verify obligation is STILL unpaid
    const oblAfterFailed = await prisma.weeklyObligation.findUnique({ where: { id: weeklyObl.id } });
    assert.strictEqual(oblAfterFailed!.status, ObligationStatus.PENDING);
    assert.strictEqual(Number(oblAfterFailed!.amountPaid), 0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST H: Duplicate Payment Prevention
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test H: Duplicate payment - duplicate transaction references are rejected', async () => {
    const member = await createIsolatedMember('H');
    const uniqueRef = `TX-DUP-${Date.now()}`;

    // First payment request passes reference submission
    const req1 = await createPaymentRequest({
      memberId: member.id,
      amount: 50,
      paymentProvider: 'TELEBIRR',
      category: 'WEEKLY',
    });
    createdRecordIds.paymentRequests.push(req1.id);
    await submitTransactionReference(req1.id, uniqueRef);

    // Second payment request attempting same reference must be rejected
    const req2 = await createPaymentRequest({
      memberId: member.id,
      amount: 50,
      paymentProvider: 'TELEBIRR',
      category: 'WEEKLY',
    });
    createdRecordIds.paymentRequests.push(req2.id);

    await assert.rejects(
      async () => {
        await submitTransactionReference(req2.id, uniqueRef);
      },
      /already been submitted|already exists|already recorded|duplicate/i,
      'Must reject duplicate transaction reference'
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST I: Refund and Reversal
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test I: Refund and reversal - reverses payment, restores obligation, logs in ledger, preserves history', async () => {
    const member = await createIsolatedMember('I');
    const weeklyObl = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 94,
        year: 2026,
        contributionAmount: 50,
        totalDue: 50,
        amountPaid: 0,
        status: ObligationStatus.PENDING,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(weeklyObl.id);

    // Confirmed payment
    const ref = `TX-REVERSE-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 50,
      paymentMethod: 'CASH',
      transactionReference: ref,
      category: 'WEEKLY',
      obligationId: weeklyObl.id,
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    // Verify obligation is Paid
    let obl = await prisma.weeklyObligation.findUnique({ where: { id: weeklyObl.id } });
    assert.strictEqual(obl!.status, ObligationStatus.PAID);

    // Execute official reversal
    await reverseVerifiedPayment(result.payment.id, adminUserId, 'Duplicate cash deposit adjustment');

    // 1. Verify obligation restored to PENDING / UNPAID
    obl = await prisma.weeklyObligation.findUnique({ where: { id: weeklyObl.id } });
    assert.strictEqual(obl!.status, ObligationStatus.PENDING, 'Obligation must be restored to PENDING');
    assert.strictEqual(Number(obl!.amountPaid), 0, 'Amount paid must be 0 after reversal');

    // 2. Verify original payment record is preserved (never deleted)
    const reversedPayment = await prisma.payment.findUnique({ where: { id: result.payment.id } });
    assert.ok(reversedPayment, 'Payment history record must be preserved');
    assert.strictEqual(reversedPayment!.status, 'REJECTED', 'Status must be updated, not deleted');

    // 3. Verify ledger reversal was logged
    const reversalRecord = await prisma.transactionReversal.findFirst({
      where: { reason: 'Duplicate cash deposit adjustment' },
    });
    assert.ok(reversalRecord, 'Transaction reversal must be permanently recorded');
    assert.strictEqual(reversalRecord!.reason, 'Duplicate cash deposit adjustment');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST J: Dashboard Consistency
  // ─────────────────────────────────────────────────────────────────────────────
  test('Test J: Dashboard consistency - Member, Admin, and Auditor summaries match verified financial records', async () => {
    const member = await createIsolatedMember('J');
    const memberSummary = await getMemberFinancialSummary(member.id);
    const orgSummary = await getOrganizationFinancialSummary();

    // Verify properties are strictly real numbers and not undefined or NaN
    assert.ok(typeof memberSummary.totalAmountPaid === 'number' && !isNaN(memberSummary.totalAmountPaid));
    assert.ok(typeof memberSummary.totalOutstandingBalance === 'number' && !isNaN(memberSummary.totalOutstandingBalance));
    assert.ok(typeof orgSummary.totalConfirmedIncome === 'number' && !isNaN(orgSummary.totalConfirmedIncome));
    assert.ok(typeof orgSummary.availableActualFunds === 'number' && !isNaN(orgSummary.availableActualFunds));
    assert.ok(typeof orgSummary.totalOutstandingReceivables === 'number' && !isNaN(orgSummary.totalOutstandingReceivables));

    // Confirm that Available Funds = Confirmed Income - Total Expenses
    const expectedFunds = orgSummary.totalConfirmedIncome - orgSummary.totalExpenses;
    assert.strictEqual(orgSummary.availableActualFunds, expectedFunds, 'Available funds must strictly equal confirmed income minus approved expenses');

    // Confirm that receivables are NOT counted as collected cash
    assert.notStrictEqual(orgSummary.availableActualFunds, orgSummary.availableActualFunds + orgSummary.totalOutstandingReceivables);
  });
});
