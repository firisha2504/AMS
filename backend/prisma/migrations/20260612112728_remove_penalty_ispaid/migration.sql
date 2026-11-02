/*
  Warnings:

  - You are about to drop the column `isPaid` on the `Penalty` table. All the data in the column will be lost.

*/

-- Migrate data
UPDATE "Penalty" SET "status" = 'SETTLED' WHERE "isPaid" = true;
UPDATE "Penalty" SET "status" = 'OUTSTANDING' WHERE "isPaid" = false;

-- AlterTable
ALTER TABLE "Penalty" DROP COLUMN "isPaid";
