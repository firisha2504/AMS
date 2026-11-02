import { Router, Response } from 'express';
import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import { getMemberById, getLanguage, getStringParam } from '../middleware/commonOperations.js';
import {
  generatePaymentId,
  generateReceiptNumber,
} from '../services/helpers.js';
import {
  applyPaymentToObligation,
  reversePaymentFromObligation,
  recordLedgerEntry,
  validatePaymentObligation,
  applyPaymentToObligationIdempotent,
  recalculateOutstandingBalance,
  validatePaymentFullyApplied,
  autoReconcileJoiningObligationPayment,
} from '../services/contribution.service.js';
import { applySpecialContributionPayment } from '../services/special-contribution.service.js';
import { recordPaymentSchema, paginationSchema } from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { sendPushNotification } from '../services/notification.service.js';

const router = Router();

// PHASE 1 FIX #10: Prevent orphan payments
router.post('/', authenticate, authorize('ADMIN', 'AUDITOR'), validateBody(recordPaymentSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { memberId, amount, paymentMethod, transactionReference, notes } = req.body;
  let { obligationId, specialContributionObligationId } = req.body;
  const recordedById = req.user!.userId;

  const { member, error } = await getMemberById(memberId, lang);
  if (error) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  // Auto-link to the oldest unpaid/overdue weekly obligation if no obligationId provided
  if (!obligationId && !specialContributionObligationId) {
    const unpaidObligation = await prisma.weeklyObligation.findFirst({
      where: {
        memberId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
      },
      orderBy: { dueDate: 'asc' }, // oldest first
    });
    if (unpaidObligation) {
      obligationId = unpaidObligation.id;
    } else {
      // PHASE 3 FIX #6: Try to auto-link to oldest unpaid special contribution if no weekly obligations
      const unpaidSpecial = await prisma.specialContributionObligation.findFirst({
        where: {
          memberId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
        },
        orderBy: { createdAt: 'asc' }, // oldest first
      });
      if (unpaidSpecial) {
        specialContributionObligationId = unpaidSpecial.id;
      } else {
        // PHASE 1 FIX #10: No unpaid obligation found - reject instead of creating orphan
        sendError(res, 'payment.noUnpaidObligation', lang, 400);
        return;
      }
    }
  }

  // PHASE 1 FIX #10: Validate obligation exists
  const validation = await validatePaymentObligation(obligationId, specialContributionObligationId);
  if (!validation.valid) {
    sendError(res, 'payment.invalidObligation', lang, 400);
    return;
  }

  const transactionType = specialContributionObligationId
    ? TransactionType.SPECIAL_CONTRIBUTION
    : TransactionType.WEEKLY_CONTRIBUTION;

  const payment = await prisma.payment.create({
    data: {
      paymentId: generatePaymentId(),
      memberId,
      obligationId: obligationId || undefined,
      specialContributionObligationId,
      amount,
      paymentMethod,
      transactionReference,
      notes,
      recordedById,
      receiptNumber: generateReceiptNumber(),
      status: PaymentStatus.PENDING,
    },
    include: {
      member: { select: { fullName: true, memberId: true } },
      recordedBy: { select: { username: true } },
    },
  });

  await recordLedgerEntry(
    memberId,
    transactionType,
    amount,
    `Payment ${payment.paymentId}`,
    recordedById
  );

  if (obligationId) {
    await applyPaymentToObligation(obligationId, amount);
  }

  if (specialContributionObligationId) {
    await applySpecialContributionPayment(specialContributionObligationId, amount);
  }

  await createAuditEntry(recordedById, 'PAYMENT_RECORDED', 'payments', { paymentId: payment.paymentId }, req.ip);

  sendSuccess(res, payment, 'payment.recorded', lang, 201);
});

