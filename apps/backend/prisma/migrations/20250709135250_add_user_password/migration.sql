/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "recipientAmount" INTEGER,
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountHolder" VARCHAR(100),
ADD COLUMN     "accountNumber" VARCHAR(20),
ADD COLUMN     "accountType" VARCHAR(20),
ADD COLUMN     "bankBranch" VARCHAR(100),
ADD COLUMN     "bankName" VARCHAR(100),
ADD COLUMN     "minPayoutAmount" INTEGER DEFAULT 1000,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "payoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeAccountEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeOnboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
