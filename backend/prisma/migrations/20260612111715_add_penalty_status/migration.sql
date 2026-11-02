-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('OUTSTANDING', 'SETTLED', 'WAIVED');

-- AlterTable
ALTER TABLE "Penalty" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "PenaltyStatus" NOT NULL DEFAULT 'OUTSTANDING';

-- CreateIndex
CREATE INDEX "Penalty_status_idx" ON "Penalty"("status");
