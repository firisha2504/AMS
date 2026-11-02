import { Router, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import { updateSettingsSchema, paginationSchema, bulkSmsSchema, announcementSchema } from '../validators/schemas.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { config } from '../config/index.js';
import { exportToExcel, exportToPdf } from '../services/export.service.js';
import { t, Language } from '../utils/i18n.js';
import { sendSms } from '../services/notification.service.js';
import { upload } from '../middleware/upload.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  sendSuccess(res, settings, 'general.success', lang);
});

router.put('/', authenticate, authorize('ADMIN'), validateBody(updateSettingsSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { settings } = req.body;

  await Promise.all(
    settings.map((s: { key: string; value: string }) =>
      prisma.systemSetting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value },
        update: { value: s.value },
      })
    )
  );

  await createAuditEntry(req.user!.userId, 'SETTINGS_UPDATED', 'settings', { settings }, req.ip);
  sendSuccess(res, null, 'general.success', lang);
});

router.get('/audit-logs', authenticate, authorize('ADMIN'), validateQuery(paginationSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { page, limit } = req.validatedQuery as { page: number; limit: number };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { username: true, role: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);

  sendSuccess(res, logs, 'general.success', lang, 200, { page, limit, total });
});

router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const userId = req.user!.userId;

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  sendSuccess(res, notifications, 'general.success', lang);
});

router.patch('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  await prisma.notification.update({
    where: { id: String(req.params.id) },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'general.success', lang);
});

router.delete('/notifications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const notification = await prisma.notification.findUnique({ where: { id: String(req.params.id) } });
  if (!notification) { sendError(res, 'general.notFound', lang, 404); return; }
  if (notification.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    sendError(res, 'general.unauthorized', lang, 403);
    return;
  }
  await prisma.notification.delete({ where: { id: String(req.params.id) } });
  sendSuccess(res, null, 'general.success', lang);
});

router.patch('/notifications/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, message } = req.body;
  const notification = await prisma.notification.findUnique({ where: { id: String(req.params.id) } });
  if (!notification) { sendError(res, 'general.notFound', lang, 404); return; }
  
  const updated = await prisma.notification.update({
    where: { id: String(req.params.id) },
    data: {
      ...(title !== undefined && { title, titleOm: title }),
      ...(message !== undefined && { message, messageOm: message }),
    },
  });
  sendSuccess(res, updated, 'general.success', lang);
});

