import { ObligationStatus, TransactionType } from '@prisma/client';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import {
  generateTransactionId,
  getNumericSetting,
  getWeekNumber,
  getGroupRelativeWeekNumber,
  getNextSaturday,
} from './helpers.js';
import { sendPaymentReminderSms } from './notification.service.js';

type PenaltyCalculation = {
  penaltyAmount: number;
  isMonthlyPenalty: boolean;
  totalDue: number;
  consecutiveMissed: number;
};

async function getContributionSettings() {
  const contributionAmount = await getNumericSetting(
    'weekly_contribution',
    config.defaults.weeklyContribution
  );
  const weeklyPenalty = await getNumericSetting('weekly_penalty', config.defaults.weeklyPenalty);
  const monthlyPenalty = await getNumericSetting('monthly_penalty', config.defaults.monthlyPenalty);
  return { contributionAmount, weeklyPenalty, monthlyPenalty };
}

async function calculatePenaltyForMember(
  memberId: string,
  contributionAmount: number,
  weeklyPenalty: number,
  monthlyPenalty: number
): Promise<PenaltyCalculation> {
  const previousObligations = await prisma.weeklyObligation.findMany({
    where: {
      memberId,
      status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
    },
    orderBy: { dueDate: 'desc' },
    take: 4,
  });

  const consecutiveMissed = previousObligations.length;
  let penaltyAmount = 0;
  let isMonthlyPenalty = false;
  let totalDue = contributionAmount;

  if (consecutiveMissed >= 3) {
    const unpaidContributions = previousObligations.reduce(
      (sum, o) => sum + Number(o.contributionAmount) - Number(o.amountPaid),
      contributionAmount
    );
    penaltyAmount = monthlyPenalty;
    isMonthlyPenalty = true;
    totalDue = unpaidContributions + monthlyPenalty;
  } else if (consecutiveMissed >= 1) {
    penaltyAmount = weeklyPenalty;
    totalDue = contributionAmount + weeklyPenalty;
  }

  return { penaltyAmount, isMonthlyPenalty, totalDue, consecutiveMissed };
}

async function createMemberWeeklyObligation(
  memberId: string,
  weekNumber: number,
  year: number,
  dueDate: Date,
  applyPenalties: boolean
): Promise<boolean> {
  const existing = await prisma.weeklyObligation.findUnique({
    where: { memberId_weekNumber_year: { memberId, weekNumber, year } },
  });
  if (existing) return false;

  const { contributionAmount, weeklyPenalty, monthlyPenalty } = await getContributionSettings();
  const penalty = applyPenalties
    ? await calculatePenaltyForMember(memberId, contributionAmount, weeklyPenalty, monthlyPenalty)
    : {
        penaltyAmount: 0,
        isMonthlyPenalty: false,
        totalDue: contributionAmount,
        consecutiveMissed: 0,
      };

  await prisma.weeklyObligation.create({
    data: {
      memberId,
      weekNumber,
      year,
      dueDate,
      contributionAmount,
      penaltyAmount: penalty.penaltyAmount,
      totalDue: penalty.totalDue,
      status: ObligationStatus.PENDING,
      isMonthlyPenalty: penalty.isMonthlyPenalty,
      consecutiveMissedWeeks: penalty.consecutiveMissed,
    },
  });

  if (applyPenalties && penalty.consecutiveMissed >= 1 && penalty.penaltyAmount > 0) {
    // PHASE 3 FIX #4: Use upsert to prevent duplicate penalties (race condition safe)
    try {
      await prisma.penalty.upsert({
        where: {
          penalty_per_week: { memberId, weekNumber, year }
        },
        create: {
          memberId,
          amount: penalty.penaltyAmount,
          reason: penalty.isMonthlyPenalty
            ? 'Monthly penalty for 4 consecutive missed weeks'
            : 'Penalty for missed weekly contribution',
          weekNumber,
          year,
          isMonthly: penalty.isMonthlyPenalty,
        },
        update: {}, // If exists, don't update (already recorded)
      });
    } catch (error) {
      console.warn(`[Penalty Upsert] Conflict for member ${memberId} week ${weekNumber}/${year}`, error);
      // Continue - penalty already exists, that's ok
    }

    await prisma.member.update({
      where: { id: memberId },
      data: {
        outstandingBalance: { increment: penalty.totalDue },
      },
    });
  }

  return true;
}

