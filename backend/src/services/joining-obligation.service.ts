import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate back contributions owed by a new member
 * For new members: Only weekly contributions
 * For existing members joining later: Weekly + Special contributions (no penalties)
 */
export async function calculateBackContributions(
  groupStartDate: Date,
  memberJoinDate: Date,
  weeklyContributionAmount: number = config.defaults.weeklyContribution,
  includeSpecialContributions: boolean = false
) {
  // Calculate number of weeks between group start and member join date
  const startTime = groupStartDate.getTime();
  const joinTime = memberJoinDate.getTime();
  const differenceInMs = joinTime - startTime;
  const differenceInWeeks = Math.floor(differenceInMs / (1000 * 60 * 60 * 24 * 7));

  // If joined before or within first week, no back contributions
  if (differenceInWeeks <= 0) {
    return {
      backContributionWeeks: 0,
      totalBackContributionAmount: 0,
      dueDate: new Date(),
    };
  }

  // Calculate weekly contributions
  let totalBackContributionAmount = differenceInWeeks * weeklyContributionAmount;

  // Add special contributions if applicable (for existing members joining late)
  if (includeSpecialContributions) {
    // Get all special contributions collected before this member joined
    const specialContributions = await prisma.specialContribution.findMany({
      where: {
        createdAt: { lt: memberJoinDate },
        status: 'CLOSED', // Only completed collections
      },
    });

    // Add the special contribution amount to the total
    for (const sc of specialContributions) {
      totalBackContributionAmount += Number(sc.amount || 0);
    }
  }

  const dueDate = new Date(memberJoinDate);
  dueDate.setDate(dueDate.getDate() + 14); // Give 2 weeks to pay back contributions

  return {
    backContributionWeeks: differenceInWeeks,
    totalBackContributionAmount,
    dueDate,
  };
}

/**
 * Create joining obligation for a new member
 * includeSpecialContributions: Set to true for existing members joining late, false for new members
 */
export async function createJoiningObligation(
  memberId: string,
  groupStartDate: Date,
  memberJoinDate: Date,
  weeklyContributionAmount?: number,
  includeSpecialContributions: boolean = false
) {
  const calculation = await calculateBackContributions(
    groupStartDate,
    memberJoinDate,
    weeklyContributionAmount,
    includeSpecialContributions
  );

  // If no back contributions needed, skip
  if (calculation.backContributionWeeks === 0) {
    return null;
  }

  // Check if joining obligation already exists
  const existing = await prisma.joiningObligation.findUnique({
    where: { memberId },
  });

  if (existing) {
    return existing;
  }

  // Create new joining obligation
  const joiningObligation = await prisma.joiningObligation.create({
    data: {
      memberId,
      backContributionWeeks: calculation.backContributionWeeks,
      totalBackContributionAmount: new Decimal(calculation.totalBackContributionAmount),
      dueDate: calculation.dueDate,
      status: 'PENDING',
    },
  });

  return joiningObligation;
}

/**
 * Get joining obligation for a member
 */
export async function getJoiningObligation(memberId: string) {
  return await prisma.joiningObligation.findUnique({
    where: { memberId },
    include: {
      member: {
        select: {
          id: true,
          memberId: true,
          fullName: true,
          joinDate: true,
        },
      },
    },
  });
}

/**
 * Record payment toward joining obligation
 */
export async function recordJoiningObligationPayment(
  memberId: string,
  paymentAmount: number
) {
  const obligation = await prisma.joiningObligation.findUnique({
    where: { memberId },
  });

  if (!obligation) {
    throw new Error('No joining obligation found for this member');
  }

  const newAmountPaid = Number(obligation.amountPaid) + paymentAmount;
  const totalAmount = Number(obligation.totalBackContributionAmount);
  
  let newStatus = 'PENDING';
  if (newAmountPaid >= totalAmount) {
    newStatus = 'PAID';
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIAL';
  }

  const updated = await prisma.joiningObligation.update({
    where: { memberId },
    data: {
      amountPaid: new Decimal(newAmountPaid),
      status: newStatus,
    },
  });

  return updated;
}