// PHASE 1 FIX #11: Prevent double-verify
router.patch('/:id/verify', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  const existing = await prisma.payment.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!existing) {
    sendError(res, 'payment.notFound', lang, 404);
    return;
  }

  // PHASE 1 FIX #11: Check if already verified
  if (existing.status === PaymentStatus.VERIFIED) {
    sendError(res, 'payment.alreadyVerified', lang, 409);
    return;
  }

  // PHASE 3 FIX #17: Validate payment has been fully applied before verification
  const applicableValidation = await validatePaymentFullyApplied(String(req.params.id));
  if (!applicableValidation.valid) {
    sendError(res, 'payment.notFullyApplied', lang, 400);
    return;
  }

  const payment = await prisma.payment.update({
    where: { id: String(req.params.id) },
    data: {
      status: PaymentStatus.VERIFIED,
      verifiedById: req.user!.userId,
      verifiedAt: new Date(),
    },
    include: {
      member: { select: { fullName: true, memberId: true, userId: true } },
      verifiedBy: { select: { username: true } },
    },
  });

  // PHASE 3 FIX #14: Auto-reconcile payment toward joining obligation if applicable
  try {
    const reconcilationResult = await autoReconcileJoiningObligationPayment(
      payment.memberId,
      Number(payment.amount),
      payment.paymentDate
    );
    if (reconcilationResult.reconciled) {
      console.log(`[Joining Obligation Reconciliation] ${reconcilationResult.reason} for payment ${payment.paymentId}`);
    }
  } catch (error) {
    console.warn('[Joining Obligation Reconciliation Error]', error);
    // Continue - reconciliation is optional
  }

  // Obligation is already updated when the payment was recorded — do not apply again on verify.

  await prisma.notification.create({
    data: {
      userId: payment.member.userId,
      memberId: payment.memberId,
      type: 'PAYMENT_CONFIRMATION',
      title: 'Payment Confirmed',
      titleOm: 'Kaffaltiin Mirkanaa\'e',
      message: `Your payment of ${payment.amount} Birr has been verified.`,
      messageOm: `Kaffaltiin keessan Birr ${payment.amount} mirkanaa\'eera.`,
      metadata: { paymentId: payment.paymentId, receiptNumber: payment.receiptNumber },
    },
  });

  await sendPushNotification(
    payment.member.userId,
    lang === 'om' ? 'Kaffaltiin Mirkanaa\'e' : 'Payment Confirmed',
    lang === 'om'
      ? `Kaffaltiin keessan Birr ${payment.amount} mirkanaa\'eera.`
      : `Your payment of ${payment.amount} Birr has been verified.`
  );

  await createAuditEntry(req.user!.userId, 'PAYMENT_VERIFIED', 'payments', { paymentId: payment.paymentId }, req.ip);

  sendSuccess(res, payment, 'payment.verified', lang);
});

// Edit a payment — ADMIN only
// If PENDING: just update fields
// If VERIFIED: rollback old amount from obligation, apply new amount, add correction ledger entry
router.patch('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { amount, paymentMethod, transactionReference, notes, paymentDate, reason } = req.body;

  const existing = await prisma.payment.findUnique({
    where: { id: String(req.params.id) },
    include: { member: { select: { fullName: true, memberId: true } } },
  });
  if (!existing) { sendError(res, 'payment.notFound', lang, 404); return; }

  const oldAmount = Number(existing.amount);
  const newAmount = amount !== undefined ? Number(amount) : oldAmount;

  // If verified and amount is changing, reverse old and apply new to obligation
  if (existing.status === PaymentStatus.VERIFIED && existing.obligationId && newAmount !== oldAmount) {
    // Reverse old amount
    await reversePaymentFromObligation(existing.obligationId, oldAmount);
    // Apply new amount
    await applyPaymentToObligation(existing.obligationId, newAmount);

    // Add a correction ledger entry
    await recordLedgerEntry(
      existing.memberId,
      TransactionType.ADJUSTMENT,
      newAmount - oldAmount,
      `Payment correction for ${existing.paymentId}: ${reason || 'Admin correction'}`,
      req.user!.userId
    );
  }

  const payment = await prisma.payment.update({
    where: { id: String(req.params.id) },
    data: {
      ...(amount !== undefined && { amount: newAmount }),
      ...(paymentMethod && { paymentMethod }),
      ...(transactionReference !== undefined && { transactionReference }),
      ...(notes !== undefined && { notes }),
      ...(paymentDate && { paymentDate: new Date(paymentDate) }),
    },
    include: { member: { select: { fullName: true, memberId: true } } },
  });

  await createAuditEntry(
    req.user!.userId,
    existing.status === PaymentStatus.VERIFIED ? 'VERIFIED_PAYMENT_EDITED' : 'PAYMENT_UPDATED',
    'payments',
    { paymentId: payment.paymentId, oldAmount, newAmount, reason: reason || 'Admin correction' },
    req.ip
  );
  sendSuccess(res, payment, 'general.success', lang);
});