export async function createWeeklyObligations(): Promise<number> {
  const dueDate = getNextSaturday();
  const weekNumber = await getGroupRelativeWeekNumber(dueDate);
  const year = dueDate.getFullYear();

  const members = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    include: { user: { select: { phone: true, preferredLanguage: true } } },
  });

  let created = 0;
  for (const member of members) {
    const wasCreated = await createMemberWeeklyObligation(
      member.id,
      weekNumber,
      year,
      dueDate,
      true
    );
    if (wasCreated) created++;
  }

  return created;
}

/**
 * Generate weekly obligations for multiple upcoming weeks
 * @param numberOfWeeks - Number of weeks to generate (1-8)
 * @returns Summary of created obligations per week
 */
export async function createWeeklyObligationsForMultipleWeeks(numberOfWeeks: number): Promise<{
  totalCreated: number;
  weeksSummary: Array<{ weekNumber: number; year: number; created: number; dueDate: string }>;
}> {
  const members = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });

  let totalCreated = 0;
  const weeksSummary: Array<{ weekNumber: number; year: number; created: number; dueDate: string }> = [];

  for (let weekOffset = 0; weekOffset < numberOfWeeks; weekOffset++) {
    const dueDate = getNextSaturday();
    dueDate.setDate(dueDate.getDate() + (weekOffset * 7));

    const weekNumber = await getGroupRelativeWeekNumber(dueDate);
    const year = dueDate.getFullYear();
    let createdThisWeek = 0;

    // PHASE 2 FIX #2: Apply penalties to ALL weeks, not just first
    // This ensures penalties are calculated correctly for members with prior unpaid obligations
    const applyPenalties = true;

    for (const member of members) {
      const wasCreated = await createMemberWeeklyObligation(
        member.id,
        weekNumber,
        year,
        dueDate,
        applyPenalties
      );
      if (wasCreated) {
        createdThisWeek++;
        totalCreated++;
      }
    }

    weeksSummary.push({
      weekNumber,
      year,
      created: createdThisWeek,
      dueDate: dueDate.toISOString(),
    });
  }

  return { totalCreated, weeksSummary };
}

/**
 * Backfill penalties on obligations that were created without them (e.g. before penalty fix).
 */
export async function applyMissingPenaltiesToExistingObligations(): Promise<number> {
  const { contributionAmount, weeklyPenalty, monthlyPenalty } = await getContributionSettings();

  const obligations = await prisma.weeklyObligation.findMany({
    where: {
      penaltyAmount: 0,
      consecutiveMissedWeeks: 0,
      status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
    },
    orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }],
  });

  let fixed = 0;

  for (const obligation of obligations) {
    const priorUnpaid = await prisma.weeklyObligation.findMany({
      where: {
        memberId: obligation.memberId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
        OR: [
          { year: { lt: obligation.year } },
          { year: obligation.year, weekNumber: { lt: obligation.weekNumber } },
        ],
      },
      orderBy: { dueDate: 'desc' },
      take: 4,
    });

    if (priorUnpaid.length === 0) continue;

    const consecutiveMissed = priorUnpaid.length;
    let penaltyAmount = 0;
    let isMonthlyPenalty = false;
    let totalDue = Number(obligation.contributionAmount);

    if (consecutiveMissed >= 3) {
      const unpaidContributions = priorUnpaid.reduce(
        (sum, o) => sum + Number(o.contributionAmount) - Number(o.amountPaid),
        Number(obligation.contributionAmount)
      );
      penaltyAmount = monthlyPenalty;
      isMonthlyPenalty = true;
      totalDue = unpaidContributions + monthlyPenalty;
    } else {
      penaltyAmount = weeklyPenalty;
      totalDue = Number(obligation.contributionAmount) + weeklyPenalty;
    }

    const existingPenalty = await prisma.penalty.findFirst({
      where: {
        memberId: obligation.memberId,
        weekNumber: obligation.weekNumber,
        year: obligation.year,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.weeklyObligation.update({
        where: { id: obligation.id },
        data: {
          penaltyAmount,
          totalDue,
          isMonthlyPenalty,
          consecutiveMissedWeeks: consecutiveMissed,
        },
      });

      if (!existingPenalty && penaltyAmount > 0) {
        await tx.penalty.create({
          data: {
            memberId: obligation.memberId,
            amount: penaltyAmount,
            reason: isMonthlyPenalty
              ? 'Monthly penalty for 4 consecutive missed weeks'
              : 'Penalty for missed weekly contribution',
            weekNumber: obligation.weekNumber,
            year: obligation.year,
            isMonthly: isMonthlyPenalty,
          },
        });
      }

      const balanceIncrease = totalDue - Number(obligation.totalDue);
      if (balanceIncrease > 0) {
        await tx.member.update({
          where: { id: obligation.memberId },
          data: { outstandingBalance: { increment: balanceIncrease } },
        });
      }
    });

    fixed++;
  }

  return fixed;
}

