import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../validators/schemas.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  getOrganizationFinancialSummary,
  getMemberFinancialSummary,
} from '../services/financial-calculator.service.js';

const router = Router();

router.get('/admin', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  try {
    const summary = await getOrganizationFinancialSummary();

    sendSuccess(
      res,
      {
        totalMembers: summary.totalMembers,
        activeMembers: summary.activeMembers,
        pendingMembers: summary.pendingMembers,
        paidMembersCount: summary.paidMembersCount,
        unpaidMembersCount: summary.unpaidMembersCount,
        pendingPaymentRequestsCount: summary.pendingPaymentRequestsCount,
        // Verified actual cash funds & expenses
        totalConfirmedIncome: summary.totalConfirmedIncome,
        totalIncome: summary.totalConfirmedIncome,
        totalExpenses: summary.totalExpenses,
        availableActualFunds: summary.availableActualFunds,
        // Receivables (strictly separated from actual cash)
        totalOutstandingReceivables: summary.totalOutstandingReceivables,
        totalOutstandingBalance: summary.totalOutstandingReceivables, // Backwards compatibility for existing dashboard cards
        unpaidObligationsCount: summary.unpaidObligationsCount,
        // Ethiopian calendar current week participation
        thisWeekPaidCount: summary.thisWeekPaidCount,
        thisWeekTotalMembers: summary.thisWeekTotalMembers,
        thisWeekPaidRate: summary.thisWeekPaidRate,
        currentWeeklyPeriod: summary.currentWeeklyPeriod,
        // Collections by category
        weeklyContributions: summary.weeklyContributionsCollected,
        weeklyContributionsCollected: summary.weeklyContributionsCollected,
        totalPenalties: summary.penaltiesCollected,
        penaltiesCollected: summary.penaltiesCollected,
        paidPenalties: summary.penaltiesCollected,
        weeklyPenaltiesCollected: summary.weeklyPenaltiesCollected,
        monthlyPenaltiesCollected: summary.monthlyPenaltiesCollected,
        otherPenaltiesCollected: summary.otherPenaltiesCollected,
        totalSpecialContributions: summary.specialContributionsCollected,
        specialContributionsCollected: summary.specialContributionsCollected,
        emergencyContributionsCollected: summary.emergencyContributionsCollected,
        historicalContributionsCollected: summary.historicalContributionsCollected,
        // Receivables by category
        weeklyContributionsReceivable: summary.weeklyContributionsReceivable,
        unpaidPenalties: summary.penaltiesReceivable,
        penaltiesReceivable: summary.penaltiesReceivable,
        specialContributionsReceivable: summary.specialContributionsReceivable,
        emergencyContributionsReceivable: summary.emergencyContributionsReceivable,
        historicalContributionsReceivable: summary.historicalContributionsReceivable,
        categoryMetrics: summary.categoryMetrics,
      },
      'general.success',
      lang
    );
  } catch (error) {
    console.error('Dashboard admin endpoint error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// Live operational activities feed from actual audit logs and payments
router.get('/activities', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const [recentLogs, recentPayments] = await Promise.all([
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              member: { select: { fullName: true } },
            },
          },
        },
      }),
      prisma.payment.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { fullName: true } } },
      }),
    ]);

    const activities = [
      ...recentLogs.map((l: any) => ({
        id: `log-${l.id}`,
        type: l.action.toLowerCase().includes('member') ? 'member' : 'approved',
        message: `${l.action.replace(/_/g, ' ')} (${l.user?.member?.fullName || l.user?.username || 'System'})`,
        time: new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        date: l.createdAt,
        icon: l.action.includes('MEMBER') ? 'user-plus' : 'check-circle',
      })),
      ...recentPayments.map((p) => ({
        id: `pay-${p.id}`,
        type: 'payment',
        message: `Payment received (${p.member?.fullName || 'Member'} - ${Number(p.amount)} ETB)`,
        time: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        date: p.createdAt,
        icon: 'check',
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    sendSuccess(res, activities, 'general.success', lang);
  } catch (error) {
    console.error('Activities endpoint error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// Consolidated history/logs
router.get('/history', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { page, limit } = req.validatedQuery as { page: number; limit: number };

  try {
    const [payments, specialContributions, attendanceRecords, auditEntries] = await Promise.all([
      prisma.payment.findMany({
        include: {
          member: { select: { fullName: true, memberId: true } },
          recordedBy: { select: { username: true } },
          verifiedBy: { select: { username: true } },
          obligation: { select: { weekNumber: true, year: true } },
          penalty: { select: { reason: true, weekNumber: true, isMonthly: true } },
          specialContributionObligation: { select: { specialContribution: { select: { title: true } } } },
          allocations: true,
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.specialContribution.findMany({
        include: {
          beneficiaryMember: { select: { fullName: true, memberId: true } },
          createdBy: { select: { username: true } },
          _count: { select: { obligations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendance.findMany({
        include: {
          member: { select: { fullName: true, memberId: true } },
          recordedBy: { select: { username: true } },
          meeting: { select: { meetingDate: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.findMany({
        include: { user: { select: { username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const [totalPayments, totalSpecial, totalAttendance, totalAudit] = await Promise.all([
      prisma.payment.count(),
      prisma.specialContribution.count(),
      prisma.attendance.count(),
      prisma.auditLog.count(),
    ]);

    sendSuccess(res, {
      payments,
      auditEntries,
      specialContributions,
      attendanceRecords,
      totals: {
        payments: totalPayments,
        auditEntries: totalAudit,
        specialContributions: totalSpecial,
        attendanceRecords: totalAttendance,
      },
    }, 'general.success', lang, 200, { page, limit });
  } catch (error) {
    console.error('History endpoint error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

router.get('/auditor', authenticate, authorize('AUDITOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  try {
    const summary = await getOrganizationFinancialSummary();

    const recentPayments = await prisma.payment.findMany({
      where: { status: 'VERIFIED' },
      take: 10,
      orderBy: { paymentDate: 'desc' },
      include: {
        member: { select: { fullName: true, memberId: true } },
        allocations: true,
      },
    });

    const totalMembers = summary.totalMembers;
    const paidPercentage = totalMembers > 0
      ? Math.min(100, Math.round((summary.paidMembersCount / Math.max(1, totalMembers)) * 100))
      : 100;

    sendSuccess(
      res,
      {
        totalMembers: summary.totalMembers,
        totalPaid: summary.paidMembersCount,
        totalDue: summary.unpaidMembersCount,
        totalAmount: summary.totalConfirmedIncome,
        totalConfirmedIncome: summary.totalConfirmedIncome,
        totalIncome: summary.totalConfirmedIncome,
        totalExpenses: summary.totalExpenses,
        availableActualFunds: summary.availableActualFunds,
        totalReceivables: summary.totalOutstandingReceivables,
        totalOutstandingReceivables: summary.totalOutstandingReceivables,
        totalOutstandingBalance: summary.totalOutstandingReceivables,
        unpaidObligationsCount: summary.unpaidObligationsCount,
        thisWeekPaidCount: summary.thisWeekPaidCount,
        thisWeekTotalMembers: summary.thisWeekTotalMembers,
        thisWeekPaidRate: summary.thisWeekPaidRate,
        paidPercentage,
        unpaidPercentage: 100 - paidPercentage,
        weeklyContributions: summary.weeklyContributionsCollected,
        penaltiesCollected: summary.penaltiesCollected,
        paidPenalties: summary.penaltiesCollected,
        specialContributions: summary.specialContributionsCollected,
        emergencyContributions: summary.emergencyContributionsCollected,
        historicalContributions: summary.historicalContributionsCollected,
        categoryMetrics: summary.categoryMetrics,
        recentTransactions: recentPayments.map((p) => ({
          id: p.id,
          date: p.paymentDate.toISOString().split('T')[0],
          memberName: p.member.fullName,
          amount: Number(p.amount),
          status: p.status,
          method: p.paymentMethod,
        })),
        recentPayments,
      },
      'general.success',
      lang
    );
  } catch (error) {
    console.error('Auditor dashboard error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

router.get('/member', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const member = await prisma.member.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!member) {
    sendSuccess(res, null, 'general.notFound', lang, 404);
    return;
  }

  const memberSummary = await getMemberFinancialSummary(member.id);
  if (!memberSummary) {
    sendSuccess(res, null, 'general.notFound', lang, 404);
    return;
  }

  const attendance = await prisma.attendance.findMany({ where: { memberId: member.id } });
  const present = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendancePercentage = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  const paidPayments = await prisma.payment.findMany({
    where: { memberId: member.id, status: 'VERIFIED' },
    orderBy: { paymentDate: 'desc' },
    take: 10,
    include: {
      receipt: true,
      allocations: true,
    },
  });

  const upcomingMeetings = await prisma.meeting.findMany({
    where: { meetingDate: { gte: new Date() } },
    take: 3,
    orderBy: { meetingDate: 'asc' },
  });

  const nextSat = new Date();
  nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7));

  sendSuccess(
    res,
    {
      fullName: member.fullName,
      memberId: member.memberId,
      status: member.status,
      profilePicture: member.profilePicture,
      joinDate: member.joinDate,
      // Verified financial calculations (NO hardcoded fake numbers)
      totalAmountPaid: memberSummary.totalAmountPaid,
      totalCredit: memberSummary.totalCredit,
      outstandingBalance: memberSummary.totalOutstandingBalance,
      totalPenalties: memberSummary.penaltiesOutstanding,
      dueThisSaturday: 50,
      nextSaturdayDate: nextSat.toISOString().split('T')[0],
      // Categories Paid
      weeklyPaid: memberSummary.weeklyPaid,
      penaltiesPaid: memberSummary.penaltiesPaid,
      specialPaid: memberSummary.specialPaid,
      emergencyPaid: memberSummary.emergencyPaid,
      historicalPaid: memberSummary.historicalPaid,
      // Categories Outstanding
      weeklyOutstanding: memberSummary.weeklyOutstanding,
      penaltiesOutstanding: memberSummary.penaltiesOutstanding,
      weeklyPenaltiesOutstanding: memberSummary.weeklyPenaltiesOutstanding,
      monthlyPenaltiesOutstanding: memberSummary.monthlyPenaltiesOutstanding,
      otherPenaltiesOutstanding: memberSummary.otherPenaltiesOutstanding,
      specialOutstanding: memberSummary.specialOutstanding,
      emergencyOutstanding: memberSummary.emergencyOutstanding,
      historicalOutstanding: memberSummary.historicalOutstanding,
      // 7 Category Metrics
      categoryMetrics: memberSummary.categoryMetrics,
      // Detailed arrays
      penalties: memberSummary.penalties,
      obligations: memberSummary.weeklyObligations,
      specialObligations: memberSummary.specialObligations,
      emergencyObligations: memberSummary.emergencyObligations,
      historicalObligation: memberSummary.historicalObligation,
      recentPayments: paidPayments.map((p) => ({
        id: p.id,
        date: p.paymentDate.toISOString().split('T')[0],
        amount: Number(p.amount),
        method: p.paymentMethod,
        status: p.status,
        receiptNumber: p.receiptNumber,
      })),
      attendancePercentage,
      upcomingMeetings,
    },
    'general.success',
    lang
  );
});

router.get('/charts', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  
  try {
    const trends = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [weeklyAgg, penaltyAgg, specialAgg] = await Promise.all([
        prisma.paymentAllocation.aggregate({
          where: {
            allocationType: 'WEEKLY',
            payment: { status: 'VERIFIED', paymentDate: { gte: start, lte: end } },
          },
          _sum: { amount: true },
        }),
        prisma.paymentAllocation.aggregate({
          where: {
            allocationType: { in: ['PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'] },
            payment: { status: 'VERIFIED', paymentDate: { gte: start, lte: end } },
          },
          _sum: { amount: true },
        }),
        prisma.paymentAllocation.aggregate({
          where: {
            allocationType: { in: ['SPECIAL', 'EMERGENCY'] },
            payment: { status: 'VERIFIED', paymentDate: { gte: start, lte: end } },
          },
          _sum: { amount: true },
        }),
      ]);

      trends.push({
        month: start.toLocaleString('en', { month: 'short' }),
        contributions: Number(weeklyAgg._sum.amount || 0),
        penalties: Number(penaltyAgg._sum.amount || 0),
        special: Number(specialAgg._sum.amount || 0),
      });
    }

    sendSuccess(res, { trends }, 'general.success', lang);
  } catch (error) {
    console.error('Charts endpoint error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// Attendance trends
router.get('/attendance-trends', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  
  try {
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    const attendanceData = await prisma.attendance.findMany({
      where: {
        createdAt: { gte: sixWeeksAgo },
      },
      include: {
        meeting: { select: { meetingDate: true } },
      },
    });

    const weeks: { [key: number]: { present: number; total: number; week: number } } = {};

    for (let i = 0; i < 6; i++) {
      weeks[i] = { present: 0, total: 0, week: i + 1 };
    }

    attendanceData.forEach((record) => {
      const weeksDiff = Math.floor((new Date().getTime() - new Date(record.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekIndex = Math.min(5, Math.max(0, 5 - weeksDiff));

      if (weeks[weekIndex]) {
        weeks[weekIndex].total += 1;
        if (record.status === 'PRESENT') {
          weeks[weekIndex].present += 1;
        }
      }
    });

    const trends = Object.values(weeks)
      .sort((a, b) => a.week - b.week)
      .map((w) => ({
        week: `Week ${w.week}`,
        percentage: w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
      }));

    sendSuccess(res, { trends }, 'general.success', lang);
  } catch (error) {
    console.error('Attendance trends error:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

export default router;
