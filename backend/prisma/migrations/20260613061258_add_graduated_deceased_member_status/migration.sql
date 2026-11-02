/*
  Warnings:

  - The values [SAVINGS] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `totalSavings` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the `SavingsRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemberStatus" ADD VALUE 'GRADUATED';
ALTER TYPE "MemberStatus" ADD VALUE 'DECEASED';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('WEEKLY_CONTRIBUTION', 'PENALTY', 'FINE', 'SPECIAL_CONTRIBUTION', 'ADJUSTMENT', 'REFUND');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "SavingsRecord" DROP CONSTRAINT "SavingsRecord_memberId_fkey";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "totalSavings";

-- DropTable
DROP TABLE "SavingsRecord";
