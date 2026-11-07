import { Decimal } from '@prisma/client/runtime/library';
import { ObligationStatus } from '@prisma/client';
import prisma from '../config/database.js';
import {
  toEthiopianDate,
  toGregorianDate,
  getDaysInEthiopianMonth,
  ETHIOPIAN_MONTHS,
} from './ethiopian-calendar.service.js';
import { createAuditEntry } from '../middleware/audit.js';

export interface OrganizationConfigData {
  id: string;
  startingEthiopianYear: number;
  startingEthiopianMonth: number;
  startingEthiopianDate: number;
  startingDate: Date;
  weeklyContributionRate: number;
  rateEffectiveDate: Date;
  formattedEth: string;
  formattedEn: string;
  formattedGregorian: string;
  ethiopianMonthNameEn: string;
  ethiopianMonthNameOm: string;
  gregorianIso: string;
  rateEffectiveDateIso: string;
  updatedAt: Date;
}

export interface UpdateOrganizationConfigInput {
  startingEthiopianYear: number;
  startingEthiopianMonth?: number;
  startingEthiopianDate?: number;
  weeklyContributionRate?: number;
  rateEffectiveDate?: string | Date;
}

/**
 * Get current organization configuration. If none exists, initializes from 2017 E.C. defaults.
 */
export async function getOrganizationConfig(): Promise<OrganizationConfigData> {
  let config = await prisma.organizationConfig.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!config) {
    // Check if systemSetting already has values
    const [yearSetting, monthSetting, dateSetting, gDateSetting, rateSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'org_starting_ethiopian_year' } }),
      prisma.systemSetting.findUnique({ where: { key: 'org_starting_ethiopian_month' } }),
      prisma.systemSetting.findUnique({ where: { key: 'org_starting_ethiopian_date' } }),
      prisma.systemSetting.findUnique({ where: { key: 'org_starting_date' } }),
      prisma.systemSetting.findUnique({ where: { key: 'weekly_contribution' } }),
    ]);

    const ethYear = yearSetting ? Number(yearSetting.value) : 2017;
    const ethMonth = monthSetting ? Number(monthSetting.value) : 1;
    const ethDate = dateSetting ? Number(dateSetting.value) : 1;
    const rate = rateSetting ? Number(rateSetting.value) : 50;

    let gDate: Date;
    if (gDateSetting && gDateSetting.value) {
      gDate = new Date(gDateSetting.value);
    } else {
      gDate = toGregorianDate(ethYear, ethMonth, ethDate);
    }

    config = await prisma.organizationConfig.create({
      data: {
        startingEthiopianYear: ethYear,
        startingEthiopianMonth: ethMonth,
        startingEthiopianDate: ethDate,
        startingDate: gDate,
        weeklyContributionRate: new Decimal(rate),
        rateEffectiveDate: gDate,
      },
    });

    // Also ensure SystemSetting is populated
    await syncToSystemSettings(config);
  }

  const ethInfo = toEthiopianDate(config.startingDate);
  const mInfo = ETHIOPIAN_MONTHS[config.startingEthiopianMonth - 1] || ETHIOPIAN_MONTHS[0];

  return {
    id: config.id,
    startingEthiopianYear: config.startingEthiopianYear,
    startingEthiopianMonth: config.startingEthiopianMonth,
    startingEthiopianDate: config.startingEthiopianDate,
    startingDate: config.startingDate,
    weeklyContributionRate: Number(config.weeklyContributionRate),
    rateEffectiveDate: config.rateEffectiveDate,
    formattedEth: `${config.startingEthiopianDate} ${mInfo.nameOm} ${config.startingEthiopianYear}`,
    formattedEn: `${config.startingEthiopianDate} ${mInfo.nameEn} ${config.startingEthiopianYear}`,
    formattedGregorian: config.startingDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    ethiopianMonthNameEn: mInfo.nameEn,
    ethiopianMonthNameOm: mInfo.nameOm,
    gregorianIso: config.startingDate.toISOString(),
    rateEffectiveDateIso: config.rateEffectiveDate.toISOString(),
    updatedAt: config.updatedAt,
  };
}

/**
 * Update organization configuration with validation, system setting syncing, rate history tracking, and audit logging.
 */
