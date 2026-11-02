import prisma from '../config/database.js';
import { executeUnifiedPayment } from './payment-allocation.service.js';
import { getMemberFinancialSummary } from './financial-calculator.service.js';

/**
 * Admin creates a manual penalty for a member
 */
export async function createManualPenalty(data: {
  memberId: string;
  amount: number;
  reason: string;
  title?: string;
  dueDate?: Date;
  isMonthly?: boolean;
  createdById?: string;
}) {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId }
  });
  if (!member) {
    throw new Error('Member not found');
  }

  const penalty = await prisma.penalty.create({
    data: {
      memberId: data.memberId,
      amount: data.amount,
      amountPaid: 0,
      title: data.title || (data.isMonthly ? 'Monthly Missed Penalty' : 'Manual Penalty'),
      reason: data.reason,
      dueDate: data.dueDate,
      isMonthly: !!data.isMonthly,
      status: 'OUTSTANDING',
    },
    include: {
      member: { select: { fullName: true, memberId: true, userId: true } }
    }
  });

  // Reconcile member balance
  await getMemberFinancialSummary(data.memberId);

  return penalty;
}

/**
 * Pay a specific penalty (supports both full and partial payments)
 * @param penaltyId - The penalty ID to pay
 * @param amount - The amount being paid towards the penalty
 * @param recordedById - The user ID recording the payment
 * @param paymentMethod - Payment method used
 * @param transactionReference - Transaction reference
 * @param notes - Optional notes
 */
export async function payPenalty(
  penaltyId: string,
  amount: number,
  recordedById: string,
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' = 'CASH',
  transactionReference?: string,
  notes?: string
) {
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

  const remaining = Number(penalty.amount) - Number(penalty.amountPaid || 0);
  if (amount > remaining) {
    throw new Error(`Payment amount (${amount} ETB) exceeds remaining penalty balance (${remaining} ETB)`);
  }

  // Execute unified payment for this exact penalty
  const result = await executeUnifiedPayment({
    memberId: penalty.memberId,
    amount,
    paymentMethod,
    transactionReference,
    notes: notes || `Penalty payment for: ${penalty.title || penalty.reason}`,
    recordedById,
    penaltyId,
    isVerified: true,
  });

  // Re-fetch updated penalty
  const updatedPenalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
  });

  // Sync member balances
  await getMemberFinancialSummary(penalty.memberId);

  return { payment: result.payment, penalty: updatedPenalty, receipt: result.receipt };
}

/**
 * Waive a penalty (forgive it without payment)
 * @param penaltyId - The penalty ID to waive
 * @param waivedById - User waiving the penalty
 * @param reason - Reason for waiving the penalty
 */
export async function waivePenalty(
  penaltyId: string,
  waivedById: string,
  reason: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error('A valid reason is required to waive a penalty');
  }

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

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status: 'WAIVED',
      waivedById,
      waiverReason: reason.trim(),
      waivedAt: new Date(),
    },
  });

  // Synchronize member outstanding balance
  await getMemberFinancialSummary(penalty.memberId);

  return updated;
}

/**
 * Reverse or reinstate a waived penalty
 */
export async function reversePenaltyWaiver(
  penaltyId: string,
  authorizedById: string,
  reason: string
) {
  if (!reason || !reason.trim()) {
    throw new Error('Reversal reason is required');
  }

  const penalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
  });

  if (!penalty) throw new Error('Penalty not found');
  if (penalty.status !== 'WAIVED') throw new Error('Penalty is not waived');

  const newStatus = Number(penalty.amountPaid || 0) > 0 ? 'PARTIAL' : 'OUTSTANDING';

  const updated = await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status: newStatus,
      waivedById: null,
      waiverReason: null,
      waivedAt: null,
    },
  });

  await getMemberFinancialSummary(penalty.memberId);

  return updated;
}

/**
 * Get all outstanding penalties for a member
 */
export async function getOutstandingPenalties(memberId: string) {
  return prisma.penalty.findMany({
    where: {
      memberId,
      status: { in: ['OUTSTANDING', 'PARTIAL'] },
    },
    orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * Calculate total outstanding penalty amount for a member
 */
export async function getTotalOutstandingPenalties(memberId: string): Promise<number> {
  const penalties = await prisma.penalty.findMany({
    where: {
      memberId,
      status: { in: ['OUTSTANDING', 'PARTIAL'] },
    },
  });

  return penalties.reduce((total, p) => total + (Number(p.amount) - Number(p.amountPaid || 0)), 0);
}
