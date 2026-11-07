import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  toEthiopianDate,
  toGregorianDate,
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_WEEKDAYS,
  isEthiopianLeapYear,
  getDaysInEthiopianMonth,
  syncWeeklyPeriodsInDb,
  generateObligationsForWeeklyPeriod,
  getWeeklyPeriodsWithSummary,
  planWeeklyPeriodsForEthiopianYear,
} from '../services/ethiopian-calendar.service.js';
import { getOrganizationConfig } from '../services/organization-config.service.js';
import prisma from '../config/database.js';

const router = Router();

// 1. Get current date in Ethiopian and Gregorian calendar (public/authenticated)
router.get('/current', async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const now = new Date();
    const ethNow = toEthiopianDate(now);

    // Find next Saturday
    const nextSat = new Date(now);
    const day = nextSat.getUTCDay();
    const diff = (6 - day + 7) % 7;
    nextSat.setUTCDate(nextSat.getUTCDate() + (diff === 0 ? 7 : diff));
    const ethNextSat = toEthiopianDate(nextSat);

    sendSuccess(
      res,
      {
        gregorian: {
          iso: now.toISOString(),
          dateString: now.toISOString().slice(0, 10),
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
          day: now.getUTCDate(),
        },
        ethiopian: ethNow,
        isLeapYear: isEthiopianLeapYear(ethNow.year),
        daysInCurrentMonth: getDaysInEthiopianMonth(ethNow.year, ethNow.month),
        nextSaturdayDeadline: {
          gregorianDate: nextSat.toISOString().slice(0, 10),
          ethiopianDate: ethNextSat.formattedEth,
          ethiopianDateEn: ethNextSat.formattedEn,
        },
      },
      'general.success',
      lang
    );
  } catch (error) {
    console.error('Error getting current Ethiopian date:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 2. Get all 13 Ethiopian months and weekdays reference
router.get('/months', async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  sendSuccess(
    res,
    {
      months: ETHIOPIAN_MONTHS,
      weekdays: ETHIOPIAN_WEEKDAYS,
    },
    'general.success',
    lang
  );
});

// 3. Convert date between Ethiopian and Gregorian
router.get('/convert', async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { date, ethYear, ethMonth, ethDate } = req.query;

    if (date) {
      const gDate = new Date(String(date));
      const eth = toEthiopianDate(gDate);
      sendSuccess(res, { input: date, converted: eth, direction: 'gregorianToEthiopian' }, 'general.success', lang);
      return;
    }

    if (ethYear && ethMonth && ethDate) {
      const gDate = toGregorianDate(Number(ethYear), Number(ethMonth), Number(ethDate));
      const ethCheck = toEthiopianDate(gDate);
      sendSuccess(
        res,
        {
          input: { year: ethYear, month: ethMonth, date: ethDate },
          converted: {
            iso: gDate.toISOString(),
            dateString: gDate.toISOString().slice(0, 10),
            ethCheck,
          },
          direction: 'ethiopianToGregorian',
        },
        'general.success',
        lang
      );
      return;
    }

    sendError(res, 'general.validationError', lang, 400);
  } catch (error: any) {
    console.error('Error converting calendar date:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// 4. View weekly periods with real collection summaries (Admin & Auditor)
router.get('/weekly-periods', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;

    const periods = await getWeeklyPeriodsWithSummary(year, month);
    sendSuccess(res, periods, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching weekly periods:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 5. Generate Weekly Periods for an Ethiopian Year or Month (Admin only)
router.post('/weekly-periods/generate', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const orgConfig = await getOrganizationConfig();
    const { ethiopianYear, ethiopianMonth, contributionRate = orgConfig.weeklyContributionRate } = req.body;
    if (!ethiopianYear) {
      sendError(res, 'general.validationError', lang, 400);
      return;
    }

    const year = Number(ethiopianYear);
    const month = ethiopianMonth ? Number(ethiopianMonth) : undefined;
    const rate = Number(contributionRate) || orgConfig.weeklyContributionRate;

    const result = await syncWeeklyPeriodsInDb(year, month, rate);

    sendSuccess(
      res,
      {
        ethiopianYear: year,
        ethiopianMonth: month,
        createdPeriodsCount: result.createdCount,
        existingPeriodsCount: result.existingCount,
        totalPeriods: result.periods.length,
      },
      'general.success',
      lang,
      201
    );
  } catch (error: any) {
    console.error('Error generating weekly periods:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// 6. Generate member obligations for a weekly period (Admin only)
router.post('/weekly-periods/:id/generate-obligations', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const periodId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await generateObligationsForWeeklyPeriod(periodId);

    sendSuccess(
      res,
      {
        periodId: result.period.periodId,
        ethiopianDueDate: result.period.ethiopianDueDate,
        createdObligationsCount: result.createdObligationsCount,
        eligibleMembersCount: result.eligibleMembersCount,
        totalExpectedAmount: result.totalExpectedAmount,
        status: 'SUCCESS',
      },
      'general.success',
      lang,
      201
    );
  } catch (error: any) {
    console.error('Error generating member obligations for period:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

// 7. Preview periods before generation (Admin confirmation summary)
router.get('/weekly-periods/preview', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const orgConfig = await getOrganizationConfig();
    const year = req.query.year ? Number(req.query.year) : orgConfig.startingEthiopianYear;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const rate = req.query.rate ? Number(req.query.rate) : orgConfig.weeklyContributionRate;

    if (year < orgConfig.startingEthiopianYear) {
      sendError(
        res,
        `Cannot preview or generate periods for Ethiopian year ${year} prior to organization starting year ${orgConfig.startingEthiopianYear} E.C.`,
        lang,
        400
      );
      return;
    }

    if (year === orgConfig.startingEthiopianYear && month !== undefined && month < orgConfig.startingEthiopianMonth) {
      sendError(
        res,
        `Cannot preview or generate periods for month ${month} prior to organization starting month ${orgConfig.startingEthiopianMonth} (${orgConfig.ethiopianMonthNameEn}) in year ${year}.`,
        lang,
        400
      );
      return;
    }

    const earliestDate = year === orgConfig.startingEthiopianYear ? orgConfig.startingDate : undefined;
    const plans = planWeeklyPeriodsForEthiopianYear(year, month, rate, earliestDate);
    const eligibleCount = await prisma.member.count({ where: { status: 'APPROVED' } });

    sendSuccess(
      res,
      {
        ethiopianYear: year,
        targetMonth: month,
        totalPlannedWeeks: plans.length,
        eligibleMembersCount: eligibleCount,
        estimatedTotalExpectedPerWeek: eligibleCount * rate,
        estimatedGrandTotalExpected: eligibleCount * rate * plans.length,
        periods: plans,
      },
      'general.success',
      lang
    );
  } catch (error: any) {
    console.error('Error previewing weekly periods:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// 8. Batch generate obligations for all periods in year/month
router.post('/weekly-periods/generate-obligations-batch', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { year, month } = req.body;
    if (!year) {
      sendError(res, 'general.validationError', lang, 400);
      return;
    }

    const periods = await prisma.weeklyPeriod.findMany({
      where: {
        ethiopianYear: Number(year),
        ...(month ? { ethiopianMonth: Number(month) } : {}),
      },
    });

    let totalCreated = 0;
    let periodsProcessed = 0;

    for (const p of periods) {
      const resObj = await generateObligationsForWeeklyPeriod(p.id);
      totalCreated += resObj.createdObligationsCount;
      periodsProcessed++;
    }

    sendSuccess(
      res,
      {
        periodsProcessed,
        totalCreatedObligations: totalCreated,
      },
      'general.success',
      lang
    );
  } catch (error: any) {
    console.error('Error batch generating obligations:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

export default router;
