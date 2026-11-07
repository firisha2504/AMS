import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { validateBody } from '../middleware/validate.js';
import { updatePublicContentSchema } from '../validators/schemas.js';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getOrganizationConfig } from '../services/organization-config.service.js';

const router = Router();

router.get('/organization', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const config = await getOrganizationConfig();
    sendSuccess(res, config, 'general.success', lang);
  } catch (error) {
    console.error('Error fetching public organization config:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

router.get('/home', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const [totalMembers, activeMembers, upcomingMeetings, homeContent] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: 'APPROVED' } }),
    prisma.meeting.findMany({
      where: { meetingDate: { gte: new Date() } },
      take: 3,
      orderBy: { meetingDate: 'asc' },
      select: { id: true, title: true, location: true, meetingDate: true, meetingTime: true },
    }),
    prisma.publicContent.findUnique({ where: { slug: 'home' } }),
  ]);

  sendSuccess(res, {
    welcomeMessage: lang === 'om'
      ? 'Baga nagaan gara Afosha dhuftan'
      : 'Welcome to Afosha',
    statistics: { totalMembers, activeMembers },
    upcomingMeetings,
    content: homeContent,
  }, 'general.success', lang);
});

router.get('/about', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const tabs = await prisma.publicContent.findMany({
    where: {
      slug: { in: ['about-afosha', 'mission-vision', 'heera-danbii', 'contact'] },
    },
    orderBy: { sortOrder: 'asc' },
  });

  sendSuccess(res, tabs, 'general.success', lang);
});

router.get('/content/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const content = await prisma.publicContent.findUnique({
    where: { slug: String(req.params.slug) },
  });

  if (!content) {
    sendSuccess(res, null, 'general.notFound', lang, 404);
    return;
  }

  sendSuccess(res, content, 'general.success', lang);
});

router.put('/content/:slug', authenticate, authorize('ADMIN'), validateBody(updatePublicContentSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { title, titleOm, content, contentOm } = req.body;

  const updated = await prisma.publicContent.upsert({
    where: { slug: String(req.params.slug) },
    create: { slug: String(req.params.slug), title, titleOm, content, contentOm: contentOm ?? content },
    update: { title, titleOm, content, contentOm },
  });

  sendSuccess(res, updated, 'general.success', lang);
});