// Rollback (unverify) a verified payment — ADMIN only
// Reverses all effects: obligation status, balance, penalties, then sets back to PENDING
router.patch('/:id/rollback', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { reason } = req.body;

  const existing = await prisma.payment.findUnique({
    where: { id: String(req.params.id) },
    include: { member: { select: { fullName: true, memberId: true, userId: true } } },
  });
  if (!existing) { sendError(res, 'payment.notFound', lang, 404); return; }
  if (existing.status !== PaymentStatus.VERIFIED) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  // 1. Reverse the obligation
  if (existing.obligationId) {
    await reversePaymentFromObligation(existing.obligationId, Number(existing.amount));
  }

  // 2. Reverse special contribution obligation if linked
  if (existing.specialContributionObligationId) {
    const scObl = await prisma.specialContributionObligation.findUnique({
      where: { id: existing.specialContributionObligationId },
    });
    if (scObl) {
      const newPaid = Math.max(0, Number(scObl.amountPaid) - Number(existing.amount));
      let newStatus = 'PENDING';
      if (newPaid >= Number(scObl.amount)) newStatus = 'PAID';
      else if (newPaid > 0) newStatus = 'PARTIAL';
      await prisma.specialContributionObligation.update({
        where: { id: existing.specialContributionObligationId },
        data: { amountPaid: newPaid, status: newStatus as 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' },
      });
    }
  }

  // 3. Set payment back to PENDING and clear verification fields
  const payment = await prisma.payment.update({
    where: { id: String(req.params.id) },
    data: {
      status: PaymentStatus.PENDING,
      verifiedById: null,
      verifiedAt: null,
    },
    include: { member: { select: { fullName: true, memberId: true } } },
  });

  // 4. Add reversal ledger entry
  await recordLedgerEntry(
    existing.memberId,
    TransactionType.ADJUSTMENT,
    -Number(existing.amount),
    `Payment rollback for ${existing.paymentId}: ${reason || 'Admin rollback'}`,
    req.user!.userId
  );

  // 5. Audit log
  await createAuditEntry(
    req.user!.userId,
    'PAYMENT_ROLLED_BACK',
    'payments',
    { paymentId: existing.paymentId, amount: existing.amount, reason: reason || 'Admin rollback' },
    req.ip
  );

  sendSuccess(res, payment, 'general.success', lang);
});