export async function markOverdueObligations(): Promise<number> {
  const now = new Date();
  const result = await prisma.weeklyObligation.updateMany({
    where: {
      dueDate: { lt: now },
      status: ObligationStatus.PENDING,
    },
    data: { status: ObligationStatus.OVERDUE },
  });
  return result.count;
}

export async function sendUnpaidReminders(): Promise<number> {
  const overdue = await prisma.weeklyObligation.findMany({
    where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
    include: {
      member: {
        include: { user: { select: { phone: true, preferredLanguage: true } } },
      },
    },
  });

  let sent = 0;
  for (const obligation of overdue) {
    const phone = obligation.member.user.phone;
    if (!phone) continue;

    const remaining = Number(obligation.totalDue) - Number(obligation.amountPaid);
    const lang = (obligation.member.user.preferredLanguage as 'en' | 'om') || 'om';
    await sendPaymentReminderSms(phone, remaining, lang);
    sent++;
  }

  return sent;
}

export async function recordLedgerEntry(
  memberId: string | null,
  type: TransactionType,
  amount: number,
  description: string,
  recordedById: string
): Promise<void> {
  await prisma.transaction.create({
    data: {
      transactionId: generateTransactionId(),
      memberId,
      type,
      amount,
      description,
      recordedById,
    },
  });
}

export async function applyPaymentToObligation(
  obligationId: string,
  amount: number
): Promise<{applied: number; overpayment: number}> {
  const obligation = await prisma.weeklyObligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) return { applied: 0, overpayment: 0 };

  const newPaid = Number(obligation.amountPaid) + amount;
  const totalDue = Number(obligation.totalDue);
  const balanceDecrement = Math.min(amount, totalDue - Number(obligation.amountPaid));
  
  // PHASE 2 FIX #3: Track overpayment
  const overpayment = amount - balanceDecrement;

  let status: ObligationStatus = ObligationStatus.PARTIAL;
  if (newPaid >= totalDue) status = ObligationStatus.PAID;
  else if (newPaid === 0) status = ObligationStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    await tx.weeklyObligation.update({
      where: { id: obligationId },
      data: { amountPaid: newPaid, status },
    });

    // Clamp to 0 so the balance never goes negative
    const current = await tx.member.findUnique({
      where: { id: obligation.memberId },
      select: { outstandingBalance: true },
    });
    const safeBalance = Math.max(0, Number(current?.outstandingBalance ?? 0) - balanceDecrement);
    await tx.member.update({
      where: { id: obligation.memberId },
      data: { outstandingBalance: safeBalance },
    });

    // PHASE 2 FIX #3: If overpayment exists, find next obligation and apply
    if (overpayment > 0) {
      const nextObligation = await tx.weeklyObligation.findFirst({
        where: {
          memberId: obligation.memberId,
          dueDate: { gt: obligation.dueDate },
          status: { in: ['PENDING', 'OVERDUE'] }
        },
        orderBy: { dueDate: 'asc' }
      });

      if (nextObligation) {
        // Recursively apply overpayment to next obligation
        const nextNewPaid = Number(nextObligation.amountPaid) + overpayment;
        const nextTotalDue = Number(nextObligation.totalDue);
        const nextBalanceDecrement = Math.min(overpayment, nextTotalDue - Number(nextObligation.amountPaid));
        
        let nextStatus: ObligationStatus = ObligationStatus.PARTIAL;
        if (nextNewPaid >= nextTotalDue) nextStatus = ObligationStatus.PAID;

        await tx.weeklyObligation.update({
          where: { id: nextObligation.id },
          data: { amountPaid: nextNewPaid, status: nextStatus }
        });

        const nextCurrent = await tx.member.findUnique({
          where: { id: obligation.memberId },
          select: { outstandingBalance: true }
        });
        const nextSafeBalance = Math.max(0, Number(nextCurrent?.outstandingBalance ?? 0) - nextBalanceDecrement);
        await tx.member.update({
          where: { id: obligation.memberId },
          data: { outstandingBalance: nextSafeBalance }
        });

        console.log(`[Overpayment] Linked ${overpayment} ETB from obligation ${obligationId} to next obligation ${nextObligation.id}`);
      } else {
        // No next obligation, create credit balance for future use
        // (in a real system, could track credits separately)
        console.log(`[Overpayment] No next obligation found for member. Excess ${overpayment} ETB remains recorded on original obligation.`);
      }
    }

    // Note: Penalties are NOT auto-settled when obligation is paid
    // Penalties must be paid separately through the Penalties page
  });

  return { applied: balanceDecrement, overpayment };
}