/**
 * Waive joining obligation (admin action)
 */
export async function waiveJoiningObligation(
  memberId: string,
  reason: string,
  userId?: string
) {
  const updated = await prisma.joiningObligation.update({
    where: { memberId },
    data: {
      status: 'WAIVED',
    },
  });

  // Log this action as a system transaction
  const recorder = userId || (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id;
  if (recorder) {
    await prisma.transaction.create({
      data: {
        transactionId: `TX-WAIVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        memberId,
        type: 'ADJUSTMENT',
        amount: new Decimal(0),
        description: `Joining obligation waived: ${reason}`,
        recordedById: recorder,
        transactionDate: new Date(),
      },
    });
  }

  return updated;
}

/**
 * Get all members with pending joining obligations (not yet paid)
 */
export async function getPendingJoiningObligations() {
  return await prisma.joiningObligation.findMany({
    where: {
      status: { in: ['PENDING', 'PARTIAL'] }, // Show all not-yet-paid obligations
    },
    include: {
      member: {
        select: {
          id: true,
          memberId: true,
          fullName: true,
          joinDate: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });
}

/**
 * Reconcile payments made before joining obligation was created
 * This links payments made around the joining date to the joining obligation
 * Only counts payments made ON or BEFORE the join date (not after)
 */
export async function reconcileJoiningObligationPayments(memberId: string) {
  const obligation = await prisma.joiningObligation.findUnique({
    where: { memberId },
  });

  if (!obligation) {
    return null;
  }

  // Get the member to find join date
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return null;
  }

  // Find payments made ON or BEFORE the joining date only
  // (payments after join date are for regular weekly contributions, not joining obligation)
  const joinDate = member.joinDate || new Date();
  const lookbackDate = new Date(joinDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const paymentsToReconcile = await prisma.payment.findMany({
    where: {
      memberId,
      paymentDate: {
        gte: lookbackDate,
        lte: joinDate, // Only up to and including join date
      },
    },
  });

  // Sum up the payments
  const totalPaymentsFound = paymentsToReconcile.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  // Update the obligation with these payments
  if (totalPaymentsFound > 0) {
    const newAmountPaid = Number(obligation.amountPaid) + totalPaymentsFound;
    const totalAmount = Number(obligation.totalBackContributionAmount);

    let newStatus = 'PENDING';
    if (newAmountPaid >= totalAmount) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIAL';
    }

    const updated = await prisma.joiningObligation.update({
      where: { memberId },
      data: {
        amountPaid: new Decimal(newAmountPaid),
        status: newStatus,
      },
    });

    return { updated, paymentsReconciled: paymentsToReconcile.length, totalReconciled: totalPaymentsFound };
  }

  return null;
}

/**
 * Reconcile all joining obligations
 */
export async function reconcileAllJoiningObligations() {
  const obligations = await prisma.joiningObligation.findMany();
  const results: Array<{ memberId: string; paymentsReconciled: number; totalReconciled: number }> = [];

  for (const obligation of obligations) {
    const result = await reconcileJoiningObligationPayments(obligation.memberId);
    if (result) {
      results.push({
        memberId: obligation.memberId,
        paymentsReconciled: result.paymentsReconciled,
        totalReconciled: result.totalReconciled,
      });
    }
  }

  return results;
}

/**
 * Get group start date from system settings
 */
export async function getGroupStartDate(): Promise<Date> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'group_start_date' },
  });

  if (!setting || !setting.value) {
    // Default to 1 year ago if not set
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }

  return new Date(setting.value);
}

/**
 * Set group start date in system settings
 */
export async function setGroupStartDate(date: Date) {
  return await prisma.systemSetting.upsert({
    where: { key: 'group_start_date' },
    create: {
      key: 'group_start_date',
      value: date.toISOString(),
      label: 'Group Start Date',
      labelOm: 'Guyyaa Jalqabaa Garee',
    },
    update: {
      value: date.toISOString(),
    },
  });
}