router.get('/reports/:type', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { type } = req.params;
  const { from, to } = req.query as { from?: string; to?: string };

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to) }),
  };

  let data: unknown;

  switch (type) {
    case 'unpaid': {
      // Fetch all unpaid/partial/overdue obligations
      const [weeklyObligations, specialObligations, penalties] = await Promise.all([
        prisma.weeklyObligation.findMany({
          where: { 
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            member: { status: 'APPROVED' } // Only active members
          },
          select: {
            id: true,
            weekNumber: true,
            year: true,
            contributionAmount: true,
            penaltyAmount: true,
            totalDue: true,
            amountPaid: true,
            status: true,
            dueDate: true,
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ dueDate: 'asc' }, { member: { fullName: 'asc' } }],
        }),
        prisma.specialContributionObligation.findMany({
          where: { 
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            isExempt: false,
            member: { status: 'APPROVED' } // Only active members
          },
          select: {
            id: true,
            amount: true,
            amountPaid: true,
            status: true,
            specialContribution: { 
              select: { 
                title: true, 
                titleOm: true, 
                type: true, 
                dueDate: true,
                campaignId: true
              } 
            },
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ specialContribution: { dueDate: 'asc' } }, { member: { fullName: 'asc' } }],
        }),
        prisma.penalty.findMany({
          where: { 
            status: 'OUTSTANDING',
            member: { status: 'APPROVED' } // Only active members
          },
          select: {
            id: true,
            amount: true,
            reason: true,
            weekNumber: true,
            year: true,
            isMonthly: true,
            status: true,
            createdAt: true,
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ createdAt: 'desc' }, { member: { fullName: 'asc' } }],
        }),
      ]);

      // Calculate totals
      const weeklyUnpaid = weeklyObligations.reduce((sum, o) => 
        sum + (Number(o.totalDue) - Number(o.amountPaid)), 0
      );
      const specialUnpaid = specialObligations.reduce((sum, o) => 
        sum + (Number(o.amount) - Number(o.amountPaid)), 0
      );
      const penaltiesUnpaid = penalties.reduce((sum, p) => 
        sum + Number(p.amount), 0
      );

      // Get unique members with unpaid contributions
      const uniqueMemberIds = new Set([
        ...weeklyObligations.map(o => o.member.id),
        ...specialObligations.map(o => o.member.id),
        ...penalties.map(p => p.member.id)
      ]);

      data = {
        summary: {
          weeklyCount: weeklyObligations.length,
          specialCount: specialObligations.length,
          penaltiesCount: penalties.length,
          weeklyUnpaidAmount: weeklyUnpaid,
          specialUnpaidAmount: specialUnpaid,
          penaltiesUnpaidAmount: penaltiesUnpaid,
          totalUnpaidAmount: weeklyUnpaid + specialUnpaid + penaltiesUnpaid,
          uniqueMembers: uniqueMemberIds.size,
        },
        weeklyObligations,
        specialObligations,
        penalties,
      };
      break;
    }
    case 'contributions':
      // Only show weekly contribution amounts (exclude penalty portions)
      const allPayments = await prisma.payment.findMany({
        where: { paymentDate: dateFilter, status: 'VERIFIED', obligationId: { not: null } },
        include: { 
          member: { select: { fullName: true, memberId: true } },
          obligation: { select: { contributionAmount: true, penaltyAmount: true } },
        },
        orderBy: { paymentDate: 'desc' },
      });
      
      // Calculate contribution portion only (exclude penalties from payment amounts)
      data = allPayments.map(payment => {
        const amount = Number(payment.amount);
        const contributionAmount = payment.obligation ? Number(payment.obligation.contributionAmount) : amount;
        // Only count up to the contribution amount (not the penalty part)
        const contributionPortion = Math.min(amount, contributionAmount);
        
        return {
          ...payment,
          amount: contributionPortion, // Replace with contribution portion only
          obligation: undefined, // Remove obligation from response
        };
      });
      break;
    case 'penalties':
      // Only show SETTLED penalties (actually paid penalties) in the report
      data = await prisma.penalty.findMany({
        where: { 
          createdAt: dateFilter,
          status: 'SETTLED', // Only show paid penalties
        },
        include: { member: { select: { fullName: true, memberId: true } } },
        orderBy: { createdAt: 'desc' },
      });
      break;
    case 'attendance':
      data = await prisma.attendance.findMany({
        where: { createdAt: dateFilter },
        include: {
          member: { select: { fullName: true, memberId: true } },
          meeting: { select: { title: true, meetingDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      break;
    case 'special-contributions':
      data = await prisma.specialContribution.findMany({
        where: { createdAt: dateFilter },
        include: {
          beneficiaryMember: { select: { fullName: true, memberId: true } },
          _count: { select: { obligations: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      break;
    case 'year-end': {
      const year = new Date().getFullYear();
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);

      const [contributions, penalties, attendanceCount, topContributors, outstanding] =
        await Promise.all([
          prisma.payment.aggregate({
            where: { paymentDate: { gte: yearStart, lte: yearEnd }, status: 'VERIFIED' },
            _sum: { amount: true },
          }),
          prisma.penalty.aggregate({
            where: { createdAt: { gte: yearStart, lte: yearEnd } },
            _sum: { amount: true },
          }),
          prisma.attendance.count({ where: { createdAt: { gte: yearStart, lte: yearEnd } } }),
          prisma.payment.groupBy({
            by: ['memberId'],
            where: { paymentDate: { gte: yearStart, lte: yearEnd }, status: 'VERIFIED' },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10,
          }),
          prisma.member.aggregate({ _sum: { outstandingBalance: true } }),
        ]);

      data = {
        year,
        totalContributions: contributions._sum.amount || 0,
        totalPenalties: penalties._sum.amount || 0,
        totalAttendance: attendanceCount,
        topContributors,
        outstandingBalances: outstanding._sum.outstandingBalance || 0,
      };
      break;
    }
    default:
      data = [];
  }

  sendSuccess(res, data, 'general.success', lang);
});

router.get('/reports/:type/export', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = (req.lang || 'om') as Language;
  const { type } = req.params;
  const { format = 'excel', from, to } = req.query as { format?: string; from?: string; to?: string };

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to) }),
  };

  type ExportConfig = {
    title: string;
    pdfHeaders: string[];
    pdfRows: string[][];
    excelColumns: { header: string; key: string; width?: number }[];
    excelRows: Record<string, unknown>[];
  };

  let exportConfig: ExportConfig | null = null;

  switch (type) {
    case 'unpaid': {
      // Fetch all unpaid/partial/overdue obligations
      const [weeklyObligations, specialObligations, penalties] = await Promise.all([
        prisma.weeklyObligation.findMany({
          where: { 
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            member: { status: 'APPROVED' }
          },
          select: {
            id: true,
            weekNumber: true,
            year: true,
            contributionAmount: true,
            penaltyAmount: true,
            totalDue: true,
            amountPaid: true,
            status: true,
            dueDate: true,
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ dueDate: 'asc' }, { member: { fullName: 'asc' } }],
        }),
        prisma.specialContributionObligation.findMany({
          where: { 
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            isExempt: false,
            member: { status: 'APPROVED' }
          },
          select: {
            id: true,
            amount: true,
            amountPaid: true,
            status: true,
            specialContribution: { 
              select: { 
                title: true, 
                titleOm: true, 
                type: true, 
                dueDate: true,
                campaignId: true
              } 
            },
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ specialContribution: { dueDate: 'asc' } }, { member: { fullName: 'asc' } }],
        }),
        prisma.penalty.findMany({
          where: { 
            status: 'OUTSTANDING',
            member: { status: 'APPROVED' }
          },
          select: {
            id: true,
            amount: true,
            reason: true,
            weekNumber: true,
            year: true,
            isMonthly: true,
            status: true,
            createdAt: true,
            member: { 
              select: { 
                id: true,
                fullName: true, 
                memberId: true,
                outstandingBalance: true,
                user: { select: { phone: true } }
              } 
            },
          },
          orderBy: [{ createdAt: 'desc' }, { member: { fullName: 'asc' } }],
        }),
      ]);

      // Calculate totals
      const weeklyUnpaid = weeklyObligations.reduce((sum, o) => 
        sum + (Number(o.totalDue) - Number(o.amountPaid)), 0
      );
      const specialUnpaid = specialObligations.reduce((sum, o) => 
        sum + (Number(o.amount) - Number(o.amountPaid)), 0
      );
      const penaltiesUnpaid = penalties.reduce((sum, p) => 
        sum + Number(p.amount), 0
      );

      // Build export data combining all three types
      const allItems: Array<{
        memberId: string;
        name: string;
        type: string;
        amount: number;
        reason?: string;
        status: string;
        date: string;
      }> = [];

      weeklyObligations.forEach(o => {
        const remaining = Number(o.totalDue) - Number(o.amountPaid);
        if (remaining > 0) {
          allItems.push({
            memberId: o.member.memberId,
            name: o.member.fullName,
            type: `Weekly Week ${o.weekNumber}/${o.year}`,
            amount: remaining,
            status: o.status,
            date: new Date(o.dueDate).toLocaleDateString(),
          });
        }
      });

      specialObligations.forEach(o => {
        const remaining = Number(o.amount) - Number(o.amountPaid);
        if (remaining > 0) {
          allItems.push({
            memberId: o.member.memberId,
            name: o.member.fullName,
            type: `Special: ${o.specialContribution.title}`,
            amount: remaining,
            status: o.status,
            date: o.specialContribution.dueDate ? new Date(o.specialContribution.dueDate).toLocaleDateString() : '—',
          });
        }
      });

      penalties.forEach(p => {
        allItems.push({
          memberId: p.member.memberId,
          name: p.member.fullName,
          type: `${p.isMonthly ? 'Monthly' : 'Weekly'} Penalty`,
          amount: Number(p.amount),
          reason: p.reason,
          status: p.status,
          date: new Date(p.createdAt).toLocaleDateString(),
        });
      });

      exportConfig = {
        title: t(lang, 'reports.titleUnpaid'),
        pdfHeaders: [
          t(lang, 'reports.headerMemberId'),
          t(lang, 'reports.headerName'),
          t(lang, 'reports.headerType'),
          t(lang, 'reports.headerAmount'),
          t(lang, 'reports.headerReason'),
          t(lang, 'reports.headerStatus'),
          t(lang, 'reports.headerDate'),
        ],
        pdfRows: allItems.map((item) => [
          item.memberId,
          item.name,
          item.type,
          String(item.amount),
          item.reason || '—',
          item.status,
          item.date,
        ]),
        excelColumns: [
          { header: t(lang, 'reports.headerMemberId'), key: 'memberId', width: 12 },
          { header: t(lang, 'reports.headerName'), key: 'name', width: 25 },
          { header: t(lang, 'reports.headerType'), key: 'type', width: 25 },
          { header: t(lang, 'reports.headerAmount'), key: 'amount', width: 12 },
          { header: t(lang, 'reports.headerReason'), key: 'reason', width: 25 },
          { header: t(lang, 'reports.headerStatus'), key: 'status', width: 12 },
          { header: t(lang, 'reports.headerDate'), key: 'date', width: 15 },
        ],
        excelRows: allItems.map((item) => ({
          memberId: item.memberId,
          name: item.name,
          type: item.type,
          amount: item.amount,
          reason: item.reason || '—',
          status: item.status,
          date: item.date,
        })),
      };
      break;
    }
    case 'contributions': {
      const allPayments = await prisma.payment.findMany({
        where: { paymentDate: dateFilter, status: 'VERIFIED' },
        include: { member: { select: { fullName: true, memberId: true } } },
        orderBy: { paymentDate: 'desc' },
      });
      // Filter out penalty payments
      const payments = allPayments.filter(p => !p.notes?.toLowerCase().includes('penalty'));
      exportConfig = {
        title: t(lang, 'reports.titleContributions'),
        pdfHeaders: [
          t(lang, 'reports.headerMemberId'),
          t(lang, 'reports.headerName'),
          t(lang, 'reports.headerAmount'),
          t(lang, 'reports.headerMethod'),
          t(lang, 'reports.headerDate'),
        ],
        pdfRows: payments.map((p) => [
          p.member.memberId,
          p.member.fullName,
          String(p.amount),
          p.paymentMethod,
          new Date(p.paymentDate).toLocaleDateString(),
        ]),
        excelColumns: [
          { header: t(lang, 'reports.headerMemberId'), key: 'memberId', width: 15 },
          { header: t(lang, 'reports.headerName'), key: 'name', width: 25 },
          { header: t(lang, 'reports.headerAmount'), key: 'amount', width: 12 },
          { header: t(lang, 'reports.headerMethod'), key: 'method', width: 15 },
          { header: t(lang, 'reports.headerDate'), key: 'date', width: 15 },
        ],
        excelRows: payments.map((p) => ({
          memberId: p.member.memberId,
          name: p.member.fullName,
          amount: Number(p.amount),
          method: p.paymentMethod,
          date: new Date(p.paymentDate).toLocaleDateString(),
        })),
      };
      break;
    }
    case 'penalties': {
      const penalties = await prisma.penalty.findMany({
        where: { createdAt: dateFilter },
        include: { member: { select: { fullName: true, memberId: true } } },
        orderBy: { createdAt: 'desc' },
      });
      exportConfig = {
        title: t(lang, 'reports.titlePenalties'),
        pdfHeaders: [
          t(lang, 'reports.headerMemberId'),
          t(lang, 'reports.headerName'),
          t(lang, 'reports.headerAmount'),
          t(lang, 'reports.headerReason'),
          t(lang, 'reports.headerDate'),
        ],
        pdfRows: penalties.map((p) => [
          p.member.memberId,
          p.member.fullName,
          String(p.amount),
          p.reason,
          new Date(p.createdAt).toLocaleDateString(),
        ]),
        excelColumns: [
          { header: t(lang, 'reports.headerMemberId'), key: 'memberId', width: 15 },
          { header: t(lang, 'reports.headerName'), key: 'name', width: 25 },
          { header: t(lang, 'reports.headerAmount'), key: 'amount', width: 12 },
          { header: t(lang, 'reports.headerReason'), key: 'reason', width: 25 },
          { header: t(lang, 'reports.headerDate'), key: 'date', width: 15 },
        ],
        excelRows: penalties.map((p) => ({
          memberId: p.member.memberId,
          name: p.member.fullName,
          amount: Number(p.amount),
          reason: p.reason,
          date: new Date(p.createdAt).toLocaleDateString(),
        })),
      };
      break;
    }
    case 'attendance': {
      const records = await prisma.attendance.findMany({
        where: { createdAt: dateFilter },
        include: {
          member: { select: { fullName: true, memberId: true } },
          meeting: { select: { title: true, meetingDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      exportConfig = {
        title: t(lang, 'reports.titleAttendance'),
        pdfHeaders: [
          t(lang, 'reports.headerMemberId'),
          t(lang, 'reports.headerName'),
          t(lang, 'reports.headerMeeting'),
          t(lang, 'reports.headerStatus'),
          t(lang, 'reports.headerDate'),
        ],
        pdfRows: records.map((r) => [
          r.member.memberId,
          r.member.fullName,
          r.meeting.title,
          r.status,
          new Date(r.meeting.meetingDate).toLocaleDateString(),
        ]),
        excelColumns: [
          { header: t(lang, 'reports.headerMemberId'), key: 'memberId', width: 15 },
          { header: t(lang, 'reports.headerName'), key: 'name', width: 25 },
          { header: t(lang, 'reports.headerMeeting'), key: 'meeting', width: 25 },
          { header: t(lang, 'reports.headerStatus'), key: 'status', width: 12 },
          { header: t(lang, 'reports.headerDate'), key: 'date', width: 15 },
        ],
        excelRows: records.map((r) => ({
          memberId: r.member.memberId,
          name: r.member.fullName,
          meeting: r.meeting.title,
          status: r.status,
          date: new Date(r.meeting.meetingDate).toLocaleDateString(),
        })),
      };
      break;
    }
    case 'special-contributions': {
      const items = await prisma.specialContribution.findMany({
        where: { createdAt: dateFilter },
        include: {
          beneficiaryMember: { select: { fullName: true, memberId: true } },
          _count: { select: { obligations: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      exportConfig = {
        title: t(lang, 'reports.titleSpecialContributions'),
        pdfHeaders: [
          t(lang, 'reports.headerType'),
          t(lang, 'reports.headerBeneficiary'),
          t(lang, 'reports.headerAmount'),
          t(lang, 'reports.headerObligations'),
          t(lang, 'reports.headerDate'),
        ],
        pdfRows: items.map((i) => [
          i.type,
          i.beneficiaryMember?.fullName ?? '-',
          String(i.amount),
          String(i._count.obligations),
          new Date(i.createdAt).toLocaleDateString(),
        ]),
        excelColumns: [
          { header: t(lang, 'reports.headerType'), key: 'type', width: 15 },
          { header: t(lang, 'reports.headerBeneficiary'), key: 'beneficiary', width: 25 },
          { header: t(lang, 'reports.headerAmount'), key: 'amount', width: 12 },
          { header: t(lang, 'reports.headerObligations'), key: 'obligations', width: 12 },
          { header: t(lang, 'reports.headerDate'), key: 'date', width: 15 },
        ],
        excelRows: items.map((i) => ({
          type: i.type,
          beneficiary: i.beneficiaryMember?.fullName ?? '-',
          amount: Number(i.amount),
          obligations: i._count.obligations,
          date: new Date(i.createdAt).toLocaleDateString(),
        })),
      };
      break;
    }
    case 'year-end': {
      const year = new Date().getFullYear();
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      const [contributions, penalties, attendanceCount, outstanding] = await Promise.all([
        prisma.payment.aggregate({
          where: { paymentDate: { gte: yearStart, lte: yearEnd }, status: 'VERIFIED' },
          _sum: { amount: true },
        }),
        prisma.penalty.aggregate({
          where: { createdAt: { gte: yearStart, lte: yearEnd } },
          _sum: { amount: true },
        }),
        prisma.attendance.count({ where: { createdAt: { gte: yearStart, lte: yearEnd } } }),
        prisma.member.aggregate({ _sum: { outstandingBalance: true } }),
      ]);
      const summary = [
        { metric: t(lang, 'reports.metricYear'), value: String(year) },
        { metric: t(lang, 'reports.metricTotalContributions'), value: String(contributions._sum.amount || 0) },
        { metric: t(lang, 'reports.metricTotalPenalties'), value: String(penalties._sum.amount || 0) },
        { metric: t(lang, 'reports.metricAttendanceRecords'), value: String(attendanceCount) },
        { metric: t(lang, 'reports.metricOutstandingBalances'), value: String(outstanding._sum.outstandingBalance || 0) },
      ];
      exportConfig = {
        title: `${t(lang, 'reports.titleYearEnd')} ${year}`,
        pdfHeaders: [t(lang, 'reports.headerMetric'), t(lang, 'reports.headerValue')],
        pdfRows: summary.map((s) => [s.metric, s.value]),
        excelColumns: [
          { header: t(lang, 'reports.headerMetric'), key: 'metric', width: 30 },
          { header: t(lang, 'reports.headerValue'), key: 'value', width: 20 },
        ],
        excelRows: summary,
      };
      break;
    }
  }

  if (!exportConfig) {
    res.status(400).json({ success: false, message: 'Export not supported for this report type' });
    return;
  }

  const filename = `${type}-${Date.now()}`;
  if (format === 'pdf') {
    exportToPdf(res, filename, exportConfig.title, exportConfig.pdfHeaders, exportConfig.pdfRows, lang);
    return;
  }

  await exportToExcel(res, filename, exportConfig.excelColumns, exportConfig.excelRows, lang);
});

router.post('/announcements', authenticate, authorize('ADMIN'), validateBody(announcementSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, titleOm, message, messageOm } = req.body;

  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: 'SYSTEM_ANNOUNCEMENT' as const,
      title,
      titleOm: titleOm ?? title,
      message,
      messageOm: messageOm ?? message,
    })),
  });

  await createAuditEntry(req.user!.userId, 'ANNOUNCEMENT_CREATED', 'notifications', { title }, req.ip);
  sendSuccess(res, { sent: users.length }, 'general.success', lang, 201);
});

router.post('/sms/bulk', authenticate, authorize('ADMIN'), validateBody(bulkSmsSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { message, phones, sendToAll } = req.body;

  let targetPhones: string[] = phones ?? [];
  if (sendToAll) {
    const members = await prisma.member.findMany({
      where: { status: 'APPROVED' },
      include: { user: { select: { phone: true } } },
    });
    targetPhones = members.map((m) => m.user.phone).filter(Boolean) as string[];
  }

  let sent = 0;
  for (const phone of targetPhones) {
    const ok = await sendSms(phone, message);
    if (ok) sent++;
  }

  await createAuditEntry(req.user!.userId, 'BULK_SMS_SENT', 'sms', { count: sent }, req.ip);
  sendSuccess(res, { sent, total: targetPhones.length }, 'general.success', lang);
});

router.post('/backups/:id/restore', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const backup = await prisma.backup.findUnique({ where: { id: String(req.params.id) } });
  if (!backup) {
    sendError(res, 'general.notFound', lang, 404);
    return;
  }

  const fs = await import('fs/promises');
  const content = await fs.readFile(backup.filePath, 'utf-8');
  const data = JSON.parse(content) as {
    settings?: Array<{ key: string; value: string }>;
    members?: Array<{ id: string; outstandingBalance?: number | string }>;
    payments?: Array<{ id: string; memberId: string; [key: string]: unknown }>;
  };

  let settingsRestored = 0;
  let membersRestored = 0;
  let paymentsRestored = 0;

  if (data.settings?.length) {
    for (const s of data.settings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value },
        update: { value: s.value },
      });
      settingsRestored++;
    }
  }

  if (data.members?.length) {
    for (const m of data.members) {
      const existing = await prisma.member.findUnique({ where: { id: m.id } });
      if (!existing) continue;
      await prisma.member.update({
        where: { id: m.id },
        data: {
          outstandingBalance: m.outstandingBalance ?? existing.outstandingBalance,
        },
      });
      membersRestored++;
    }
  }

  if (data.payments?.length) {
    for (const p of data.payments) {
      const existing = await prisma.payment.findUnique({ where: { id: p.id } });
      if (!existing) continue;
      await prisma.payment.update({
        where: { id: p.id },
        data: {
          amount: p.amount !== undefined ? Number(p.amount) : undefined,
          status: typeof p.status === 'string' ? (p.status as 'PENDING' | 'VERIFIED' | 'REJECTED') : undefined,
          notes: typeof p.notes === 'string' ? p.notes : undefined,
        },
      });
      paymentsRestored++;
    }
  }

  await createAuditEntry(req.user!.userId, 'BACKUP_RESTORED', 'backup', { filename: backup.filename }, req.ip);
  sendSuccess(
    res,
    {
      restored: true,
      settingsRestored,
      membersRestored,
      paymentsRestored,
      note: 'Settings, member balances, and payment records restored where possible',
    },
    'general.success',
    lang
  );
});