router.get('/payment-info', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  // 1. Fetch system settings for rates and payment accounts
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'weekly_contribution',
          'weekly_penalty',
          'monthly_penalty',
          'graduation_contribution',
          'bereavement_contribution',
          'meeting_day',
          'payment_account_cbe',
          'payment_account_telebirr',
          'payment_account_ebirr',
          'payment_account_bank_transfer',
        ],
      },
    },
  });

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  const orgConfig = await getOrganizationConfig();
  const weeklyContribution = orgConfig.weeklyContributionRate || parseFloat(settingsMap['weekly_contribution'] || '50');
  const weeklyPenalty = parseFloat(settingsMap['weekly_penalty'] || '50');
  const monthlyPenalty = parseFloat(settingsMap['monthly_penalty'] || '100');
  const graduationContribution = parseFloat(settingsMap['graduation_contribution'] || '100');
  const bereavementContribution = parseFloat(settingsMap['bereavement_contribution'] || '100');

  const parseJsonSafe = (raw?: string, fallback: any = {}) => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const paymentMethods = [
    {
      id: 'CBE',
      name: 'Commercial Bank of Ethiopia (CBE / CBE Birr)',
      nameOm: 'Baankii Daldala Itoophiyaa (CBE / CBE Birr)',
      accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
      accountNumber: '1000234567890',
      branch: 'Melka Jabdu / Dire Dawa',
      details: parseJsonSafe(settingsMap['payment_account_cbe']),
      instructionsEn: 'Deposit or transfer to CBE Account 1000234567890. Enter Member ID in the narrative/reason. Keep the transaction reference for verification.',
      instructionsOm: 'Herrega Baankii CBE 1000234567890 irratti dabarsaa. Sababa kaffaltii irratti Eenyummeessaa Miseensaa (Member ID) galchaa. Lakkoofsa ragaa kaffaltii qabadhaa.',
      icon: 'cbe',
    },
    {
      id: 'TELEBIRR',
      name: 'Telebirr Mobile Money',
      nameOm: 'Telebirr Maallaqa Moobaayilaa',
      accountName: 'Gamtaa Dargaggoota Melka Jabdu',
      accountNumber: '+251 900 000 000',
      merchantCode: '789456',
      details: parseJsonSafe(settingsMap['payment_account_telebirr']),
      instructionsEn: 'Open Telebirr, select Send Money or Pay Merchant (Code: 789456). Enter your contribution amount and save the transaction confirmation SMS.',
      instructionsOm: 'Appii Telebirr banaa, Maallaqa Ergi ykn Koodii Daldalaa (789456) fayyadamaa. Hanga maallaqaa galchuun ergaa gabaasa kaffaltii olkaa\'aa.',
      icon: 'telebirr',
    },
    {
      id: 'EBIRR',
      name: 'eBirr Digital Wallet',
      nameOm: 'eBirr Walda Maallaqa Dijitaalaa',
      accountName: 'Gamtaa Dargaggoota Melka Jabdu',
      accountNumber: '+251 900 000 000',
      merchantCode: '45213',
      details: parseJsonSafe(settingsMap['payment_account_ebirr']),
      instructionsEn: 'Dial *841# or open the eBirr App. Send money or pay merchant #45213. Copy the transaction reference ID.',
      instructionsOm: '*841# bilbilaa ykn Appii eBirr fayyadamaa. Koodii daldalaa #45213 kaffalaati lakkoofsa ragaa kaffaltii kopi godhadhaa.',
      icon: 'ebirr',
    },
    {
      id: 'BANK_TRANSFER',
      name: 'Direct Bank Transfer / Wire',
      nameOm: 'Dabarsa Baankii Kallattii',
      accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
      accountNumber: '1000234567890',
      branch: 'Melka Jabdu Branch',
      swiftCode: 'CBETETAA',
      details: parseJsonSafe(settingsMap['payment_account_bank_transfer']),
      instructionsEn: 'Direct bank transfer via CBE Mobile Banking, ATM, or Awash Bank. Include your full name and member ID in the transfer slip.',
      instructionsOm: 'Dabarsa Baankii kallattii CBE, Awash ykn ATM dhaan kaffalaa. Nagahee irratti maqaa fi lakk. miseensaa barreessaa.',
      icon: 'bank',
    },
  ];

  // 2. If authenticated member, fetch live financial balance and recent payments
  let memberDetails: any = null;
  if (req.user?.userId) {
    const member = await prisma.member.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { phone: true, email: true } },
      },
    });

    if (member) {
      const { getMemberFinancialSummary } = await import('../services/financial-calculator.service.js');
      const memberSummary = await getMemberFinancialSummary(member.id);

      const paidPayments = await prisma.payment.findMany({
        where: { memberId: member.id, status: 'VERIFIED' },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      });

      const nextSat = new Date();
      nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7));

      if (memberSummary) {
        memberDetails = {
          id: member.id,
          fullName: member.fullName,
          memberId: member.memberId,
          status: member.status,
          phone: member.user?.phone,
          outstandingBalance: memberSummary.totalOutstandingBalance,
          totalCredit: memberSummary.totalCredit,
          totalAmountPaid: memberSummary.totalAmountPaid,
          totalPenalties: memberSummary.penaltiesOutstanding,
          weeklyOutstanding: memberSummary.weeklyOutstanding,
          specialOutstanding: memberSummary.specialOutstanding,
          emergencyOutstanding: memberSummary.emergencyOutstanding,
          historicalOutstanding: memberSummary.historicalOutstanding,
          unpaidObligationsCount: memberSummary.weeklyObligations.filter((w) => w.status !== 'PAID').length,
          dueThisSaturday: weeklyContribution,
          nextSaturdayDate: nextSat.toISOString().split('T')[0],
          penalties: memberSummary.penalties,
          obligations: memberSummary.weeklyObligations,
          specialObligations: memberSummary.specialObligations,
          emergencyObligations: memberSummary.emergencyObligations,
          historicalObligation: memberSummary.historicalObligation,
          recentPayments: paidPayments.map((p) => ({
            id: p.id,
            paymentId: p.paymentId,
            date: p.paymentDate.toISOString().split('T')[0],
            amount: Number(p.amount),
            method: p.paymentMethod,
            status: p.status,
            receiptNumber: p.receiptNumber,
            notes: p.notes,
          })),
        };
      }
    }
  }

  sendSuccess(
    res,
    {
      rates: {
        weeklyContribution,
        weeklyPenalty,
        monthlyPenalty,
        graduationContribution,
        bereavementContribution,
        meetingDay: 'Saturday',
        meetingDayOm: 'Sanbata',
      },
      paymentMethods,
      rules: {
        weeklyContribution: {
          titleEn: 'Weekly Contribution Rules',
          titleOm: 'Seera Kaffaltii Torbanii',
          descriptionEn: `Every member is obligated to contribute ${weeklyContribution} ETB weekly. Payment day is every Saturday. Timely contributions maintain good organizational standing and fund solidarity activities.`,
          descriptionOm: `Miseensi hundi torbanitti ${weeklyContribution} ETB kaffaluuf dirqama qaba. Guyyaan kaffaltii Sanbata hunda. Kaffaltiin yeroo eeggatee raawwatamu miseensummaa qulqulluu fi tokkummaa gamtaa cimsa.`,
        },
        penalties: {
          titleEn: 'Penalties & Default Rules',
          titleOm: 'Seera Adabbii fi Yeroo Darbe',
          descriptionEn: `A late penalty of ${weeklyPenalty} ETB applies for missing the Saturday contribution window. Unsettled obligations for 4 consecutive weeks trigger an escalating reminder, while 8 consecutive weeks incur an additional ${monthlyPenalty} ETB monthly penalty and risk suspension.`,
          descriptionOm: `Kaffaltii Sanbataa dabarsuuf adabbiin ${weeklyPenalty} ETB ni murtaa'a. Torban 4 walitti aanee kan hin kaffalle adabbii dabalataa fi akeekkachiisa, torban 8 walitti aansuun dhabamuun immoo adabbii ${monthlyPenalty} ETB fi miseensummaa dhaabuu geessisa.`,
        },
        historicalJoining: {
          titleEn: 'Historical Joining Obligations',
          titleOm: 'Kaffaltii Seensaa fi Seenaa',
          descriptionEn: `Members joining after the founding date (${orgConfig.startingEthiopianDate}/${orgConfig.startingEthiopianMonth}/${orgConfig.startingEthiopianYear} EC) contribute an assessed retrospective rate (variable weekly rates + past special campaigns) or follow an approved installment plan without undue barrier.`,
          descriptionOm: `Miseensonni erga gamtaan hundeeffamee (${orgConfig.startingEthiopianDate}/${orgConfig.startingEthiopianMonth}/${orgConfig.startingEthiopianYear} ALH) booda galmaa'an kaffaltii seensaa bu'uura gumaata kaffalameetiin herreegamu kaffalu ykn qoodanii kaffaluuf carraa qabaatu.`,
        },
        specialAndEmergency: {
          titleEn: 'Special & Emergency Contributions',
          titleOm: 'Gumaacha Addaa fi Hatattamaa',
          descriptionEn: `In events of grief/bereavement (${bereavementContribution} ETB) or educational graduation (${graduationContribution} ETB) or sudden member distress, members pool mutual solidarity funds per formal organizational resolution.`,
          descriptionOm: `Taatee gaddaa (${bereavementContribution} ETB), eebba barnootaa (${graduationContribution} ETB) ykn rakkoo hatattamaa miseensaa yeroo uumamu, miseensonni murtii gamtaatiin wal gargaaru.`,
        },
      },
      member: memberDetails,
    },
    'general.success',
    lang
  );
});

