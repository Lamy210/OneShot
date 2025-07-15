-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "passwordResetTokenExpires" TIMESTAMP(3);