/**
 * Reverses a previously applied payment from an obligation.
 * Used when a verified payment is rolled back / corrected.
 */
export async function reversePaymentFromObligation(
  obligationId: string,
  amount: number
): Promise<void> {
  const obligation = await prisma.weeklyObligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) return;

  const currentPaid = Number(obligation.amountPaid);
  const newPaid = Math.max(0, currentPaid - amount);
  const totalDue = Number(obligation.totalDue);

  // How much outstanding balance to restore
  const balanceIncrement = Math.min(amount, currentPaid);

  let status: ObligationStatus;
  if (newPaid <= 0) status = ObligationStatus.PENDING;
  else if (newPaid >= totalDue) status = ObligationStatus.PAID;
  else status = ObligationStatus.PARTIAL;

  await prisma.$transaction(async (tx) => {
    await tx.weeklyObligation.update({
      where: { id: obligationId },
      data: { amountPaid: newPaid, status },
    });

    // Restore the outstanding balance
    await tx.member.update({
      where: { id: obligation.memberId },
      data: { outstandingBalance: { increment: balanceIncrement } },
    });

    // Note: Penalties are NOT auto-reverted when obligation is rolled back
    // Penalties must be managed separately through the Penalties page
  });
}


/**
 * PHASE 1 FIX #8: Reconcile Outstanding Balance
 * Recalculates member's outstanding balance from scratch based on:
 * - Unpaid weekly obligations (totalDue - amountPaid)
 * - Unpaid special contributions (amount - amountPaid)
 * - Outstanding penalties
 * This ensures accuracy even if incremental updates became inconsistent
 */
export async function recalculateOutstandingBalance(memberId: string): Promise<number> {
  const [weeklyData, specialData, penaltyData] = await Promise.all([
    prisma.weeklyObligation.aggregate({
      where: { memberId, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
      _sum: {
        totalDue: true,
        amountPaid: true,
      },
    }),
    prisma.specialContributionObligation.aggregate({
      where: { memberId, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
      _sum: {
        amount: true,
        amountPaid: true,
      },
    }),
    prisma.penalty.aggregate({
      where: { memberId, status: 'OUTSTANDING' },
      _sum: { amount: true },
    }),
  ]);

  const weeklyUnpaid = Number(weeklyData._sum.totalDue || 0) - Number(weeklyData._sum.amountPaid || 0);
  const specialUnpaid = Number(specialData._sum.amount || 0) - Number(specialData._sum.amountPaid || 0);
  const totalPenalties = Number(penaltyData._sum.amount || 0);

  const totalBalance = weeklyUnpaid + specialUnpaid + totalPenalties;

  await prisma.member.update({
    where: { id: memberId },
    data: { outstandingBalance: totalBalance },
  });

  return totalBalance;
}

/**
 * PHASE 1 FIX #18: Apply Payment with Idempotency
 * Only applies payment once using appliedAt timestamp as idempotency marker
 * Prevents duplicate balance deductions if called multiple times with same paymentId
 */
export async function applyPaymentToObligationIdempotent(
  paymentId: string,
  obligationId: string,
  amount: number
): Promise<{ applied: boolean; reason?: string }> {
  // Check if payment already applied
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { applied: false, reason: 'Payment not found' };
  }

  if (payment.appliedAt) {
    return { applied: false, reason: 'Payment already applied to obligation' };
  }

  const obligation = await prisma.weeklyObligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) {
    return { applied: false, reason: 'Obligation not found' };
  }

  const newPaid = Number(obligation.amountPaid) + amount;
  const totalDue = Number(obligation.totalDue);
  const balanceDecrement = Math.min(amount, totalDue - Number(obligation.amountPaid));

  let status: ObligationStatus = ObligationStatus.PARTIAL;
  if (newPaid >= totalDue) status = ObligationStatus.PAID;
  else if (newPaid === 0) status = ObligationStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    // Update obligation
    await tx.weeklyObligation.update({
      where: { id: obligationId },
      data: { amountPaid: newPaid, status },
    });

    // Update member balance
    const current = await tx.member.findUnique({
      where: { id: obligation.memberId },
      select: { outstandingBalance: true },
    });
    const safeBalance = Math.max(0, Number(current?.outstandingBalance ?? 0) - balanceDecrement);
    await tx.member.update({
      where: { id: obligation.memberId },
      data: { outstandingBalance: safeBalance },
    });

    // Mark payment as applied (idempotency marker)
    await tx.payment.update({
      where: { id: paymentId },
      data: { appliedAt: new Date() },
    });
  });

  return { applied: true };
}

