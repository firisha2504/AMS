import { EthDateTime } from 'ethiopian-calendar-date-converter';
import prisma from '../config/database.js';
import { ObligationStatus } from '@prisma/client';
import { recalculateOutstandingBalance } from './contribution.service.js';

export interface EthiopianMonthInfo {
  number: number;
  nameEn: string;
  nameOm: string;
  nameAm: string;
  days: number;
}

export interface EthiopianDateResult {
  year: number;
  month: number;
  date: number;
  monthNameEn: string;
  monthNameOm: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  dayNameEn: string;
  dayNameOm: string;
  formattedEth: string; // e.g. "24 Onkololeessa 2019"
  formattedEn: string;  // e.g. "24 Tikimt 2019"
}

export const ETHIOPIAN_MONTHS: EthiopianMonthInfo[] = [
  { number: 1, nameEn: 'Meskerem', nameOm: 'Fulbaana', nameAm: 'መስከረም', days: 30 },
  { number: 2, nameEn: 'Tikimt', nameOm: 'Onkololeessa', nameAm: 'ጥቅምት', days: 30 },
  { number: 3, nameEn: 'Hidar', nameOm: 'Sadaasa', nameAm: 'ኅዳር', days: 30 },
  { number: 4, nameEn: 'Tahsas', nameOm: 'Muddee', nameAm: 'ታኅሣሥ', days: 30 },
  { number: 5, nameEn: 'Tir', nameOm: 'Amajjii', nameAm: 'ጥር', days: 30 },
  { number: 6, nameEn: 'Yekatit', nameOm: 'Guraandhala', nameAm: 'የካቲት', days: 30 },
  { number: 7, nameEn: 'Megabit', nameOm: 'Bitootessa', nameAm: 'መጋቢት', days: 30 },
  { number: 8, nameEn: 'Miazia', nameOm: 'Ebla', nameAm: 'ሚያዝያ', days: 30 },
  { number: 9, nameEn: 'Ginbot', nameOm: 'Caamsaa', nameAm: 'ግንቦት', days: 30 },
  { number: 10, nameEn: 'Sene', nameOm: 'Waxabajjii', nameAm: 'ሰኔ', days: 30 },
  { number: 11, nameEn: 'Hamle', nameOm: 'Adooleessa', nameAm: 'ሐምሌ', days: 30 },
  { number: 12, nameEn: 'Nehase', nameOm: 'Hagayya', nameAm: 'ነሐሴ', days: 30 },
  { number: 13, nameEn: 'Pagume', nameOm: 'Qaammee', nameAm: 'ጳጉሜ', days: 5 }, // 6 in leap year
];

export const ETHIOPIAN_WEEKDAYS = [
  { day: 0, nameEn: 'Sunday', nameOm: 'Dilbata', shortOm: 'Dil' },
  { day: 1, nameEn: 'Monday', nameOm: 'Wiixata', shortOm: 'Wix' },
  { day: 2, nameEn: 'Tuesday', nameOm: 'Kibxata', shortOm: 'Kib' },
  { day: 3, nameEn: 'Wednesday', nameOm: 'Roobii', shortOm: 'Rob' },
  { day: 4, nameEn: 'Thursday', nameOm: 'Kamiisa', shortOm: 'Kam' },
  { day: 5, nameEn: 'Friday', nameOm: 'Jimmata', shortOm: 'Jim' },
  { day: 6, nameEn: 'Saturday', nameOm: 'Sanbata', shortOm: 'San' },
];

/**
 * Check if an Ethiopian year is a leap year (Pagume has 6 days)
 * Ethiopian leap year rule: year % 4 === 3
 */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/**
 * Get number of days in an Ethiopian month
 */
export function getDaysInEthiopianMonth(year: number, month: number): number {
  if (month < 1 || month > 13) throw new Error(`Invalid Ethiopian month: ${month}`);
  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  return 30;
}

/**
 * Convert a Gregorian Date to Ethiopian Date object with rich bilingual metadata
 */