router.post('/backups', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const filename = `backup-${Date.now()}.json`;

  const backupData = {
    timestamp: new Date().toISOString(),
    members: await prisma.member.findMany(),
    payments: await prisma.payment.findMany(),
    settings: await prisma.systemSetting.findMany(),
  };

  const fs = await import('fs/promises');
  const path = await import('path');
  const backupDir = config.backup.dir;
  await fs.mkdir(backupDir, { recursive: true });
  const filePath = path.join(backupDir, filename);
  const content = JSON.stringify(backupData, null, 2);
  await fs.writeFile(filePath, content);

  const backup = await prisma.backup.create({
    data: {
      filename,
      filePath,
      fileSize: Buffer.byteLength(content),
      type: 'manual',
      createdBy: req.user!.userId,
    },
  });

  await createAuditEntry(req.user!.userId, 'BACKUP_CREATED', 'backup', { filename }, req.ip);
  sendSuccess(res, backup, 'general.success', lang, 201);
});

router.get('/backups', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
  sendSuccess(res, backups, 'general.success', lang);
});

// Upload mobile app logo
router.post('/logo', authenticate, authorize('ADMIN'), upload.single('logo'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  
  if (!req.file) {
    sendError(res, 'No logo file uploaded', lang, 400);
    return;
  }

  // Save logo path to SystemSetting
  const logoPath = `/uploads/${req.file.filename}`;
  await prisma.systemSetting.upsert({
    where: { key: 'mobile_app_logo' },
    create: { 
      key: 'mobile_app_logo', 
      value: logoPath,
      label: 'Mobile App Logo',
      labelOm: 'Sajoo Bilbilaa Mobaayilaa'
    },
    update: { value: logoPath },
  });

  await createAuditEntry(req.user!.userId, 'LOGO_UPLOADED', 'settings', { logoPath }, req.ip);
  sendSuccess(res, { logoPath }, 'general.success', lang);
});

