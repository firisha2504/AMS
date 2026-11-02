import prisma from '../config/database.js';
import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { generatePaymentId, generateReceiptNumber } from './helpers.js';
import { getMemberFinancialSummary } from './financial-calculator.service.js';

export interface ExplicitAllocationItem {
  category: 'WEEKLY' | 'WEEKLY_PENALTY' | 'MONTHLY_PENALTY' | 'OTHER_PENALTY' | 'SPECIAL' | 'EMERGENCY' | 'HISTORICAL' | 'PENALTY';
  targetId: string;
  amount: number;
}

export interface ExecutePaymentInput {
  memberId: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  transactionReference?: string;
  notes?: string;
  recordedById: string;
  // Direct target options (if paying a specific obligation)
  obligationId?: string;
  penaltyId?: string;
  specialContributionObligationId?: string;
  joiningObligationId?: string;
  category?: 'WEEKLY' | 'PENALTY' | 'SPECIAL' | 'EMERGENCY' | 'HISTORICAL' | 'ALL';
  explicitAllocations?: ExplicitAllocationItem[];
  // Immediate verification flag (default true for direct admin/auditor entry)
  isVerified?: boolean;
}

export interface AllocationItem {
  allocationType: 'WEEKLY' | 'WEEKLY_PENALTY' | 'PENALTY' | 'MONTHLY_PENALTY' | 'OTHER_PENALTY' | 'HISTORICAL' | 'SPECIAL' | 'EMERGENCY';
  amount: number;
  targetId: string;
  description: string;
}

/**
 * Validates whether a transaction reference has already been used.
 */
export async function validateTransactionReferenceUnique(reference?: string): Promise<boolean> {
  if (!reference || !reference.trim()) return true;
  const cleanRef = reference.trim();

  const [existingPayment, existingRequest] = await Promise.all([
    prisma.payment.findFirst({
      where: {
        transactionReference: cleanRef,
        status: { not: 'REJECTED' },
      },
    }),
    prisma.paymentRequest.findFirst({
      where: {
        transactionReference: cleanRef,
        status: { in: ['SUBMITTED', 'VERIFIED'] },
      },
    }),
  ]);

  return !existingPayment && !existingRequest;
}

/**
 * Calculates allocation plan for a given amount without committing to the database.
 */