export function toEthiopianDate(dateInput: Date | string): EthiopianDateResult {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid Date input: ${dateInput}`);
  }

  // Adjust for Africa/Addis_Ababa timezone (UTC+3)
  const addisOffsetMs = 3 * 60 * 60 * 1000;
  const localTime = new Date(d.getTime() + addisOffsetMs);
  
  // Use UTC components to avoid host timezone interference
  const utcDate = new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
  const eth = EthDateTime.fromEuropeanDate(utcDate);

  const mInfo = ETHIOPIAN_MONTHS[eth.month - 1] || ETHIOPIAN_MONTHS[0];
  const dayOfWeek = utcDate.getUTCDay();
  const dayInfo = ETHIOPIAN_WEEKDAYS[dayOfWeek];

  return {
    year: eth.year,
    month: eth.month,
    date: eth.date,
    monthNameEn: mInfo.nameEn,
    monthNameOm: mInfo.nameOm,
    dayOfWeek,
    dayNameEn: dayInfo.nameEn,
    dayNameOm: dayInfo.nameOm,
    formattedEth: `${eth.date} ${mInfo.nameOm} ${eth.year}`,
    formattedEn: `${eth.date} ${mInfo.nameEn} ${eth.year}`,
  };
}

/**
 * Convert an Ethiopian date to Gregorian Date
 */
export function toGregorianDate(ethYear: number, ethMonth: number, ethDate: number): Date {
  const maxDays = getDaysInEthiopianMonth(ethYear, ethMonth);
  if (ethDate < 1 || ethDate > maxDays) {
    throw new Error(`Invalid Ethiopian day: ${ethDate} for month ${ethMonth} year ${ethYear} (max: ${maxDays})`);
  }

  const eth = new EthDateTime(ethYear, ethMonth, ethDate);
  const euro = eth.toEuropeanDate();
  // Return Date set to midnight in Addis Ababa (21:00 UTC previous day, or 00:00 local)
  return new Date(Date.UTC(euro.getUTCFullYear(), euro.getUTCMonth(), euro.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Format any date with calendar selection and language
 */
export function formatWithCalendar(
  dateInput: Date | string,
  calendar: 'ETHIOPIAN' | 'GREGORIAN' = 'ETHIOPIAN',
  lang: 'om' | 'en' = 'om'
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  if (calendar === 'ETHIOPIAN') {
    const eth = toEthiopianDate(d);
    return lang === 'om' ? eth.formattedEth : eth.formattedEn;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return d.toLocaleDateString(lang === 'om' ? 'en-US' : 'en-US', options);
}

/**
 * Calculate all Saturday payment periods in an Ethiopian Year or Month
 */
export interface GeneratedPeriodPlan {
  periodId: string;
  ethiopianYear: number;
  ethiopianMonth: number;
  ethiopianMonthName: string;
  weekNumber: number;
  ethiopianStartDate: string;
  ethiopianEndDate: string;
  ethiopianDueDate: string;
  startDate: Date;
  endDate: Date;
  dueDate: Date; // Saturday deadline
  contributionAmount: number;
}

export function planWeeklyPeriodsForEthiopianYear(
  ethYear: number,
  targetMonth?: number,
  contributionRate = 50,
  earliestAllowedDate?: Date
): GeneratedPeriodPlan[] {
  const periods: GeneratedPeriodPlan[] = [];

  // Meskerem 1 starts the Ethiopian year
  const startOfYear = toGregorianDate(ethYear, 1, 1);
  // Pagume end of year
  const pagumeDays = getDaysInEthiopianMonth(ethYear, 13);
  const endOfYear = toGregorianDate(ethYear, 13, pagumeDays);

  // Find the first Saturday on or after startOfYear
  const currentSaturday = new Date(startOfYear);
  while (currentSaturday.getUTCDay() !== 6) {
    currentSaturday.setUTCDate(currentSaturday.getUTCDate() + 1);
  }

  let weekNumber = 1;
  const loopLimit = 60; // Max weeks in a solar year is ~53
  let iter = 0;

  while (currentSaturday <= endOfYear && iter < loopLimit) {
    iter++;
    
    // Saturday deadline is at 18:00 (6:00 PM local time = 15:00 UTC)
    const dueDate = new Date(Date.UTC(
      currentSaturday.getUTCFullYear(),
      currentSaturday.getUTCMonth(),
      currentSaturday.getUTCDate(),
      15, 0, 0, 0
    ));

    // Period starts 6 days before Saturday (Sunday 00:00 local)
    const startDate = new Date(Date.UTC(
      currentSaturday.getUTCFullYear(),
      currentSaturday.getUTCMonth(),
      currentSaturday.getUTCDate() - 6,
      0, 0, 0, 0
    ));

    // Period ends Saturday 23:59:59 local
    const endDate = new Date(Date.UTC(
      currentSaturday.getUTCFullYear(),
      currentSaturday.getUTCMonth(),
      currentSaturday.getUTCDate(),
      20, 59, 59, 999
    ));

    const ethStart = toEthiopianDate(startDate);
    const ethDue = toEthiopianDate(dueDate);

    // Skip if before organization's earliest allowed date
    if (earliestAllowedDate && dueDate < earliestAllowedDate) {
      weekNumber++;
      currentSaturday.setUTCDate(currentSaturday.getUTCDate() + 7);
      continue;
    }

    // Filter by target month if specified (based on the Saturday payment due date)
    if (!targetMonth || ethDue.month === targetMonth) {
      const padWeek = String(weekNumber).padStart(2, '0');
      const periodId = `WP-${ethYear}-W${padWeek}`;

      periods.push({
        periodId,
        ethiopianYear: ethYear,
        ethiopianMonth: ethDue.month,
        ethiopianMonthName: ethDue.monthNameEn,
        weekNumber,
        ethiopianStartDate: `${ethStart.date} ${ethStart.monthNameEn}`,
        ethiopianEndDate: `${ethDue.date} ${ethDue.monthNameEn}`,
        ethiopianDueDate: `${ethDue.date} ${ethDue.monthNameEn} ${ethYear} (${ethDue.dayNameEn})`,
        startDate,
        endDate,
        dueDate,
        contributionAmount: contributionRate,
      });
    }

    weekNumber++;
    // Advance to next Saturday
    currentSaturday.setUTCDate(currentSaturday.getUTCDate() + 7);
  }

  return periods;
}

/**
 * Generate or sync WeeklyPeriod records into PostgreSQL
 */
export async function syncWeeklyPeriodsInDb(
  ethYear: number,
  targetMonth?: number,
  rate?: number
): Promise<{ createdCount: number; existingCount: number; periods: any[] }> {
  const { getOrganizationConfig } = await import('./organization-config.service.js');
  const orgConfig = await getOrganizationConfig();

  // Prevent generating periods prior to organization starting year
  if (ethYear < orgConfig.startingEthiopianYear) {
    throw new Error(
      `Cannot generate periods for Ethiopian year ${ethYear}. Organization starting year is ${orgConfig.startingEthiopianYear} E.C.`
    );
  }

  // Prevent generating periods prior to organization starting month in starting year
  if (ethYear === orgConfig.startingEthiopianYear && targetMonth && targetMonth < orgConfig.startingEthiopianMonth) {
    throw new Error(
      `Cannot generate periods for month ${targetMonth} in year ${ethYear}. Organization started in month ${orgConfig.startingEthiopianMonth} (${orgConfig.ethiopianMonthNameEn}).`
    );
  }

  const effectiveRate = rate && rate > 0 ? rate : orgConfig.weeklyContributionRate;
  const earliestDate = ethYear === orgConfig.startingEthiopianYear ? orgConfig.startingDate : undefined;

  const plans = planWeeklyPeriodsForEthiopianYear(ethYear, targetMonth, effectiveRate, earliestDate);
  let createdCount = 0;
  let existingCount = 0;
  const resultPeriods = [];

  for (const plan of plans) {
    const existing = await prisma.weeklyPeriod.findUnique({
      where: { periodId: plan.periodId },
      include: {
        _count: { select: { weeklyObligations: true } },
      },
    });

    if (existing) {
      existingCount++;
      resultPeriods.push(existing);
    } else {
      const created = await prisma.weeklyPeriod.create({
        data: {
          periodId: plan.periodId,
          ethiopianYear: plan.ethiopianYear,
          ethiopianMonth: plan.ethiopianMonth,
          ethiopianMonthName: plan.ethiopianMonthName,
          weekNumber: plan.weekNumber,
          ethiopianStartDate: plan.ethiopianStartDate,
          ethiopianEndDate: plan.ethiopianEndDate,
          ethiopianDueDate: plan.ethiopianDueDate,
          startDate: plan.startDate,
          endDate: plan.endDate,
          dueDate: plan.dueDate,
          contributionAmount: plan.contributionAmount,
          isGenerated: false,
          obligationsCount: 0,
        },
      });
      createdCount++;
      resultPeriods.push(created);
    }
  }

  return { createdCount, existingCount, periods: resultPeriods };
}

/**
 * Generate weekly obligations for all eligible members for a specific WeeklyPeriod
 */
export async function generateObligationsForWeeklyPeriod(weeklyPeriodId: string): Promise<{
  period: any;
  createdObligationsCount: number;
  eligibleMembersCount: number;
  totalExpectedAmount: number;
}> {
  const period = await prisma.weeklyPeriod.findUnique({
    where: { id: weeklyPeriodId },
  });

  if (!period) {
    throw new Error(`Weekly period not found: ${weeklyPeriodId}`);
  }

  const eligibleMembers = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, fullName: true, memberId: true, joinDate: true, registrationDate: true },
  });

  let createdCount = 0;
  const contributionAmount = Number(period.contributionAmount);

  for (const member of eligibleMembers) {
    // Member's approved financial eligibility date
    const memberEligibilityDate = member.joinDate || member.registrationDate;

    // Check financial eligibility: do not charge member for weeks prior to their eligibility date
    if (memberEligibilityDate && period.dueDate < memberEligibilityDate) {
      continue;
    }

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
      await recalculateOutstandingBalance(member.id);
      createdCount++;
    } else if (!existing.weeklyPeriodId) {
      // Link previously existing obligation if not linked
      await prisma.weeklyObligation.update({
        where: { id: existing.id },
        data: {
          weeklyPeriodId: period.id,
          ethiopianPeriodId: period.periodId,
        },
      });
    }
  }

  // Update period metadata
  const allPeriodObligations = await prisma.weeklyObligation.findMany({
    where: { weeklyPeriodId: period.id },
    select: { totalDue: true, amountPaid: true, status: true },
  });

  const obligationsCount = allPeriodObligations.length;
  const totalExpected = allPeriodObligations.reduce((acc, o) => acc + Number(o.totalDue), 0);
  const totalCollected = allPeriodObligations.reduce((acc, o) => acc + Number(o.amountPaid), 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);

  const updatedPeriod = await prisma.weeklyPeriod.update({
    where: { id: period.id },
    data: {
      isGenerated: obligationsCount > 0,
      obligationsCount,
      totalExpected,
      totalCollected,
      totalOutstanding,
    },
  });

  return {
    period: updatedPeriod,
    createdObligationsCount: createdCount,
    eligibleMembersCount: obligationsCount,
    totalExpectedAmount: totalExpected,
  };
}

/**
 * Get Weekly Periods with live aggregation
 */
export async function getWeeklyPeriodsWithSummary(
  ethYear?: number,
  ethMonth?: number
) {
  const whereClause: any = {};
  if (ethYear) whereClause.ethiopianYear = Number(ethYear);
  if (ethMonth) whereClause.ethiopianMonth = Number(ethMonth);

  const periods = await prisma.weeklyPeriod.findMany({
    where: whereClause,
    orderBy: [{ ethiopianYear: 'desc' }, { weekNumber: 'asc' }],
    include: {
      weeklyObligations: {
        select: {
          id: true,
          memberId: true,
          status: true,
          totalDue: true,
          amountPaid: true,
          penaltyAmount: true,
          member: { select: { fullName: true, memberId: true } },
        },
      },
    },
  });

  return periods.map((p) => {
    const obligations = p.weeklyObligations || [];
    const eligibleCount = obligations.length;
    const paidCount = obligations.filter((o) => o.status === 'PAID').length;
    const unpaidCount = obligations.filter((o) => o.status !== 'PAID').length;
    const totalExpected = obligations.reduce((s, o) => s + Number(o.totalDue), 0);
    const totalCollected = obligations.reduce((s, o) => s + Number(o.amountPaid), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);

    return {
      id: p.id,
      periodId: p.periodId,
      ethiopianYear: p.ethiopianYear,
      ethiopianMonth: p.ethiopianMonth,
      ethiopianMonthName: p.ethiopianMonthName,
      weekNumber: p.weekNumber,
      ethiopianStartDate: p.ethiopianStartDate,
      ethiopianEndDate: p.ethiopianEndDate,
      ethiopianDueDate: p.ethiopianDueDate,
      startDate: p.startDate,
      endDate: p.endDate,
      dueDate: p.dueDate,
      contributionAmount: Number(p.contributionAmount),
      isGenerated: p.isGenerated,
      eligibleMembersCount: eligibleCount,
      paidCount,
      unpaidCount,
      totalExpected,
      totalCollected,
      totalOutstanding,
      obligations,
    };
  });
}
