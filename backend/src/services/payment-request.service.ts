import prisma from '../config/database.js';
import { v4 as uuid } from 'uuid';
import { executeUnifiedPayment, validateTransactionReferenceUnique } from './payment-allocation.service.js';

export interface PaymentRequestData {
  memberId: string;
  amount: number;
  paymentProvider: 'M_PESA' | 'TELEBIRR' | 'CBE' | 'EBIRR' | 'BANK_TRANSFER';
  obligationId?: string;
  penaltyId?: string;
  specialContributionObligationId?: string;
  category?: 'WEEKLY' | 'PENALTY' | 'SPECIAL' | 'EMERGENCY' | 'HISTORICAL' | 'ALL';
}

/**
 * Create a payment request for a member
 */
export async function createPaymentRequest(data: PaymentRequestData) {
  // Get payment account details from system settings
  const settingKey = `payment_account_${data.paymentProvider.toLowerCase()}`;
  let accountSetting = await prisma.systemSetting.findFirst({
    where: { key: settingKey }
  });

  let accountDetails: any;
  if (accountSetting) {
    try {
      accountDetails = JSON.parse(accountSetting.value);
    } catch {
      accountDetails = { value: accountSetting.value };
    }
  } else {
    // Default fallback account details
    accountDetails = {
      provider: data.paymentProvider,
      accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
      accountNumber: data.paymentProvider === 'TELEBIRR' || data.paymentProvider === 'EBIRR' ? '+251900000000' : '1000234567890',
      branch: 'Melka Jabdu'
    };
  }
  const referenceNumber = `${data.paymentProvider.substring(0, 3)}-${Date.now()}-${uuid().substring(0, 8)}`.toUpperCase();
  
  // Payment requests expire after 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      referenceNumber,
      memberId: data.memberId,
      obligationId: data.obligationId,
      penaltyId: data.penaltyId,
      specialContributionObligationId: data.specialContributionObligationId,
      category: data.category,
      amount: data.amount,
      paymentProvider: data.paymentProvider,
      accountDetails,
      status: 'PENDING',
      expiresAt
    },
    include: {
      member: { select: { fullName: true, memberId: true } }
    }
  });

  return paymentRequest;
}

/**
 * Get payment request by ID
 */
export async function getPaymentRequest(id: string) {
  return prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      member: { select: { fullName: true, memberId: true } },
      penalty: { select: { reason: true, amount: true, isMonthly: true, weekNumber: true } },
      obligation: { select: { weekNumber: true, year: true, contributionAmount: true } },
      specialContributionObligation: {
        include: {
          specialContribution: { select: { title: true, type: true } }
        }
      },
      verifiedBy: { select: { username: true } }
    }
  });
}

/**
 * Get member's payment requests
 */
export async function getMemberPaymentRequests(memberId: string) {
  return prisma.paymentRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    include: {
      obligation: { select: { weekNumber: true, year: true } },
      penalty: { select: { reason: true, amount: true, isMonthly: true, weekNumber: true } },
      specialContributionObligation: { select: { specialContribution: { select: { title: true } } } }
    }
  });
}

/**
 * Submit transaction reference for a payment request
 */
export async function submitTransactionReference(
  id: string,
  transactionReference: string,
  receiptScreenshot?: string
) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id }
  });

  if (!paymentRequest) {
    throw new Error('Payment request not found');
  }

  if (paymentRequest.status !== 'PENDING') {
    throw new Error(`Cannot submit reference for request with status: ${paymentRequest.status}`);
  }

  if (new Date() > paymentRequest.expiresAt) {
    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });
    throw new Error('Payment request has expired');
  }

  // Duplicate check
  const isUnique = await validateTransactionReferenceUnique(transactionReference);
  if (!isUnique) {
    throw new Error(`Transaction reference '${transactionReference}' has already been submitted or verified.`);
  }

  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      transactionReference: transactionReference.trim(),
      receiptScreenshot,
      status: 'SUBMITTED'
    },
    include: {
      member: { select: { fullName: true, memberId: true } }
    }
  });

  return updated;
}

/**
 * Verify a payment request:
 * Executes unified payment allocation, settles or updates the exact obligation/penalty,
 * writes to financial ledger, and creates receipt.
 */
export async function verifyPaymentRequest(
  id: string,
  verifiedById: string,
  verificationMethod: 'AUTOMATIC' | 'MANUAL',
  verificationNotes?: string
) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id },
    include: { obligation: true, specialContributionObligation: true, penalty: true, member: true }
  });

  if (!paymentRequest) {
    throw new Error('Payment request not found');
  }

  if (paymentRequest.status === 'VERIFIED') {
    throw new Error('Payment request is already verified');
  }

  // Convert provider to payment method
  const paymentMethod = paymentRequest.paymentProvider === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'MOBILE_MONEY';

  // Execute unified payment
  const result = await executeUnifiedPayment({
    memberId: paymentRequest.memberId,
    amount: Number(paymentRequest.amount),
    paymentMethod,
    transactionReference: paymentRequest.transactionReference || paymentRequest.referenceNumber,
    notes: `Verified via ${paymentRequest.paymentProvider} (${verificationMethod}) - ${verificationNotes || ''}`,
    recordedById: verifiedById,
    obligationId: paymentRequest.obligationId || undefined,
    penaltyId: paymentRequest.penaltyId || undefined,
    specialContributionObligationId: paymentRequest.specialContributionObligationId || undefined,
    category: (paymentRequest.category as any) || undefined,
    isVerified: true,
  });

  // Update payment request status
  const updatedRequest = await prisma.paymentRequest.update({
    where: { id },
    data: {
      status: 'VERIFIED',
      verificationMethod,
      verificationNotes,
      verifiedById
    }
  });

  return { paymentRequest: updatedRequest, payment: result.payment, receipt: result.receipt };
}

/**
 * Reject a payment request
 */
export async function rejectPaymentRequest(
  id: string,
  rejectedById: string,
  reason: string
) {
  return prisma.paymentRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      verificationNotes: reason,
      verifiedById: rejectedById
    }
  });
}

/**
 * Get all pending payment requests (for admin)
 */
export async function getPendingPaymentRequests(limit = 50) {
  return prisma.paymentRequest.findMany({
    where: {
      status: 'SUBMITTED'
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      member: { select: { fullName: true, memberId: true } },
      obligation: { select: { weekNumber: true, year: true } },
      penalty: { select: { reason: true, amount: true, isMonthly: true, weekNumber: true } }
    }
  });
}

/**
 * Expire old payment requests
 */
export async function expireOldPaymentRequests() {
  const now = new Date();
  const result = await prisma.paymentRequest.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now }
    },
    data: { status: 'EXPIRED' }
  });

  return result.count;
}
