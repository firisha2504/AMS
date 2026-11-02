import { Router, Response } from 'express';
import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import {
  generatePaymentId,
  generateReceiptNumber,
} from '../services/helpers.js';
import { getMemberById, getLanguage, getStringParam } from '../middleware/commonOperations.js';
import { recordLedgerEntry } from '../services/contribution.service.js';
import { payPenalty, waivePenalty } from '../services/penalty.service.js';
import { penaltyPaymentSchema, paginationSchema } from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { sendPushNotification } from '../services/notification.service.js';

const router = Router();

// Get all penalties for a member
router.get('/member/:memberId', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const memberId = getStringParam(req.params.memberId);
  const { page, limit, status } = req.validatedQuery as { page: number; limit: number; status?: string };

  const { member, error } = await getMemberById(memberId, lang);
  if (error) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  const where: Record<string, unknown> = { memberId };
  if (status) where.status = status;

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.penalty.count({ where }),
  ]);

  sendSuccess(res, penalties, 'general.success', lang, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// Get member's own penalties (for logged-in member)
router.get('/my', authenticate, authorize('MEMBER'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const userId = req.user!.userId;
  const { page, limit, status } = req.validatedQuery as { page: number; limit: number; status?: string };

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  const where: Record<string, unknown> = { memberId: member.id };
  if (status) where.status = status;

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.penalty.count({ where }),
  ]);

  sendSuccess(res, penalties, 'general.success', lang, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// Pay a specific penalty
router.post('/pay', authenticate, authorize('ADMIN', 'AUDITOR'), validateBody(penaltyPaymentSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { penaltyId, amount, paymentMethod, transactionReference, notes } = req.body;
  const recordedById = req.user!.userId;

  const penalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
    include: { member: { select: { fullName: true, memberId: true, userId: true } } },
  });

  if (!penalty) {
    sendError(res, 'penalty.notFound', lang, 404);
    return;
  }

  if (penalty.status === 'SETTLED') {
    sendError(res, 'penalty.alreadyPaid', lang, 400);
    return;
  }

  if (penalty.status === 'WAIVED') {
    sendError(res, 'penalty.alreadyWaived', lang, 400);
    return;
  }

  // Check if amount is valid (should not exceed penalty amount)
  const penaltyAmount = Number(penalty.amount);
  if (amount > penaltyAmount) {
    sendError(res, 'penalty.amountExceedsPenalty', lang, 400);
    return;
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      paymentId: generatePaymentId(),
      memberId: penalty.memberId,
      amount,
      paymentMethod,
      transactionReference,
      notes: notes || `Penalty payment for Week ${penalty.weekNumber}, ${penalty.year}`,
      recordedById,
      receiptNumber: generateReceiptNumber(),
      status: PaymentStatus.PENDING,
    },
    include: {
      member: { select: { fullName: true, memberId: true } },
      recordedBy: { select: { username: true } },
    },
  });

  // Record ledger entry
  await recordLedgerEntry(
    penalty.memberId,
    TransactionType.PENALTY,
    amount,
    `Penalty payment ${payment.paymentId} - Week ${penalty.weekNumber}, ${penalty.year}`,
    recordedById
  );

  // Mark penalty as settled
  await payPenalty(penaltyId, amount);

  // Create audit entry
  await createAuditEntry(
    recordedById,
    'PENALTY_PAYMENT_RECORDED',
    'penalties',
    {
      paymentId: payment.paymentId,
      penaltyId,
      weekNumber: penalty.weekNumber,
      year: penalty.year,
      amount,
    },
    req.ip
  );

  // Send notification to member
  await prisma.notification.create({
    data: {
      userId: penalty.member.userId,
      memberId: penalty.memberId,
      type: 'PAYMENT_CONFIRMATION',
      title: 'Penalty Payment Received',
      titleOm: 'Adabbiin Kaffaltii Fudhatame',
      message: `Your penalty payment of ${amount} Birr for Week ${penalty.weekNumber}, ${penalty.year} has been recorded.`,
      messageOm: `Kaffaltiin adabbii keessanii Birr ${amount} Torban ${penalty.weekNumber}, ${penalty.year}f fudhatameera.`,
      metadata: { paymentId: payment.paymentId, penaltyId, receiptNumber: payment.receiptNumber },
    },
  });

  sendSuccess(res, { payment, penalty: await prisma.penalty.findUnique({ where: { id: penaltyId } }) }, 'penalty.paymentRecorded', lang, 201);
});

// Waive a penalty (ADMIN only)
router.patch('/:id/waive', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const id = String(req.params.id);
  const { reason } = req.body;

  const penalty = await prisma.penalty.findUnique({
    where: { id },
    include: { member: { select: { fullName: true, memberId: true, userId: true } } },
  });

  if (!penalty) {
    sendError(res, 'penalty.notFound', lang, 404);
    return;
  }

  if (penalty.status === 'SETTLED') {
    sendError(res, 'penalty.alreadyPaid', lang, 400);
    return;
  }

  if (penalty.status === 'WAIVED') {
    sendError(res, 'penalty.alreadyWaived', lang, 400);
    return;
  }

  // Waive the penalty
  await waivePenalty(id, reason);

  // Create audit entry
  await createAuditEntry(
    req.user!.userId,
    'PENALTY_WAIVED',
    'penalties',
    {
      penaltyId: id,
      memberId: penalty.memberId,
      amount: penalty.amount,
      weekNumber: penalty.weekNumber,
      year: penalty.year,
      reason: reason || 'No reason provided',
    },
    req.ip
  );

  // Send notification to member
  await prisma.notification.create({
    data: {
      userId: penalty.member.userId,
      memberId: penalty.memberId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Penalty Waived',
      titleOm: 'Adabbiin Dhiifame',
      message: `Your penalty of ${penalty.amount} Birr for Week ${penalty.weekNumber}, ${penalty.year} has been waived. Reason: ${reason || 'Administrative decision'}`,
      messageOm: `Adabbiin keessan Birr ${penalty.amount} Torban ${penalty.weekNumber}, ${penalty.year}f dhiifameera. Sababni: ${reason || 'Murtii bulchiinsaa'}`,
      metadata: { penaltyId: id, reason },
    },
  });

  sendSuccess(res, await prisma.penalty.findUnique({ where: { id } }), 'penalty.waived', lang);
});

// Get all penalties (ADMIN/AUDITOR) - with filters
router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { page, limit, status, isMonthly } = req.validatedQuery as {
    page: number;
    limit: number;
    status?: string;
    isMonthly?: string;
  };

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (isMonthly !== undefined) where.isMonthly = isMonthly === 'true';

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      include: {
        member: {
          select: {
            fullName: true,
            memberId: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.penalty.count({ where }),
  ]);

  sendSuccess(res, penalties, 'general.success', lang, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// Get penalty by ID
router.get('/:id', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const id = String(req.params.id);

  const penalty = await prisma.penalty.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          fullName: true,
          memberId: true,
        },
      },
    },
  });

  if (!penalty) {
    sendError(res, 'penalty.notFound', lang, 404);
    return;
  }

  sendSuccess(res, penalty, 'general.success', lang);
});

export default router;
