import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { sendSuccess, sendError } from '../utils/response.js';
import * as paymentRequestService from '../services/payment-request.service.js';
import prisma from '../config/database.js';

const router = Router();

// Schemas
const createPaymentRequestSchema = z.object({
  amount: z.number().positive(),
  paymentProvider: z.enum(['M_PESA', 'TELEBIRR', 'CBE', 'EBIRR']),
  obligationId: z.string().optional(),
  specialContributionObligationId: z.string().optional()
});

const submitTransactionSchema = z.object({
  transactionReference: z.string().min(1),
  receiptScreenshot: z.string().optional()
});

const verifyPaymentSchema = z.object({
  verificationMethod: z.enum(['AUTOMATIC', 'MANUAL']),
  verificationNotes: z.string().optional()
});

const rejectPaymentSchema = z.object({
  reason: z.string().min(1)
});

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// ── SPECIFIC ROUTES FIRST (before :id parameter) ──

/**
 * Get member's payment requests
 * GET /payment-requests/my
 */
router.get('/my', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const member = await prisma.member.findUnique({
      where: { userId: req.user!.userId as string }
    });
    if (!member) {
      sendError(res, 'member.notFound', lang, 404);
      return;
    }
    const requests = await paymentRequestService.getMemberPaymentRequests(member.id);
    sendSuccess(res, requests, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 500);
  }
});

/**
 * Get all pending payment requests (admin)
 * GET /payment-requests/admin/pending
 */
router.get('/admin/pending', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { limit } = req.validatedQuery as { limit: number };
    const requests = await paymentRequestService.getPendingPaymentRequests(limit);
    sendSuccess(res, requests, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 500);
  }
});

// ── CREATE PAYMENT REQUEST ──

/**
 * Create a payment request
 * POST /payment-requests
 */
router.post('/', authenticate, authorize('MEMBER'), validateBody(createPaymentRequestSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const member = await prisma.member.findUnique({
      where: { userId: req.user!.userId as string }
    });
    if (!member) {
      sendError(res, 'member.notFound', lang, 404);
      return;
    }
    if (req.body.obligationId) {
      const obligation = await prisma.weeklyObligation.findUnique({
        where: { id: req.body.obligationId as string }
      });
      if (!obligation || obligation.memberId !== member.id) {
        sendError(res, 'obligation.notFound', lang, 404);
        return;
      }
      if (req.body.amount !== Number(obligation.totalDue)) {
        sendError(res, 'Invalid payment amount', lang, 400);
        return;
      }
    }
    const paymentRequest = await paymentRequestService.createPaymentRequest({
      memberId: member.id,
      amount: req.body.amount,
      paymentProvider: req.body.paymentProvider,
      obligationId: req.body.obligationId,
      specialContributionObligationId: req.body.specialContributionObligationId
    });
    sendSuccess(res, paymentRequest, 'general.success', lang, 201);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

// ── PARAMETERIZED ROUTES ──

/**
 * Get payment request details
 * GET /payment-requests/:id
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const request = await paymentRequestService.getPaymentRequest(req.params.id as string);
    if (!request) {
      sendError(res, 'payment.request.notFound', lang, 404);
      return;
    }
    if (req.user?.role === 'MEMBER') {
      const member = await prisma.member.findUnique({
        where: { userId: req.user.userId as string }
      });
      if (member?.id !== request.memberId) {
        sendError(res, 'Unauthorized', lang, 403);
        return;
      }
    }
    sendSuccess(res, request, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 500);
  }
});

/**
 * Submit transaction reference
 * POST /payment-requests/:id/submit
 */
router.post('/:id/submit', authenticate, authorize('MEMBER'), validateBody(submitTransactionSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const paymentRequest = await paymentRequestService.getPaymentRequest(req.params.id as string);
    if (!paymentRequest) {
      sendError(res, 'payment.request.notFound', lang, 404);
      return;
    }
    const member = await prisma.member.findUnique({
      where: { userId: req.user!.userId as string }
    });
    if (member?.id !== paymentRequest.memberId) {
      sendError(res, 'Unauthorized', lang, 403);
      return;
    }
    const updated = await paymentRequestService.submitTransactionReference(
      req.params.id as string,
      req.body.transactionReference,
      req.body.receiptScreenshot
    );
    sendSuccess(res, updated, 'general.success', lang, 200);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

/**
 * Verify a payment request
 * POST /payment-requests/:id/verify
 */
router.post('/:id/verify', authenticate, authorize('ADMIN', 'AUDITOR'), validateBody(verifyPaymentSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { payment } = await paymentRequestService.verifyPaymentRequest(
      req.params.id as string,
      req.user!.userId as string,
      req.body.verificationMethod,
      req.body.verificationNotes
    );
    sendSuccess(res, payment, 'general.success', lang, 200);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

/**
 * Reject a payment request
 * POST /payment-requests/:id/reject
 */
router.post('/:id/reject', authenticate, authorize('ADMIN', 'AUDITOR'), validateBody(rejectPaymentSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const updated = await paymentRequestService.rejectPaymentRequest(
      req.params.id as string,
      req.user!.userId as string,
      req.body.reason
    );
    sendSuccess(res, updated, 'general.success', lang);
  } catch (error: any) {
    sendError(res, error.message, lang, 400);
  }
});

export default router;
