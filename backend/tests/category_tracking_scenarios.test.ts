import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/database.js';
import { executeUnifiedPayment } from '../src/services/payment-allocation.service.js';
import { getMemberFinancialSummary, getOrganizationFinancialSummary } from '../src/services/financial-calculator.service.js';
import { PenaltyStatus, ObligationStatus } from '@prisma/client';

describe('Category-Specific Financial Tracking & Multi-Allocation Tests', () => {
  let adminUserId: string;
  const createdRecordIds: {
    members: string[];
    users: string[];
    obligations: string[];
    penalties: string[];
    specialCampaigns: string[];
    payments: string[];
  } = {
    members: [],
    users: [],
    obligations: [],
    penalties: [],
    specialCampaigns: [],
    payments: [],
  };

  async function createTestMember(tag: string) {
    const user = await prisma.user.create({
      data: {
        username: `cat_user_${tag}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        phone: `+25198${Math.floor(1000000 + Math.random() * 9000000)}`,
        passwordHash: 'dummyhash',
        role: 'MEMBER',
        preferredLanguage: 'om',
      },
    });
    createdRecordIds.users.push(user.id);

    const member = await prisma.member.create({
      data: {
        memberId: `CAT-${tag}-${Date.now()}`,
        userId: user.id,
        fullName: `Category Test Member ${tag}`,
        gender: 'MALE',
        dateOfBirth: new Date('1996-01-01'),
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
        await prisma.joiningObligation.deleteMany({ where: { memberId: { in: createdRecordIds.members } } });
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
  // 1. Multi-Category Single Transaction Allocation (150 ETB example)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Multi-category payment: 150 ETB creates 1 payment and 3 separate allocations (weekly 50, weekly penalty 50, special 50)', async () => {
    const member = await createTestMember('MULTI');

    // 1. Weekly obligation: 50 ETB
    const weekly = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 101,
        year: 2026,
        contributionAmount: 50,
        totalDue: 50,
        amountPaid: 0,
        status: ObligationStatus.PENDING,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(weekly.id);

    // 2. Weekly penalty: 50 ETB
    const weeklyPen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Weekly Missed Saturday',
        reason: 'Missed Saturday deadline',
        amount: 50,
        amountPaid: 0,
        isMonthly: false,
        weekNumber: 100,
        year: 2026,
        status: PenaltyStatus.OUTSTANDING,
      },
    });
    createdRecordIds.penalties.push(weeklyPen.id);

    // 3. Special contribution: 100 ETB
    const specialCampaign = await prisma.specialContribution.create({
      data: {
        campaignId: `SC-TEST-${Date.now()}`,
        type: 'GRADUATION',
        title: 'Graduation Celebration',
        amount: 100,
        createdById: adminUserId,
        obligations: {
          create: [{ memberId: member.id, amount: 100, status: ObligationStatus.PENDING, amountPaid: 0 }],
        },
      },
      include: { obligations: true },
    });
    createdRecordIds.specialCampaigns.push(specialCampaign.id);
    const specialObl = specialCampaign.obligations[0];

    // 4. Monthly penalty: 100 ETB (should remain UNTOUCHED)
    const monthlyPen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: '4-Week Missed Penalty',
        reason: 'Four consecutive missed weeks',
        amount: 100,
        amountPaid: 0,
        isMonthly: true,
        status: PenaltyStatus.OUTSTANDING,
      },
    });
    createdRecordIds.penalties.push(monthlyPen.id);

    // Member pays 150 ETB with explicit multi-allocations:
    // 50 ETB weekly + 50 ETB weekly penalty + 50 ETB special contribution
    const ref = `TX-MULTI-${Date.now()}`;
    const result = await executeUnifiedPayment({
      memberId: member.id,
      amount: 150,
      paymentMethod: 'CASH',
      transactionReference: ref,
      explicitAllocations: [
        { category: 'WEEKLY', targetId: weekly.id, amount: 50 },
        { category: 'WEEKLY_PENALTY', targetId: weeklyPen.id, amount: 50 },
        { category: 'SPECIAL', targetId: specialObl.id, amount: 50 },
      ],
      recordedById: adminUserId,
    });
    createdRecordIds.payments.push(result.payment.id);

    // Assert ONE payment transaction created for 150 ETB
    assert.strictEqual(Number(result.payment.amount), 150, 'Payment amount must be 150 ETB');

    // Assert THREE separate allocations created, each 50 ETB
    assert.strictEqual(result.allocations.length, 3, 'Must create exactly 3 separate allocation records');
    assert.strictEqual(Number(result.allocations[0].amount), 50);
    assert.strictEqual(Number(result.allocations[1].amount), 50);
    assert.strictEqual(Number(result.allocations[2].amount), 50);

    // Assert ONLY the 3 targeted obligations updated
    const updatedWeekly = await prisma.weeklyObligation.findUnique({ where: { id: weekly.id } });
    assert.strictEqual(updatedWeekly!.status, ObligationStatus.PAID, 'Weekly obligation must be PAID');
    assert.strictEqual(Number(updatedWeekly!.amountPaid), 50);

    const updatedWeeklyPen = await prisma.penalty.findUnique({ where: { id: weeklyPen.id } });
    assert.strictEqual(updatedWeeklyPen!.status, PenaltyStatus.SETTLED, 'Weekly penalty must be SETTLED');
    assert.strictEqual(Number(updatedWeeklyPen!.amountPaid), 50);

    const updatedSpecial = await prisma.specialContributionObligation.findUnique({ where: { id: specialObl.id } });
    assert.strictEqual(updatedSpecial!.status, ObligationStatus.PARTIAL, 'Special contribution was partially paid (50 of 100)');
    assert.strictEqual(Number(updatedSpecial!.amountPaid), 50);

    // Assert monthly penalty is completely UNTOUCHED
    const updatedMonthlyPen = await prisma.penalty.findUnique({ where: { id: monthlyPen.id } });
    assert.strictEqual(updatedMonthlyPen!.status, PenaltyStatus.OUTSTANDING, 'Monthly penalty remains OUTSTANDING');
    assert.strictEqual(Number(updatedMonthlyPen!.amountPaid), 0, 'Monthly penalty paid remains 0');

    // Assert receipt breakdown has all 3 line items
    const receipt = await prisma.receipt.findFirst({ where: { paymentId: result.payment.id } });
    assert.ok(receipt, 'Receipt created');
    assert.strictEqual(Number(receipt!.amount), 150);
    const breakdown = receipt!.breakdown as any[];
    assert.strictEqual(breakdown.length, 3, 'Receipt must show 3 separate breakdown items');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Independent Category Metrics in Member Financial Summary
  // ─────────────────────────────────────────────────────────────────────────────
  test('Member Financial Summary provides separate category metrics for all 7 categories', async () => {
    const member = await createTestMember('ALL_CATS');

    // 1. Weekly: 50 ETB (paid 50)
    const weekly = await prisma.weeklyObligation.create({
      data: {
        memberId: member.id,
        weekNumber: 102,
        year: 2026,
        contributionAmount: 50,
        totalDue: 50,
        amountPaid: 50,
        status: ObligationStatus.PAID,
        dueDate: new Date(),
      },
    });
    createdRecordIds.obligations.push(weekly.id);

    // 2. Weekly Penalty: 50 ETB (unpaid)
    const wPen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Weekly Missed Saturday',
        reason: 'Missed week 101',
        amount: 50,
        amountPaid: 0,
        isMonthly: false,
        weekNumber: 101,
        year: 2026,
        status: PenaltyStatus.OUTSTANDING,
      },
    });
    createdRecordIds.penalties.push(wPen.id);

    // 3. Monthly Penalty: 100 ETB (partial paid 40)
    const mPen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: '4-Week Missed Penalty',
        reason: 'Consecutive miss',
        amount: 100,
        amountPaid: 40,
        isMonthly: true,
        status: PenaltyStatus.PARTIAL,
      },
    });
    createdRecordIds.penalties.push(mPen.id);

    // 4. Other Penalty: 75 ETB (waived)
    const oPen = await prisma.penalty.create({
      data: {
        memberId: member.id,
        title: 'Noise in Assembly',
        reason: 'Disruptive behavior',
        amount: 75,
        amountPaid: 0,
        isMonthly: false,
        status: PenaltyStatus.WAIVED,
        waivedAt: new Date(),
        waivedById: adminUserId,
        waiverReason: 'First-time warning granted by assembly',
      },
    });
    createdRecordIds.penalties.push(oPen.id);

    // 5. Special Contribution: 100 ETB (unpaid)
    const specCampaign = await prisma.specialContribution.create({
      data: {
        campaignId: `SC-CAT-${Date.now()}`,
        type: 'BEREAVEMENT',
        title: 'Bereavement Support',
        amount: 100,
        createdById: adminUserId,
        obligations: {
          create: [{ memberId: member.id, amount: 100, status: ObligationStatus.PENDING, amountPaid: 0 }],
        },
      },
      include: { obligations: true },
    });
    createdRecordIds.specialCampaigns.push(specCampaign.id);

    // 6. Emergency Contribution: 150 ETB (paid 150)
    const emerCampaign = await prisma.specialContribution.create({
      data: {
        campaignId: `EMER-CAT-${Date.now()}`,
        type: 'EMERGENCY',
        title: 'Emergency Medical Assistance',
        amount: 150,
        createdById: adminUserId,
        obligations: {
          create: [{ memberId: member.id, amount: 150, status: ObligationStatus.PAID, amountPaid: 150 }],
        },
      },
      include: { obligations: true },
    });
    createdRecordIds.specialCampaigns.push(emerCampaign.id);

    // 7. Historical Joining Contribution: 200 ETB (paid 50, remaining 150)
    const joiningObl = await prisma.joiningObligation.create({
      data: {
        memberId: member.id,
        totalBackContributionAmount: 200,
        amountPaid: 50,
        backContributionWeeks: 4,
        status: 'PARTIAL',
        dueDate: new Date(Date.now() + 86400000 * 30),
      },
    });

    const summary = await getMemberFinancialSummary(member.id);
    assert.ok(summary, 'Summary returned');
    const metrics = summary.categoryMetrics;
    assert.ok(metrics, 'categoryMetrics present');

    // 1. Weekly: Owed 50, Paid 50, Remaining 0, 100% progress
    assert.strictEqual(metrics.WEEKLY.totalOwed, 50);
    assert.strictEqual(metrics.WEEKLY.totalPaid, 50);
    assert.strictEqual(metrics.WEEKLY.remainingBalance, 0);
    assert.strictEqual(metrics.WEEKLY.progressPercentage, 100);
    assert.strictEqual(metrics.WEEKLY.paidCount, 1);

    // 2. Weekly Penalty: Owed 50, Paid 0, Remaining 50, 0% progress
    assert.strictEqual(metrics.WEEKLY_PENALTY.totalOwed, 50);
    assert.strictEqual(metrics.WEEKLY_PENALTY.totalPaid, 0);
    assert.strictEqual(metrics.WEEKLY_PENALTY.remainingBalance, 50);
    assert.strictEqual(metrics.WEEKLY_PENALTY.progressPercentage, 0);
    assert.strictEqual(metrics.WEEKLY_PENALTY.unpaidCount, 1);

    // 3. Monthly Penalty: Owed 100, Paid 40, Remaining 60, 40% progress, 1 partial
    assert.strictEqual(metrics.MONTHLY_PENALTY.totalOwed, 100);
    assert.strictEqual(metrics.MONTHLY_PENALTY.totalPaid, 40);
    assert.strictEqual(metrics.MONTHLY_PENALTY.remainingBalance, 60);
    assert.strictEqual(metrics.MONTHLY_PENALTY.progressPercentage, 40);
    assert.strictEqual(metrics.MONTHLY_PENALTY.partiallyPaidCount, 1);

    // 4. Other Penalty: Owed 75, Paid 0, Remaining 0 (waived), 1 waived
    assert.strictEqual(metrics.OTHER_PENALTY.totalOwed, 75);
    assert.strictEqual(metrics.OTHER_PENALTY.remainingBalance, 0);
    assert.strictEqual(metrics.OTHER_PENALTY.waivedCount, 1);

    // 5. Special: Owed 100, Paid 0, Remaining 100
    assert.strictEqual(metrics.SPECIAL.totalOwed, 100);
    assert.strictEqual(metrics.SPECIAL.totalPaid, 0);
    assert.strictEqual(metrics.SPECIAL.remainingBalance, 100);
    assert.strictEqual(metrics.SPECIAL.unpaidCount, 1);

    // 6. Emergency: Owed 150, Paid 150, Remaining 0, 100% progress
    assert.strictEqual(metrics.EMERGENCY.totalOwed, 150);
    assert.strictEqual(metrics.EMERGENCY.totalPaid, 150);
    assert.strictEqual(metrics.EMERGENCY.remainingBalance, 0);
    assert.strictEqual(metrics.EMERGENCY.paidCount, 1);

    // 7. Historical: Owed 200, Paid 50, Remaining 150, 25% progress, 1 partial
    assert.strictEqual(metrics.HISTORICAL.totalOwed, 200);
    assert.strictEqual(metrics.HISTORICAL.totalPaid, 50);
    assert.strictEqual(metrics.HISTORICAL.remainingBalance, 150);
    assert.strictEqual(metrics.HISTORICAL.progressPercentage, 25);
    assert.strictEqual(metrics.HISTORICAL.partiallyPaidCount, 1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Dashboard Consistency for All 7 Categories
  // ─────────────────────────────────────────────────────────────────────────────
  test('Organization summary exposes consistent 7 category metrics for Admin and Auditor dashboards', async () => {
    const orgSummary = await getOrganizationFinancialSummary();
    const metrics = orgSummary.categoryMetrics;
    assert.ok(metrics, 'Organization categoryMetrics exists');

    const expectedKeys = ['WEEKLY', 'WEEKLY_PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY', 'SPECIAL', 'EMERGENCY', 'HISTORICAL'];
    for (const key of expectedKeys) {
      assert.ok(metrics[key], `Metric for ${key} must exist`);
      assert.ok(typeof metrics[key].totalOwed === 'number');
      assert.ok(typeof metrics[key].totalPaid === 'number');
      assert.ok(typeof metrics[key].remainingBalance === 'number');
      assert.ok(typeof metrics[key].progressPercentage === 'number');
      assert.ok(typeof metrics[key].paidCount === 'number');
      assert.ok(typeof metrics[key].unpaidCount === 'number');
      assert.ok(typeof metrics[key].partiallyPaidCount === 'number');
    }
  });
});
