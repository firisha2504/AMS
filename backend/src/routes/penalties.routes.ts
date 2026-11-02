import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import { getMemberById, getLanguage, getStringParam } from '../middleware/commonOperations.js';
import { payPenalty, waivePenalty, reversePenaltyWaiver, createManualPenalty } from '../services/penalty.service.js';
import { paginationSchema } from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();

const createPenaltySchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(2),
  title: z.string().optional(),
  dueDate: z.string().optional(),
  isMonthly: z.boolean().optional(),
});

const payPenaltySchema = z.object({
  penaltyId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY']).default('CASH'),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

const waivePenaltySchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
});

// 1. Get member's own penalties (for logged-in member)
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
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }, { createdAt: 'desc' }],
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

// 2. Get all penalties for a member (ADMIN/AUDITOR)
router.get('/member/:memberId', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const memberId = getStringParam(req.params.memberId);
  const { page, limit, status } = req.validatedQuery as { page: number; limit: number; status?: string };

  const { member, error } = await getMemberById(memberId, lang);
  if (error) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  const where: Record<string, unknown> = { memberId: member!.id };
  if (status) where.status = status;

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }, { createdAt: 'desc' }],
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

// 3. Admin creates a manual penalty
router.post('/', authenticate, authorize('ADMIN'), validateBody(createPenaltySchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { memberId, amount, reason, title, dueDate, isMonthly } = req.body;
  const createdById = req.user!.userId;

  try {
    const penalty = await createManualPenalty({
      memberId,
      amount,
      reason,
      title,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isMonthly,
      createdById,
    });

    await createAuditEntry(
      createdById,
      'PENALTY_CREATED',
      'penalties',
      { penaltyId: penalty.id, memberId, amount, reason },
      req.ip
    );

    sendSuccess(res, penalty, 'general.success', lang, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create penalty', lang, 400);
  }
});

// 4. Pay a penalty (Member can pay their own, or Admin/Auditor can record payment)
router.post('/pay', authenticate, authorize('ADMIN', 'AUDITOR', 'MEMBER'), validateBody(payPenaltySchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { penaltyId, amount, paymentMethod, transactionReference, notes } = req.body;
  const userId = req.user!.userId;

  const penalty = await prisma.penalty.findUnique({
    where: { id: penaltyId },
    include: { member: true },
  });

  if (!penalty) {
    sendError(res, 'penalty.notFound', lang, 404);
    return;
  }

  // If role is MEMBER, verify they own the penalty
  if (req.user?.role === 'MEMBER') {
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member || member.id !== penalty.memberId) {
      sendError(res, 'Unauthorized to pay penalty of another member', lang, 403);
      return;
    }
  }

  try {
    const result = await payPenalty(
      penaltyId,
      amount,
      userId,
      paymentMethod,
      transactionReference,
      notes
    );

    await createAuditEntry(
      userId,
      'PENALTY_PAID',
      'penalties',
      {
        penaltyId,
        memberId: penalty.memberId,
        amount,
        paymentId: result.payment.paymentId,
      },
      req.ip
    );

    sendSuccess(res, result, 'penalty.paymentRecorded', lang, 200);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to pay penalty', lang, 400);
  }
});

// 5. Waive a penalty (ADMIN only)
router.patch('/:id/waive', authenticate, authorize('ADMIN'), validateBody(waivePenaltySchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const id = String(req.params.id);
  const { reason } = req.body;
  const userId = req.user!.userId;

  try {
    const updated = await waivePenalty(id, userId, reason);

    await createAuditEntry(
      userId,
      'PENALTY_WAIVED',
      'penalties',
      { penaltyId: id, memberId: updated.memberId, reason },
      req.ip
    );

    sendSuccess(res, updated, 'penalty.waived', lang);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to waive penalty', lang, 400);
  }
});

// 6. Reverse a penalty waiver (ADMIN only)
router.patch('/:id/reverse', authenticate, authorize('ADMIN'), validateBody(waivePenaltySchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const id = String(req.params.id);
  const { reason } = req.body;
  const userId = req.user!.userId;

  try {
    const updated = await reversePenaltyWaiver(id, userId, reason);

    await createAuditEntry(
      userId,
      'PENALTY_WAIVER_REVERSED',
      'penalties',
      { penaltyId: id, memberId: updated.memberId, reason },
      req.ip
    );

    sendSuccess(res, updated, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to reverse penalty waiver', lang, 400);
  }
});

// 7. Get all penalties (ADMIN/AUDITOR)
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
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }, { createdAt: 'desc' }],
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

// 8. Get penalty by ID
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
      allocations: true,
    },
  });

  if (!penalty) {
    sendError(res, 'penalty.notFound', lang, 404);
    return;
  }

  sendSuccess(res, penalty, 'general.success', lang);
});

export default router;