router.get('/contact', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';

  const [contactContent, orgConfig] = await Promise.all([
    prisma.publicContent.findUnique({ where: { slug: 'contact' } }),
    getOrganizationConfig(),
  ]);

  const contactData = {
    organization: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
    slogan: 'Tokkummaan Ciminaa fi Milkaayina',
    founded: `${orgConfig.startingEthiopianDate}/${orgConfig.startingEthiopianMonth}/${orgConfig.startingEthiopianYear} EC (${orgConfig.ethiopianMonthNameEn} ${orgConfig.startingEthiopianDate}, ${orgConfig.startingEthiopianYear} EC)`,
    address: {
      city: 'Dire Dawa',
      subCity: 'Melka Jabdu / Qaxaa Araati',
      kebele: 'Kebele 01',
      country: 'Ethiopia',
      fullAddressEn: 'Melka Jabdu / Qaxaa Araati, Kebele 01, Dire Dawa, Ethiopia',
      fullAddressOm: 'Melka Jabdu / Qaxaa Araati, Ganda 01, Dirree Dawaa, Itoophiyaa',
    },
    phones: [
      { label: 'Executive Committee / Secretariat', labelOm: 'Koree Hojii Raawwachiiftuu / Barreessaa', number: '+251 911 234 567' },
      { label: 'Treasury & Finance Office', labelOm: 'Waajjira Qorannoo fi Maallaqaa', number: '+251 922 345 678' },
      { label: 'Emergency Hotline', labelOm: 'Sarara Hatattamaa', number: '+251 900 000 000' },
    ],
    emails: [
      { label: 'General Inquiries', email: 'info@afosha.org' },
      { label: 'Support & Member Services', email: 'support@afosha.org' },
    ],
    meetingSchedule: {
      dayEn: 'Every Saturday',
      dayOm: 'Sanbata Hunda',
      time: '2:00 PM – 5:00 PM (Sa\'aatii 8:00 – 11:00 WB)',
      location: 'Melka Jabdu Community Assembly Hall',
      locationOm: 'Galma Walga\'ii Hawaasaa Melka Jabdu',
    },
    socials: {
      telegram: '@MelkaJabduAfosha',
      whatsapp: '+251 911 234 567',
    },
    content: contactContent,
  };

  sendSuccess(res, contactData, 'general.success', lang);
});

router.post('/contact', optionalAuth, async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { fullName, phone, email, subject, message } = req.body;

  if (!fullName || !phone || !message) {
    res.status(400).json({
      success: false,
      message: lang === 'om' ? 'Maqaa, bilbila fi ergaa galchuun dirqama.' : 'Name, phone number, and message are required.',
    });
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: 'PUBLIC_CONTACT_INQUIRY',
        module: 'PUBLIC',
        details: {
          fullName,
          phone,
          email: email || null,
          subject: subject || 'General Inquiry',
          message,
        },
        userId: req.user?.userId || null,
        ipAddress: req.ip,
      },
    });
  } catch (err) {
    console.log('Public inquiry received:', { fullName, phone, email, subject, message });
  }

  res.json({
    success: true,
    message: lang === 'om'
      ? 'Ergaan keessan milkaa\'inaan nu ga\'eera. Yeroo gabaabaa keessatti isin qunnamna.'
      : 'Your message has been sent successfully. We will get back to you shortly.',
    data: {
      receivedAt: new Date().toISOString(),
      ticket: `INQ-${Math.floor(100000 + Math.random() * 900000)}`,
    },
  });
});

export default router;
