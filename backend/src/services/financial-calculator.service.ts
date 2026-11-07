import prisma from '../config/database.js';

export interface CategoryFinancialMetric {
  key: 'WEEKLY' | 'WEEKLY_PENALTY' | 'MONTHLY_PENALTY' | 'OTHER_PENALTY' | 'SPECIAL' | 'EMERGENCY' | 'HISTORICAL';
  nameEn: string;
  nameOm: string;
  totalOwed: number;
  totalPaid: number;
  remainingBalance: number;
  progressPercentage: number;
  paidCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  waivedCount: number;
}

export interface ObligationPaymentHistoryItem {
  allocationId: string;
  paymentId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  transactionReference?: string | null;
  receiptNumber?: string | null;
}

export interface MemberFinancialSummary {
  memberId: string;
  fullName: string;
  status: string;
  totalAmountPaid: number;
  totalCredit: number;
  totalOutstandingBalance: number;
  
  // Paid by category
  weeklyPaid: number;
  penaltiesPaid: number;
  weeklyPenaltiesPaid: number;
  monthlyPenaltiesPaid: number;
  otherPenaltiesPaid: number;
  specialPaid: number;
  emergencyPaid: number;
  historicalPaid: number;

  // Outstanding by category
  weeklyOutstanding: number;
  penaltiesOutstanding: number;
  weeklyPenaltiesOutstanding: number;
  monthlyPenaltiesOutstanding: number;
  otherPenaltiesOutstanding: number;
  specialOutstanding: number;
  emergencyOutstanding: number;
  historicalOutstanding: number;

  // Category Metrics (Independent tracking for all 7 categories)
  categoryMetrics: Record<string, CategoryFinancialMetric>;

  // Detail arrays with payment date, reference, receipt, and payment history
  weeklyObligations: Array<{
    id: string;
    weekNumber: number;
    year: number;
    dueDate: Date;
    originalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    status: string;
    paymentDate?: Date | null;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    paymentHistory: ObligationPaymentHistoryItem[];
  }>;
  penalties: Array<{
    id: string;
    title?: string | null;
    reason: string;
    weekNumber?: number | null;
    year?: number | null;
    originalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    status: string;
    isMonthly: boolean;
    dueDate?: Date | null;
    paidAt?: Date | null;
    paymentDate?: Date | null;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    paymentHistory: ObligationPaymentHistoryItem[];
  }>;
  specialObligations: Array<{
    id: string;
    specialContributionId: string;
    title: string;
    type: string;
    dueDate?: Date | null;
    originalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    status: string;
    paymentDate?: Date | null;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    paymentHistory: ObligationPaymentHistoryItem[];
  }>;
  emergencyObligations: Array<{
    id: string;
    specialContributionId: string;
    title: string;
    dueDate?: Date | null;
    originalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    status: string;
    paymentDate?: Date | null;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    paymentHistory: ObligationPaymentHistoryItem[];
  }>;
  historicalObligation?: {
    id: string;
    originalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    status: string;
    backContributionWeeks: number;
    dueDate: Date;
    paymentDate?: Date | null;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    paymentHistory: ObligationPaymentHistoryItem[];
  } | null;
}

export interface OrganizationFinancialSummary {
  // Cash & Ledger (ACTUAL CASH)
  totalConfirmedIncome: number;
  totalExpenses: number;
  availableActualFunds: number;

  // Receivables (NOT CASH)
  totalOutstandingReceivables: number;

  // Collections by category
  weeklyContributionsCollected: number;
  penaltiesCollected: number;
  weeklyPenaltiesCollected: number;
  monthlyPenaltiesCollected: number;
  otherPenaltiesCollected: number;
  specialContributionsCollected: number;
  emergencyContributionsCollected: number;
  historicalContributionsCollected: number;

  // Receivables by category
  weeklyContributionsReceivable: number;
  penaltiesReceivable: number;
  specialContributionsReceivable: number;
  emergencyContributionsReceivable: number;
  historicalContributionsReceivable: number;

  // 7 Separate Category Metrics for Admin & Auditor
  categoryMetrics: Record<string, CategoryFinancialMetric>;

  // Member statistics
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  paidMembersCount: number;
  unpaidMembersCount: number;
  pendingPaymentRequestsCount: number;

  // Current Ethiopian week participation
  thisWeekPaidCount: number;
  thisWeekTotalMembers: number;
  thisWeekPaidRate: number;
  currentWeeklyPeriod?: any;

  // Unpaid obligations count across all categories
  unpaidObligationsCount: number;

  // Compatibility aliases
  totalIncome: number;
  paidPenalties: number;
}

/**
 * Calculate complete, verified financial breakdown for a member.
 * Synchronizes the member's outstandingBalance in the database.
 */