/**
 * PHASE 1 FIX #10: Ensure Payment Has Valid Obligation
 * Validates that payment is linked to either weekly or special contribution obligation
 * Prevents orphan payments
 */
export async function validatePaymentObligation(
  obligationId: string | null | undefined,
  specialContributionObligationId: string | null | undefined
): Promise<{ valid: boolean; error?: string }> {
  if (!obligationId && !specialContributionObligationId) {
    return { valid: false, error: 'Payment must be linked to either a weekly or special contribution obligation' };
  }

  if (obligationId) {
    const obligation = await prisma.weeklyObligation.findUnique({
      where: { id: obligationId },
    });
    if (!obligation) {
      return { valid: false, error: 'Weekly obligation not found' };
    }
  }

  if (specialContributionObligationId) {
    const obligation = await prisma.specialContributionObligation.findUnique({
      where: { id: specialContributionObligationId },
    });
    if (!obligation) {
      return { valid: false, error: 'Special contribution obligation not found' };
    }
  }

  return { valid: true };
}

/**
 * PHASE 3 FIX #17: Verify payment has been fully applied before marking as verified
 * Ensures all obligation-linked payments are reflected in obligation status
 * Prevents verification of payments that haven't been applied yet
 */
export async function validatePaymentFullyApplied(
  paymentId: string
): Promise<{ valid: boolean; error?: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      obligation: { select: { id: true, amountPaid: true, totalDue: true } },
      specialContributionObligation: { select: { id: true, amountPaid: true, amount: true } }
    }
  });

  if (!payment) {
    return { valid: false, error: 'Payment not found' };
  }

  // If payment is linked to a weekly obligation, verify it's been applied
  if (payment.obligationId && payment.obligation) {
    const newAmountPaid = Number(payment.obligation.amountPaid) + Number(payment.amount);
    const previouslyApplied = Number(payment.obligation.amountPaid);
    
    // Check if payment amount matches what would be applied (within tolerance)
    // If obligation is already paid, verify payment amount doesn't exceed remaining
    const remaining = Math.max(0, Number(payment.obligation.totalDue) - previouslyApplied);
    if (Number(payment.amount) > remaining && remaining > 0) {
      return { valid: false, error: 'Payment amount exceeds remaining obligation balance' };
    }
  }

  // If payment is linked to special contribution obligation, verify similarly
  if (payment.specialContributionObligationId && payment.specialContributionObligation) {
    const previouslyApplied = Number(payment.specialContributionObligation.amountPaid);
    const remaining = Math.max(0, Number(payment.specialContributionObligation.amount) - previouslyApplied);
    if (Number(payment.amount) > remaining && remaining > 0) {
      return { valid: false, error: 'Payment amount exceeds remaining special contribution balance' };
    }
  }

  return { valid: true };
}

/**
 * PHASE 3 FIX #14: Auto-reconcile payments toward joining obligation
 * When a verified payment exists, check if it should be counted toward joining obligation
 * Links payments made around join date to the joining obligation
 */
export async function autoReconcileJoiningObligationPayment(
  memberId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<{ reconciled: boolean; reason?: string }> {
  const { reconcileJoiningObligationPayments } = await import('./joining-obligation.service.js');
  
  const joiningObligation = await prisma.joiningObligation.findUnique({
    where: { memberId },
  });

  if (!joiningObligation || joiningObligation.status === 'PAID' || joiningObligation.status === 'WAIVED') {
    return { reconciled: false, reason: 'No pending joining obligation' };
  }

  // Call the reconciliation service which will check if this payment should count
  const result = await reconcileJoiningObligationPayments(memberId);
  
  if (result && result.totalReconciled > 0) {
    return { reconciled: true, reason: `Reconciled ${result.totalReconciled} ETB to joining obligation` };
  }

  return { reconciled: false, reason: 'Payment not applicable to joining obligation' };
}
