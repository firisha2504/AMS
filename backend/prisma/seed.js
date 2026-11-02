"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const helpers_js_1 = require("../src/services/helpers.js");
const index_js_1 = require("../src/config/index.js");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const passwordHash = await (0, helpers_js_1.hashPassword)('Admin@123');
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
        },
    });
    console.log('Admin user created:', admin.username);
    const defaultSettings = [
        { key: 'weekly_contribution', value: String(index_js_1.config.defaults.weeklyContribution), label: 'Weekly Contribution Amount', labelOm: 'Hanga Kaffaltii Torbanii' },
        { key: 'weekly_penalty', value: String(index_js_1.config.defaults.weeklyPenalty), label: 'Weekly Penalty Amount', labelOm: 'Hanga Adabbii Torbanii' },
        { key: 'monthly_penalty', value: String(index_js_1.config.defaults.monthlyPenalty), label: 'Monthly Penalty Amount', labelOm: 'Hanga Adabbii Ji\'aati' },
        { key: 'meeting_day', value: String(index_js_1.config.defaults.meetingDay), label: 'Meeting Day (0=Sun, 6=Sat)', labelOm: 'Guyyaa Walga\'ii' },
        { key: 'organization_name', value: 'Afosha', label: 'Organization Name', labelOm: 'Maqaa Dhaabbataa' },
        { key: 'organization_name_om', value: 'Afosha', label: 'Organization Name (Oromo)', labelOm: 'Maqaa Dhaabbataa (Afaan Oromoo)' },
    ];
    for (const setting of defaultSettings) {
        await prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
        });
    }
    console.log('Default settings created');
    console.log('Seed completed successfully');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map