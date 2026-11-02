import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeCleanup() {
  console.log('========================================================');
  console.log('--- AFOSHA SYSTEM: SAFE DEMO & TEST DATA CLEANUP ---');
  console.log('========================================================\n');

  // 1. Identify users to preserve
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  const auditor = await prisma.user.findFirst({ where: { username: 'auditor' } });

  if (!admin) throw new Error('CRITICAL: Admin account not found! Aborting cleanup.');
  if (!auditor) throw new Error('CRITICAL: Auditor account not found! Aborting cleanup.');

  console.log(`[PROTECTED] Real Admin Account: ${admin.username} (${admin.email}, ${admin.phone})`);
  console.log(`[PROTECTED] Real Auditor Account: ${auditor.username} (${auditor.email}, ${auditor.phone})\n`);

  // 2. Identify demo seeded users and test execution users
  const demoUsernames = ['abebe', 'gemechu', 'tsion', 'chala', 'tolasa'];
  
  const allUsers = await prisma.user.findMany({
    include: { member: true },
  });

  const usersToDelete = allUsers.filter(u => {
    if (u.id === admin.id || u.id === auditor.id) return false;
    if (demoUsernames.includes(u.username)) return true;
    if (u.username.startsWith('user_') || u.username.startsWith('test_user_') || u.username.startsWith('cat_user_')) return true;
    if (u.member?.memberId?.startsWith('MEM-') && demoUsernames.includes(u.username)) return true;
    if (u.member?.memberId?.startsWith('TEST-') || u.member?.memberId?.startsWith('CAT-') || u.member?.fullName?.includes('Test Member') || u.member?.fullName?.includes('Test Audit Member')) return true;
    return false;
  });

  const memberIdsToDelete = usersToDelete
    .map(u => u.member?.id)
    .filter((id): id is string => Boolean(id));

  const userIdsToDelete = usersToDelete.map(u => u.id);

  console.log(`[IDENTIFIED] ${usersToDelete.length} demo/test users to safely remove:`);
  usersToDelete.forEach(u => {
    console.log(`  - ${u.username} (${u.role}) | Member: ${u.member?.fullName || 'N/A'} [${u.member?.memberId || 'N/A'}]`);
  });

  // 3. Identify demo and test special contributions
  const allCampaigns = await prisma.specialContribution.findMany();
  const campaignsToDelete = allCampaigns.filter(c => {
    if (c.campaignId.startsWith('SC-TEST-') || c.campaignId.startsWith('SC-GRA-17936') || c.campaignId.startsWith('SC-EME-17936')) {
      return true;
    }
    if (c.title.includes('Test Member') || c.title.includes('Test Audit Member')) {
      return true;
    }
    return false;
  });

  console.log(`\n[IDENTIFIED] ${campaignsToDelete.length} test special contribution campaigns to remove:`);
  campaignsToDelete.forEach(c => {
    console.log(`  - ${c.campaignId}: "${c.title}" (${c.type})`);
  });

  // 4. Perform safe transactional deletion
  console.log('\n[EXECUTING] Running transactional cleanup...');

  await prisma.$transaction(async (tx) => {
    // A. Clean up allocations and receipts for targeted members or payments
    if (memberIdsToDelete.length > 0) {
      await tx.paymentAllocation.deleteMany({
        where: {
          OR: [
            { payment: { memberId: { in: memberIdsToDelete } } },
            { weeklyObligation: { memberId: { in: memberIdsToDelete } } },
            { penalty: { memberId: { in: memberIdsToDelete } } },
            { specialContributionObligation: { memberId: { in: memberIdsToDelete } } },
          ],
        },
      });

      await tx.receipt.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.transaction.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.paymentRequest.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.payment.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.penalty.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.fine.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.weeklyObligation.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.attendance.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.joiningObligation.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.emergencyContact.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });

      await tx.notification.deleteMany({
        where: { memberId: { in: memberIdsToDelete } },
      });
    }

    // B. Clean up test special contribution campaigns
    if (campaignsToDelete.length > 0) {
      const campIds = campaignsToDelete.map(c => c.id);
      await tx.paymentAllocation.deleteMany({
        where: { specialContributionObligation: { specialContributionId: { in: campIds } } },
      });
      await tx.specialContributionObligation.deleteMany({
        where: { specialContributionId: { in: campIds } },
      });
      await tx.specialContribution.deleteMany({
        where: { id: { in: campIds } },
      });
    }

    // C. Clean up demo expenses (e.g. EXP-2026-001)
    await tx.expense.deleteMany({
      where: { expenseId: 'EXP-2026-001' },
    });

    // D. Delete the members
    if (memberIdsToDelete.length > 0) {
      await tx.member.deleteMany({
        where: { id: { in: memberIdsToDelete } },
      });
    }

    // E. Delete the users
    if (userIdsToDelete.length > 0) {
      await tx.refreshToken.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await tx.deviceToken.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await tx.otpCode.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await tx.user.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });
    }

    // Log the audit event under admin
    await tx.auditLog.create({
      data: {
        user: { connect: { id: admin.id } },
        action: 'SAFE_DEMO_DATA_CLEANUP',
        module: 'SYSTEM',
        details: {
          removedUsersCount: userIdsToDelete.length,
          removedMembersCount: memberIdsToDelete.length,
          removedCampaignsCount: campaignsToDelete.length,
        },
      },
    });
  });

  console.log('[SUCCESS] Transaction committed successfully!\n');

  // 5. Verification after cleanup
  const remainingUsers = await prisma.user.findMany({
    select: { username: true, role: true, email: true, phone: true },
  });
  const remainingMembers = await prisma.member.count();
  const remainingPayments = await prisma.payment.count();
  const remainingPenalties = await prisma.penalty.count();
  const remainingCampaigns = await prisma.specialContribution.count();

  console.log('========================================================');
  console.log('--- DATABASE STATE AFTER CLEANUP ---');
  console.log('========================================================');
  console.log(`Remaining Users: ${remainingUsers.length}`);
  remainingUsers.forEach(u => console.log(`  - ${u.username} (${u.role}) | ${u.email} | ${u.phone}`));
  console.log(`Remaining Members: ${remainingMembers}`);
  console.log(`Remaining Payments: ${remainingPayments}`);
  console.log(`Remaining Penalties: ${remainingPenalties}`);
  console.log(`Remaining Special Campaigns: ${remainingCampaigns}`);
  console.log('========================================================\n');
}

safeCleanup()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
