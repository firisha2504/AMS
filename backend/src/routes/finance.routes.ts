import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getLanguage } from '../middleware/commonOperations.js';
import { createFineSchema, createMeetingSchema, recordAttendanceSchema, paginationSchema } from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { recordLedgerEntry } from '../services/contribution.service.js';
import { TransactionType } from '@prisma/client';
import { createAuditEntry } from '../middleware/audit.js';

const router = Router();

// --- Penalties ---
router.get('/penalties', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };

  const where: Record<string, unknown> = {};
  if (req.user?.role === 'MEMBER') {
    const member = await prisma.member.findUnique({ where: { userId: req.user.userId } });
    if (!member) { sendError(res, 'member.notFound', lang, 404); return; }
    where.memberId = member.id;
  }

  const [penalties, total] = await Promise.all([
    prisma.penalty.findMany({
      where,
      include: { member: { select: { fullName: true, memberId: true } } },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.penalty.count({ where }),
  ]);

  sendSuccess(res, penalties, 'general.success', lang, 200, { page: Number(page), limit: Number(limit), total });
});

// --- Fines ---
router.post('/fines', authenticate, authorize('ADMIN'), validateBody(createFineSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const fine = await prisma.fine.create({
    data: { ...req.body, createdById: req.user!.userId },
    include: { member: { select: { fullName: true, memberId: true } } },
  });

  await recordLedgerEntry(fine.memberId, TransactionType.FINE, Number(fine.amount), fine.reason, req.user!.userId);
  await createAuditEntry(req.user!.userId, 'FINE_CREATED', 'fines', { fineId: fine.id }, req.ip);

  sendSuccess(res, fine, 'general.success', lang, 201);
});

