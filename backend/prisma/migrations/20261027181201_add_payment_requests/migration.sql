-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('M_PESA', 'TELEBIRR', 'CBE', 'EBIRR');

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "obligationId" TEXT,
    "specialContributionObligationId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentProvider" "PaymentProvider" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accountDetails" JSONB NOT NULL,
    "transactionReference" TEXT,
    "receiptScreenshot" TEXT,
    "verificationMethod" TEXT,
    "verifiedById" TEXT,
    "verificationNotes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_referenceNumber_key" ON "PaymentRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "PaymentRequest_memberId_idx" ON "PaymentRequest"("memberId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "PaymentRequest_expiresAt_idx" ON "PaymentRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "PaymentRequest_paymentProvider_idx" ON "PaymentRequest"("paymentProvider");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "WeeklyObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_specialContributionObligationId_fkey" FOREIGN KEY ("specialContributionObligationId") REFERENCES "SpecialContributionObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
