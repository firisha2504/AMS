import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  getAttendanceAnalytics,
  getFinancialAnalytics,
  getMemberAnalytics,
  getMeetingAnalytics,
  getMemberPersonalAnalytics,
  DateFilter,
} from '../services/analytics.service.js';

const router = Router();

// 1. Attendance Analytics (Admin & Auditor)
router.get('/attendance', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const filter: DateFilter = {
      range: req.query.range as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      meetingType: req.query.meetingType as string,
    };
    const analytics = await getAttendanceAnalytics(filter);
    sendSuccess(res, analytics, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 2. Financial Analytics (Admin & Auditor)
router.get('/financial', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const analytics = await getFinancialAnalytics();
    sendSuccess(res, analytics, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 3. Member Analytics (Admin & Auditor)
router.get('/members', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const analytics = await getMemberAnalytics();
    sendSuccess(res, analytics, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching member analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 4. Meeting Analytics (Admin & Auditor)
router.get('/meetings', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const analytics = await getMeetingAnalytics();
    sendSuccess(res, analytics, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching meeting analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 5. Personal Member Analytics (Member only)
router.get('/personal', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const member = await prisma.member.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!member) {
      sendError(res, 'member.notFound', lang, 404);
      return;
    }

    const analytics = await getMemberPersonalAnalytics(member.id);
    sendSuccess(res, analytics, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching personal member analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 6. Special & Emergency Contributions Detailed Analytics
router.get('/special-contributions', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const campaigns = await prisma.specialContribution.findMany({
      include: {
        beneficiaryMember: { select: { fullName: true, memberId: true } },
        obligations: {
          include: {
            member: { select: { fullName: true, memberId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = campaigns.map((c) => {
      const nonExempt = c.obligations.filter((o) => !o.isExempt);
      const totalExpected = nonExempt.reduce((s, o) => s + Number(o.amount), 0);
      const totalCollected = nonExempt.reduce((s, o) => s + Number(o.amountPaid), 0);
      const outstanding = Math.max(0, totalExpected - totalCollected);
      const paidMembersCount = nonExempt.filter((o) => o.status === 'PAID').length;
      const unpaidMembersCount = nonExempt.filter((o) => o.status !== 'PAID').length;

      return {
        id: c.id,
        campaignId: c.campaignId,
        title: c.title,
        titleOm: c.titleOm,
        type: c.type,
        status: c.status,
        amount: Number(c.amount),
        dueDate: c.dueDate,
        createdAt: c.createdAt,
        beneficiary: c.beneficiaryMember ? {
          fullName: c.beneficiaryMember.fullName,
          memberId: c.beneficiaryMember.memberId,
          relationship: c.familyRelationship,
        } : null,
        totalExpected,
        totalCollected,
        outstanding,
        eligibleMembersCount: nonExempt.length,
        paidMembersCount,
        unpaidMembersCount,
        progressPercentage: totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0,
        memberObligations: c.obligations.map((o) => ({
          id: o.id,
          memberId: o.memberId,
          memberName: o.member.fullName,
          memberNumber: o.member.memberId,
          amount: Number(o.amount),
          amountPaid: Number(o.amountPaid),
          remainingBalance: Math.max(0, Number(o.amount) - Number(o.amountPaid)),
          status: o.status,
          isExempt: o.isExempt,
        })),
      };
    });

    sendSuccess(res, data, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching special contributions analytics:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

export default router;