export async function updateOrganizationConfig(
  input: UpdateOrganizationConfigInput,
  userId: string | null = null,
  ipAddress?: string
): Promise<OrganizationConfigData> {
  const current = await getOrganizationConfig();

  const ethYear = Math.floor(Number(input.startingEthiopianYear));
  if (isNaN(ethYear) || ethYear < 1900 || ethYear > 2200) {
    throw new Error(`Invalid Ethiopian starting year: ${input.startingEthiopianYear}. Must be between 1900 and 2200.`);
  }

  const ethMonth = input.startingEthiopianMonth !== undefined ? Math.floor(Number(input.startingEthiopianMonth)) : current.startingEthiopianMonth;
  if (isNaN(ethMonth) || ethMonth < 1 || ethMonth > 13) {
    throw new Error(`Invalid Ethiopian month: ${ethMonth}. Must be between 1 (Meskerem) and 13 (Pagume).`);
  }

  const maxDays = getDaysInEthiopianMonth(ethYear, ethMonth);
  const ethDate = input.startingEthiopianDate !== undefined ? Math.floor(Number(input.startingEthiopianDate)) : current.startingEthiopianDate;
  if (isNaN(ethDate) || ethDate < 1 || ethDate > maxDays) {
    throw new Error(
      `Invalid Ethiopian date: ${ethDate} for month ${ethMonth} in year ${ethYear}. Max days allowed: ${maxDays}.`
    );
  }

  const calculatedGregorianDate = toGregorianDate(ethYear, ethMonth, ethDate);

  const rate = input.weeklyContributionRate !== undefined ? Number(input.weeklyContributionRate) : current.weeklyContributionRate;
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid weekly contribution rate: ${rate}. Must be a positive amount.`);
  }

  let rateEffectiveDate: Date;
  if (input.rateEffectiveDate) {
    rateEffectiveDate = new Date(input.rateEffectiveDate);
    if (isNaN(rateEffectiveDate.getTime())) {
      rateEffectiveDate = calculatedGregorianDate;
    }
  } else {
    rateEffectiveDate = current.rateEffectiveDate;
  }

  const previousValues = {
    startingEthiopianYear: current.startingEthiopianYear,
    startingEthiopianMonth: current.startingEthiopianMonth,
    startingEthiopianDate: current.startingEthiopianDate,
    startingDate: current.startingDate.toISOString(),
    weeklyContributionRate: current.weeklyContributionRate,
    rateEffectiveDate: current.rateEffectiveDate.toISOString(),
  };

  const newValues = {
    startingEthiopianYear: ethYear,
    startingEthiopianMonth: ethMonth,
    startingEthiopianDate: ethDate,
    startingDate: calculatedGregorianDate.toISOString(),
    weeklyContributionRate: rate,
    rateEffectiveDate: rateEffectiveDate.toISOString(),
  };

  // Upsert the configuration record in OrganizationConfig table
  const updated = await prisma.organizationConfig.upsert({
    where: { id: current.id },
    create: {
      startingEthiopianYear: ethYear,
      startingEthiopianMonth: ethMonth,
      startingEthiopianDate: ethDate,
      startingDate: calculatedGregorianDate,
      weeklyContributionRate: new Decimal(rate),
      rateEffectiveDate,
    },
    update: {
      startingEthiopianYear: ethYear,
      startingEthiopianMonth: ethMonth,
      startingEthiopianDate: ethDate,
      startingDate: calculatedGregorianDate,
      weeklyContributionRate: new Decimal(rate),
      rateEffectiveDate,
    },
  });

  // Sync to SystemSettings
  await syncToSystemSettings(updated);

  // If contribution rate changed, record in ContributionRateHistory
  if (current.weeklyContributionRate !== rate) {
    await prisma.contributionRateHistory.create({
      data: {
        effectiveDate: rateEffectiveDate,
        weeklyAmount: new Decimal(rate),
        description: `Rate updated from ${current.weeklyContributionRate} to ${rate} ETB on config update`,
        createdBy: userId,
      },
    });
  }

  // Create an explicit Audit Log entry
  await createAuditEntry(
    userId,
    'ORGANIZATION_CONFIG_UPDATED',
    'settings',
    {
      previousValues,
      newValues,
      note: 'Admin updated organization starting year / configuration',
    },
    ipAddress
  );

  return getOrganizationConfig();
}

/**
 * Synchronize OrganizationConfig fields to SystemSetting table
 */
async function syncToSystemSettings(config: any) {
  const gDateStr = config.startingDate.toISOString();
  const rateStr = String(config.weeklyContributionRate);

  const settingsToUpsert = [
    {
      key: 'org_starting_ethiopian_year',
      value: String(config.startingEthiopianYear),
      label: 'Organization Starting Ethiopian Year',
      labelOm: 'Waggaa Jalqabaa Dhaabbataa (ALH)',
    },
    {
      key: 'org_starting_ethiopian_month',
      value: String(config.startingEthiopianMonth),
      label: 'Organization Starting Ethiopian Month',
      labelOm: "Ji'a Jalqabaa Dhaabbataa",
    },
    {
      key: 'org_starting_ethiopian_date',
      value: String(config.startingEthiopianDate),
      label: 'Organization Starting Ethiopian Day',
      labelOm: 'Guyyaa Jalqabaa Dhaabbataa',
    },
    {
      key: 'org_starting_date',
      value: gDateStr,
      label: 'Organization Starting Date (Gregorian)',
      labelOm: 'Guyyaa Jalqabaa Dhaabbataa (Giregooriyaan)',
    },
    {
      key: 'group_start_date',
      value: gDateStr,
      label: 'Group Start Date',
      labelOm: 'Guyyaa Jalqabaa Garee',
    },
    {
      key: 'weekly_contribution',
      value: rateStr,
      label: 'Weekly Contribution Amount',
      labelOm: 'Hanga Kaffaltii Torbanii',
    },
    {
      key: 'rate_effective_date',
      value: config.rateEffectiveDate.toISOString(),
      label: 'Contribution Rate Effective Date',
      labelOm: 'Guyyaa Gatiin Kaffaltii Hojiirra Oole',
    },
  ];

  await Promise.all(
    settingsToUpsert.map((s) =>
      prisma.systemSetting.upsert({
        where: { key: s.key },
        create: s,
        update: { value: s.value },
      })
    )
  );
}

export interface RecalculateObligationsInput {
  confirmRecalculate: boolean;
  reason?: string;
  adminUserId?: string | null;
  ipAddress?: string;
}

export async function recalculateAllMemberObligations(
  input: RecalculateObligationsInput
): Promise<{
  totalApprovedMembers: number;
  totalPeriodsEvaluated: number;
  newObligationsCreated: number;
  message: string;
}> {
  if (!input.confirmRecalculate) {
    throw new Error('Explicit confirmation is required to recalculate member obligations.');
  }

  const orgConfig = await getOrganizationConfig();

  // Find all weekly periods on or after organization starting year
  const periods = await prisma.weeklyPeriod.findMany({
    where: {
      ethiopianYear: { gte: orgConfig.startingEthiopianYear },
    },
    orderBy: [{ ethiopianYear: 'asc' }, { weekNumber: 'asc' }],
  });

  const members = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, fullName: true, memberId: true, joinDate: true, registrationDate: true },
  });

  const { recalculateOutstandingBalance } = await import('./contribution.service.js');

  let newObligationsCreated = 0;

  for (const period of periods) {
    // Skip periods before organization's exact starting date
    if (period.dueDate < orgConfig.startingDate) {
      continue;
    }

    const contributionAmount = Number(period.contributionAmount);

    for (const member of members) {
      const eligibilityDate = member.joinDate || member.registrationDate;

      // Crucial: A member must only have obligations on or after their eligibility date
      if (eligibilityDate && period.dueDate < eligibilityDate) {
        // Ineligible for this historical period
        continue;
      }

      // Check if obligation already exists
      const existing = await prisma.weeklyObligation.findUnique({
        where: {
          memberId_weekNumber_year: {
            memberId: member.id,
            weekNumber: period.weekNumber,
            year: period.dueDate.getUTCFullYear(),
          },
        },
      });

      if (!existing) {
        await prisma.weeklyObligation.create({
          data: {
            memberId: member.id,
            weeklyPeriodId: period.id,
            ethiopianPeriodId: period.periodId,
            weekNumber: period.weekNumber,
            year: period.dueDate.getUTCFullYear(),
            dueDate: period.dueDate,
            contributionAmount,
            penaltyAmount: 0,
            totalDue: contributionAmount,
            amountPaid: 0,
            status: ObligationStatus.PENDING,
            isMonthlyPenalty: false,
            consecutiveMissedWeeks: 0,
          },
        });
        newObligationsCreated++;
      } else if (!existing.weeklyPeriodId) {
        // Link unlinked existing obligation
        await prisma.weeklyObligation.update({
          where: { id: existing.id },
          data: {
            weeklyPeriodId: period.id,
            ethiopianPeriodId: period.periodId,
          },
        });
      }
    }

    // Refresh period summary metrics
    const periodObligations = await prisma.weeklyObligation.findMany({
      where: { weeklyPeriodId: period.id },
      select: { totalDue: true, amountPaid: true },
    });
    const totalExpected = periodObligations.reduce((sum, o) => sum + Number(o.totalDue), 0);
    const totalCollected = periodObligations.reduce((sum, o) => sum + Number(o.amountPaid), 0);
    await prisma.weeklyPeriod.update({
      where: { id: period.id },
      data: {
        isGenerated: periodObligations.length > 0,
        obligationsCount: periodObligations.length,
        totalExpected,
        totalCollected,
        totalOutstanding: Math.max(0, totalExpected - totalCollected),
      },
    });
  }

  // Recalculate outstanding balance for each member without deleting historical payments/penalties
  for (const member of members) {
    await recalculateOutstandingBalance(member.id);
  }

  // Log in AuditLog
  await createAuditEntry(
    input.adminUserId || null,
    'RECALCULATE_MEMBER_OBLIGATIONS',
    'FINANCIAL_ENGINE',
    {
      totalApprovedMembers: members.length,
      totalPeriodsEvaluated: periods.length,
      newObligationsCreated,
      reason: input.reason || 'Admin confirmed member obligation recalculation',
    },
    input.ipAddress
  );

  return {
    totalApprovedMembers: members.length,
    totalPeriodsEvaluated: periods.length,
    newObligationsCreated,
    message: 'Member obligations recalculated and balances reconciled successfully.',
  };
}