export async function calculateAllocationBreakdown(
  memberId: string,
  amount: number,
  input: {
    obligationId?: string;
    penaltyId?: string;
    specialContributionObligationId?: string;
    joiningObligationId?: string;
    category?: 'WEEKLY' | 'PENALTY' | 'SPECIAL' | 'EMERGENCY' | 'HISTORICAL' | 'ALL';
    explicitAllocations?: ExplicitAllocationItem[];
  }
): Promise<{
  allocations: AllocationItem[];
  totalAllocated: number;
  unallocatedRemainder: number;
}> {
  const summary = await getMemberFinancialSummary(memberId);
  if (!summary) throw new Error('Member not found');

  const allocations: AllocationItem[] = [];
  let remainingToAllocate = amount;

  // 0. Explicit Multiple Allocations
  if (input.explicitAllocations && input.explicitAllocations.length > 0) {
    for (const explicit of input.explicitAllocations) {
      if (explicit.amount <= 0) continue;
      let allocType: AllocationItem['allocationType'] = explicit.category as any;
      let description = '';

      if (explicit.category === 'WEEKLY') {
        const obl = summary.weeklyObligations.find((o) => o.id === explicit.targetId);
        if (!obl) throw new Error(`Selected weekly obligation ${explicit.targetId} not found`);
        if (obl.status === 'PAID') throw new Error(`Weekly obligation Week ${obl.weekNumber} is already fully paid`);
        allocType = 'WEEKLY';
        description = `Weekly contribution Week ${obl.weekNumber}, ${obl.year} (${explicit.amount} ETB)`;
      } else if (['PENALTY', 'WEEKLY_PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'].includes(explicit.category)) {
        const pen = summary.penalties.find((p) => p.id === explicit.targetId);
        if (!pen) throw new Error(`Selected penalty ${explicit.targetId} not found`);
        if (pen.status === 'SETTLED') throw new Error(`Penalty ${pen.title || pen.reason} is already settled`);
        if (pen.status === 'WAIVED') throw new Error(`Penalty ${pen.title || pen.reason} has been waived`);
        allocType = pen.isMonthly ? 'MONTHLY_PENALTY' : pen.weekNumber ? 'WEEKLY_PENALTY' : 'OTHER_PENALTY';
        description = `Penalty payment: ${pen.title || pen.reason} (${explicit.amount} ETB)`;
      } else if (explicit.category === 'SPECIAL') {
        const spec = summary.specialObligations.find((s) => s.id === explicit.targetId);
        if (!spec) throw new Error(`Selected special obligation ${explicit.targetId} not found`);
        if (spec.status === 'PAID') throw new Error(`Special obligation is already fully paid`);
        allocType = 'SPECIAL';
        description = `Special contribution: ${spec.title} (${explicit.amount} ETB)`;
      } else if (explicit.category === 'EMERGENCY') {
        const emer = summary.emergencyObligations.find((e) => e.id === explicit.targetId);
        if (!emer) throw new Error(`Selected emergency obligation ${explicit.targetId} not found`);
        if (emer.status === 'PAID') throw new Error(`Emergency obligation is already fully paid`);
        allocType = 'EMERGENCY';
        description = `Emergency contribution: ${emer.title} (${explicit.amount} ETB)`;
      } else if (explicit.category === 'HISTORICAL') {
        const hist = summary.historicalObligation;
        if (!hist || hist.id !== explicit.targetId) throw new Error(`Selected historical obligation not found`);
        if (hist.status === 'PAID') throw new Error(`Historical obligation is already fully paid`);
        allocType = 'HISTORICAL';
        description = `Historical joining contribution (${explicit.amount} ETB)`;
      }

      allocations.push({
        allocationType: allocType,
        amount: explicit.amount,
        targetId: explicit.targetId,
        description,
      });
      remainingToAllocate -= explicit.amount;
    }

    return {
      allocations,
      totalAllocated: amount - remainingToAllocate,
      unallocatedRemainder: remainingToAllocate,
    };
  }

  // 1. Direct Target: Penalty
  if (input.penaltyId) {
    const penalty = summary.penalties.find((p) => p.id === input.penaltyId);
    if (!penalty) throw new Error('Selected penalty not found for this member');
    if (penalty.status === 'SETTLED') throw new Error('Selected penalty is already fully paid');
    if (penalty.status === 'WAIVED') throw new Error('Selected penalty has been waived');

    const allocAmount = Math.min(remainingToAllocate, penalty.remainingAmount);
    if (allocAmount > 0) {
      allocations.push({
        allocationType: penalty.isMonthly
          ? 'MONTHLY_PENALTY'
          : penalty.weekNumber
          ? 'WEEKLY_PENALTY'
          : 'OTHER_PENALTY',
        amount: allocAmount,
        targetId: penalty.id,
        description: `Penalty payment: ${penalty.reason} (${allocAmount} ETB)`,
      });
      remainingToAllocate -= allocAmount;
    }
    return {
      allocations,
      totalAllocated: amount - remainingToAllocate,
      unallocatedRemainder: remainingToAllocate,
    };
  }

  // 2. Direct Target: Weekly Obligation
  if (input.obligationId) {
    const obligation = summary.weeklyObligations.find((o) => o.id === input.obligationId);
    if (!obligation) throw new Error('Selected weekly obligation not found for this member');
    if (obligation.status === 'PAID') throw new Error('Selected weekly obligation is already fully paid');

    const allocAmount = Math.min(remainingToAllocate, obligation.remainingAmount);
    if (allocAmount > 0) {
      allocations.push({
        allocationType: 'WEEKLY',
        amount: allocAmount,
        targetId: obligation.id,
        description: `Weekly contribution Week ${obligation.weekNumber}, ${obligation.year} (${allocAmount} ETB)`,
      });
      remainingToAllocate -= allocAmount;
    }
    return {
      allocations,
      totalAllocated: amount - remainingToAllocate,
      unallocatedRemainder: remainingToAllocate,
    };
  }

  // 3. Direct Target: Special / Emergency Obligation
  if (input.specialContributionObligationId) {
    const special = summary.specialObligations.find((s) => s.id === input.specialContributionObligationId);
    const emergency = summary.emergencyObligations.find((e) => e.id === input.specialContributionObligationId);
    const target = special || emergency;
    if (!target) throw new Error('Selected special/emergency obligation not found for this member');
    if (target.status === 'PAID') throw new Error('Selected obligation is already fully paid');

    const isEmergency = !!emergency;
    const allocAmount = Math.min(remainingToAllocate, target.remainingAmount);
    if (allocAmount > 0) {
      allocations.push({
        allocationType: isEmergency ? 'EMERGENCY' : 'SPECIAL',
        amount: allocAmount,
        targetId: target.id,
        description: `${isEmergency ? 'Emergency' : 'Special'} contribution: ${target.title} (${allocAmount} ETB)`,
      });
      remainingToAllocate -= allocAmount;
    }
    return {
      allocations,
      totalAllocated: amount - remainingToAllocate,
      unallocatedRemainder: remainingToAllocate,
    };
  }

  // 4. Direct Target: Historical Joining Obligation
  if (input.joiningObligationId) {
    const historical = summary.historicalObligation;
    if (!historical || historical.id !== input.joiningObligationId) {
      throw new Error('Historical joining obligation not found for this member');
    }
    if (historical.status === 'PAID' || historical.status === 'WAIVED') {
      throw new Error('Historical joining obligation is already paid or waived');
    }

    const allocAmount = Math.min(remainingToAllocate, historical.remainingAmount);
    if (allocAmount > 0) {
      allocations.push({
        allocationType: 'HISTORICAL',
        amount: allocAmount,
        targetId: historical.id,
        description: `Historical back-contribution (${allocAmount} ETB)`,
      });
      remainingToAllocate -= allocAmount;
    }
    return {
      allocations,
      totalAllocated: amount - remainingToAllocate,
      unallocatedRemainder: remainingToAllocate,
    };
  }

  // 5. Category-Specific or Default Strict Priority Allocation (Section 8)
  // Priority:
  // 1. Oldest weekly contributions
  // 2. Related weekly penalties
  // 3. Monthly penalties
  // 4. Other penalties
  // 5. Historical contributions
  // 6. Special contributions
  // 7. Emergency contributions

  const cat = input.category || 'ALL';

  // Step 5.1: Weekly Contributions
  if ((cat === 'ALL' || cat === 'WEEKLY') && remainingToAllocate > 0) {
    for (const o of summary.weeklyObligations) {
      if (remainingToAllocate <= 0) break;
      if (o.status === 'PAID' || o.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, o.remainingAmount);
      allocations.push({
        allocationType: 'WEEKLY',
        amount: alloc,
        targetId: o.id,
        description: `Weekly contribution Week ${o.weekNumber}, ${o.year}`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.2: Weekly Penalties
  if ((cat === 'ALL' || cat === 'PENALTY') && remainingToAllocate > 0) {
    const weeklyPenalties = summary.penalties.filter((p) => !p.isMonthly && p.weekNumber !== null && p.status !== 'SETTLED' && p.status !== 'WAIVED');
    for (const p of weeklyPenalties) {
      if (remainingToAllocate <= 0) break;
      if (p.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, p.remainingAmount);
      allocations.push({
        allocationType: 'PENALTY',
        amount: alloc,
        targetId: p.id,
        description: `Weekly penalty Week ${p.weekNumber}, ${p.year}`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.3: Monthly Penalties
  if ((cat === 'ALL' || cat === 'PENALTY') && remainingToAllocate > 0) {
    const monthlyPenalties = summary.penalties.filter((p) => p.isMonthly && p.status !== 'SETTLED' && p.status !== 'WAIVED');
    for (const p of monthlyPenalties) {
      if (remainingToAllocate <= 0) break;
      if (p.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, p.remainingAmount);
      allocations.push({
        allocationType: 'MONTHLY_PENALTY',
        amount: alloc,
        targetId: p.id,
        description: `Monthly penalty (${p.reason})`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.4: Other Penalties
  if ((cat === 'ALL' || cat === 'PENALTY') && remainingToAllocate > 0) {
    const otherPenalties = summary.penalties.filter((p) => p.weekNumber === null && p.status !== 'SETTLED' && p.status !== 'WAIVED');
    for (const p of otherPenalties) {
      if (remainingToAllocate <= 0) break;
      if (p.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, p.remainingAmount);
      allocations.push({
        allocationType: 'OTHER_PENALTY',
        amount: alloc,
        targetId: p.id,
        description: `Penalty: ${p.title || p.reason}`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.5: Historical Joining Contributions
  if ((cat === 'ALL' || cat === 'HISTORICAL') && remainingToAllocate > 0) {
    if (summary.historicalObligation && summary.historicalObligation.status !== 'PAID' && summary.historicalObligation.status !== 'WAIVED' && summary.historicalObligation.remainingAmount > 0) {
      const alloc = Math.min(remainingToAllocate, summary.historicalObligation.remainingAmount);
      allocations.push({
        allocationType: 'HISTORICAL',
        amount: alloc,
        targetId: summary.historicalObligation.id,
        description: `Historical back-contribution`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.6: Special Contributions (Non-emergency)
  if ((cat === 'ALL' || cat === 'SPECIAL') && remainingToAllocate > 0) {
    for (const s of summary.specialObligations) {
      if (remainingToAllocate <= 0) break;
      if (s.status === 'PAID' || s.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, s.remainingAmount);
      allocations.push({
        allocationType: 'SPECIAL',
        amount: alloc,
        targetId: s.id,
        description: `Special contribution: ${s.title}`,
      });
      remainingToAllocate -= alloc;
    }
  }

  // Step 5.7: Emergency Contributions
  if ((cat === 'ALL' || cat === 'EMERGENCY') && remainingToAllocate > 0) {
    for (const e of summary.emergencyObligations) {
      if (remainingToAllocate <= 0) break;
      if (e.status === 'PAID' || e.remainingAmount <= 0) continue;
      const alloc = Math.min(remainingToAllocate, e.remainingAmount);
      allocations.push({
        allocationType: 'EMERGENCY',
        amount: alloc,
        targetId: e.id,
        description: `Emergency contribution: ${e.title}`,
      });
      remainingToAllocate -= alloc;
    }
  }

  return {
    allocations,
    totalAllocated: amount - remainingToAllocate,
    unallocatedRemainder: remainingToAllocate,
  };
}

/**
 * Executes a payment, records allocations, updates obligations/penalties,
 * posts to ledger, and generates receipt in a single ACID database transaction.
 */
export async function executeUnifiedPayment(input: ExecutePaymentInput) {
  const isUnique = await validateTransactionReferenceUnique(input.transactionReference);
  if (!isUnique) {
    throw new Error(`Duplicate transaction reference: ${input.transactionReference}`);
  }

  const { allocations, totalAllocated } = await calculateAllocationBreakdown(
    input.memberId,
    input.amount,
    {
      obligationId: input.obligationId,
      penaltyId: input.penaltyId,
      specialContributionObligationId: input.specialContributionObligationId,
      joiningObligationId: input.joiningObligationId,
      category: input.category,
      explicitAllocations: input.explicitAllocations,
    }
  );

  if (allocations.length === 0 && !input.isVerified) {
    // If pending payment request, it can be created without immediate allocation
  } else if (allocations.length === 0) {
    throw new Error('No payable obligations found matching the payment criteria');
  }

  const isVerified = input.isVerified !== false;
  const paymentId = generatePaymentId();
  const receiptNumber = isVerified ? generateReceiptNumber() : null;

  let normalizedMethod: PaymentMethod = PaymentMethod.CASH;
  const rawMethod = String(input.paymentMethod || '').toUpperCase();
  if (rawMethod === 'BANK_TRANSFER' || rawMethod === 'CBE') {
    normalizedMethod = PaymentMethod.BANK_TRANSFER;
  } else if (rawMethod === 'MOBILE_MONEY' || rawMethod === 'TELEBIRR' || rawMethod === 'EBIRR' || rawMethod === 'M_PESA') {
    normalizedMethod = PaymentMethod.MOBILE_MONEY;
  } else if (rawMethod === 'CASH') {
    normalizedMethod = PaymentMethod.CASH;
  }

  return prisma.$transaction(async (tx) => {
    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        paymentId,
        memberId: input.memberId,
        amount: input.amount,
        paymentDate: new Date(),
        paymentMethod: normalizedMethod,
        transactionReference: input.transactionReference,
        status: isVerified ? PaymentStatus.VERIFIED : PaymentStatus.PENDING,
        recordedById: input.recordedById,
        verifiedById: isVerified ? input.recordedById : null,
        verifiedAt: isVerified ? new Date() : null,
        receiptNumber,
        notes: input.notes,
        obligationId: input.obligationId,
        penaltyId: input.penaltyId,
        specialContributionObligationId: input.specialContributionObligationId,
        joiningObligationId: input.joiningObligationId,
        appliedAt: isVerified ? new Date() : null,
      },
    });

    if (!isVerified) {
      // Pending transaction: do NOT reduce balances, do NOT change obligations, do NOT write to ledger
      return { payment, allocations: [], receipt: null };
    }

    // 2. Apply allocations to exact obligations and penalties
    const createdAllocations = [];
    for (const alloc of allocations) {
      const allocationRecord = await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          allocationType: alloc.allocationType,
          amount: alloc.amount,
          weeklyObligationId: alloc.allocationType === 'WEEKLY' ? alloc.targetId : null,
          penaltyId: ['PENALTY', 'WEEKLY_PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'].includes(alloc.allocationType)
            ? alloc.targetId
            : null,
          specialContributionObligationId: ['SPECIAL', 'EMERGENCY'].includes(alloc.allocationType)
            ? alloc.targetId
            : null,
          joiningObligationId: alloc.allocationType === 'HISTORICAL' ? alloc.targetId : null,
        },
      });
      createdAllocations.push(allocationRecord);

      // 2a. Update Weekly Obligation
      if (alloc.allocationType === 'WEEKLY') {
        const obl = await tx.weeklyObligation.findUnique({ where: { id: alloc.targetId } });
        if (obl) {
          const newPaid = Number(obl.amountPaid) + alloc.amount;
          const status = newPaid >= Number(obl.contributionAmount) ? 'PAID' : 'PARTIAL';
          await tx.weeklyObligation.update({
            where: { id: obl.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }

      // 2b. Update Penalty
      if (['PENALTY', 'WEEKLY_PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'].includes(alloc.allocationType)) {
        const pen = await tx.penalty.findUnique({ where: { id: alloc.targetId } });
        if (pen) {
          const newPaid = Number(pen.amountPaid || 0) + alloc.amount;
          const isFullySettled = newPaid >= Number(pen.amount);
          await tx.penalty.update({
            where: { id: pen.id },
            data: {
              amountPaid: newPaid,
              status: isFullySettled ? 'SETTLED' : 'PARTIAL',
              paidAt: isFullySettled ? new Date() : null,
            },
          });
        }
      }

      // 2c. Update Special / Emergency Contribution
      if (['SPECIAL', 'EMERGENCY'].includes(alloc.allocationType)) {
        const spec = await tx.specialContributionObligation.findUnique({ where: { id: alloc.targetId } });
        if (spec) {
          const newPaid = Number(spec.amountPaid) + alloc.amount;
          const status = newPaid >= Number(spec.amount) ? 'PAID' : 'PARTIAL';
          await tx.specialContributionObligation.update({
            where: { id: spec.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }

      // 2d. Update Joining Obligation
      if (alloc.allocationType === 'HISTORICAL') {
        const join = await tx.joiningObligation.findUnique({ where: { id: alloc.targetId } });
        if (join) {
          const newPaid = Number(join.amountPaid) + alloc.amount;
          const status = newPaid >= Number(join.totalBackContributionAmount) ? 'PAID' : 'PARTIAL';
          await tx.joiningObligation.update({
            where: { id: join.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }
    }

    // 3. Post to Financial Ledger (Transaction)
    const txType = input.penaltyId || (allocations.length > 0 && ['PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'].includes(allocations[0].allocationType))
      ? TransactionType.PENALTY
      : input.specialContributionObligationId || (allocations.length > 0 && ['SPECIAL', 'EMERGENCY'].includes(allocations[0].allocationType))
      ? TransactionType.SPECIAL_CONTRIBUTION
      : TransactionType.WEEKLY_CONTRIBUTION;

    await tx.transaction.create({
      data: {
        transactionId: `TX-${payment.paymentId}`,
        memberId: input.memberId,
        type: txType,
        amount: input.amount,
        description: `Verified Payment ${payment.paymentId}: ${allocations.map((a) => a.description).join('; ') || 'General payment'}`,
        recordedById: input.recordedById,
      },
    });

    // 4. Generate Official Receipt
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber: receiptNumber!,
        paymentId: payment.id,
        memberId: input.memberId,
        amount: input.amount,
        issuedAt: new Date(),
        paymentMethod: normalizedMethod,
        reference: input.transactionReference,
        breakdown: allocations.map((a) => ({
          type: a.allocationType,
          amount: a.amount,
          description: a.description,
        })),
      },
    });

    return { payment, allocations: createdAllocations, receipt };
  });
}

/**
 * Reverses or refunds a verified payment, restoring obligation and penalty balances.
 */
export async function reverseVerifiedPayment(
  paymentId: string,
  authorizedById: string,
  reason: string
) {
  if (!reason || !reason.trim()) {
    throw new Error('Reversal reason is required');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      allocations: true,
      member: true,
    },
  });

  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'VERIFIED') throw new Error(`Cannot reverse payment with status: ${payment.status}`);

  return prisma.$transaction(async (tx) => {
    // 1. Revert each allocation
    for (const alloc of payment.allocations) {
      if (alloc.weeklyObligationId) {
        const obl = await tx.weeklyObligation.findUnique({ where: { id: alloc.weeklyObligationId } });
        if (obl) {
          const newPaid = Math.max(0, Number(obl.amountPaid) - Number(alloc.amount));
          const status = newPaid <= 0 ? 'PENDING' : newPaid >= Number(obl.contributionAmount) ? 'PAID' : 'PARTIAL';
          await tx.weeklyObligation.update({
            where: { id: obl.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }

      if (alloc.penaltyId) {
        const pen = await tx.penalty.findUnique({ where: { id: alloc.penaltyId } });
        if (pen) {
          const newPaid = Math.max(0, Number(pen.amountPaid || 0) - Number(alloc.amount));
          const status = newPaid <= 0 ? 'OUTSTANDING' : newPaid >= Number(pen.amount) ? 'SETTLED' : 'PARTIAL';
          await tx.penalty.update({
            where: { id: pen.id },
            data: {
              amountPaid: newPaid,
              status,
              paidAt: status === 'SETTLED' ? pen.paidAt : null,
            },
          });
        }
      }

      if (alloc.specialContributionObligationId) {
        const spec = await tx.specialContributionObligation.findUnique({ where: { id: alloc.specialContributionObligationId } });
        if (spec) {
          const newPaid = Math.max(0, Number(spec.amountPaid) - Number(alloc.amount));
          const status = newPaid <= 0 ? 'PENDING' : newPaid >= Number(spec.amount) ? 'PAID' : 'PARTIAL';
          await tx.specialContributionObligation.update({
            where: { id: spec.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }

      if (alloc.joiningObligationId) {
        const join = await tx.joiningObligation.findUnique({ where: { id: alloc.joiningObligationId } });
        if (join) {
          const newPaid = Math.max(0, Number(join.amountPaid) - Number(alloc.amount));
          const status = newPaid <= 0 ? 'PENDING' : newPaid >= Number(join.totalBackContributionAmount) ? 'PAID' : 'PARTIAL';
          await tx.joiningObligation.update({
            where: { id: join.id },
            data: { amountPaid: newPaid, status },
          });
        }
      }
    }

    // 2. Mark payment as REJECTED / Refunded
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        notes: `${payment.notes || ''} [REVERSED: ${reason}]`,
      },
    });

    // 3. Post Reversal entry in Ledger
    await tx.transaction.create({
      data: {
        transactionId: `REV-${Date.now()}-${payment.paymentId}`,
        memberId: payment.memberId,
        type: TransactionType.REFUND,
        amount: Number(payment.amount),
        description: `Reversal of Payment ${payment.paymentId}: ${reason}`,
        recordedById: authorizedById,
      },
    });

    // 4. Record Audit log
    await tx.auditLog.create({
      data: {
        userId: authorizedById,
        action: 'PAYMENT_REVERSED',
        module: 'finance',
        details: {
          paymentId: payment.id,
          memberId: payment.memberId,
          amount: payment.amount,
          reason,
        },
      },
    });

    // 5. Record TransactionReversal entry
    await tx.transactionReversal.create({
      data: {
        reversalId: `REV-${Date.now()}`,
        originalTxId: payment.paymentId,
        reason,
        amount: payment.amount,
        authorizedById,
      },
    });

    return { reversed: true, paymentId };
  });
}
