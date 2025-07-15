/*
  Warnings:

  - Added the required column `updatedAt` to the `ng_words` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ng_words" ADD COLUMN     "category" VARCHAR(50),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "word" SET DATA TYPE VARCHAR(100);