// Get current logo path (JSON response for frontend)
router.get('/logo/info', async (_req, res: Response) => {
  try {
    const logoSetting = await prisma.systemSetting.findUnique({
      where: { key: 'mobile_app_logo' },
    });

    if (!logoSetting || !logoSetting.value) {
      sendSuccess(res, { logoPath: null }, 'general.success', 'om');
      return;
    }

    sendSuccess(res, { logoPath: logoSetting.value }, 'general.success', 'om');
  } catch (error) {
    sendError(res, 'general.error', 'om', 500);
  }
});

// Get current logo (public endpoint - serves file directly)
router.get('/logo', async (_req, res: Response) => {
  try {
    const logoSetting = await prisma.systemSetting.findUnique({
      where: { key: 'mobile_app_logo' },
    });

    if (!logoSetting || !logoSetting.value) {
      res.status(404).json({ success: false, message: 'No logo uploaded' });
      return;
    }

    const logoPath = path.join(__dirname, '..', '..', logoSetting.value);
    
    // Check if file exists
    try {
      await fs.access(logoPath);
      res.sendFile(logoPath);
    } catch {
      res.status(404).json({ success: false, message: 'Logo file not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logo' });
  }
});

// Reset database (ADMIN only) - clears all data except admin user and settings
router.post('/reset-database', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  
  // Double confirmation check
  const { confirm: confirmReset } = req.body;
  if (!confirmReset || confirmReset !== true) {
    sendError(res, 'Confirmation required', lang, 400);
    return;
  }

  try {
    // Create backup before reset
    const filename = `backup-before-reset-${Date.now()}.json`;
    const backupData = {
      members: await prisma.member.findMany(),
      payments: await prisma.payment.findMany(),
      penalties: await prisma.penalty.findMany(),
      obligations: await prisma.weeklyObligation.findMany(),
    };
    const backupDir = config.backup.dir;
    await fs.mkdir(backupDir, { recursive: true });
    const filePath = path.join(backupDir, filename);
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    await prisma.backup.create({
      data: {
        filename,
        filePath,
        type: 'auto-before-reset',
        fileSize: JSON.stringify(backupData).length,
      },
    });

    // Delete all data (keeping admin and settings)
    await Promise.all([
      prisma.payment.deleteMany({}),
      prisma.penalty.deleteMany({}),
      prisma.weeklyObligation.deleteMany({}),
      prisma.joiningObligation.deleteMany({}),
      prisma.specialContributionObligation.deleteMany({}),
      prisma.attendance.deleteMany({}),
      prisma.meeting.deleteMany({}),
      prisma.transaction.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.refreshToken.deleteMany({}),
      prisma.otpCode.deleteMany({}),
    ]);

    // Delete members (which cascades to delete related records)
    await prisma.member.deleteMany({});

    // Delete non-admin users
    const memberUsers = await prisma.user.findMany({ where: { role: 'MEMBER' } });
    for (const user of memberUsers) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    await createAuditEntry(req.user!.userId, 'DATABASE_RESET', 'admin', { reason: 'Manual reset by admin' }, req.ip);

    sendSuccess(res, {
      message: 'Database reset successful. Auto-backup created before reset.',
      backupFile: filename,
    }, 'general.success', lang);
  } catch (error) {
    console.error('Reset database error:', error);
    sendError(res, 'Error resetting database', lang, 500);
  }
});

