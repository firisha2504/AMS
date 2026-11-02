import prisma from '../config/database.js';
import { Prisma, SpecialContributionType, FamilyRelationship, ObligationStatus } from '@prisma/client';
import { getNumericSetting } from './helpers.js';

function generateCampaignId(type: string): string {
  return `SC-${type.slice(0, 3)}-${Date.now()}`;
}

export async function createGraduationContribution(
  beneficiaryMemberId: string,
  familyRelationship: FamilyRelationship,
  createdById: string,
  dueDate?: Date
) {
  const amount = await getNumericSetting('graduation_contribution', 100);
  const beneficiary = await prisma.member.findUnique({ where: { id: beneficiaryMemberId } });
  if (!beneficiary) throw new Error('Beneficiary member not found');

  const title = `Graduation Contribution - ${beneficiary.fullName}`;
  const titleOm = `Kaffaltii Eebbifamuu - ${beneficiary.fullName}`;

  return createSpecialContributionCampaign({
    type: SpecialContributionType.GRADUATION,
    title,
    titleOm,
    amount,
    beneficiaryMemberId,
    familyRelationship,
    createdById,
    dueDate,
  });
}

export async function createBereavementContribution(
  beneficiaryMemberId: string,
  familyRelationship: FamilyRelationship,
  createdById: string,
  dueDate?: Date
) {
  const amount = await getNumericSetting('bereavement_contribution', 100);
  const beneficiary = await prisma.member.findUnique({ where: { id: beneficiaryMemberId } });
  if (!beneficiary) throw new Error('Beneficiary member not found');

  const title = `Bereavement Contribution - ${beneficiary.fullName}`;
  const titleOm = `Kaffaltii Rakkoo Du'a - ${beneficiary.fullName}`;

  return createSpecialContributionCampaign({
    type: SpecialContributionType.BEREAVEMENT,
    title,
    titleOm,
    amount,
    beneficiaryMemberId,
    familyRelationship,
    createdById,
    dueDate,
  });
}

export async function createEmergencyContribution(
  data: {
    title: string;
    titleOm?: string;
    description?: string;
    descriptionOm?: string;
    amount: number;
    dueDate: Date;
    targetMemberIds?: string[];
    createdById: string;
  }
) {
  return createSpecialContributionCampaign({
    type: SpecialContributionType.EMERGENCY,
    title: data.title,
    titleOm: data.titleOm,
    description: data.description,
    descriptionOm: data.descriptionOm,
    amount: data.amount,
    dueDate: data.dueDate,
    targetMemberIds: data.targetMemberIds,
    createdById: data.createdById,
  });
}

async function createSpecialContributionCampaign(params: {
  type: SpecialContributionType;
  title: string;
  titleOm?: string;
  description?: string;
  descriptionOm?: string;
  amount: number;
  beneficiaryMemberId?: string;
  familyRelationship?: FamilyRelationship;
  dueDate?: Date;
  targetMemberIds?: string[];
  createdById: string;
}) {
  const activeMembers = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });

  let targetMembers = activeMembers;
  if (params.targetMemberIds?.length) {
    targetMembers = activeMembers.filter((m) => params.targetMemberIds!.includes(m.id));
  }

  // Exclude beneficiary from obligation creation - they don't pay
  const payingMembers = targetMembers.filter((m) => m.id !== params.beneficiaryMemberId);

  const campaign = await prisma.specialContribution.create({
    data: {
      campaignId: generateCampaignId(params.type),
      type: params.type,
      title: params.title,
      titleOm: params.titleOm,
      description: params.description,
      descriptionOm: params.descriptionOm,
      amount: params.amount,
      dueDate: params.dueDate,
      beneficiaryMemberId: params.beneficiaryMemberId,
      familyRelationship: params.familyRelationship,
      targetMemberIds: params.targetMemberIds ?? undefined,
      createdById: params.createdById,
      obligations: {
        create: payingMembers.map((member) => ({
          memberId: member.id,
          amount: params.amount,
          isExempt: false,
          status: ObligationStatus.PENDING,
          amountPaid: 0,
        })),
      },
    },
    include: {
      obligations: { include: { member: { select: { fullName: true, memberId: true } } } },
      beneficiaryMember: { select: { fullName: true, memberId: true } },
    },
  });

  // Notify all paying members
  for (const obligation of campaign.obligations) {
    const member = await prisma.member.findUnique({
      where: { id: obligation.memberId },
      select: { userId: true },
    });
    if (member) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          memberId: obligation.memberId,
          type: 'SPECIAL_CONTRIBUTION',
          title: params.title,
          titleOm: params.titleOm ?? params.title,
          message: `Special contribution of ${params.amount} Birr is due.`,
          messageOm: `Kaffaltiin addaa Birr ${params.amount} kan kaffalamu.`,
          metadata: { campaignId: campaign.campaignId, type: params.type } as Prisma.InputJsonValue,
        },
      });
    }
  }

  return campaign;
}

export async function applySpecialContributionPayment(
  obligationId: string,
  amount: number
): Promise<void> {
  const obligation = await prisma.specialContributionObligation.findUnique({
    where: { id: obligationId },
  });
  if (!obligation || obligation.isExempt) return;

  const newPaid = Number(obligation.amountPaid) + amount;
  const totalDue = Number(obligation.amount);

  let status: ObligationStatus = ObligationStatus.PARTIAL;
  if (newPaid >= totalDue) status = ObligationStatus.PAID;

  await prisma.specialContributionObligation.update({
    where: { id: obligationId },
    data: { amountPaid: newPaid, status },
  });
}
