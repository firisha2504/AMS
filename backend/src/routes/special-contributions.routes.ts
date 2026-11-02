import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import {
  createGraduationContribution,
  createBereavementContribution,
  createEmergencyContribution,
} from '../services/special-contribution.service.js';
import {
  graduationContributionSchema,
  bereavementContributionSchema,
  emergencyContributionSchema,
  paginationSchema,
} from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { page, limit } = req.validatedQuery as { page: number; limit: number };

  const [campaigns, total] = await Promise.all([
    prisma.specialContribution.findMany({
      include: {
        beneficiaryMember: { select: { fullName: true, memberId: true } },
        _count: { select: { obligations: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.specialContribution.count(),
  ]);

  sendSuccess(res, campaigns, 'general.success', lang, 200, { page, limit, total });
});

router.get('/my', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const member = await prisma.member.findUnique({ where: { userId: req.user!.userId } });
  if (!member) {
    sendError(res, 'member.notFound', lang, 404);
    return;
  }

  const obligations = await prisma.specialContributionObligation.findMany({
    where: { memberId: member.id, isExempt: false },
    include: {
      specialContribution: {
        select: { campaignId: true, type: true, title: true, titleOm: true, dueDate: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, obligations, 'general.success', lang);
});

router.get('/:id', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const campaign = await prisma.specialContribution.findUnique({
    where: { id: String(req.params.id) },
    include: {
      beneficiaryMember: { select: { fullName: true, memberId: true } },
      obligations: {
        include: { member: { select: { fullName: true, memberId: true } } },
      },
    },
  });

  if (!campaign) {
    sendError(res, 'general.notFound', lang, 404);
    return;
  }

  sendSuccess(res, campaign, 'general.success', lang);
});

router.post('/graduation', authenticate, authorize('ADMIN'), validateBody(graduationContributionSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { beneficiaryMemberId, familyRelationship, dueDate } = req.body;

  try {
    const campaign = await createGraduationContribution(
      beneficiaryMemberId,
      familyRelationship,
      req.user!.userId,
      dueDate ? new Date(dueDate) : undefined
    );

    await createAuditEntry(req.user!.userId, 'GRADUATION_CONTRIBUTION_CREATED', 'special-contributions', {
      campaignId: campaign.campaignId,
    }, req.ip);

    sendSuccess(res, campaign, 'general.success', lang, 201);
  } catch {
    sendError(res, 'general.error', lang, 400);
  }
});

router.post('/bereavement', authenticate, authorize('ADMIN'), validateBody(bereavementContributionSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { beneficiaryMemberId, familyRelationship, dueDate } = req.body;

  try {
    const campaign = await createBereavementContribution(
      beneficiaryMemberId,
      familyRelationship,
      req.user!.userId,
      dueDate ? new Date(dueDate) : undefined
    );

    await createAuditEntry(req.user!.userId, 'BEREAVEMENT_CONTRIBUTION_CREATED', 'special-contributions', {
      campaignId: campaign.campaignId,
    }, req.ip);

    sendSuccess(res, campaign, 'general.success', lang, 201);
  } catch {
    sendError(res, 'general.error', lang, 400);
  }
});

router.post('/emergency', authenticate, authorize('ADMIN'), validateBody(emergencyContributionSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const campaign = await createEmergencyContribution({
    ...req.body,
    dueDate: new Date(req.body.dueDate),
    createdById: req.user!.userId,
  });

  await createAuditEntry(req.user!.userId, 'EMERGENCY_CONTRIBUTION_CREATED', 'special-contributions', {
    campaignId: campaign.campaignId,
  }, req.ip);

  sendSuccess(res, campaign, 'general.success', lang, 201);
});

router.patch('/:id/close', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const campaign = await prisma.specialContribution.update({
    where: { id: String(req.params.id) },
    data: { status: 'CLOSED' },
  });

  await createAuditEntry(req.user!.userId, 'SPECIAL_CONTRIBUTION_CLOSED', 'special-contributions', { campaignId: campaign.campaignId }, req.ip);
  sendSuccess(res, campaign, 'general.success', lang);
});

// Edit a special contribution (title, amount, dueDate, description) — only ACTIVE ones
router.patch('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, titleOm, description, descriptionOm, amount, dueDate, status } = req.body;

  const existing = await prisma.specialContribution.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) { sendError(res, 'general.notFound', lang, 404); return; }

  const campaign = await prisma.specialContribution.update({
    where: { id: String(req.params.id) },
    data: {
      ...(title !== undefined && { title }),
      ...(titleOm !== undefined && { titleOm }),
      ...(description !== undefined && { description }),
      ...(descriptionOm !== undefined && { descriptionOm }),
      ...(amount !== undefined && { amount }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status !== undefined && { status }),
    },
    include: { beneficiaryMember: { select: { fullName: true, memberId: true } } },
  });

  await createAuditEntry(req.user!.userId, 'SPECIAL_CONTRIBUTION_UPDATED', 'special-contributions', { campaignId: campaign.campaignId }, req.ip);
  sendSuccess(res, campaign, 'general.success', lang);
});

// Delete a special contribution (only if no payments have been made)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const existing = await prisma.specialContribution.findUnique({
    where: { id: String(req.params.id) },
    include: { obligations: { include: { payments: true } } },
  });
  if (!existing) { sendError(res, 'general.notFound', lang, 404); return; }

  // Check if any payments were made
  const hasPayments = existing.obligations.some((o) => o.payments.length > 0);
  if (hasPayments) {
    sendError(res, 'general.error', lang, 400); // Cannot delete if payments exist
    return;
  }

  await prisma.specialContribution.delete({ where: { id: String(req.params.id) } });
  await createAuditEntry(req.user!.userId, 'SPECIAL_CONTRIBUTION_DELETED', 'special-contributions', { campaignId: existing.campaignId }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

// Get all members with their penalty summary
router.get('/penalties/summary', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const members = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: {
      id: true, fullName: true, memberId: true,
      penalties: {
        select: { id: true, amount: true, reason: true, status: true, isMonthly: true, weekNumber: true, year: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      fines: {
        select: { id: true, amount: true, reason: true, fineType: true, isPaid: true, fineDate: true },
        orderBy: { fineDate: 'desc' },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  const summary = members
    .map((m) => {
      const totalPenalties = m.penalties.filter((p) => p.status !== 'WAIVED').reduce((s, p) => s + Number(p.amount), 0);
      const unpaidPenalties = m.penalties.filter((p) => p.status === 'OUTSTANDING').reduce((s, p) => s + Number(p.amount), 0);
      const totalFines = m.fines.reduce((s, f) => s + Number(f.amount), 0);
      const unpaidFines = m.fines.filter((f) => !f.isPaid).reduce((s, f) => s + Number(f.amount), 0);
      return {
        id: m.id,
        fullName: m.fullName,
        memberId: m.memberId,
        totalPenalties,
        unpaidPenalties,
        paidPenalties: totalPenalties - unpaidPenalties,
        penaltyCount: m.penalties.length,
        unpaidPenaltyCount: m.penalties.filter((p) => p.status === 'OUTSTANDING').length,
        totalFines,
        unpaidFines,
        totalOutstanding: unpaidPenalties + unpaidFines,
        recentPenalties: m.penalties.slice(0, 3),
        recentFines: m.fines.slice(0, 3),
      };
    })
    // Filter to only members with penalties or fines
    .filter((m) => m.penaltyCount > 0 || m.totalFines > 0);

  sendSuccess(res, summary, 'general.success', lang);
});

export default router;
