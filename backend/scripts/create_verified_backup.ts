import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function createBackup() {
  console.log('--- Starting Verified Pre-Cleanup Database Backup ---');

  const [
    users,
    members,
    emergencyContacts,
    weeklyObligations,
    payments,
    penalties,
    fines,
    meetings,
    attendances,
    transactions,
    notifications,
    auditLogs,
    systemSettings,
    contributionRateHistories,
    specialContributions,
    specialContributionObligations,
    publicContents,
    paymentRequests,
    joiningObligations,
    expenses,
    receipts,
    paymentAllocations,
    yearEndSummaries,
    transactionReversals,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.member.findMany(),
    prisma.emergencyContact.findMany(),
    prisma.weeklyObligation.findMany(),
    prisma.payment.findMany(),
    prisma.penalty.findMany(),
    prisma.fine.findMany(),
    prisma.meeting.findMany(),
    prisma.attendance.findMany(),
    prisma.transaction.findMany(),
    prisma.notification.findMany(),
    prisma.auditLog.findMany(),
    prisma.systemSetting.findMany(),
    prisma.contributionRateHistory.findMany(),
    prisma.specialContribution.findMany(),
    prisma.specialContributionObligation.findMany(),
    prisma.publicContent.findMany(),
    prisma.paymentRequest.findMany(),
    prisma.joiningObligation.findMany(),
    prisma.expense.findMany(),
    prisma.receipt.findMany(),
    prisma.paymentAllocation.findMany(),
    prisma.yearEndSummary.findMany(),
    prisma.transactionReversal.findMany(),
  ]);

  const backupPayload = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    description: 'Pre-cleanup full verified database backup',
    counts: {
      users: users.length,
      members: members.length,
      emergencyContacts: emergencyContacts.length,
      weeklyObligations: weeklyObligations.length,
      payments: payments.length,
      penalties: penalties.length,
      fines: fines.length,
      meetings: meetings.length,
      attendances: attendances.length,
      transactions: transactions.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length,
      systemSettings: systemSettings.length,
      contributionRateHistories: contributionRateHistories.length,
      specialContributions: specialContributions.length,
      specialContributionObligations: specialContributionObligations.length,
      publicContents: publicContents.length,
      paymentRequests: paymentRequests.length,
      joiningObligations: joiningObligations.length,
      expenses: expenses.length,
      receipts: receipts.length,
      paymentAllocations: paymentAllocations.length,
      yearEndSummaries: yearEndSummaries.length,
      transactionReversals: transactionReversals.length,
    },
    data: {
      users,
      members,
      emergencyContacts,
      weeklyObligations,
      payments,
      penalties,
      fines,
      meetings,
      attendances,
      transactions,
      notifications,
      auditLogs,
      systemSettings,
      contributionRateHistories,
      specialContributions,
      specialContributionObligations,
      publicContents,
      paymentRequests,
      joiningObligations,
      expenses,
      receipts,
      paymentAllocations,
      yearEndSummaries,
      transactionReversals,
    },
  };

  const backupDir = path.join(process.cwd(), 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  const filename = `pre-cleanup-backup-${Date.now()}.json`;
  const filePath = path.join(backupDir, filename);
  const content = JSON.stringify(backupPayload, null, 2);

  await fs.writeFile(filePath, content, 'utf8');

  // Also register in Backup table if admin exists
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    await prisma.backup.create({
      data: {
        filename,
        filePath,
        fileSize: content.length,
        type: 'FULL',
        createdBy: admin.id,
      },
    });
  }

  console.log(`[SUCCESS] Backup saved to: ${filePath}`);
  console.log(`[METRICS] Total file size: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(JSON.stringify(backupPayload.counts, null, 2));
}

createBackup()
  .catch((e) => {
    console.error('Backup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
