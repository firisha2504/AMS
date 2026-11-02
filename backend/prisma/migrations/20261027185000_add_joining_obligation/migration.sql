-- Add joinDate column to Member table
ALTER TABLE "Member" ADD COLUMN "joinDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Create a joining_obligation table to track back contributions
CREATE TABLE "JoiningObligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "totalBackContributionAmount" DECIMAL(12,2) NOT NULL,
    "backContributionWeeks" INTEGER NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JoiningObligation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "JoiningObligation_memberId_key" ON "JoiningObligation"("memberId");
CREATE INDEX "JoiningObligation_status_idx" ON "JoiningObligation"("status");