export default router;

// Get contribution rate history
router.get('/contribution-rates', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const rates = await prisma.contributionRateHistory.findMany({
    orderBy: { effectiveDate: 'desc' }
  });
  sendSuccess(res, rates, 'general.success', lang);
});

// Add new contribution rate (when amount changes)
router.post('/contribution-rates', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { effectiveDate, weeklyAmount, description } = req.body;

  if (!effectiveDate || !weeklyAmount) {
    sendError(res, 'general.validationError', lang, 400);
    return;
  }

  const rate = await prisma.contributionRateHistory.create({
    data: {
      effectiveDate: new Date(effectiveDate),
      weeklyAmount: new Decimal(weeklyAmount),
      description,
      createdBy: req.user?.userId,
    }
  });

  await createAuditEntry(req.user!.userId, 'CONTRIBUTION_RATE_ADDED', 'settings', { rateId: rate.id, amount: weeklyAmount }, req.ip);
  sendSuccess(res, rate, 'general.success', lang, 201);
});

// Calculate joining obligation with variable rates
router.post('/calculate-joining-with-rates', authenticate, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { joinDate, groupStartDate } = req.body;

  if (!joinDate || !groupStartDate) {
    sendError(res, 'general.validationError', lang, 400);
    return;
  }

  try {
    const join = new Date(joinDate);
    const groupStart = new Date(groupStartDate);

    // Get all contribution rates between group start and join date
    const rates = await prisma.contributionRateHistory.findMany({
      where: {
        effectiveDate: { lte: join }
      },
      orderBy: { effectiveDate: 'desc' }
    });

    if (rates.length === 0) {
      // No rate history, use current setting
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'weekly_contribution' }
      });
      const weeklyAmount = Number(setting?.value || 50);
      const weeks = Math.floor((join.getTime() - groupStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const total = weeks * weeklyAmount;
      
      sendSuccess(res, {
        joinDate: join,
        groupStartDate: groupStart,
        weeksBefore: weeks,
        rates: [{
          effectiveDate: groupStart,
          weeklyAmount,
          weeks,
          subtotal: weeks * weeklyAmount
        }],
        totalAmount: total
      }, 'general.success', lang);
      return;
    }

    // Calculate with rate history
    let total = 0;
    const breakdown: any[] = [];
    let currentDate = join;

    for (let i = 0; i < rates.length; i++) {
      const rate = rates[i];
      const nextRateDate = i > 0 ? rates[i - 1].effectiveDate : groupStart;
      
      if (nextRateDate >= currentDate) continue;
      
      const weeks = Math.floor((currentDate.getTime() - nextRateDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const subtotal = weeks * Number(rate.weeklyAmount);
      
      breakdown.push({
        period: `${nextRateDate.toLocaleDateString()} - ${currentDate.toLocaleDateString()}`,
        weeklyAmount: Number(rate.weeklyAmount),
        weeks,
        subtotal
      });
      
      total += subtotal;
      currentDate = nextRateDate;
    }

    sendSuccess(res, {
      joinDate: join,
      groupStartDate: groupStart,
      breakdown,
      totalAmount: total
    }, 'general.success', lang);
  } catch (error) {
    sendError(res, 'general.error', lang, 500);
  }
});
