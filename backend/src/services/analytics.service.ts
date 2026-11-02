import prisma from '../config/database.js';
import { getOrganizationFinancialSummary, getMemberFinancialSummary } from './financial-calculator.service.js';

export interface DateFilter {
  range?: 'today' | 'week' | 'month' | 'year' | 'custom' | string;
  startDate?: string;
  endDate?: string;
  meetingType?: string;
}

export function getDateBounds(filter?: DateFilter): { start?: Date; end?: Date } {
  if (!filter || !filter.range || filter.range === 'all') return {};

  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter.range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week': {
      start = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'custom':
      if (filter.startDate) start = new Date(filter.startDate);
      else start = new Date(now.getFullYear(), 0, 1);
      if (filter.endDate) end = new Date(filter.endDate);
      break;
    default:
      return {};
  }

  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Attendance Analytics
// ─────────────────────────────────────────────────────────────────────────────
export async function getAttendanceAnalytics(filter?: DateFilter) {
  const { start, end } = getDateBounds(filter);

  const meetingWhere: any = {};
  if (start || end) {
    meetingWhere.meetingDate = {};
    if (start) meetingWhere.meetingDate.gte = start;
    if (end) meetingWhere.meetingDate.lte = end;
  }

  const meetings = await prisma.meeting.findMany({
    where: meetingWhere,
    include: {
      attendance: {
        include: {
          member: { select: { id: true, memberId: true, fullName: true } },
        },
      },
    },
    orderBy: { meetingDate: 'asc' },
  });

  const totalMembersCount = await prisma.member.count({ where: { status: 'APPROVED' } });

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let lateCount = 0;

  const meetingComparison = meetings.map((m) => {
    let mPresent = 0;
    let mAbsent = 0;
    let mExcused = 0;
    let mLate = 0;

    m.attendance.forEach((att) => {
      const isLate = att.remarks?.toLowerCase().includes('late') || false;
      if (isLate) {
        mLate++;
        lateCount++;
      }
      if (att.status === 'PRESENT') {
        mPresent++;
        presentCount++;
      } else if (att.status === 'ABSENT') {
        mAbsent++;
        absentCount++;
      } else if (att.status === 'EXCUSED') {
        mExcused++;
        excusedCount++;
      }
    });

    const eligible = Math.max(m.attendance.length, totalMembersCount || 1);
    const effectiveEligible = Math.max(1, eligible - mExcused);
    const rate = Math.min(100, Math.round(((mPresent + mLate) / effectiveEligible) * 100));

    return {
      id: m.id,
      title: m.title,
      date: m.meetingDate.toISOString().split('T')[0],
      present: mPresent,
      absent: mAbsent,
      excused: mExcused,
      late: mLate,
      totalAttendees: m.attendance.length,
      attendanceRate: rate,
    };
  });

  // Calculate overall attendance rate: (Present / (Eligible - Excused)) * 100
  const totalRecorded = presentCount + absentCount + excusedCount;
  const denominator = Math.max(1, totalRecorded - excusedCount);
  const overallRate = totalRecorded > 0 ? Math.min(100, Math.round((presentCount / denominator) * 100)) : 0;

  // Member-specific attendance performance
  const memberAttendanceMap: Record<string, { memberId: string; fullName: string; present: number; absent: number; excused: number; total: number }> = {};
  
  meetings.forEach((m) => {
    m.attendance.forEach((att) => {
      if (!memberAttendanceMap[att.memberId]) {
        memberAttendanceMap[att.memberId] = {
          memberId: att.member.memberId,
          fullName: att.member.fullName,
          present: 0,
          absent: 0,
          excused: 0,
          total: 0,
        };
      }
      memberAttendanceMap[att.memberId].total += 1;
      if (att.status === 'PRESENT') memberAttendanceMap[att.memberId].present += 1;
      else if (att.status === 'ABSENT') memberAttendanceMap[att.memberId].absent += 1;
      else if (att.status === 'EXCUSED') memberAttendanceMap[att.memberId].excused += 1;
    });
  });

  const memberPerformance = Object.values(memberAttendanceMap).map((m) => {
    const denom = Math.max(1, m.total - m.excused);
    const rate = Math.round((m.present / denom) * 100);
    return {
      memberId: m.memberId,
      fullName: m.fullName,
      present: m.present,
      absent: m.absent,
      excused: m.excused,
      total: m.total,
      attendanceRate: rate,
    };
  });

  const highestAttendance = [...memberPerformance].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 5);
  const lowAttendance = [...memberPerformance].sort((a, b) => a.attendanceRate - b.attendanceRate).slice(0, 5);
  const frequentMissers = [...memberPerformance].sort((a, b) => b.absent - a.absent).filter((m) => m.absent > 0).slice(0, 5);

  return {
    overview: {
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
      late: lateCount,
      totalRecords: totalRecorded,
      attendanceRate: overallRate,
    },
    trends: meetingComparison.slice(-12),
    meetingComparison,
    highestAttendance,
    lowAttendance,
    frequentMissers,
    totalMeetings: meetings.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Financial Analytics
// ─────────────────────────────────────────────────────────────────────────────
export async function getFinancialAnalytics() {
  const orgSummary = await getOrganizationFinancialSummary();

  // 12 Months income & expenses aggregation
  const now = new Date();
  const monthlyTrends: Array<{
    month: string;
    weeklyContributions: number;
    penalties: number;
    specialContributions: number;
    emergencyContributions: number;
    otherIncome: number;
    expenses: number;
    netCash: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = start.toLocaleString('en-US', { month: 'short', year: '2-digit' });

    const [allocations, expenses] = await Promise.all([
      prisma.paymentAllocation.findMany({
        where: {
          payment: { status: 'VERIFIED', paymentDate: { gte: start, lte: end } },
        },
      }),
      prisma.expense.aggregate({
        where: {
          approvalStatus: 'APPROVED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    let weekly = 0;
    let pen = 0;
    let special = 0;
    let emergency = 0;
    let other = 0;

    allocations.forEach((a) => {
      const amt = Number(a.amount);
      if (a.allocationType === 'WEEKLY') weekly += amt;
      else if (['PENALTY', 'WEEKLY_PENALTY', 'MONTHLY_PENALTY', 'OTHER_PENALTY'].includes(a.allocationType)) pen += amt;
      else if (a.allocationType === 'SPECIAL') special += amt;
      else if (a.allocationType === 'EMERGENCY') emergency += amt;
      else other += amt;
    });

    const expAmt = Number(expenses._sum.amount || 0);
    const totalCollectedMonth = weekly + pen + special + emergency + other;

    monthlyTrends.push({
      month: monthLabel,
      weeklyContributions: weekly,
      penalties: pen,
      specialContributions: special,
      emergencyContributions: emergency,
      otherIncome: other,
      expenses: expAmt,
      netCash: totalCollectedMonth - expAmt,
    });
  }

  // Payment Status counts across all obligations
  const [weeklyStatus, specialStatus, penaltyStatus] = await Promise.all([
    prisma.weeklyObligation.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalDue: true, amountPaid: true },
    }),
    prisma.specialContributionObligation.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true, amountPaid: true },
    }),
    prisma.penalty.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;

  weeklyStatus.forEach((w) => {
    if (w.status === 'PAID') paidCount += w._count.id;
    else if (w.status === 'PARTIAL') partialCount += w._count.id;
    else if (w.status === 'OVERDUE') overdueCount += w._count.id;
    else unpaidCount += w._count.id;
  });

  specialStatus.forEach((s) => {
    if (s.status === 'PAID') paidCount += s._count.id;
    else if (s.status === 'PARTIAL') partialCount += s._count.id;
    else if (s.status === 'OVERDUE') overdueCount += s._count.id;
    else unpaidCount += s._count.id;
  });

  penaltyStatus.forEach((p) => {
    if (p.status === 'SETTLED') paidCount += p._count.id;
    else if (p.status === 'WAIVED') {} // handled in waived
    else unpaidCount += p._count.id;
  });

  // Special & Emergency campaigns progress
  const campaigns = await prisma.specialContribution.findMany({
    include: {
      obligations: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const campaignsProgress = campaigns.map((c) => {
    const nonExempt = c.obligations.filter((o) => !o.isExempt);
    const expected = nonExempt.reduce((s, o) => s + Number(o.amount), 0);
    const collected = nonExempt.reduce((s, o) => s + Number(o.amountPaid), 0);
    const outstanding = Math.max(0, expected - collected);
    const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
    return {
      id: c.id,
      campaignId: c.campaignId,
      title: c.title,
      type: c.type,
      status: c.status,
      amountPerMember: Number(c.amount),
      eligibleMembers: nonExempt.length,
      totalExpected: expected,
      totalCollected: collected,
      totalOutstanding: outstanding,
      progressPercentage: progress,
    };
  });

  return {
    categoryMetrics: orgSummary.categoryMetrics,
    monthlyTrends,
    paymentStatusDistribution: [
      { name: 'Paid', value: paidCount, color: '#10B981' },
      { name: 'Partially Paid', value: partialCount, color: '#3B82F6' },
      { name: 'Unpaid', value: unpaidCount, color: '#F59E0B' },
      { name: 'Overdue', value: overdueCount, color: '#EF4444' },
    ],
    outstandingBalanceAnalysis: orgSummary.categoryMetrics.map((c) => ({
      name: c.categoryName,
      outstanding: c.remainingBalance,
      collected: c.totalPaid,
    })),
    penaltyAnalytics: {
      weeklyPenaltiesCollected: orgSummary.weeklyPenaltiesCollected,
      weeklyPenaltiesOutstanding: orgSummary.weeklyPenaltiesReceivable,
      monthlyPenaltiesCollected: orgSummary.monthlyPenaltiesCollected,
      monthlyPenaltiesOutstanding: orgSummary.monthlyPenaltiesReceivable,
      otherPenaltiesCollected: orgSummary.otherPenaltiesCollected,
      otherPenaltiesOutstanding: orgSummary.otherPenaltiesReceivable,
      totalCollected: orgSummary.penaltiesCollected,
      totalOutstanding: orgSummary.penaltiesReceivable,
    },
    campaignsProgress,
    totals: {
      confirmedIncome: orgSummary.totalConfirmedIncome,
      totalExpenses: orgSummary.totalExpenses,
      availableFunds: orgSummary.availableActualFunds,
      totalOutstandingReceivables: orgSummary.totalOutstandingReceivables,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Member Analytics
// ─────────────────────────────────────────────────────────────────────────────
export async function getMemberAnalytics() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      memberId: true,
      fullName: true,
      status: true,
      createdAt: true,
      registrationDate: true,
      outstandingBalance: true,
      totalCredit: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const statusMap: Record<string, number> = {
    APPROVED: 0,
    PENDING: 0,
    INACTIVE: 0,
    SUSPENDED: 0,
    REJECTED: 0,
  };

  members.forEach((m) => {
    statusMap[m.status] = (statusMap[m.status] || 0) + 1;
  });

  // Growth by month
  const growthMap: Record<string, number> = {};
  members.forEach((m) => {
    const d = new Date(m.createdAt || m.registrationDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    growthMap[key] = (growthMap[key] || 0) + 1;
  });

  let cumulative = 0;
  const growthTrends = Object.keys(growthMap)
    .sort()
    .map((monthKey) => {
      cumulative += growthMap[monthKey];
      return {
        month: monthKey,
        newMembers: growthMap[monthKey],
        totalMembers: cumulative,
      };
    });

  return {
    totalMembers: members.length,
    activeMembers: statusMap.APPROVED || 0,
    pendingMembers: statusMap.PENDING || 0,
    inactiveMembers: statusMap.INACTIVE || 0,
    suspendedMembers: statusMap.SUSPENDED || 0,
    statusDistribution: [
      { name: 'Active', value: statusMap.APPROVED || 0, color: '#10B981' },
      { name: 'Pending', value: statusMap.PENDING || 0, color: '#F59E0B' },
      { name: 'Inactive', value: statusMap.INACTIVE || 0, color: '#6B7280' },
      { name: 'Suspended', value: statusMap.SUSPENDED || 0, color: '#EF4444' },
    ],
    growthTrends,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Meeting Analytics
// ─────────────────────────────────────────────────────────────────────────────
export async function getMeetingAnalytics() {
  const meetings = await prisma.meeting.findMany({
    include: {
      attendance: true,
    },
    orderBy: { meetingDate: 'desc' },
  });

  const total = meetings.length;
  const now = new Date();
  const conducted = meetings.filter((m) => new Date(m.meetingDate) <= now).length;
  const scheduled = meetings.filter((m) => new Date(m.meetingDate) > now).length;

  return {
    totalMeetings: total,
    conductedMeetings: conducted,
    scheduledMeetings: scheduled,
    cancelledMeetings: 0,
    recentMeetings: meetings.slice(0, 10).map((m) => ({
      id: m.id,
      title: m.title,
      date: m.meetingDate.toISOString().split('T')[0],
      attendees: m.attendance.filter((a) => a.status === 'PRESENT').length,
      totalEligible: m.attendance.length,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Personal Member Analytics (Scoped strictly to memberId)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMemberPersonalAnalytics(memberId: string) {
  const summary = await getMemberFinancialSummary(memberId);
  if (!summary) return null;

  const attendanceRecords = await prisma.attendance.findMany({
    where: { memberId },
    include: {
      meeting: { select: { title: true, meetingDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const excused = attendanceRecords.filter((a) => a.status === 'EXCUSED').length;
  const absent = attendanceRecords.filter((a) => a.status === 'ABSENT').length;
  const denom = Math.max(1, attendanceRecords.length - excused);
  const attendanceRate = attendanceRecords.length > 0 ? Math.round((present / denom) * 100) : 0;

  return {
    financialSummary: summary,
    attendanceRate,
    attendanceBreakdown: {
      present,
      absent,
      excused,
      totalMeetings: attendanceRecords.length,
    },
    attendanceHistory: attendanceRecords.map((a) => ({
      meetingTitle: a.meeting.title,
      date: a.meeting.meetingDate.toISOString().split('T')[0],
      status: a.status,
      remarks: a.remarks,
    })),
  };
}