// Delete a pending payment (ADMIN only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  const existing = await prisma.payment.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) { sendError(res, 'payment.notFound', lang, 404); return; }
  if (existing.status === PaymentStatus.VERIFIED) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  await prisma.payment.delete({ where: { id: String(req.params.id) } });
  await createAuditEntry(req.user!.userId, 'PAYMENT_DELETED', 'payments', { paymentId: existing.paymentId }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

// Bulk record payments for multiple members at once
router.post('/bulk', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { payments: bulkPayments } = req.body as {
    payments: Array<{
      memberId: string;
      amount: number;
      paymentMethod: string;
      transactionReference?: string;
      notes?: string;
    }>;
  };

  if (!Array.isArray(bulkPayments) || bulkPayments.length === 0) {
    sendError(res, 'general.validationError', lang, 400);
    return;
  }

  const recordedById = req.user!.userId;
  const results = [];

  for (const p of bulkPayments) {
    const member = await prisma.member.findUnique({ where: { id: p.memberId } });
    if (!member) continue;

    // Auto-link to oldest unpaid obligation
    const unpaidObligation = await prisma.weeklyObligation.findFirst({
      where: { memberId: p.memberId, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
      orderBy: { dueDate: 'asc' },
    });

    const payment = await prisma.payment.create({
      data: {
        paymentId: generatePaymentId(),
        memberId: p.memberId,
        obligationId: unpaidObligation?.id ?? undefined,
        amount: p.amount,
        paymentMethod: p.paymentMethod as PaymentMethod,
        transactionReference: p.transactionReference,
        notes: p.notes,
        recordedById,
        receiptNumber: generateReceiptNumber(),
        status: PaymentStatus.PENDING,
      },
      include: { member: { select: { fullName: true, memberId: true } } },
    });

    await recordLedgerEntry(
      p.memberId,
      TransactionType.WEEKLY_CONTRIBUTION,
      p.amount,
      `Bulk Payment ${payment.paymentId}`,
      recordedById
    );

    if (unpaidObligation) {
      await applyPaymentToObligation(unpaidObligation.id, p.amount);
    }

    results.push(payment);
  }

  await createAuditEntry(recordedById, 'BULK_PAYMENT_RECORDED', 'payments', { count: results.length }, req.ip);
  sendSuccess(res, results, 'payment.recorded', lang, 201);
});

router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { page, limit, search, status } = req.validatedQuery as { page: number; limit: number; search?: string; status?: string };

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      member: { select: { fullName: true, memberId: true } },
      recordedBy: { select: { username: true } },
      verifiedBy: { select: { username: true } },
      obligation: {
        select: {
          weekNumber: true,
          year: true,
          dueDate: true,
        },
      },
      specialContributionObligation: {
        select: {
          specialContribution: {
            select: {
              title: true,
              titleOm: true,
              type: true,
            },
          },
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { paymentDate: 'desc' },
  });

  const total = await prisma.payment.count({ where });

  sendSuccess(res, payments, 'general.success', lang, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

router.get('/my', authenticate, authorize('MEMBER'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const userId = req.user!.userId;
  const { page, limit } = req.validatedQuery as { page: number; limit: number };

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { memberId: member.id },
      orderBy: { paymentDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where: { memberId: member.id } }),
  ]);

  sendSuccess(res, payments, 'general.success', lang, 200, { page, limit, total });
});

router.get('/:id/receipt', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  const payment = await prisma.payment.findUnique({
    where: { id: String(req.params.id) },
    include: {
      member: { select: { fullName: true, memberId: true } },
      recordedBy: { select: { username: true } },
      verifiedBy: { select: { username: true } },
      obligation: {
        select: {
          weekNumber: true,
          year: true,
          contributionAmount: true,
          penaltyAmount: true,
          totalDue: true,
          amountPaid: true,
        },
      },
      specialContributionObligation: {
        select: {
          specialContribution: {
            select: {
              title: true,
              titleOm: true,
              type: true,
            },
          },
          amount: true,
        },
      },
    },
  });

  if (!payment) {
    sendError(res, 'payment.notFound', lang, 404);
    return;
  }

  if (req.user?.role === 'MEMBER') {
    const member = await prisma.member.findUnique({ where: { userId: req.user.userId } });
    if (member?.id !== payment.memberId) {
      sendError(res, 'auth.forbidden', lang, 403);
      return;
    }
  }

  // Calculate breakdown for weekly contribution payments
  let breakdown = null;
  if (payment.obligation) {
    const contributionAmount = Number(payment.obligation.contributionAmount);
    const penaltyAmount = Number(payment.obligation.penaltyAmount);
    const paidAmount = Number(payment.amount);
    
    // Determine what was paid
    const contributionPaid = Math.min(paidAmount, contributionAmount);
    const penaltyPaid = Math.max(0, Math.min(paidAmount - contributionPaid, penaltyAmount));
    
    breakdown = {
      type: 'WEEKLY_CONTRIBUTION',
      weekNumber: payment.obligation.weekNumber,
      year: payment.obligation.year,
      contributionAmount,
      penaltyAmount,
      contributionPaid,
      penaltyPaid,
      totalPaid: paidAmount,
    };
  } else if (payment.specialContributionObligation) {
    breakdown = {
      type: 'SPECIAL_CONTRIBUTION',
      title: lang === 'om' 
        ? payment.specialContributionObligation.specialContribution.titleOm 
        : payment.specialContributionObligation.specialContribution.title,
      contributionType: payment.specialContributionObligation.specialContribution.type,
      amount: Number(payment.specialContributionObligation.amount),
      totalPaid: Number(payment.amount),
    };
  } else {
    // Standalone payment (no obligation link)
    breakdown = {
      type: 'OTHER',
      totalPaid: Number(payment.amount),
      notes: payment.notes,
    };
  }

  sendSuccess(res, {
    receiptNumber: payment.receiptNumber,
    memberName: payment.member.fullName,
    memberId: payment.member.memberId,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    auditorName: payment.verifiedBy?.username || payment.recordedBy.username,
    status: payment.status,
    breakdown, // New: detailed breakdown
  }, 'general.success', lang);
});

