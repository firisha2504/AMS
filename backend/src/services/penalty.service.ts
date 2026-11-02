import prisma from '../config/database.js';

/**
 * Pay a specific penalty independently from weekly contributions
 * @param penaltyId - The penalty ID to pay
 * @param amount - The amount being paid towards the penalty
 */
export async function payPenalty(penaltyId: string, amount: number): Promise<void> {
  const penalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
  });

  if (!penalty) {
    throw new Error('Penalty not found');
  }

  if (penalty.status === 'SETTLED') {
    throw new Error('Penalty already paid');
  }

  if (penalty.status === 'WAIVED') {
    throw new Error('Penalty already waived');
  }

  const penaltyAmount = Number(penalty.amount);

  // If the payment amount is equal to or greater than the penalty, mark as SETTLED
  if (amount >= penaltyAmount) {
    await prisma.$transaction(async (tx) => {
      // Mark penalty as settled
      await tx.penalty.update({
        where: { id: penaltyId },
        data: {
          status: 'SETTLED',
          paidAt: new Date(),
        },
      });

      // Reduce member's outstanding balance
      await tx.member.update({
        where: { id: penalty.memberId },
        data: {
          outstandingBalance: {
            decrement: penaltyAmount,
          },
        },
      });
    });
  } else {
    // Partial payment is not supported for penalties in the current model
    // You could extend the Penalty model to track partial payments if needed
    throw new Error('Partial penalty payment not supported. Payment must cover full penalty amount.');
  }
}

/**
 * Waive a penalty (forgive it without payment)
 * @param penaltyId - The penalty ID to waive
 * @param reason - Reason for waiving the penalty
 */
export async function waivePenalty(penaltyId: string, reason?: string): Promise<void> {
  const penalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
  });

  if (!penalty) {
    throw new Error('Penalty not found');
  }

  if (penalty.status === 'SETTLED') {
    throw new Error('Cannot waive a penalty that has already been paid');
  }

  if (penalty.status === 'WAIVED') {
    throw new Error('Penalty already waived');
  }

  const penaltyAmount = Number(penalty.amount);

  await prisma.$transaction(async (tx) => {
    // Mark penalty as waived
    await tx.penalty.update({
      where: { id: penaltyId },
      data: {
        status: 'WAIVED',
      },
    });

    // Reduce member's outstanding balance
    await tx.member.update({
      where: { id: penalty.memberId },
      data: {
        outstandingBalance: {
          decrement: penaltyAmount,
        },
      },
    });
  });
}

/**
 * Get all outstanding penalties for a member
 * @param memberId - The member ID
 * @returns Array of outstanding penalties
 */
export async function getOutstandingPenalties(memberId: string) {
  return prisma.penalty.findMany({
    where: {
      memberId,
      status: 'OUTSTANDING',
    },
    orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }],
  });
}

/**
 * Get penalties by week and year
 * @param memberId - The member ID
 * @param weekNumber - Week number
 * @param year - Year
 * @returns Penalty for the specified week
 */
export async function getPenaltyByWeek(memberId: string, weekNumber: number, year: number) {
  return prisma.penalty.findFirst({
    where: {
      memberId,
      weekNumber,
      year,
    },
  });
}

/**
 * Calculate total outstanding penalty amount for a member
 * @param memberId - The member ID
 * @returns Total outstanding penalty amount
 */
export async function getTotalOutstandingPenalties(memberId: string): Promise<number> {
  const penalties = await prisma.penalty.findMany({
    where: {
      memberId,
      status: 'OUTSTANDING',
    },
  });

  return penalties.reduce((total, penalty) => total + Number(penalty.amount), 0);
}
