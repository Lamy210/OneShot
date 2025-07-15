/*
  Warnings:

  - You are about to drop the column `category` on the `posts` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
