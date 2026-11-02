-- CreateEnum
CREATE TYPE "SpecialContributionType" AS ENUM ('GRADUATION', 'BEREAVEMENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'UNCLE', 'AUNT');

-- CreateEnum
CREATE TYPE "SpecialContributionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SPECIAL_CONTRIBUTION';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'SPECIAL_CONTRIBUTION';

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "meetingTime" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "specialContributionObligationId" TEXT;

-- CreateTable
CREATE TABLE "SpecialContribution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "SpecialContributionType" NOT NULL,
    "title" TEXT NOT NULL,
    "titleOm" TEXT,
    "description" TEXT,
    "descriptionOm" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "beneficiaryMemberId" TEXT,
    "familyRelationship" "FamilyRelationship",
    "targetMemberIds" JSONB,
    "status" "SpecialContributionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialContributionObligation" (
    "id" TEXT NOT NULL,
    "specialContributionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ObligationStatus" NOT NULL DEFAULT 'PENDING',
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialContributionObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicContent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleOm" TEXT,
    "content" TEXT NOT NULL,
    "contentOm" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialContribution_campaignId_key" ON "SpecialContribution"("campaignId");

-- CreateIndex
CREATE INDEX "SpecialContribution_type_idx" ON "SpecialContribution"("type");

-- CreateIndex
CREATE INDEX "SpecialContribution_status_idx" ON "SpecialContribution"("status");

-- CreateIndex
CREATE INDEX "SpecialContribution_dueDate_idx" ON "SpecialContribution"("dueDate");

-- CreateIndex
CREATE INDEX "SpecialContributionObligation_memberId_idx" ON "SpecialContributionObligation"("memberId");

-- CreateIndex
CREATE INDEX "SpecialContributionObligation_status_idx" ON "SpecialContributionObligation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialContributionObligation_specialContributionId_memberI_key" ON "SpecialContributionObligation"("specialContributionId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicContent_slug_key" ON "PublicContent"("slug");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_specialContributionObligationId_fkey" FOREIGN KEY ("specialContributionObligationId") REFERENCES "SpecialContributionObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialContribution" ADD CONSTRAINT "SpecialContribution_beneficiaryMemberId_fkey" FOREIGN KEY ("beneficiaryMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialContribution" ADD CONSTRAINT "SpecialContribution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialContributionObligation" ADD CONSTRAINT "SpecialContributionObligation_specialContributionId_fkey" FOREIGN KEY ("specialContributionId") REFERENCES "SpecialContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialContributionObligation" ADD CONSTRAINT "SpecialContributionObligation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
