import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  createJoiningObligation,
  getJoiningObligation,
  recordJoiningObligationPayment,
  waiveJoiningObligation,
  getPendingJoiningObligations,
  getGroupStartDate,
  setGroupStartDate,
} from '../services/joining-obligation.service.js';

const router = Router();

/**
 * Get group start date (no auth needed - public info)
 */
router.get('/group-start-date', async (_req: AuthRequest, res: Response) => {
  try {
    const date = await getGroupStartDate();
    sendSuccess(res, { groupStartDate: date }, 'general.success', 'om');
  } catch (error) {
    sendError(res, 'general.error', 'om', 500);
  }
});

/**
 * Get all pending joining obligations (MUST BE BEFORE /:memberId route)
 */
router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  try {
    const obligations = await getPendingJoiningObligations();
    sendSuccess(res, obligations, 'general.success', lang);
  } catch (error) {
    sendError(res, 'general.error', lang, 500);
  }
});

/**
 * Set group start date (admin only)
 */
router.post('/group-start-date', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { groupStartDate } = req.body;

  if (!groupStartDate) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  try {
    const date = new Date(groupStartDate);
    await setGroupStartDate(date);
    sendSuccess(res, { groupStartDate: date }, 'general.success', lang);
  } catch (error) {
    sendError(res, 'general.error', lang, 500);
  }
});

/**
 * Get joining obligation for a specific member
 */
router.get('/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const memberId = String(req.params.memberId);

  try {
    const obligation = await getJoiningObligation(memberId);
    if (!obligation) {
      sendSuccess(res, null, 'general.notFound', lang, 404);
      return;
    }

    sendSuccess(res, obligation, 'general.success', lang);
  } catch (error) {
    sendError(res, 'general.error', lang, 500);
  }
});

/**
 * Record payment toward joining obligation
 */
router.post('/:memberId/payment', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const memberId = String(req.params.memberId);
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  try {
    const updated = await recordJoiningObligationPayment(memberId, amount);
    sendSuccess(res, updated, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

/**
 * Waive joining obligation (admin only)
 */
router.post('/:memberId/waive', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const memberId = String(req.params.memberId);
  const { reason } = req.body;

  if (!reason) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  try {
    const updated = await waiveJoiningObligation(memberId, reason, req.user?.userId);
    sendSuccess(res, updated, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

/**
 * Create joining obligation for a member (admin only)
 * includeSpecialContributions: true to include special contributions, false for weekly only
 */
router.post('/:memberId/create', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const memberId = String(req.params.memberId);
  const { includeSpecialContributions } = req.body;

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      sendError(res, 'general.notFound', lang, 404);
      return;
    }

    const groupStartDate = await getGroupStartDate();
    const obligation = await createJoiningObligation(
      memberId,
      groupStartDate,
      member.joinDate || new Date(),
      undefined,
      includeSpecialContributions || false
    );

    if (!obligation) {
      sendSuccess(res, { message: 'No back contributions required' }, 'general.success', lang);
      return;
    }

    sendSuccess(res, obligation, 'general.success', lang, 201);
  } catch (error) {
    sendError(res, 'general.error', lang, 500);
  }
});

export default router;
