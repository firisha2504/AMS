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
    {
      key: 'payment_account_cbe',
      value: JSON.stringify({
        provider: 'CBE',
        bankName: 'Commercial Bank of Ethiopia (CBE)',
        accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
        accountNumber: '1000234567890',
        branch: 'Melka Jabdu / Dire Dawa',
        description: 'Official CBE Account for Weekly and Special Contributions'
      }),
      label: 'CBE Payment Account Details',
      labelOm: 'Herrega Baankii Daldala Itoophiyaa (CBE)',
    },
    {
      key: 'payment_account_telebirr',
      value: JSON.stringify({
        provider: 'TELEBIRR',
        accountName: 'Gamtaa Dargaggoota Melka Jabdu',
        accountNumber: '+251900000000',
        merchantCode: '789456',
        description: 'Telebirr Mobile Money Merchant Account'
      }),
      label: 'Telebirr Payment Account Details',
      labelOm: 'Herrega Kaffaltii Telebirr',
    },
    {
      key: 'payment_account_ebirr',
      value: JSON.stringify({
        provider: 'EBIRR',
        accountName: 'Gamtaa Dargaggoota Melka Jabdu',
        accountNumber: '+251900000000',
        merchantCode: '45213',
        description: 'eBirr Digital Wallet Payment Gateway'
      }),
      label: 'eBirr Payment Account Details',
      labelOm: 'Herrega Kaffaltii eBirr',
    },
    {
      key: 'payment_account_bank_transfer',
      value: JSON.stringify({
        provider: 'BANK_TRANSFER',
        bankName: 'Commercial Bank of Ethiopia / Awash Bank',
        accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
        accountNumber: '1000234567890',
        branch: 'Melka Jabdu Branch',
        swiftCode: 'CBETETAA',
        description: 'Direct Bank Deposit or Wire Transfer'
      }),
      label: 'Bank Transfer Account Details',
      labelOm: 'Herrega Dabarsa Baankii Kallattii',
    },
    {
      key: 'payment_account_m_pesa',
      value: JSON.stringify({
        provider: 'M_PESA',
        accountName: 'Gamtaa Dargaggoota Melka Jabdu',
        accountNumber: '+251700000000',
        shortCode: '56789',
        description: 'Safaricom M-Pesa Mobile Money'
      }),
      label: 'M-Pesa Payment Account Details',
      labelOm: 'Herrega Kaffaltii M-Pesa',
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
      title: 'Laws & Regulations (Seeraa fi Dambii)',
      titleOm: 'Seeraa fi Dambii Gamtaa',
      content: `PROPOSED INITIAL ORGANIZATIONAL RULES (WIXINEE DAMBII JALQABAA)
Note: These are proposed initial organizational rules subject to formal review and adoption by the General Assembly, and remain editable by authorized administrators.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSTITUTIONAL FOUNDATION (HEERA MOOTUMMAA RDFI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Constitution of the Federal Democratic Republic of Ethiopia (FDRE), Article 31:
"Every person has the right to freedom of association for any cause or purpose, in accordance with the law, culture, and traditions of society."

Based on this constitutional provision, Gamtaan dargaggoota Melka Jabdu Qaxaa Araati was established on Meskerem 1, 2017 Ethiopian Calendar as a legally recognized youth association founded on national law and respecting the cultures and traditions of the community.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEERAA FI DAMBII GAMTAA (ORGANIZATIONAL RULES 1 - 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rule 1: Purpose of the Association (Seera 1: Kaayyoo Gamtaa)
Our association is established to strengthen unity, mutual support, love, respect, and positive relationships among the youth.

Rule 2: Mutual Respect (Seera 2: Kabaja Walii)
Every member must respect the culture, religion, opinions, and perspectives of other members.

Rule 3: Weekly Contribution (Seera 3: Kaffaltii Torbanii)
Every member must pay the weekly contribution established by the organization on time. Contribution day is Saturday.

Rule 4: Payment Penalties (Seera 4: Adabbii Kaffaltii)
Any member who fails to pay the weekly contribution on time shall pay penalties as determined in the association's bylaws.

Rule 5: Special Contributions (Seera 5: Gumaacha Addaa)
When an exceptional event occurs for a member, such as bereavement or family educational graduation, other members make contributions per the association's decision.

Rule 6: Mutual Support (Seera 6: Wal-gargaarsa)
Members must support and stand by one another in times of joy, grief, and adversity.

Rule 7: Financial Transparency (Seera 7: Iftoomina Maallaqaa)
Administration of revenue, expenditures, contributions, penalties, and association assets must be managed with transparency and verifiable documentation.

Rule 8: Meeting Participation (Seera 8: Hirmaannaa Walga'ii)
Members must make every effort to attend and participate in association meetings.

Rule 9: Association Decisions (Seera 9: Murtii Gamtaa)
Decisions of the association must be made legally, based on deliberation and consensus of the members.

Rule 10: Amendment of Regulations (Seera 10: Fooyya'iinsa Dambii)
The association bylaws may be amended whenever necessary based on the association's established decision-making procedures.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motto: Tokkummaan Ciminaa fi Milkaayina (Unity is Strength and Success)`,
      contentOm: `WIXINEE DAMBII JALQABAA GAMTAA
Hubachiisa: Seeraa fi dambiin kun wixinee jalqabaa marii fi murtee yaa'ii waliigalaa gamtaatiif dhiyaatedha. Akkaataa adeemsa murtii gamtaatiin bulchitoota aangoo qabaniin kan fooyya'uu fi yeroo yaa'ii waliigalaatiin ragga'u kan hojiirra ooludha.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEERA MOOTUMMAA RDFI (BU'UURA SEERAA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Heera Mootummaa Dimokiraatawa Federaalawaa Itoophiyaa (FDRE), Keewwata 31:
"Namni kamiyyuu haala seera biyyattii, aadaa fi duudhaa hawaasaa hin faallessineen kaayyoo ykn sababa fedheef gurmaa'uu ykn gamtaadhaan ijaaramuu mirga qaba."

Gamtaan dargaggoota Melka Jabdu Qaxaa Araati bu'uura heera kanaatiin gamtaa seera qabeessa ta'e seera biyyattii bu'uura godhachuun, akkasumas aadaa fi duudhaa ummataa haala hin faallessineen Fuulbana 1/1/2017 akka lakk. Itoophiyaatti hundaa'eera.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEERAA FI DAMBII GAMTAA (SEERA 1 - 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seera 1: Kaayyoo Gamtaa
Gamtaan keenya kan hundeeffame tokkummaa, wal-gargaarsa, jaalala, kabajaafi hariiroo gaarii dargaggoota gidduutti cimsuuf.

Seera 2: Kabaja Walii
Miseensi hundi aadaa, amantii, yaadaafi ilaalcha miseensota biroo kabajuu qaba.

Seera 3: Kaffaltii Torbanii
Miseensi hundi kaffaltii torbanii dhaabbanni murteesse yeroo isaa eeggatee kaffaluu qaba. Guyyaan kaffaltii Sanbata.

Seera 4: Adabbii Kaffaltii
Miseensi kaffaltii torbanii yeroo isaa keessatti hin kaffalle adabbii akkaataa dambii gamtaa keessatti murtaa'een kaffaluu qaba.

Seera 5: Gumaacha Addaa
Yeroo miseensa tokkoof taatee addaa, kan akka du'a ykn eebba barnootaa maatii isaa, uumamu miseensonni biroo akka murtii gamtaa gumaacha taasisu.

Seera 6: Wal-gargaarsa
Miseensonni yeroo gammachuu, gaddaafi rakkoo wal deeggaruu qabu.

Seera 7: Iftoomina Maallaqaa
Bulchiinsi galii, baasii, kaffaltii, adabbii fi qabeenya gamtaa iftoominaafi ragaa qabatamaa irratti hundaa'uun bulchuu qaba.

Seera 8: Hirmaannaa Walga'ii
Miseensonni walga'ii gamtaa irratti hirmaachuuf carraaqqii gochuu qabu.

Seera 9: Murtii Gamtaa
Murtiin gamtaa haala seera qabeessa, marii fi waliigaltee miseensotaa irratti hundaa'uun kennamuu qaba.

Seera 10: Fooyya'iinsa Dambii
Dambiin gamtaa yeroo barbaachisaa ta'etti akkaataa adeemsa murtii gamtaa irratti hundaa'uun fooyya'uu danda'a.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mata Duree: Tokkummaan Ciminaa fi Milkaayina`,
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

  console.log('Production baseline (Admin, Auditor, System Settings, Public Content, Rate History) seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