router.get('/fines', authenticate, authorize('ADMIN', 'AUDITOR'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { page, limit } = req.validatedQuery as { page: number; limit: number };

  const [fines, total] = await Promise.all([
    prisma.fine.findMany({
      include: { member: { select: { fullName: true, memberId: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fine.count(),
  ]);

  sendSuccess(res, fines, 'general.success', lang, 200, { page, limit, total });
});

// Edit a fine (ADMIN only, only if unpaid)
router.patch('/fines/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { fineType, amount, reason, isPaid } = req.body;

  const existing = await prisma.fine.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!existing) { sendError(res, 'general.notFound', lang, 404); return; }

  const fine = await prisma.fine.update({
    where: { id: String(req.params.id) },
    data: {
      ...(fineType !== undefined && { fineType }),
      ...(amount !== undefined && { amount }),
      ...(reason !== undefined && { reason }),
      ...(isPaid !== undefined && { isPaid }),
    },
    include: { member: { select: { fullName: true, memberId: true } } },
  });

  await createAuditEntry(req.user!.userId, 'FINE_UPDATED', 'fines', { fineId: fine.id }, req.ip);
  sendSuccess(res, fine, 'general.success', lang);
});

// Delete a fine (ADMIN only, only if unpaid)
router.delete('/fines/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);

  const existing = await prisma.fine.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) { sendError(res, 'general.notFound', lang, 404); return; }
  if (existing.isPaid) {
    sendError(res, 'general.error', lang, 400); // Cannot delete a paid fine
    return;
  }

  await prisma.fine.delete({ where: { id: String(req.params.id) } });
  await createAuditEntry(req.user!.userId, 'FINE_DELETED', 'fines', { fineId: req.params.id }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

// --- Weekly Contributions Summary ---
// Shows all members with their obligation status for a given week/year
router.get('/contributions/weekly', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req);
  const { week, year } = req.query as { week?: string; year?: string };

  // Default to most recent recorded week if not provided
  const now = new Date();
  let targetYear = year ? parseInt(year) : now.getFullYear();

  // Calculate week number if not provided
  let targetWeek: number;
  if (week) {
    targetWeek = parseInt(week);
  } else {
    // Find the most recent week that has payments recorded (not just obligations)
    const mostRecentPayment = await prisma.payment.findFirst({
      where: {
        obligation: { isNot: null },
        status: 'VERIFIED',
      },
      include: {
        obligation: {
          select: { weekNumber: true, year: true },
        },
      },
      orderBy: [
        { obligation: { year: 'desc' } },
        { obligation: { weekNumber: 'desc' } },
      ],
    });
    
    if (mostRecentPayment?.obligation) {
      // Use the most recent week with verified payments
      targetWeek = mostRecentPayment.obligation.weekNumber;
      targetYear = mostRecentPayment.obligation.year;
    } else {
      // Fallback: find most recent week with obligations
      const mostRecentObligation = await prisma.weeklyObligation.findFirst({
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
        select: { weekNumber: true, year: true },
      });
      
      if (mostRecentObligation) {
        targetWeek = mostRecentObligation.weekNumber;
        targetYear = mostRecentObligation.year;
      } else {
        // Final fallback: current calendar week
        const startOfYear = new Date(targetYear, 0, 1);
        const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        targetWeek = Math.ceil(dayOfYear / 7);
        // Removed verbose logging - default to current week
      }
    }
  }

  // Get all available weeks/years for the filter dropdowns
  const allWeeks = await prisma.weeklyObligation.findMany({
    select: { weekNumber: true, year: true, dueDate: true },
    distinct: ['weekNumber', 'year'],
    orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    take: 52,
  });

  // Get obligations for target week (includes ALL members with obligations, regardless of approval status)
  const obligations = await prisma.weeklyObligation.findMany({
    where: { weekNumber: targetWeek, year: targetYear },
    include: {
      member: { select: { id: true, fullName: true, memberId: true, outstandingBalance: true } },
      payments: {
        select: { id: true, amount: true, paymentMethod: true, paymentDate: true, status: true, receiptNumber: true },
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  // Get APPROVED members for members without obligations
  const approvedMembers = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, fullName: true, memberId: true, outstandingBalance: true },
    orderBy: { fullName: 'asc' },
  });

  // Map member ID → obligation
  const obligationMap = new Map(obligations.map((o) => [o.memberId, o]));
  
  // Get all members: those with obligations PLUS approved members without obligations
  const obligationMemberIds = new Set(obligations.map(o => o.memberId));
  const approvedWithoutObligation = approvedMembers.filter(m => !obligationMemberIds.has(m.id));
  
  const members = [
    ...obligations.map(o => o.member),
    ...approvedWithoutObligation
  ].sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Get ALL verified payments for each member in this week range (to catch payments not linked to obligations)
  const weekStart = obligations.length > 0
    ? new Date(Math.min(...obligations.map(o => new Date(o.dueDate).getTime())) - 7 * 24 * 60 * 60 * 1000)
    : new Date(new Date().setDate(new Date().getDate() - 7));
  const weekEnd = obligations.length > 0
    ? new Date(Math.max(...obligations.map(o => new Date(o.dueDate).getTime())) + 24 * 60 * 60 * 1000)
    : new Date();

  const weekPayments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: weekStart, lte: weekEnd },
      status: { in: ['PENDING', 'VERIFIED'] },
    },
    select: { memberId: true, amount: true, status: true, paymentDate: true, paymentMethod: true, id: true, receiptNumber: true },
  });

  // Group payments by memberId
  const paymentsByMember = new Map<string, typeof weekPayments>();
  for (const p of weekPayments) {
    if (!paymentsByMember.has(p.memberId)) paymentsByMember.set(p.memberId, []);
    paymentsByMember.get(p.memberId)!.push(p);
  }

  // Build per-member status — check both obligation AND direct payments
  const memberStatuses = members.map((m) => {
    const obl = obligationMap.get(m.id);
    const directPayments = paymentsByMember.get(m.id) || [];

    // Determine effective status
    let effectiveStatus = obl ? obl.status : 'NO_OBLIGATION';
    let effectiveAmountPaid = obl ? Number(obl.amountPaid) : 0;
    const effectivePayments = obl?.payments || [];

    // If there are direct payments this week (not linked to obligation), factor them in
    if (directPayments.length > 0 && (effectiveStatus === 'PENDING' || effectiveStatus === 'NO_OBLIGATION')) {
      const totalDirectPaid = directPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalDue = obl ? Number(obl.totalDue) : null;
      if (totalDirectPaid > 0) {
        effectiveAmountPaid = Math.max(effectiveAmountPaid, totalDirectPaid);
        if (totalDue && totalDirectPaid >= totalDue) effectiveStatus = 'PAID';
        else if (totalDue && totalDirectPaid > 0) effectiveStatus = 'PARTIAL';
        else if (!totalDue) effectiveStatus = 'PAID'; // no obligation but payment exists → paid
      }
    }

    return {
      memberId: m.id,
      memberNumber: m.memberId,
      fullName: m.fullName,
      outstandingBalance: Number(m.outstandingBalance),
      obligationId: obl?.id || null,
      dueDate: obl?.dueDate || null,
      contributionAmount: obl ? Number(obl.contributionAmount) : null,
      penaltyAmount: obl ? Number(obl.penaltyAmount) : 0,
      totalDue: obl ? Number(obl.totalDue) : null,
      amountPaid: effectiveAmountPaid,
      status: effectiveStatus,
      isMonthlyPenalty: obl?.isMonthlyPenalty || false,
      consecutiveMissedWeeks: obl?.consecutiveMissedWeeks || 0,
      payments: [...effectivePayments, ...directPayments.filter(dp => !effectivePayments.find(ep => ep.id === dp.id))],
    };
  });

  // Summary stats
  const withObligation = memberStatuses.filter((m) => m.status !== 'NO_OBLIGATION');
  const paid = withObligation.filter((m) => m.status === 'PAID').length;
  const pending = withObligation.filter((m) => m.status === 'PENDING').length;
  const overdue = withObligation.filter((m) => m.status === 'OVERDUE').length;
  const partial = withObligation.filter((m) => m.status === 'PARTIAL').length;
  
  // For Weekly Contributions page:
  // - totalCollected should be contribution amounts ONLY (not penalties)
  // - totalExpected should be contribution amounts ONLY (not penalties)
  // Penalties are tracked separately in the Penalties tab
  const totalCollected = withObligation.reduce((s, m) => {
    if (m.contributionAmount === null) return s;
    // Only count the contribution portion, not penalty payments
    const contributionPaid = Math.min(m.amountPaid, m.contributionAmount);
    return s + contributionPaid;
  }, 0);
  
  const totalExpected = withObligation.reduce((s, m) => s + (m.contributionAmount || 0), 0);
  const totalPenalties = withObligation.reduce((s, m) => s + m.penaltyAmount, 0);

  sendSuccess(res, {
    week: targetWeek,
    year: targetYear,
    members: memberStatuses,
    availableWeeks: allWeeks,
    summary: { paid, pending, overdue, partial, total: withObligation.length, totalCollected, totalExpected, totalPenalties, noObligation: members.length - withObligation.length },
  }, 'general.success', lang);
});