export async function getMemberFinancialSummary(memberId: string): Promise<MemberFinancialSummary | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      obligations: {
        include: {
          allocations: {
            include: { payment: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }],
      },
      penalties: {
        include: {
          allocations: {
            include: { payment: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ createdAt: 'asc' }],
      },
      specialContributionObligations: {
        include: {
          specialContribution: true,
          allocations: {
            include: { payment: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      joiningObligation: {
        include: {
          allocations: {
            include: { payment: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!member) return null;

  const now = new Date();

  // Helper to map allocations to payment history
  function mapAllocations(allocations: any[]): ObligationPaymentHistoryItem[] {
    return (allocations || []).map((a) => ({
      allocationId: a.id,
      paymentId: a.paymentId,
      amount: Number(a.amount),
      paymentDate: a.payment?.paymentDate || a.createdAt,
      paymentMethod: a.payment?.paymentMethod || 'CASH',
      transactionReference: a.payment?.transactionReference || null,
      receiptNumber: a.payment?.receiptNumber || null,
    }));
  }

  // 1. Weekly obligations
  let weeklyPaid = 0;
  let weeklyOutstanding = 0;
  let weeklyTotalOwed = 0;
  let weeklyPaidCount = 0;
  let weeklyUnpaidCount = 0;
  let weeklyPartiallyPaidCount = 0;
  let weeklyOverdueCount = 0;

  const weeklyObligations = member.obligations.map((o) => {
    const originalAmount = Number(o.contributionAmount);
    const amountPaid = Number(o.amountPaid);
    const remainingAmount = Math.max(0, originalAmount - amountPaid);
    weeklyTotalOwed += originalAmount;
    weeklyPaid += amountPaid;

    const isPaid = o.status === 'PAID' || remainingAmount <= 0;
    const isOverdue = !isPaid && o.dueDate && new Date(o.dueDate) < now;

    if (isPaid) {
      weeklyPaidCount++;
    } else if (amountPaid > 0) {
      weeklyPartiallyPaidCount++;
      weeklyOutstanding += remainingAmount;
    } else {
      weeklyUnpaidCount++;
      weeklyOutstanding += remainingAmount;
    }
    if (isOverdue) weeklyOverdueCount++;

    const paymentHistory = mapAllocations(o.allocations);
    const latestPayment = paymentHistory[0] || null;

    return {
      id: o.id,
      weekNumber: o.weekNumber,
      year: o.year,
      dueDate: o.dueDate,
      originalAmount,
      amountPaid,
      remainingAmount,
      status: isPaid ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING',
      paymentDate: latestPayment?.paymentDate || null,
      transactionReference: latestPayment?.transactionReference || null,
      receiptNumber: latestPayment?.receiptNumber || null,
      paymentHistory,
    };
  });

  // 2. Penalties
  let penaltiesPaid = 0;
  let penaltiesOutstanding = 0;

  // Weekly penalties
  let weeklyPenTotalOwed = 0;
  let weeklyPenaltiesPaid = 0;
  let weeklyPenaltiesOutstanding = 0;
  let weeklyPenPaidCount = 0;
  let weeklyPenUnpaidCount = 0;
  let weeklyPenPartiallyPaidCount = 0;
  let weeklyPenOverdueCount = 0;
  let weeklyPenWaivedCount = 0;

  // Monthly penalties
  let monthlyPenTotalOwed = 0;
  let monthlyPenaltiesPaid = 0;
  let monthlyPenaltiesOutstanding = 0;
  let monthlyPenPaidCount = 0;
  let monthlyPenUnpaidCount = 0;
  let monthlyPenPartiallyPaidCount = 0;
  let monthlyPenOverdueCount = 0;
  let monthlyPenWaivedCount = 0;

  // Other / Manual penalties
  let otherPenTotalOwed = 0;
  let otherPenaltiesPaid = 0;
  let otherPenaltiesOutstanding = 0;
  let otherPenPaidCount = 0;
  let otherPenUnpaidCount = 0;
  let otherPenPartiallyPaidCount = 0;
  let otherPenOverdueCount = 0;
  let otherPenWaivedCount = 0;

  const penalties = member.penalties.map((p) => {
    const originalAmount = Number(p.amount);
    const amountPaid = Number(p.amountPaid || 0);
    const isWaived = p.status === 'WAIVED';
    const remainingAmount = isWaived ? 0 : Math.max(0, originalAmount - amountPaid);
    const isPaid = p.status === 'SETTLED' || (!isWaived && remainingAmount <= 0);
    const isOverdue = !isPaid && !isWaived && p.dueDate && new Date(p.dueDate) < now;

    penaltiesPaid += amountPaid;
    if (!isWaived && !isPaid) {
      penaltiesOutstanding += remainingAmount;
    }

    if (p.isMonthly) {
      monthlyPenTotalOwed += originalAmount;
      monthlyPenaltiesPaid += amountPaid;
      if (isWaived) {
        monthlyPenWaivedCount++;
      } else if (isPaid) {
        monthlyPenPaidCount++;
      } else if (amountPaid > 0) {
        monthlyPenPartiallyPaidCount++;
        monthlyPenaltiesOutstanding += remainingAmount;
      } else {
        monthlyPenUnpaidCount++;
        monthlyPenaltiesOutstanding += remainingAmount;
      }
      if (isOverdue) monthlyPenOverdueCount++;
    } else if (p.weekNumber !== null && p.weekNumber !== undefined) {
      weeklyPenTotalOwed += originalAmount;
      weeklyPenaltiesPaid += amountPaid;
      if (isWaived) {
        weeklyPenWaivedCount++;
      } else if (isPaid) {
        weeklyPenPaidCount++;
      } else if (amountPaid > 0) {
        weeklyPenPartiallyPaidCount++;
        weeklyPenaltiesOutstanding += remainingAmount;
      } else {
        weeklyPenUnpaidCount++;
        weeklyPenaltiesOutstanding += remainingAmount;
      }
      if (isOverdue) weeklyPenOverdueCount++;
    } else {
      otherPenTotalOwed += originalAmount;
      otherPenaltiesPaid += amountPaid;
      if (isWaived) {
        otherPenWaivedCount++;
      } else if (isPaid) {
        otherPenPaidCount++;
      } else if (amountPaid > 0) {
        otherPenPartiallyPaidCount++;
        otherPenaltiesOutstanding += remainingAmount;
      } else {
        otherPenUnpaidCount++;
        otherPenaltiesOutstanding += remainingAmount;
      }
      if (isOverdue) otherPenOverdueCount++;
    }

    const paymentHistory = mapAllocations(p.allocations);
    const latestPayment = paymentHistory[0] || null;

    return {
      id: p.id,
      title: p.title,
      reason: p.reason,
      weekNumber: p.weekNumber,
      year: p.year,
      originalAmount,
      amountPaid,
      remainingAmount,
      status: isWaived ? 'WAIVED' : isPaid ? 'SETTLED' : amountPaid > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'OUTSTANDING',
      isMonthly: p.isMonthly,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      paymentDate: latestPayment?.paymentDate || p.paidAt || null,
      transactionReference: latestPayment?.transactionReference || null,
      receiptNumber: latestPayment?.receiptNumber || null,
      paymentHistory,
    };
  });

  // 3. Special & Emergency Contributions
  let specialTotalOwed = 0;
  let specialPaid = 0;
  let specialOutstanding = 0;
  let specialPaidCount = 0;
  let specialUnpaidCount = 0;
  let specialPartiallyPaidCount = 0;
  let specialOverdueCount = 0;

  let emergencyTotalOwed = 0;
  let emergencyPaid = 0;
  let emergencyOutstanding = 0;
  let emergencyPaidCount = 0;
  let emergencyUnpaidCount = 0;
  let emergencyPartiallyPaidCount = 0;
  let emergencyOverdueCount = 0;

  const specialObligations: MemberFinancialSummary['specialObligations'] = [];
  const emergencyObligations: MemberFinancialSummary['emergencyObligations'] = [];

  for (const s of member.specialContributionObligations) {
    if (s.isExempt) continue; // Beneficiary member is exempt
    const originalAmount = Number(s.amount);
    const amountPaid = Number(s.amountPaid);
    const isPaid = s.status === 'PAID' || amountPaid >= originalAmount;
    const remainingAmount = isPaid ? 0 : Math.max(0, originalAmount - amountPaid);
    const isOverdue = !isPaid && s.specialContribution.dueDate && new Date(s.specialContribution.dueDate) < now;

    const paymentHistory = mapAllocations(s.allocations);
    const latestPayment = paymentHistory[0] || null;

    if (s.specialContribution.type === 'EMERGENCY') {
      emergencyTotalOwed += originalAmount;
      emergencyPaid += amountPaid;
      if (isPaid) {
        emergencyPaidCount++;
      } else if (amountPaid > 0) {
        emergencyPartiallyPaidCount++;
        emergencyOutstanding += remainingAmount;
      } else {
        emergencyUnpaidCount++;
        emergencyOutstanding += remainingAmount;
      }
      if (isOverdue) emergencyOverdueCount++;

      emergencyObligations.push({
        id: s.id,
        specialContributionId: s.specialContributionId,
        title: s.specialContribution.title,
        dueDate: s.specialContribution.dueDate,
        originalAmount,
        amountPaid,
        remainingAmount,
        status: isPaid ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING',
        paymentDate: latestPayment?.paymentDate || null,
        transactionReference: latestPayment?.transactionReference || null,
        receiptNumber: latestPayment?.receiptNumber || null,
        paymentHistory,
      });
    } else {
      specialTotalOwed += originalAmount;
      specialPaid += amountPaid;
      if (isPaid) {
        specialPaidCount++;
      } else if (amountPaid > 0) {
        specialPartiallyPaidCount++;
        specialOutstanding += remainingAmount;
      } else {
        specialUnpaidCount++;
        specialOutstanding += remainingAmount;
      }
      if (isOverdue) specialOverdueCount++;

      specialObligations.push({
        id: s.id,
        specialContributionId: s.specialContributionId,
        title: s.specialContribution.title,
        type: s.specialContribution.type,
        dueDate: s.specialContribution.dueDate,
        originalAmount,
        amountPaid,
        remainingAmount,
        status: isPaid ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING',
        paymentDate: latestPayment?.paymentDate || null,
        transactionReference: latestPayment?.transactionReference || null,
        receiptNumber: latestPayment?.receiptNumber || null,
        paymentHistory,
      });
    }
  }

  // 4. Joining / Historical Obligation
  let historicalTotalOwed = 0;
  let historicalPaid = 0;
  let historicalOutstanding = 0;
  let historicalPaidCount = 0;
  let historicalUnpaidCount = 0;
  let historicalPartiallyPaidCount = 0;
  let historicalOverdueCount = 0;
  let historicalWaivedCount = 0;
  let historicalObligation: MemberFinancialSummary['historicalObligation'] = null;

  if (member.joiningObligation) {
    const originalAmount = Number(member.joiningObligation.totalBackContributionAmount);
    const amountPaid = Number(member.joiningObligation.amountPaid);
    const isWaived = member.joiningObligation.status === 'WAIVED';
    const isPaid = member.joiningObligation.status === 'PAID' || (!isWaived && amountPaid >= originalAmount);
    const remainingAmount = isWaived || isPaid ? 0 : Math.max(0, originalAmount - amountPaid);
    const isOverdue = !isPaid && !isWaived && member.joiningObligation.dueDate && new Date(member.joiningObligation.dueDate) < now;

    historicalTotalOwed = originalAmount;
    historicalPaid = amountPaid;
    if (isWaived) {
      historicalWaivedCount = 1;
    } else if (isPaid) {
      historicalPaidCount = 1;
    } else if (amountPaid > 0) {
      historicalPartiallyPaidCount = 1;
      historicalOutstanding = remainingAmount;
    } else {
      historicalUnpaidCount = 1;
      historicalOutstanding = remainingAmount;
    }
    if (isOverdue) historicalOverdueCount = 1;

    const paymentHistory = mapAllocations(member.joiningObligation.allocations);
    const latestPayment = paymentHistory[0] || null;

    historicalObligation = {
      id: member.joiningObligation.id,
      originalAmount,
      amountPaid,
      remainingAmount,
      status: isWaived ? 'WAIVED' : isPaid ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING',
      backContributionWeeks: member.joiningObligation.backContributionWeeks,
      dueDate: member.joiningObligation.dueDate,
      paymentDate: latestPayment?.paymentDate || null,
      transactionReference: latestPayment?.transactionReference || null,
      receiptNumber: latestPayment?.receiptNumber || null,
      paymentHistory,
    };
  }

  // Helper for progress percentage
  function calcProgress(paid: number, owed: number): number {
    if (owed <= 0) return 100;
    return Math.min(100, Math.round((paid / owed) * 100));
  }

  // Build the 7 separate category metrics
  const categoryMetrics: Record<string, CategoryFinancialMetric> = {
    WEEKLY: {
      key: 'WEEKLY',
      nameEn: 'Weekly Contributions',
      nameOm: 'Kaffaltiiwwan Torbanii',
      totalOwed: weeklyTotalOwed,
      totalPaid: weeklyPaid,
      remainingBalance: weeklyOutstanding,
      progressPercentage: calcProgress(weeklyPaid, weeklyTotalOwed),
      paidCount: weeklyPaidCount,
      unpaidCount: weeklyUnpaidCount,
      partiallyPaidCount: weeklyPartiallyPaidCount,
      overdueCount: weeklyOverdueCount,
      waivedCount: 0,
    },
    WEEKLY_PENALTY: {
      key: 'WEEKLY_PENALTY',
      nameEn: 'Weekly Penalties',
      nameOm: 'Adabbiiwwan Torbanii',
      totalOwed: weeklyPenTotalOwed,
      totalPaid: weeklyPenaltiesPaid,
      remainingBalance: weeklyPenaltiesOutstanding,
      progressPercentage: calcProgress(weeklyPenaltiesPaid, weeklyPenTotalOwed),
      paidCount: weeklyPenPaidCount,
      unpaidCount: weeklyPenUnpaidCount,
      partiallyPaidCount: weeklyPenPartiallyPaidCount,
      overdueCount: weeklyPenOverdueCount,
      waivedCount: weeklyPenWaivedCount,
    },
    MONTHLY_PENALTY: {
      key: 'MONTHLY_PENALTY',
      nameEn: 'Monthly Penalties',
      nameOm: "Adabbiiwwan Ji'aa",
      totalOwed: monthlyPenTotalOwed,
      totalPaid: monthlyPenaltiesPaid,
      remainingBalance: monthlyPenaltiesOutstanding,
      progressPercentage: calcProgress(monthlyPenaltiesPaid, monthlyPenTotalOwed),
      paidCount: monthlyPenPaidCount,
      unpaidCount: monthlyPenUnpaidCount,
      partiallyPaidCount: monthlyPenPartiallyPaidCount,
      overdueCount: monthlyPenOverdueCount,
      waivedCount: monthlyPenWaivedCount,
    },
    OTHER_PENALTY: {
      key: 'OTHER_PENALTY',
      nameEn: 'Other Penalties',
      nameOm: 'Adabbiiwwan Biroo',
      totalOwed: otherPenTotalOwed,
      totalPaid: otherPenaltiesPaid,
      remainingBalance: otherPenaltiesOutstanding,
      progressPercentage: calcProgress(otherPenaltiesPaid, otherPenTotalOwed),
      paidCount: otherPenPaidCount,
      unpaidCount: otherPenUnpaidCount,
      partiallyPaidCount: otherPenPartiallyPaidCount,
      overdueCount: otherPenOverdueCount,
      waivedCount: otherPenWaivedCount,
    },
    SPECIAL: {
      key: 'SPECIAL',
      nameEn: 'Special Contributions',
      nameOm: 'Gumaacha Addaa',
      totalOwed: specialTotalOwed,
      totalPaid: specialPaid,
      remainingBalance: specialOutstanding,
      progressPercentage: calcProgress(specialPaid, specialTotalOwed),
      paidCount: specialPaidCount,
      unpaidCount: specialUnpaidCount,
      partiallyPaidCount: specialPartiallyPaidCount,
      overdueCount: specialOverdueCount,
      waivedCount: 0,
    },
    EMERGENCY: {
      key: 'EMERGENCY',
      nameEn: 'Emergency Contributions',
      nameOm: 'Gumaacha Hatattamaa',
      totalOwed: emergencyTotalOwed,
      totalPaid: emergencyPaid,
      remainingBalance: emergencyOutstanding,
      progressPercentage: calcProgress(emergencyPaid, emergencyTotalOwed),
      paidCount: emergencyPaidCount,
      unpaidCount: emergencyUnpaidCount,
      partiallyPaidCount: emergencyPartiallyPaidCount,
      overdueCount: emergencyOverdueCount,
      waivedCount: 0,
    },
    HISTORICAL: {
      key: 'HISTORICAL',
      nameEn: 'Historical Contributions',
      nameOm: 'Kaffaltiiwwan Seenaa',
      totalOwed: historicalTotalOwed,
      totalPaid: historicalPaid,
      remainingBalance: historicalOutstanding,
      progressPercentage: calcProgress(historicalPaid, historicalTotalOwed),
      paidCount: historicalPaidCount,
      unpaidCount: historicalUnpaidCount,
      partiallyPaidCount: historicalPartiallyPaidCount,
      overdueCount: historicalOverdueCount,
      waivedCount: historicalWaivedCount,
    },
  };

  // 5. Total Verified Payments (Sum of all verified payments recorded for this member)
  const verifiedPaymentsAgg = await prisma.payment.aggregate({
    where: { memberId, status: 'VERIFIED' },
    _sum: { amount: true },
  });
  const totalAmountPaid = Number(verifiedPaymentsAgg._sum.amount || 0);

  // 6. Total Outstanding Balance
  const totalOutstandingBalance =
    weeklyOutstanding +
    penaltiesOutstanding +
    specialOutstanding +
    emergencyOutstanding +
    historicalOutstanding;

  // Synchronize member.outstandingBalance in DB if changed
  if (Number(member.outstandingBalance) !== totalOutstandingBalance) {
    await prisma.member.update({
      where: { id: memberId },
      data: { outstandingBalance: totalOutstandingBalance },
    });
  }

  return {
    memberId: member.id,
    fullName: member.fullName,
    status: member.status,
    totalAmountPaid,
    totalCredit: Number(member.totalCredit || 0),
    totalOutstandingBalance,
    weeklyPaid,
    penaltiesPaid,
    weeklyPenaltiesPaid,
    monthlyPenaltiesPaid,
    otherPenaltiesPaid,
    specialPaid,
    emergencyPaid,
    historicalPaid,
    weeklyOutstanding,
    penaltiesOutstanding,
    weeklyPenaltiesOutstanding,
    monthlyPenaltiesOutstanding,
    otherPenaltiesOutstanding,
    specialOutstanding,
    emergencyOutstanding,
    historicalOutstanding,
    categoryMetrics,
    weeklyObligations,
    penalties,
    specialObligations,
    emergencyObligations,
    historicalObligation,
  };
}

/**
 * Calculate organization-wide financial summary across all active records.
 * Cash is derived strictly from confirmed, non-reversed payments minus approved expenses.
 * Receivables are calculated separately and NEVER counted as collected cash.
 */
export async function getOrganizationFinancialSummary(): Promise<OrganizationFinancialSummary> {
  const [
    confirmedIncomeAgg,
    approvedExpensesAgg,
    totalMembers,
    activeMembers,
    pendingMembers,
    pendingPaymentRequestsCount,
    allWeekly,
    allSpecial,
    allPenalties,
    allJoining,
    allocationsAgg,
  ] = await Promise.all([
    // Confirmed cash income (only VERIFIED payments)
    prisma.payment.aggregate({
      where: { status: 'VERIFIED' },
      _sum: { amount: true },
    }),
    // Approved expenses
    prisma.expense.aggregate({
      where: { approvalStatus: 'APPROVED' },
      _sum: { amount: true },
    }),
    // Member counts
    prisma.member.count(),
    prisma.member.count({ where: { status: 'APPROVED' } }),
    prisma.member.count({ where: { status: 'PENDING' } }),
    // Pending verification requests
    prisma.paymentRequest.count({
      where: { status: { in: ['SUBMITTED', 'PENDING'] } },
    }),
    // All weekly obligations
    prisma.weeklyObligation.findMany({
      select: {
        id: true,
        memberId: true,
        contributionAmount: true,
        amountPaid: true,
        status: true,
        dueDate: true,
        weeklyPeriodId: true,
        weekNumber: true,
        year: true,
      },
    }),
    // All special/emergency obligations
    prisma.specialContributionObligation.findMany({
      where: { isExempt: false },
      select: {
        id: true,
        memberId: true,
        amount: true,
        amountPaid: true,
        status: true,
        specialContribution: { select: { type: true, dueDate: true } },
      },
    }),
    // All penalties
    prisma.penalty.findMany({
      select: {
        id: true,
        memberId: true,
        amount: true,
        amountPaid: true,
        status: true,
        isMonthly: true,
        weekNumber: true,
        dueDate: true,
      },
    }),
    // All historical joining obligations
    prisma.joiningObligation.findMany({
      select: {
        id: true,
        memberId: true,
        totalBackContributionAmount: true,
        amountPaid: true,
        status: true,
        dueDate: true,
      },
    }),
    // Verified payment allocations
    prisma.paymentAllocation.groupBy({
      by: ['allocationType'],
      where: { payment: { status: 'VERIFIED' } },
      _sum: { amount: true },
    }),
  ]);

  const now = new Date();
  const totalConfirmedIncome = Number(confirmedIncomeAgg._sum.amount || 0);
  const totalExpenses = Number(approvedExpensesAgg._sum.amount || 0);
  const availableActualFunds = totalConfirmedIncome - totalExpenses;

  // 1. Weekly breakdown
  let weeklyOwed = 0;
  let weeklyPaid = 0;
  let weeklyReceivable = 0;
  let weeklyPaidCount = 0;
  let weeklyUnpaidCount = 0;
  let weeklyPartialCount = 0;
  let weeklyOverdueCount = 0;

  const memberReceivablesMap = new Map<string, number>();
  const membersWithUnpaid = new Set<string>();

  for (const o of allWeekly) {
    const orig = Number(o.contributionAmount);
    const paid = Number(o.amountPaid);
    const rem = Math.max(0, orig - paid);
    weeklyOwed += orig;
    weeklyPaid += paid;
    if (o.status === 'PAID' || rem <= 0) {
      weeklyPaidCount++;
    } else if (paid > 0) {
      weeklyPartialCount++;
      weeklyReceivable += rem;
      memberReceivablesMap.set(o.memberId, (memberReceivablesMap.get(o.memberId) || 0) + rem);
      membersWithUnpaid.add(o.memberId);
    } else {
      weeklyUnpaidCount++;
      weeklyReceivable += rem;
      memberReceivablesMap.set(o.memberId, (memberReceivablesMap.get(o.memberId) || 0) + rem);
      membersWithUnpaid.add(o.memberId);
    }
    if (rem > 0 && o.dueDate && new Date(o.dueDate) < now) {
      weeklyOverdueCount++;
    }
  }

  // 2. Penalties breakdown
  let weeklyPenOwed = 0;
  let weeklyPenPaid = 0;
  let weeklyPenReceivable = 0;
  let weeklyPenPaidCount = 0;
  let weeklyPenUnpaidCount = 0;
  let weeklyPenPartialCount = 0;
  let weeklyPenOverdueCount = 0;
  let weeklyPenWaivedCount = 0;

  let monthlyPenOwed = 0;
  let monthlyPenPaid = 0;
  let monthlyPenReceivable = 0;
  let monthlyPenPaidCount = 0;
  let monthlyPenUnpaidCount = 0;
  let monthlyPenPartialCount = 0;
  let monthlyPenOverdueCount = 0;
  let monthlyPenWaivedCount = 0;

  let otherPenOwed = 0;
  let otherPenPaid = 0;
  let otherPenReceivable = 0;
  let otherPenPaidCount = 0;
  let otherPenUnpaidCount = 0;
  let otherPenPartialCount = 0;
  let otherPenOverdueCount = 0;
  let otherPenWaivedCount = 0;

  for (const p of allPenalties) {
    const orig = Number(p.amount);
    const paid = Number(p.amountPaid || 0);
    const isWaived = p.status === 'WAIVED';
    const isSettled = p.status === 'SETTLED' || (!isWaived && paid >= orig);
    const rem = isWaived || isSettled ? 0 : Math.max(0, orig - paid);
    const isOverdue = rem > 0 && p.dueDate && new Date(p.dueDate) < now;

    if (p.isMonthly) {
      monthlyPenOwed += orig;
      monthlyPenPaid += paid;
      if (isWaived) {
        monthlyPenWaivedCount++;
      } else if (isSettled) {
        monthlyPenPaidCount++;
      } else if (paid > 0) {
        monthlyPenPartialCount++;
        monthlyPenReceivable += rem;
      } else {
        monthlyPenUnpaidCount++;
        monthlyPenReceivable += rem;
      }
      if (isOverdue) monthlyPenOverdueCount++;
    } else if (p.weekNumber !== null && p.weekNumber !== undefined) {
      weeklyPenOwed += orig;
      weeklyPenPaid += paid;
      if (isWaived) {
        weeklyPenWaivedCount++;
      } else if (isSettled) {
        weeklyPenPaidCount++;
      } else if (paid > 0) {
        weeklyPenPartialCount++;
        weeklyPenReceivable += rem;
      } else {
        weeklyPenUnpaidCount++;
        weeklyPenReceivable += rem;
      }
      if (isOverdue) weeklyPenOverdueCount++;
    } else {
      otherPenOwed += orig;
      otherPenPaid += paid;
      if (isWaived) {
        otherPenWaivedCount++;
      } else if (isSettled) {
        otherPenPaidCount++;
      } else if (paid > 0) {
        otherPenPartialCount++;
        otherPenReceivable += rem;
      } else {
        otherPenUnpaidCount++;
        otherPenReceivable += rem;
      }
      if (isOverdue) otherPenOverdueCount++;
    }

    if (rem > 0 && !isWaived) {
      memberReceivablesMap.set(p.memberId, (memberReceivablesMap.get(p.memberId) || 0) + rem);
      membersWithUnpaid.add(p.memberId);
    }
  }

  // 3. Special & Emergency breakdown
  let specialOwed = 0;
  let specialPaid = 0;
  let specialReceivable = 0;
  let specialPaidCount = 0;
  let specialUnpaidCount = 0;
  let specialPartialCount = 0;
  let specialOverdueCount = 0;

  let emergencyOwed = 0;
  let emergencyPaid = 0;
  let emergencyReceivable = 0;
  let emergencyPaidCount = 0;
  let emergencyUnpaidCount = 0;
  let emergencyPartialCount = 0;
  let emergencyOverdueCount = 0;

  for (const s of allSpecial) {
    const orig = Number(s.amount);
    const paid = Number(s.amountPaid);
    const isPaid = s.status === 'PAID' || paid >= orig;
    const rem = isPaid ? 0 : Math.max(0, orig - paid);
    const isOverdue = rem > 0 && s.specialContribution.dueDate && new Date(s.specialContribution.dueDate) < now;

    if (s.specialContribution.type === 'EMERGENCY') {
      emergencyOwed += orig;
      emergencyPaid += paid;
      if (isPaid) {
        emergencyPaidCount++;
      } else if (paid > 0) {
        emergencyPartialCount++;
        emergencyReceivable += rem;
      } else {
        emergencyUnpaidCount++;
        emergencyReceivable += rem;
      }
      if (isOverdue) emergencyOverdueCount++;
    } else {
      specialOwed += orig;
      specialPaid += paid;
      if (isPaid) {
        specialPaidCount++;
      } else if (paid > 0) {
        specialPartialCount++;
        specialReceivable += rem;
      } else {
        specialUnpaidCount++;
        specialReceivable += rem;
      }
      if (isOverdue) specialOverdueCount++;
    }

    if (rem > 0 && !isPaid) {
      memberReceivablesMap.set(s.memberId, (memberReceivablesMap.get(s.memberId) || 0) + rem);
      membersWithUnpaid.add(s.memberId);
    }
  }

  // 4. Historical Joining breakdown
  let histOwed = 0;
  let histPaid = 0;
  let histReceivable = 0;
  let histPaidCount = 0;
  let histUnpaidCount = 0;
  let histPartialCount = 0;
  let histOverdueCount = 0;
  let histWaivedCount = 0;

  for (const j of allJoining) {
    const orig = Number(j.totalBackContributionAmount);
    const paid = Number(j.amountPaid || 0);
    const isWaived = j.status === 'WAIVED';
    const isPaid = j.status === 'PAID' || (!isWaived && paid >= orig);
    const rem = isWaived || isPaid ? 0 : Math.max(0, orig - paid);
    const isOverdue = rem > 0 && j.dueDate && new Date(j.dueDate) < now;

    histOwed += orig;
    histPaid += paid;
    if (isWaived) {
      histWaivedCount++;
    } else if (isPaid) {
      histPaidCount++;
    } else if (paid > 0) {
      histPartialCount++;
      histReceivable += rem;
    } else {
      histUnpaidCount++;
      histReceivable += rem;
    }
    if (isOverdue) histOverdueCount++;

    if (rem > 0 && !isWaived && !isPaid) {
      memberReceivablesMap.set(j.memberId, (memberReceivablesMap.get(j.memberId) || 0) + rem);
      membersWithUnpaid.add(j.memberId);
    }
  }

  const penaltiesReceivable = weeklyPenReceivable + monthlyPenReceivable + otherPenReceivable;
  const totalOutstandingReceivables =
    weeklyReceivable +
    penaltiesReceivable +
    specialReceivable +
    emergencyReceivable +
    histReceivable;

  function calcProgress(paid: number, owed: number): number {
    if (owed <= 0) return 100;
    return Math.min(100, Math.round((paid / owed) * 100));
  }

  const categoryMetrics: Record<string, CategoryFinancialMetric> = {
    WEEKLY: {
      key: 'WEEKLY',
      nameEn: 'Weekly Contributions',
      nameOm: 'Kaffaltiiwwan Torbanii',
      totalOwed: weeklyOwed,
      totalPaid: weeklyPaid,
      remainingBalance: weeklyReceivable,
      progressPercentage: calcProgress(weeklyPaid, weeklyOwed),
      paidCount: weeklyPaidCount,
      unpaidCount: weeklyUnpaidCount,
      partiallyPaidCount: weeklyPartialCount,
      overdueCount: weeklyOverdueCount,
      waivedCount: 0,
    },
    WEEKLY_PENALTY: {
      key: 'WEEKLY_PENALTY',
      nameEn: 'Weekly Penalties',
      nameOm: 'Adabbiiwwan Torbanii',
      totalOwed: weeklyPenOwed,
      totalPaid: weeklyPenPaid,
      remainingBalance: weeklyPenReceivable,
      progressPercentage: calcProgress(weeklyPenPaid, weeklyPenOwed),
      paidCount: weeklyPenPaidCount,
      unpaidCount: weeklyPenUnpaidCount,
      partiallyPaidCount: weeklyPenPartialCount,
      overdueCount: weeklyPenOverdueCount,
      waivedCount: weeklyPenWaivedCount,
    },
    MONTHLY_PENALTY: {
      key: 'MONTHLY_PENALTY',
      nameEn: 'Monthly Penalties',
      nameOm: "Adabbiiwwan Ji'aa",
      totalOwed: monthlyPenOwed,
      totalPaid: monthlyPenPaid,
      remainingBalance: monthlyPenReceivable,
      progressPercentage: calcProgress(monthlyPenPaid, monthlyPenOwed),
      paidCount: monthlyPenPaidCount,
      unpaidCount: monthlyPenUnpaidCount,
      partiallyPaidCount: monthlyPenPartialCount,
      overdueCount: monthlyPenOverdueCount,
      waivedCount: monthlyPenWaivedCount,
    },
    OTHER_PENALTY: {
      key: 'OTHER_PENALTY',
      nameEn: 'Other Penalties',
      nameOm: 'Adabbiiwwan Biroo',
      totalOwed: otherPenOwed,
      totalPaid: otherPenPaid,
      remainingBalance: otherPenReceivable,
      progressPercentage: calcProgress(otherPenPaid, otherPenOwed),
      paidCount: otherPenPaidCount,
      unpaidCount: otherPenUnpaidCount,
      partiallyPaidCount: otherPenPartialCount,
      overdueCount: otherPenOverdueCount,
      waivedCount: otherPenWaivedCount,
    },
    SPECIAL: {
      key: 'SPECIAL',
      nameEn: 'Special Contributions',
      nameOm: 'Gumaacha Addaa',
      totalOwed: specialOwed,
      totalPaid: specialPaid,
      remainingBalance: specialReceivable,
      progressPercentage: calcProgress(specialPaid, specialOwed),
      paidCount: specialPaidCount,
      unpaidCount: specialUnpaidCount,
      partiallyPaidCount: specialPartialCount,
      overdueCount: specialOverdueCount,
      waivedCount: 0,
    },
    EMERGENCY: {
      key: 'EMERGENCY',
      nameEn: 'Emergency Contributions',
      nameOm: 'Gumaacha Hatattamaa',
      totalOwed: emergencyOwed,
      totalPaid: emergencyPaid,
      remainingBalance: emergencyReceivable,
      progressPercentage: calcProgress(emergencyPaid, emergencyOwed),
      paidCount: emergencyPaidCount,
      unpaidCount: emergencyUnpaidCount,
      partiallyPaidCount: emergencyPartialCount,
      overdueCount: emergencyOverdueCount,
      waivedCount: 0,
    },
    HISTORICAL: {
      key: 'HISTORICAL',
      nameEn: 'Historical Contributions',
      nameOm: 'Kaffaltiiwwan Seenaa',
      totalOwed: histOwed,
      totalPaid: histPaid,
      remainingBalance: histReceivable,
      progressPercentage: calcProgress(histPaid, histOwed),
      paidCount: histPaidCount,
      unpaidCount: histUnpaidCount,
      partiallyPaidCount: histPartialCount,
      overdueCount: histOverdueCount,
      waivedCount: histWaivedCount,
    },
  };

  // 5. Total unpaid obligations count across all categories
  const unpaidObligationsCount =
    weeklyUnpaidCount +
    weeklyPartialCount +
    weeklyPenUnpaidCount +
    weeklyPenPartialCount +
    monthlyPenUnpaidCount +
    monthlyPenPartialCount +
    otherPenUnpaidCount +
    otherPenPartialCount +
    specialUnpaidCount +
    specialPartialCount +
    emergencyUnpaidCount +
    emergencyPartialCount +
    histUnpaidCount +
    histPartialCount;

  // 6. Paid and unpaid members count (active approved members) based on actual receivables
  const activeMembersWithBalance = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, outstandingBalance: true },
  });

  let activeUnpaidCount = 0;
  for (const m of activeMembersWithBalance) {
    const actualBal = memberReceivablesMap.get(m.id) || 0;
    if (actualBal > 0 || membersWithUnpaid.has(m.id)) {
      activeUnpaidCount++;
    }
    // Synchronize Member.outstandingBalance column in DB if out of sync
    if (Number(m.outstandingBalance) !== actualBal) {
      await prisma.member.update({
        where: { id: m.id },
        data: { outstandingBalance: actualBal },
      }).catch((e) => console.error('Failed to sync member outstanding balance:', e));
    }
  }
  const unpaidMembersCount = activeUnpaidCount;
  const paidMembersCount = Math.max(0, activeMembers - unpaidMembersCount);

  // 7. Ethiopian calendar current week payment status
  let currentWeeklyPeriod = await prisma.weeklyPeriod.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (!currentWeeklyPeriod) {
    currentWeeklyPeriod =
      (await prisma.weeklyPeriod.findFirst({
        where: { dueDate: { gte: now } },
        orderBy: { dueDate: 'asc' },
      })) ||
      (await prisma.weeklyPeriod.findFirst({
        orderBy: { dueDate: 'desc' },
      }));
  }

  let thisWeekPaidCount = 0;
  const thisWeekTotalMembers = activeMembers;

  if (currentWeeklyPeriod) {
    const currentPeriodObligations = await prisma.weeklyObligation.findMany({
      where: {
        OR: [
          { weeklyPeriodId: currentWeeklyPeriod.id },
          {
            weekNumber: currentWeeklyPeriod.weekNumber,
            year: currentWeeklyPeriod.dueDate.getUTCFullYear(),
          },
        ],
        member: { status: 'APPROVED' },
      },
      select: {
        id: true,
        memberId: true,
        contributionAmount: true,
        amountPaid: true,
        status: true,
        payments: {
          where: { status: 'VERIFIED' },
          select: { id: true, amount: true },
        },
        allocations: {
          where: {
            allocationType: 'WEEKLY',
            payment: { status: 'VERIFIED' },
          },
          select: { id: true, amount: true },
        },
      },
    });

    const paidMemberIds = new Set<string>();
    for (const ob of currentPeriodObligations) {
      const verifiedPaymentSum = ob.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const verifiedAllocSum = ob.allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const totalVerified = Math.max(verifiedPaymentSum, verifiedAllocSum);
      const required = Number(ob.contributionAmount || 0);

      // ONLY successfully confirmed weekly contribution payments count.
      // Pending, rejected, and unverified payments never count.
      if (
        (totalVerified >= required && required > 0) ||
        (ob.status === 'PAID' && (ob.payments.length > 0 || ob.allocations.length > 0))
      ) {
        paidMemberIds.add(ob.memberId);
      }
    }
    thisWeekPaidCount = paidMemberIds.size;
  }

  const thisWeekPaidRate =
    thisWeekTotalMembers > 0
      ? Math.round((thisWeekPaidCount / thisWeekTotalMembers) * 100)
      : 0;

  return {
    totalConfirmedIncome,
    totalIncome: totalConfirmedIncome,
    paidPenalties: weeklyPenPaid + monthlyPenPaid + otherPenPaid,
    totalExpenses,
    availableActualFunds,
    totalOutstandingReceivables,
    weeklyContributionsCollected: weeklyPaid,
    penaltiesCollected: weeklyPenPaid + monthlyPenPaid + otherPenPaid,
    weeklyPenaltiesCollected: weeklyPenPaid,
    monthlyPenaltiesCollected: monthlyPenPaid,
    otherPenaltiesCollected: otherPenPaid,
    specialContributionsCollected: specialPaid,
    emergencyContributionsCollected: emergencyPaid,
    historicalContributionsCollected: histPaid,
    weeklyContributionsReceivable: weeklyReceivable,
    penaltiesReceivable,
    specialContributionsReceivable: specialReceivable,
    emergencyContributionsReceivable: emergencyReceivable,
    historicalContributionsReceivable: histReceivable,
    categoryMetrics,
    totalMembers,
    activeMembers,
    pendingMembers,
    paidMembersCount,
    unpaidMembersCount,
    pendingPaymentRequestsCount,
    thisWeekPaidCount,
    thisWeekTotalMembers,
    thisWeekPaidRate,
    currentWeeklyPeriod,
    unpaidObligationsCount,
  };
}
