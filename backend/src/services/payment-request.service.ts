import prisma from '../config/database.js';
import { v4 as uuid } from 'uuid';

export interface PaymentRequestData {
  memberId: string;
  amount: number;
  paymentProvider: 'M_PESA' | 'TELEBIRR' | 'CBE' | 'EBIRR';
  obligationId?: string;
  specialContributionObligationId?: string;
}

/**
 * Create a payment request for a member
 */
export async function createPaymentRequest(data: PaymentRequestData) {
  // Get payment account details from system settings
  const accountSetting = await prisma.systemSetting.findFirst({
    where: { key: `payment_account_${data.paymentProvider.toLowerCase()}` }
  });

  if (!accountSetting) {
    throw new Error(`Payment account not configured for ${data.paymentProvider}`);
  }

  const accountDetails = JSON.parse(accountSetting.value);
  const referenceNumber = `${data.paymentProvider.substring(0, 3)}-${Date.now()}-${uuid().substring(0, 8)}`.toUpperCase();
  
  // Payment requests expire after 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      referenceNumber,
      memberId: data.memberId,
      obligationId: data.obligationId,
      specialContributionObligationId: data.specialContributionObligationId,
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
    // Mark as expired
    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });
    throw new Error('Payment request has expired');
  }

  // Update payment request
  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      transactionReference,
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
 * Verify a payment request (create actual payment record)
 */
export async function verifyPaymentRequest(
  id: string,
  verifiedById: string,
  verificationMethod: 'AUTOMATIC' | 'MANUAL',
  verificationNotes?: string
) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id },
    include: { obligation: true, specialContributionObligation: true, member: true }
  });

  if (!paymentRequest) {
    throw new Error('Payment request not found');
  }

  // Create payment record
  const paymentId = `PAY-${Date.now()}-${uuid().substring(0, 6)}`.toUpperCase();
  const payment = await prisma.payment.create({
    data: {
      paymentId,
      memberId: paymentRequest.memberId,
      obligationId: paymentRequest.obligationId,
      specialContributionObligationId: paymentRequest.specialContributionObligationId,
      amount: paymentRequest.amount,
      paymentDate: new Date(),
      paymentMethod: 'MOBILE_MONEY',
      transactionReference: paymentRequest.transactionReference,
      status: 'VERIFIED',
      recordedById: verifiedById,
      verifiedById,
      verifiedAt: new Date(),
      notes: `Verified via ${paymentRequest.paymentProvider} - ${verificationNotes || ''}`
    }
  });

  // Update payment request
  await prisma.paymentRequest.update({
    where: { id },
    data: {
      status: 'VERIFIED',
      verificationMethod,
      verificationNotes,
      verifiedById
    }
  });

  return { paymentRequest: paymentRequest, payment };
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
      obligation: { select: { weekNumber: true, year: true } }
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
