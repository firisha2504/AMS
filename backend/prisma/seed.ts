import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/helpers.js';
import { config } from '../src/config/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await hashPassword('Admin@123');

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@afosha.org',
      phone: '+251900000000',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      preferredLanguage: 'om',
      mustChangePassword: true,
    },
  });

  console.log('Admin user created:', admin.username);

  const defaultSettings = [
    { key: 'weekly_contribution', value: String(config.defaults.weeklyContribution), label: 'Weekly Contribution Amount', labelOm: 'Hanga Kaffaltii Torbanii' },
    { key: 'weekly_penalty', value: String(config.defaults.weeklyPenalty), label: 'Weekly Penalty Amount', labelOm: 'Hanga Adabbii Torbanii' },
    { key: 'monthly_penalty', value: String(config.defaults.monthlyPenalty), label: 'Monthly Penalty Amount', labelOm: 'Hanga Adabbii Ji\'aati' },
    { key: 'graduation_contribution', value: String(config.defaults.graduationContribution), label: 'Graduation Contribution Amount', labelOm: 'Hanga Kaffaltii Eebbifamuu' },
    { key: 'bereavement_contribution', value: String(config.defaults.bereavementContribution), label: 'Bereavement Contribution Amount', labelOm: 'Hanga Kaffaltii Du\'aa' },
    { key: 'meeting_day', value: String(config.defaults.meetingDay), label: 'Meeting Day (0=Sun, 6=Sat)', labelOm: 'Guyyaa Walga\'ii' },
    { key: 'organization_name', value: 'Afosha', label: 'Organization Name', labelOm: 'Maqaa Dhaabbataa' },
    { key: 'organization_motto', value: 'Tokkummaan Ciminaa fi Milkaayina', label: 'Motto', labelOm: 'Mata Duree' },
    {
      key: 'sms_template_payment_reminder_en',
      value: 'Reminder: Your weekly contribution of Birr {amount} is unpaid. Please pay before {dueDate}.',
      label: 'SMS Payment Reminder (English)',
      labelOm: 'Ergaa SMS Yaadachiisa Kaffaltii (Ingliffa)',
    },
    {
      key: 'sms_template_payment_reminder_om',
      value: 'Yaadachiisa: Gumaata tiyya Birr {amount} kaffalamuu qaba. Guyyaa {dueDate} dura kaffali.',
      label: 'SMS Payment Reminder (Afan Oromo)',
      labelOm: 'Ergaa SMS Yaadachiisa Kaffaltii (Afaan Oromoo)',
    },
    {
      key: 'sms_template_meeting_reminder_en',
      value: 'Reminder: A meeting is scheduled on {meetingDate}. Your attendance is required.',
      label: 'SMS Meeting Reminder (English)',
      labelOm: 'Ergaa SMS Yaadachiisa Walgahii (Ingliffa)',
    },
    {
      key: 'sms_template_meeting_reminder_om',
      value: 'Yaadachiisa: Walgahiin guyyaa {meetingDate} qophaa\'eera. Hirmaachuu siif barbaachisa.',
      label: 'SMS Meeting Reminder (Afan Oromo)',
      labelOm: 'Ergaa SMS Yaadachiisa Walgahii (Afaan Oromoo)',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  const publicPages = [
    {
      slug: 'home',
      title: 'Welcome to Afosha',
      titleOm: 'Baga nagaan gara Afosha dhuftan',
      content: 'Afosha Management System — supporting members through contributions, savings, and community solidarity.',
      contentOm: 'Sirna Bulchiinsa Afosha — miseensota kaffaltii, kuusaa fi waldaa hawaasummaa tiin deeggaru.',
      sortOrder: 0,
    },
    {
      slug: 'about-afosha',
      title: 'About Afosha',
      titleOm: 'Waa\'ee Afosha',
      content: 'Afosha is a community organization dedicated to member welfare, financial discipline, and social support.',
      contentOm: 'Afosha dhaabbata hawaasummaa miseensota eeguuf, cimina faayinaansii fi deeggarsa hawaasummaa irratti xiyyeeffatu.',
      sortOrder: 1,
    },
    {
      slug: 'mission-vision',
      title: 'Mission & Vision',
      titleOm: 'Ergaa fi Mul\'ata',
      content: 'Mission: To strengthen member unity and financial sustainability.\n\nVision: A united, prosperous member community.',
      contentOm: 'Ergaa: Tokkummaa miseensotaa fi cimina faayinaansii cimsuu.\n\nMul\'ata: Hawaasa miseensotaa tokkummaa qabu fi badhaadhaa.',
      sortOrder: 2,
    },
    {
      slug: 'heera-danbii',
      title: 'Rules & Regulations',
      titleOm: 'Heera fi Danbii',
      content: `Based on the Federal Democratic Republic of Ethiopia (FDRE) Constitution Article 31, which states: "Every person has the right to freedom of association for any cause or purpose, in accordance with the law, culture, and traditions of society."

Therefore, the Gamtaa Dargaggoota Melka Jabdu (Youth Association of Melka Jabdu) was established on January 1, 2017 (Ethiopian Calendar), based on this constitutional provision as a legally recognized association, founded on national law and respecting the culture and traditions of the people.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJECTIVES, FUNDAMENTAL PRINCIPLES, MEMBERSHIP CONDITIONS, RIGHTS AND RESPONSIBILITIES OF MEMBERS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core Objectives of the Association

The Gamtaa Dargaggoota Melka Jabdu has the following objectives:

1. To educate, build, and enable young people to live together and support one another.

2. To strengthen the unity and solidarity of young people.

3. To assist young people affected by natural or man-made disasters by pooling small resources together.

4. To provide humanitarian support to the community and create positive community relationships.

5. To stand by each other in times of sorrow (grief) and joy (celebration).

6. To respect and uphold the culture and traditions we inherited from our ancestors.

7. To promote good culture, tradition, and communal living.

8. To create a generation that embraces mutual support, love, and human compassion.

9. To respect each other's culture and beliefs — currently focusing primarily on objectives 1 and 9.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#Unity is Strength and Success`,
      contentOm: `Bu'uura akka Heera mootummaa dimokraatawaa rippaabilika Itoophiyaa keewwata (FDRE) 31 jalatti eerameen "namni kamiyyuu haala seera biyyattii, aadaa fi duudhaa hawaasaa hin faallessinen kaayyoo ykn sababa fedheef gurmaa'uu ykn gamtaadhaan ijaaramuu mirga qaba".

Kanaafuu Gamtaan dargaggoota melka jabdu qaxaa araati bu'uura heera kanaatin gamtaa seera qabeessa ta'e seera biyyatti bu'uura godhachuun, akkasumaas aadaa fi duudhaa ummataa haala hin faalleessineen fuulbana 1/1/2017 akka lakk. Itoophiyaatti hundaa'eera.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KAAYYOO, QAJEELTOO BU'UURAA, HAALA HIRMANNAA, MIRGA FI DIRQAMOOTA MISEENSOOTA GAMTICHAA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kaayyoo Ijoo Gamtichaa

Gamtaan dargaggoo melka jabdu Kaayyoo armaan gadii ni qabaatu:

1. Dargaggoon akka waliin jiraatan walbarsiisuu, ijaaruu fi akka walgargaaran taasisuu.

2. Walitti dhufeenya dargaggoo Tokkummaa fi Hawaasummaa jajjabeessuu.

3. Waan xiqqoo qaban walitti fiduudhaan, dargaggoo balaan uumamaa fi nam-tolcheen irra dhaqqabe gargaaruu.

4. Hawaasaf deeggarsa namuumma kennuun hawaasni keenya akka walitti dhufeenya gaarii uumaan godhuu/taasisu.

5. Yeroo rakkoos (gaddaa) ta'ee balloos (gammachuu) wal-cinaa dhaabbachuu.

6. Safuu fi duudhaa Kutaa irraa dhufnee akka hin cabsine eeguu fi wal kabachiisuu.

7. Aadaa, duudhaa fi hawaasummaan gaariin jidduu akka jiraatu godhu.

8. Dhaloota wal gargaarsa aadeeffate, jaalalaa fi quuqama namummaa qabu oomishu.

9. Aadaa fi amantaa ofii waliif kajuu — keessumattuu Qabxii 1ffaa fi 9 caalmaatti irratti xiyyeeffannee kan hoojjannu amma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#Tokkummaan Ciminaa fi Milkaayina`,
      sortOrder: 3,
    },
    {
      slug: 'contact',
      title: 'Contact Information',
      titleOm: 'Odeeffannoo Quunnamtii',
      content: 'Email: info@afosha.org\nPhone: +251 900 000 000\nAddress: Addis Ababa, Ethiopia',
      contentOm: 'Imeelii: info@afosha.org\nBilbila: +251 900 000 000\nTeessoo: Finfinnee, Itoophiyaa',
      sortOrder: 4,
    },
  ];

  for (const page of publicPages) {
    await prisma.publicContent.upsert({
      where: { slug: page.slug },
      update: { title: page.title, titleOm: page.titleOm, content: page.content, contentOm: page.contentOm, sortOrder: page.sortOrder },
      create: page,
    });
  }

  // 2. Auditor User
  const auditorPasswordHash = await hashPassword('Auditor@123');
  const auditor = await prisma.user.upsert({
    where: { username: 'auditor' },
    update: {},
    create: {
      username: 'auditor',
      email: 'auditor@afosha.org',
      phone: '+251911000001',
      passwordHash: auditorPasswordHash,
      role: 'AUDITOR',
      isActive: true,
      isVerified: true,
      preferredLanguage: 'om',
      mustChangePassword: false,
    },
  });
  console.log('Auditor user created:', auditor.username);

  // 3. Member User - Abebe Kebede (as featured in mockups)
  const memberPasswordHash = await hashPassword('Abebe@123');
  const memberUser = await prisma.user.upsert({
    where: { username: 'abebe' },
    update: {},
    create: {
      username: 'abebe',
      email: 'abebe@email.com',
      phone: '+251911123456',
      passwordHash: memberPasswordHash,
      role: 'MEMBER',
      isActive: true,
      isVerified: true,
      preferredLanguage: 'om',
      mustChangePassword: false,
    },
  });

  const abebeMember = await prisma.member.upsert({
    where: { memberId: 'MEM-001' },
    update: {},
    create: {
      memberId: 'MEM-001',
      userId: memberUser.id,
      fullName: 'Abebe Kebede',
      gender: 'MALE',
      dateOfBirth: new Date('1998-05-12'),
      address: 'Addis Ababa, Ethiopia',
      occupation: 'Software Engineer',
      registrationDate: new Date('2024-09-11'),
      joinDate: new Date('2024-09-11'),
      status: 'APPROVED',
      totalCredit: 150,
      outstandingBalance: 100,
    },
  });

  // Emergency contact for Abebe
  await prisma.emergencyContact.upsert({
    where: { memberId: abebeMember.id },
    update: {},
    create: {
      memberId: abebeMember.id,
      fullName: 'Almaz Tadesse',
      relationship: 'Mother',
      phone: '+251922334455',
      address: 'Addis Ababa',
    },
  });

  // Additional members to match dashboard statistics (Gemechu K, Tsion D, etc.)
  const additionalMembers = [
    { username: 'gemechu', fullName: 'Gemechu Keneni', phone: '+251911223344', memberId: 'MEM-002', gender: 'MALE' },
    { username: 'tsion', fullName: 'Tsion Daniel', phone: '+251911334455', memberId: 'MEM-003', gender: 'FEMALE' },
    { username: 'chala', fullName: 'Chala Beyene', phone: '+251911445566', memberId: 'MEM-004', gender: 'MALE' },
    { username: 'tolasa', fullName: 'Tolasa Feyisa', phone: '+251911556677', memberId: 'MEM-005', gender: 'MALE' },
  ];

  for (const m of additionalMembers) {
    const user = await prisma.user.upsert({
      where: { username: m.username },
      update: {},
      create: {
        username: m.username,
        email: `${m.username}@afosha.org`,
        phone: m.phone,
        passwordHash: memberPasswordHash,
        role: 'MEMBER',
        isActive: true,
        isVerified: true,
      },
    });

    await prisma.member.upsert({
      where: { memberId: m.memberId },
      update: {},
      create: {
        memberId: m.memberId,
        userId: user.id,
        fullName: m.fullName,
        gender: m.gender as any,
        dateOfBirth: new Date('1999-01-01'),
        address: 'Addis Ababa, Ethiopia',
        status: 'APPROVED',
        totalCredit: 50,
        outstandingBalance: 0,
      },
    });
  }

  // 4. Initial Contribution Rate History
  const existingRate = await prisma.contributionRateHistory.findFirst();
  if (!existingRate) {
    await prisma.contributionRateHistory.create({
      data: {
        effectiveDate: new Date('2024-09-11'),
        weeklyAmount: 50,
        description: 'Approved founding weekly contribution rate (Gamtaan dargaggoota Melka Jabdu Qaxaa Araati)',
        createdBy: admin.id,
      },
    });
  }

  // 5. Sample Obligations & Penalties for Abebe Kebede
  const now = new Date();
  const currentWeek = 44;
  const currentYear = 2026;

  await prisma.weeklyObligation.upsert({
    where: {
      memberId_weekNumber_year: {
        memberId: abebeMember.id,
        weekNumber: currentWeek,
        year: currentYear,
      },
    },
    update: {},
    create: {
      memberId: abebeMember.id,
      weekNumber: currentWeek,
      year: currentYear,
      dueDate: now,
      contributionAmount: 50,
      penaltyAmount: 50,
      totalDue: 100,
      amountPaid: 0,
      status: 'OVERDUE',
      consecutiveMissedWeeks: 1,
    },
  });

  await prisma.penalty.upsert({
    where: {
      penalty_per_week: {
        memberId: abebeMember.id,
        weekNumber: currentWeek,
        year: currentYear,
      },
    },
    update: {},
    create: {
      memberId: abebeMember.id,
      weekNumber: currentWeek,
      year: currentYear,
      amount: 50,
      reason: 'Late payment for Saturday contribution',
      status: 'OUTSTANDING',
    },
  });

  // 6. Sample Expense
  const existingExp = await prisma.expense.findFirst();
  if (!existingExp) {
    await prisma.expense.create({
      data: {
        expenseId: 'EXP-2026-001',
        title: 'Hall Rent for General Assembly Meeting',
        titleOm: 'Kiree Galmaa Walga\'ii Gamtaa',
        category: 'EVENT',
        amount: 3500,
        paymentMethod: 'CASH',
        recordedById: admin.id,
        approvalStatus: 'APPROVED',
      },
    });
  }

  // 7. Sample Verified Payment and Receipt for Abebe
  const existingPay = await prisma.payment.findFirst({ where: { memberId: abebeMember.id } });
  if (!existingPay) {
    const payment = await prisma.payment.create({
      data: {
        paymentId: 'PAY-2026-001',
        memberId: abebeMember.id,
        amount: 150,
        paymentMethod: 'MOBILE_MONEY',
        transactionReference: 'AF-2025-1101',
        status: 'VERIFIED',
        recordedById: admin.id,
        verifiedById: admin.id,
        verifiedAt: new Date(),
        receiptNumber: 'AF-2025-1101',
      },
    });

    await prisma.receipt.create({
      data: {
        receiptNumber: 'AF-2025-1101',
        paymentId: payment.id,
        memberId: abebeMember.id,
        amount: 150,
        paymentMethod: 'CBE Birr',
        reference: 'AF-2025-1101',
        breakdown: {
          weeklyContribution: 50,
          penalty: 50,
          outstanding: 50,
        },
      },
    });
  }

  console.log('Default settings, users, members, and public content seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