// Manually trigger obligation creation for a specific week (admin only)
router.post('/contributions/weekly/generate', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { weeks = 1 } = req.body; // Number of weeks to generate (default: 1)
  
  if (weeks < 1 || weeks > 8) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  const { createWeeklyObligationsForMultipleWeeks } = await import('../services/contribution.service.js');
  const result = await createWeeklyObligationsForMultipleWeeks(weeks);
  
  sendSuccess(res, { 
    totalCreated: result.totalCreated,
    weeksSummary: result.weeksSummary 
  }, 'general.success', lang, 201);
});

// Get all obligations (weekly + special) for a specific member
router.get('/obligations/member/:memberId', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const memberId = String(req.params.memberId);

  const [weekly, special] = await Promise.all([
    prisma.weeklyObligation.findMany({
      where: { 
        memberId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, // Only show unpaid/partial obligations
      },
      select: {
        id: true,
        contributionAmount: true,
        amountPaid: true,
        status: true,
        dueDate: true,
        weekNumber: true,
        year: true,
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    }),
    prisma.specialContributionObligation.findMany({
      where: { 
        memberId,
        isExempt: false, // Don't show exempt obligations
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, // Only show unpaid/partial obligations
      },
      select: {
        id: true,
        amount: true,
        amountPaid: true,
        status: true,
        isExempt: true,
        specialContribution: { select: { title: true, titleOm: true, type: true, dueDate: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const obligations = [
    ...weekly.map(o => ({
      id: o.id,
      type: 'WEEKLY' as const,
      amount: Number(o.contributionAmount),
      amountPaid: Number(o.amountPaid),
      status: o.status,
      dueDate: o.dueDate,
      weekNumber: o.weekNumber,
      year: o.year,
    })),
    ...special.map(o => ({
      id: o.id,
      type: 'SPECIAL' as const,
      amount: Number(o.amount),
      amountPaid: Number(o.amountPaid),
      status: o.status,
      dueDate: o.specialContribution.dueDate,
      title: o.specialContribution.title,
      titleOm: o.specialContribution.titleOm,
      campaignType: o.specialContribution.type,
    })),
  ];

  sendSuccess(res, obligations, 'general.success', lang);
});

// Get all obligations (weekly + special) for bulk recording
// Return DISTINCT weeks/campaigns (not per-member obligations)
router.get('/obligations', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const [weekly, special] = await Promise.all([
    // Get DISTINCT weeks with unpaid obligations
    prisma.weeklyObligation.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
      distinct: ['weekNumber', 'year'],
      select: {
        id: true,
        memberId: true,
        contributionAmount: true,
        amountPaid: true,
        status: true,
        dueDate: true,
        weekNumber: true,
        year: true,
        member: { select: { fullName: true, memberId: true } },
      },
      orderBy: [{ dueDate: 'desc' }, { weekNumber: 'desc' }],
      take: 100,
    }),
    prisma.specialContributionObligation.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
      select: {
        id: true,
        memberId: true,
        amount: true,
        amountPaid: true,
        status: true,
        isExempt: true,
        specialContribution: { select: { title: true, titleOm: true, type: true, dueDate: true } },
        member: { select: { fullName: true, memberId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const obligations = [
    ...weekly.map(o => ({
      id: o.id,
      type: 'WEEKLY' as const,
      memberId: o.memberId,
      memberName: o.member.fullName,
      memberMemberId: o.member.memberId,
      amount: Number(o.contributionAmount),
      amountPaid: Number(o.amountPaid),
      status: o.status,
      dueDate: o.dueDate,
      weekNumber: o.weekNumber,
      year: o.year,
    })),
    ...special.map(o => ({
      id: o.id,
      type: 'SPECIAL' as const,
      memberId: o.memberId,
      memberName: o.member.fullName,
      memberMemberId: o.member.memberId,
      amount: Number(o.amount),
      amountPaid: Number(o.amountPaid),
      status: o.status,
      dueDate: o.specialContribution.dueDate,
      title: o.specialContribution.title,
      titleOm: o.specialContribution.titleOm,
      campaignType: o.specialContribution.type,
    })),
  ];

  sendSuccess(res, obligations, 'general.success', lang);
});

// --- Meetings ---
router.post('/meetings', authenticate, authorize('ADMIN'), validateBody(createMeetingSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const meeting = await prisma.meeting.create({
    data: { ...req.body, meetingDate: new Date(req.body.meetingDate), createdById: req.user!.userId },
  });
  sendSuccess(res, meeting, 'general.success', lang, 201);
});

router.get('/meetings', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const meetings = await prisma.meeting.findMany({ orderBy: { meetingDate: 'desc' } });
  sendSuccess(res, meetings, 'general.success', lang);
});

router.patch('/meetings/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, location, meetingDate, meetingTime, agenda } = req.body;
  const meeting = await prisma.meeting.update({
    where: { id: String(req.params.id) },
    data: {
      ...(title && { title }),
      ...(location !== undefined && { location }),
      ...(meetingDate && { meetingDate: new Date(meetingDate) }),
      ...(meetingTime !== undefined && { meetingTime }),
      ...(agenda !== undefined && { agenda }),
    },
  });
  await createAuditEntry(req.user!.userId, 'MEETING_UPDATED', 'meetings', { meetingId: meeting.id }, req.ip);
  sendSuccess(res, meeting, 'general.success', lang);
});

router.delete('/meetings/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  await prisma.meeting.delete({ where: { id: String(req.params.id) } });
  await createAuditEntry(req.user!.userId, 'MEETING_DELETED', 'meetings', { meetingId: req.params.id }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

// --- Attendance ---
router.post('/attendance', authenticate, authorize('ADMIN', 'AUDITOR'), validateBody(recordAttendanceSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { meetingId, records } = req.body;

  // Get the meeting date for context
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });

  // Get weekly penalty amount from settings
  const penaltySetting = await prisma.systemSetting.findUnique({ where: { key: 'weekly_penalty' } });
  const attendancePenaltyAmount = penaltySetting ? parseFloat(penaltySetting.value) : 50;

  // Get current week/year
  const meetingDate = meeting ? new Date(meeting.meetingDate) : new Date();
  const startOfYear = new Date(meetingDate.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((meetingDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil(dayOfYear / 7);
  const year = meetingDate.getFullYear();

  const results = await Promise.all(
    records.map((r: { memberId: string; status: string; remarks?: string }) =>
      prisma.attendance.upsert({
        where: { meetingId_memberId: { meetingId, memberId: r.memberId } },
        create: { meetingId, memberId: r.memberId, status: r.status as 'PRESENT' | 'ABSENT' | 'EXCUSED', remarks: r.remarks, recordedById: req.user!.userId },
        update: { status: r.status as 'PRESENT' | 'ABSENT' | 'EXCUSED', remarks: r.remarks },
      })
    )
  );

  // Penalties are created automatically by the scheduler for non-payment
  // Attendance tracking is separate from penalties - no attendance-based penalties

  await createAuditEntry(req.user!.userId, 'ATTENDANCE_RECORDED', 'attendance', { meetingId, count: records.length }, req.ip);
  sendSuccess(res, results, 'general.success', lang, 201);
});

// Get attendance for a specific meeting
router.get('/attendance/meeting/:meetingId', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const records = await prisma.attendance.findMany({
    where: { meetingId: String(req.params.meetingId) },
    include: { member: { select: { fullName: true, memberId: true } } },
  });
  sendSuccess(res, records, 'general.success', lang);
});

// Edit a single attendance record
router.patch('/attendance/:id', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { status, remarks } = req.body;

  // Get existing record before update
  const existing = await prisma.attendance.findUnique({
    where: { id: String(req.params.id) },
    include: { meeting: { select: { title: true, meetingDate: true } } },
  });

  const record = await prisma.attendance.update({
    where: { id: String(req.params.id) },
    data: {
      ...(status && { status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' }),
      ...(remarks !== undefined && { remarks }),
    },
    include: { member: { select: { fullName: true, memberId: true } } },
  });

  // Penalties are based on payment status only, not attendance
  // No penalty logic needed when editing attendance records

  await createAuditEntry(req.user!.userId, 'ATTENDANCE_UPDATED', 'attendance', { attendanceId: record.id }, req.ip);
  sendSuccess(res, record, 'general.success', lang);
});

// Delete a single attendance record
router.delete('/attendance/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  await prisma.attendance.delete({ where: { id: String(req.params.id) } });
  await createAuditEntry(req.user!.userId, 'ATTENDANCE_DELETED', 'attendance', { attendanceId: req.params.id }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

router.get('/attendance/my', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const member = await prisma.member.findUnique({ where: { userId: req.user!.userId } });
  if (!member) { sendError(res, 'member.notFound', lang, 404); return; }

  const records = await prisma.attendance.findMany({
    where: { memberId: member.id },
    include: { meeting: { select: { title: true, meetingDate: true, location: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const present = records.filter((r) => r.status === 'PRESENT').length;
  const percentage = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  sendSuccess(res, { records, attendancePercentage: percentage }, 'general.success', lang);
});

router.get('/attendance/report', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const records = await prisma.attendance.findMany({
    include: {
      member: { select: { fullName: true, memberId: true } },
      meeting: { select: { title: true, meetingDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  sendSuccess(res, records, 'general.success', lang);
});

// --- Transactions Ledger ---
router.get('/transactions', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const {
    memberId,
    type,
    from,
    to,
    page = '1',
    limit = '50',
  } = req.query as {
    memberId?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  // Build dynamic where clause — only include filters that are present
  const where: Record<string, unknown> = {};

  if (memberId) {
    where.memberId = memberId;
  }

  if (type && Object.values(TransactionType).includes(type as TransactionType)) {
    where.type = type as TransactionType;
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    where.createdAt = createdAt;
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { member: { select: { fullName: true, memberId: true } } },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  sendSuccess(res, transactions, 'general.success', lang, 200, {
    total,
    page: pageNum,
    limit: limitNum,
  });
});

export default router;