export default router;


// PHASE 1 FIX #8: Reconcile balance endpoint
// Admin-only endpoint to recalculate outstanding balance from scratch
router.post('/reconcile/:memberId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const memberId = getStringParam(req.params.memberId);

  const { member, error } = await getMemberById(memberId, lang);
  if (error) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  try {
    const newBalance = await recalculateOutstandingBalance(memberId);
    await createAuditEntry(req.user!.userId, 'BALANCE_RECONCILED', 'payments', { memberId, newBalance }, req.ip);
    sendSuccess(res, { memberId, previousBalance: Number(member.outstandingBalance), newBalance }, 'general.success', lang);
  } catch (error) {
    console.error('[Reconciliation Error]', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// PHASE 1 FIX #8: Reconcile all members (admin bulk operation)
router.post('/reconcile-all', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  try {
    const members = await prisma.member.findMany({
      where: { status: 'APPROVED' },
      select: { id: true },
    });

    const results = [];
    for (const member of members) {
      const newBalance = await recalculateOutstandingBalance(member.id);
      results.push({ memberId: member.id, newBalance });
    }

    await createAuditEntry(req.user!.userId, 'BULK_BALANCE_RECONCILIATION', 'payments', { count: results.length }, req.ip);
    sendSuccess(res, { reconciled: results.length, results }, 'general.success', lang);
  } catch (error) {
    console.error('[Bulk Reconciliation Error]', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// PHASE 3 FIX #14: Reconcile joining obligation payments for a member
router.post('/reconcile-joining/:memberId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const memberId = getStringParam(req.params.memberId);

  const { member, error } = await getMemberById(memberId, lang);
  if (error) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  try {
    const { reconcileJoiningObligationPayments } = await import('../services/joining-obligation.service.js');
    const result = await reconcileJoiningObligationPayments(memberId);
    
    if (result) {
      await createAuditEntry(req.user!.userId, 'JOINING_OBLIGATION_RECONCILED', 'payments', 
        { memberId, paymentsReconciled: result.paymentsReconciled, totalReconciled: result.totalReconciled }, req.ip);
      sendSuccess(res, { 
        memberId, 
        paymentsReconciled: result.paymentsReconciled, 
        totalReconciled: result.totalReconciled,
        message: `Reconciled ${result.totalReconciled} ETB to joining obligation`
      }, 'general.success', lang);
    } else {
      sendSuccess(res, { memberId, paymentsReconciled: 0, totalReconciled: 0, message: 'No joining obligation or payments to reconcile' }, 'general.success', lang);
    }
  } catch (error) {
    console.error('[Joining Obligation Reconciliation Error]', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// PHASE 3 FIX #14: Reconcile all joining obligations (admin bulk operation)
router.post('/reconcile-all-joining', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  try {
    const { reconcileAllJoiningObligations } = await import('../services/joining-obligation.service.js');
    const results = await reconcileAllJoiningObligations();
    
    const totalReconciled = results.reduce((sum, r) => sum + r.totalReconciled, 0);
    await createAuditEntry(req.user!.userId, 'BULK_JOINING_OBLIGATION_RECONCILIATION', 'payments', 
      { count: results.length, totalReconciled }, req.ip);
    
    sendSuccess(res, { 
      reconciled: results.length, 
      totalReconciled,
      results 
    }, 'general.success', lang);
  } catch (error) {
    console.error('[Bulk Joining Obligation Reconciliation Error]', error);
    sendError(res, 'general.error', lang, 500);
  }
});
