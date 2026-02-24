/*
  Warnings:

  - You are about to drop the column `moduleId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `Module` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_semesterId_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "moduleId",
ADD COLUMN     "learningModuleId" TEXT;

-- DropTable
DROP TABLE "Module";

-- CreateTable
CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "semesterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_learningModuleId_fkey" FOREIGN KEY ("learningModuleId") REFERENCES "LearningModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
